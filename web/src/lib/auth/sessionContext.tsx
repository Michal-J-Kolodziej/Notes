import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  ensureGuestSession,
  formatGuestSessionLabel,
} from './guestSession'
import {
  getOptionalAccountPreparationClient,
  prepareAuthenticatedAccountWithBackend,
} from './remoteAccountPreparation'
import {
  getOptionalConvexClient,
  registerGuestSessionWithBackend,
} from './remoteGuestRegistration'
import type { ReactNode } from 'react'
import type { GuestSession } from './guestSession'
import type {
  AccountPreparationFailureReason,
  ExternalSignedInAccountState,
} from './remoteAccountPreparation'
import type { GuestSessionBackendRegistration } from './remoteGuestRegistration'

export type ReadyGuestSession = {
  backendRegistration: GuestSessionBackendRegistration
  status: 'ready'
} & GuestSession

export interface ReadyAccountPendingSession
  extends Omit<ReadyGuestSession, 'mode'> {
  authSubject: string
  displayName?: string
  email?: string
  mode: 'account_pending'
  reason?: AccountPreparationFailureReason
}

export interface ReadyAccountSession
  extends Omit<ReadyGuestSession, 'mode'> {
  authSubject: string
  displayName?: string
  email?: string
  mode: 'account'
  userId: string
}

export type ReadyAppSession =
  | ReadyGuestSession
  | ReadyAccountPendingSession
  | ReadyAccountSession

export type ExternalAccountState =
  | { status: 'disabled' }
  | { status: 'loading' }
  | { status: 'signed_out' }
  | ExternalSignedInAccountState

export type AppSession = { status: 'loading' } | ReadyAppSession

export interface AppSessionSummary {
  detail: string
  heading: string
  sessionLabel?: string
  statusLabel: string
}

const AppSessionContext = createContext<AppSession | null>(null)
const AppSessionControlsContext = createContext<{
  retryAccountPreparation: () => void
} | null>(null)

