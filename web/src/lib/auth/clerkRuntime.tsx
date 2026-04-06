import {
  ClerkProvider,
  SignInButton,
  UserButton,
  useAuth,
  useUser,
} from '@clerk/tanstack-react-start'
import {
  getOptionalClerkClientConfig,
} from './clerkConfig'
import { AppSessionProvider } from './sessionContext'
import type { ReactNode } from 'react'
import type { OptionalClerkClientConfig } from './clerkConfig'
import type { ExternalAccountState } from './sessionContext'

export { getOptionalClerkClientConfig, getOptionalClerkServerConfig } from './clerkConfig'

export function OptionalClerkProvider({
  children,
  config = getOptionalClerkClientConfig(),
}: {
  children: ReactNode
  config?: OptionalClerkClientConfig
}) {
  if (!config.enabled || !config.publishableKey) {
    return <>{children}</>
  }

  return (
    <ClerkProvider publishableKey={config.publishableKey}>
      {children}
    </ClerkProvider>
  )
}

function useExternalAccountState(): ExternalAccountState {
  const auth = useAuth()
  const userState = useUser()

  if (!auth.isLoaded || !userState.isLoaded) {
    return { status: 'loading' }
  }

  if (!auth.isSignedIn || !userState.user) {
    return { status: 'signed_out' }
  }

  return {
    authSubject: auth.userId,
    displayName:
      userState.user.fullName ??
      userState.user.firstName ??
      undefined,
    email: userState.user.primaryEmailAddress?.emailAddress ?? undefined,
    getToken: auth.getToken,
    sessionClaims: auth.sessionClaims,
    status: 'signed_in',
  }
}

function EnabledClerkAppSessionProvider({
  children,
}: {
  children: ReactNode
}) {
  const externalAccountState = useExternalAccountState()

  return (
    <AppSessionProvider externalAccountState={externalAccountState}>
      {children}
    </AppSessionProvider>
  )
}

export function AppSessionRootProvider({
  children,
  config = getOptionalClerkClientConfig(),
}: {
  children: ReactNode
  config?: OptionalClerkClientConfig
}) {
  if (!config.enabled) {
    return <AppSessionProvider>{children}</AppSessionProvider>
  }

  return <EnabledClerkAppSessionProvider>{children}</EnabledClerkAppSessionProvider>
}

function EnabledSettingsAccountControls({
  config,
  fallbackRedirectUrl,
}: {
  config: OptionalClerkClientConfig
  fallbackRedirectUrl: string
}) {
  const auth = useAuth()
  const userState = useUser()

  if (!auth.isLoaded || !userState.isLoaded) {
    return (
      <p className="text-sm leading-6 text-[var(--muted)]">
        Checking account setup for this device.
      </p>
    )
  }

  if (!auth.isSignedIn || !userState.user) {
    if (!config.accountPreparationEnabled) {
      return (
        <p className="text-sm leading-6 text-[var(--muted)]">
          Account copy is not configured in this build yet. Local notes still stay
          on this device until migration support is fully enabled.
        </p>
      )
    }

    return (
      <div className="grid gap-3">
        <p className="text-sm leading-6 text-[var(--muted)]">
          Sign in to prepare account migration later. Notes still stay on this
          device until migration is explicitly confirmed.
        </p>
        <SignInButton fallbackRedirectUrl={fallbackRedirectUrl}>
          <button
            className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(230,113,96,0.22)]"
            type="button"
          >
            Sign in to prepare account
          </button>
        </SignInButton>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm leading-6 text-[var(--muted)]">
        Signed in as{' '}
        <span className="font-semibold text-[var(--ink)]">
          {userState.user.fullName ??
            userState.user.primaryEmailAddress?.emailAddress ??
            'this account'}
        </span>
        . Notes still stay on this device until migration is explicitly
        completed.
      </p>
      <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-[rgba(58,34,29,0.12)] bg-white px-4 py-3">
        <span className="text-sm font-semibold text-[var(--ink)]">
          Manage account
        </span>
        <UserButton />
      </div>
    </div>
  )
}

export function OptionalSettingsAccountControls({
  config = getOptionalClerkClientConfig(),
  fallbackRedirectUrl = '/settings',
}: {
  config?: OptionalClerkClientConfig
  fallbackRedirectUrl?: string
}) {
  if (!config.enabled) {
    return null
  }

  return (
    <EnabledSettingsAccountControls
      config={config}
      fallbackRedirectUrl={fallbackRedirectUrl}
    />
  )
}
