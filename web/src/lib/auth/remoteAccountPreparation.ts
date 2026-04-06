import { api } from '../../../convex/_generated/api'
import { getOptionalClerkClientConfig } from './clerkConfig'
import { getOptionalSharedConvexClient } from './convexClient'
import type { AuthTokenFetcher } from 'convex/browser'
import type { GuestSession } from './guestSession'

export interface ExternalSignedInAccountState {
  authSubject: string
  displayName?: string
  email?: string
  getToken: (options: {
    skipCache?: boolean
    template?: 'convex'
  }) => Promise<string | null>
  sessionClaims?: Record<string, unknown> | null
  status: 'signed_in'
}

export type AccountPreparationFailureReason =
  | 'missing_backend_config'
  | 'missing_token'
  | 'request_failed'
  | 'request_timed_out'

export type AccountPreparationResult =
  | {
      status: 'ready'
      userId: string
    }
  | {
      reason: AccountPreparationFailureReason
      status: 'unavailable'
    }

export interface AccountPreparationClient {
  clearAuth: () => void
  mutation: (
    mutationReference: typeof api.myFunctions.ensureViewerUser,
    args: {
      guestSessionId?: string
    },
  ) => Promise<{
    userId: string
  }>
  query?: (...args: Array<any>) => Promise<any>
  setAuth: (fetchToken: AuthTokenFetcher) => void
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timeoutHandle = window.setTimeout(() => {
      reject(new Error('account_preparation_timeout'))
    }, timeoutMs)

    promise.then(
      (value) => {
        window.clearTimeout(timeoutHandle)
        resolve(value)
      },
      (error: unknown) => {
        window.clearTimeout(timeoutHandle)
        reject(error)
      },
    )
  })
}

export function createClerkConvexTokenFetcher(
  accountState: ExternalSignedInAccountState,
) {
  const fetchAccessToken: AuthTokenFetcher = async ({
    forceRefreshToken,
  }) => {
    try {
      if (accountState.sessionClaims?.aud === 'convex') {
        return await accountState.getToken({
          skipCache: forceRefreshToken,
        })
      }

      return await accountState.getToken({
        skipCache: forceRefreshToken,
        template: 'convex',
      })
    } catch {
      return null
    }
  }

  return fetchAccessToken
}

export function getOptionalAccountPreparationClient() {
  if (!getOptionalClerkClientConfig().accountPreparationEnabled) {
    return null
  }

  return getOptionalSharedConvexClient() as AccountPreparationClient | null
}

export async function prepareAuthenticatedAccountWithBackend(
  guestSession: GuestSession,
  accountState: ExternalSignedInAccountState,
  client: AccountPreparationClient | null,
  timeoutMs = 4_000,
): Promise<AccountPreparationResult> {
  if (!client) {
    return {
      reason: 'missing_backend_config',
      status: 'unavailable',
    }
  }

  const fetchAccessToken = createClerkConvexTokenFetcher(accountState)
  client.setAuth(fetchAccessToken)

  const token = await fetchAccessToken({
    forceRefreshToken: false,
  })

  if (!token) {
    client.clearAuth()

    return {
      reason: 'missing_token',
      status: 'unavailable',
    }
  }

  try {
    const result = await withTimeout(
      client.mutation(api.myFunctions.ensureViewerUser, {
        guestSessionId: guestSession.sessionId,
      }),
      timeoutMs,
    )

    return {
      status: 'ready',
      userId: result.userId,
    }
  } catch (error) {
    client.clearAuth()

    return {
      reason:
        error instanceof Error &&
        error.message === 'account_preparation_timeout'
          ? 'request_timed_out'
          : 'request_failed',
      status: 'unavailable',
    }
  }
}
