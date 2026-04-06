import { api } from '../../../convex/_generated/api'
import { getOptionalSharedConvexClient } from './convexClient'
import type { GuestSession } from './guestSession'

export type GuestSessionMigrationState =
  | 'local_only'
  | 'migration_pending'
  | 'migrated'

export type GuestSessionBackendRegistration =
  | {
      reason?: 'missing_backend_config' | 'volatile_session'
      status: 'local_only'
    }
  | {
      migrationState: GuestSessionMigrationState
      status: 'registered'
    }
  | {
      reason: 'request_failed' | 'request_timed_out'
      status: 'unavailable'
    }

export interface GuestSessionRegistrationClient {
  mutation: (
    mutationReference: typeof api.myFunctions.registerGuestSession,
    args: {
      createdAt: number
      sessionId: string
    },
  ) => Promise<{
    migrationState: GuestSessionMigrationState
  }>
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timeoutHandle = window.setTimeout(() => {
      reject(new Error('guest_registration_timeout'))
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

export function getOptionalConvexClient(): GuestSessionRegistrationClient | null {
  return getOptionalSharedConvexClient()
}

export async function registerGuestSessionWithBackend(
  session: GuestSession,
  client: GuestSessionRegistrationClient | null,
  timeoutMs = 4_000,
): Promise<GuestSessionBackendRegistration> {
  if (!client) {
    return {
      reason: 'missing_backend_config',
      status: 'local_only',
    }
  }

  if (session.persistence !== 'local_storage') {
    return {
      reason: 'volatile_session',
      status: 'local_only',
    }
  }

  try {
    const result = await withTimeout(
      client.mutation(api.myFunctions.registerGuestSession, {
        createdAt: session.createdAt,
        sessionId: session.sessionId,
      }),
      timeoutMs,
    )

    return {
      migrationState: result.migrationState,
      status: 'registered',
    }
  } catch (error) {
    return {
      reason:
        error instanceof Error &&
        error.message === 'guest_registration_timeout'
          ? 'request_timed_out'
          : 'request_failed',
      status: 'unavailable',
    }
  }
}