export function AppSessionProvider({
  children,
  externalAccountState = { status: 'disabled' },
  getAccountClient = getOptionalAccountPreparationClient,
  getConvexClient = getOptionalConvexClient,
  syncAuthenticatedAccount = prepareAuthenticatedAccountWithBackend,
  syncGuestSessionRegistration = registerGuestSessionWithBackend,
}: {
  children: ReactNode
  externalAccountState?: ExternalAccountState
  getAccountClient?: typeof getOptionalAccountPreparationClient
  getConvexClient?: typeof getOptionalConvexClient
  syncAuthenticatedAccount?: typeof prepareAuthenticatedAccountWithBackend
  syncGuestSessionRegistration?: typeof registerGuestSessionWithBackend
}) {
  const [session, setSession] = useState<AppSession>({ status: 'loading' })
  const [accountPreparationAttempt, setAccountPreparationAttempt] = useState(0)
  const lastAccountSyncKeyRef = useRef<string | null>(null)
  const retryAccountPreparation = useCallback(() => {
    lastAccountSyncKeyRef.current = null
    setAccountPreparationAttempt((currentAttempt) => currentAttempt + 1)
  }, [])

  useEffect(() => {
    const guestSession = ensureGuestSession()

    setSession({
      backendRegistration:
        guestSession.persistence === 'memory'
          ? {
              reason: 'volatile_session',
              status: 'local_only',
            }
          : {
              reason: 'missing_backend_config',
              status: 'local_only',
            },
      status: 'ready',
      ...guestSession,
    })
  }, [])

  useEffect(() => {
    const guestSessionForSync = getGuestSessionForBackendSync(session)

    if (!guestSessionForSync) {
      return
    }

    const client = getConvexClient()

    if (!client) {
      return
    }

    let cancelled = false

    void syncGuestSessionRegistration(guestSessionForSync, client).then(
      (backendRegistration) => {
        if (cancelled) {
          return
        }

        setSession((currentSession) => {
          if (
            currentSession.status !== 'ready' ||
            currentSession.sessionId !== guestSessionForSync.sessionId
          ) {
            return currentSession
          }

          return {
            ...currentSession,
            backendRegistration,
          }
        })
      },
    )

    return () => {
      cancelled = true
    }
  }, [getConvexClient, session, syncGuestSessionRegistration])

  useEffect(() => {
    if (session.status !== 'ready') {
      return
    }

    if (
      externalAccountState.status === 'disabled' ||
      externalAccountState.status === 'loading'
    ) {
      return
    }

    const accountClient = getAccountClient()

    if (externalAccountState.status === 'signed_out') {
      lastAccountSyncKeyRef.current = null
      setAccountPreparationAttempt(0)
      accountClient?.clearAuth()

      if (session.mode !== 'guest') {
        setSession(toGuestReadySession(session))
      }

      return
    }

    const syncKey = `${session.sessionId}:${externalAccountState.authSubject}:${accountPreparationAttempt}`

    if (
      lastAccountSyncKeyRef.current === syncKey &&
      session.mode !== 'guest' &&
      session.authSubject === externalAccountState.authSubject
    ) {
      return
    }

    lastAccountSyncKeyRef.current = syncKey
    setSession(toAccountPendingSession(session, externalAccountState))

    let cancelled = false
    const guestSession = toGuestSession(session)

    void syncAuthenticatedAccount(
      guestSession,
      externalAccountState,
      accountClient,
    ).then((accountResult) => {
      if (cancelled) {
        return
      }

      setSession((currentSession) => {
        if (
          currentSession.status !== 'ready' ||
          currentSession.sessionId !== guestSession.sessionId
        ) {
          return currentSession
        }

        return accountResult.status === 'ready'
          ? toAccountReadySession(
              currentSession,
              externalAccountState,
              accountResult.userId,
            )
          : toAccountPendingSession(
              currentSession,
              externalAccountState,
              accountResult.reason,
            )
      })
    })

    return () => {
      cancelled = true
    }
  }, [
    accountPreparationAttempt,
    externalAccountState,
    getAccountClient,
    session.status === 'ready' ? session.sessionId : null,
    syncAuthenticatedAccount,
  ])

  return (
    <AppSessionControlsContext.Provider value={{ retryAccountPreparation }}>
      <AppSessionContext.Provider value={session}>
        {children}
      </AppSessionContext.Provider>
    </AppSessionControlsContext.Provider>
  )
}

export function useAppSession() {
  const session = useContext(AppSessionContext)

  if (!session) {
    throw new Error('useAppSession must be used inside AppSessionProvider')
  }

  return session
}

export function useAppSessionControls() {
  const controls = useContext(AppSessionControlsContext)

  if (!controls) {
    throw new Error(
      'useAppSessionControls must be used inside AppSessionProvider',
    )
  }

  return controls
}

export function canRetryAccountPreparation(session: AppSession) {
  return (
    session.status === 'ready' &&
    session.mode === 'account_pending' &&
    session.reason !== undefined &&
    session.reason !== 'missing_backend_config'
  )
}

export function getGuestSessionForBackendSync(
  session: AppSession,
): GuestSession | null {
  if (
    session.status === 'ready' &&
    session.persistence === 'local_storage' &&
    session.backendRegistration.status === 'local_only'
  ) {
    return toGuestSession(session)
  }

  return null
}

function normalizeAccountText(value: string | undefined) {
  const trimmedValue = value?.trim()

  return trimmedValue ? trimmedValue : undefined
}

function toGuestSession(session: ReadyAppSession): GuestSession {
  return {
    createdAt: session.createdAt,
    mode: 'guest',
    persistence: session.persistence,
    sessionId: session.sessionId,
  }
}

function toGuestReadySession(session: ReadyAppSession): ReadyGuestSession {
  return {
    ...toGuestSession(session),
    backendRegistration: session.backendRegistration,
    status: 'ready',
  }
}

function toAccountPendingSession(
  session: ReadyAppSession,
  accountState: ExternalSignedInAccountState,
  reason?: AccountPreparationFailureReason,
): ReadyAccountPendingSession {
  return {
    ...toGuestReadySession(session),
    authSubject: accountState.authSubject,
    displayName: normalizeAccountText(accountState.displayName),
    email: normalizeAccountText(accountState.email),
    mode: 'account_pending',
    ...(reason ? { reason } : {}),
  }
}

function toAccountReadySession(
  session: ReadyAppSession,
  accountState: ExternalSignedInAccountState,
  userId: string,
): ReadyAccountSession {
  return {
    ...toGuestReadySession(session),
    authSubject: accountState.authSubject,
    displayName: normalizeAccountText(accountState.displayName),
    email: normalizeAccountText(accountState.email),
    mode: 'account',
    userId,
  }
}

export function summarizeAppSession(
  session: AppSession,
): AppSessionSummary | undefined {
  if (session.status !== 'ready') {
    return undefined
  }

  if (session.mode === 'account') {
    return {
      detail:
        session.persistence === 'memory'
          ? 'This account is signed in on this device, but browser storage is still temporary in this session. Notes stay local to this device, and migration should wait for normal browser storage.'
          : 'This account is ready on this device. Notes still stay local to this device until migration and sync are explicitly completed, so this does not imply cloud backup yet.',
      heading:
        session.displayName?.trim() ||
        session.email?.trim() ||
        'Signed-in account on this device',
      statusLabel: 'Account ready',
    }
  }

  if (session.mode === 'account_pending') {
    return {
      detail:
        session.reason === 'missing_backend_config'
          ? 'This account is signed in on this device, but backend account preparation is not configured in this build. Notes still stay local to this device until migration exists.'
          : session.reason === 'missing_token'
            ? 'This account is signed in on this device, but the app could not obtain a valid account token for migration preparation. Notes still stay local to this device.'
            : session.reason === 'request_failed' ||
                session.reason === 'request_timed_out'
              ? 'This account is signed in on this device, but the app could not prepare account migration right now. Notes still stay local to this device, and no cloud backup is implied.'
              : 'This account is being prepared on this device. Notes still stay local to this device until migration is explicitly completed.',
      heading:
        session.displayName?.trim() ||
        session.email?.trim() ||
        'Signed-in account on this device',
      statusLabel: session.reason
        ? 'Account prep unavailable'
        : 'Preparing account',
    }
  }

  if (session.persistence === 'memory') {
    return {
      detail:
        'This browser could not persist guest identity beyond the current session. Notes still stay local-first, but account migration should wait for normal browser storage.',
      heading: 'Temporary guest mode in this browser session',
      sessionLabel: formatGuestSessionLabel(session.sessionId),
      statusLabel: 'Temporary',
    }
  }

  if (session.backendRegistration.status === 'registered') {
    return {
      detail:
        'This device is using a durable guest session. Notes stay local-first and are not backed up to the cloud yet. This session is registered with the backend to support future account migration without implying cloud backup today.',
      heading: 'Guest mode on this device',
      sessionLabel: formatGuestSessionLabel(session.sessionId),
      statusLabel: 'Migration ready',
    }
  }

  if (session.backendRegistration.status === 'unavailable') {
    return {
      detail:
        'This device is using a durable guest session. Notes remain local to this device, and the app could not reach backend registration right now. Future account migration is not prepared yet, but local ownership is unchanged.',
      heading: 'Guest mode on this device',
      sessionLabel: formatGuestSessionLabel(session.sessionId),
      statusLabel: 'Cloud prep unavailable',
    }
  }

  return {
    detail:
      session.backendRegistration.reason === 'missing_backend_config'
        ? 'This device is using a durable guest session. Notes stay local-first and are not backed up to the cloud yet. Backend sync is not configured in this build.'
        : 'This device is using a durable guest session. Notes stay local-first, but browser storage is too temporary to prepare future account migration safely.',
    heading: 'Guest mode on this device',
    sessionLabel: formatGuestSessionLabel(session.sessionId),
    statusLabel: 'Local only',
  }
}
