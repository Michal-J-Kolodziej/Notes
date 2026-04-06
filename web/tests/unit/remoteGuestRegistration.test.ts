import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../convex/_generated/api'
import {
  
  registerGuestSessionWithBackend
} from '../../src/lib/auth/remoteGuestRegistration'
import type {GuestSessionRegistrationClient} from '../../src/lib/auth/remoteGuestRegistration';
import type { GuestSession } from '../../src/lib/auth/guestSession'

const durableGuestSession: GuestSession = {
  createdAt: 1712088000000,
  mode: 'guest',
  persistence: 'local_storage',
  sessionId: 'guest-session-123',
}

describe('registerGuestSessionWithBackend', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps local-only sessions local when no Convex client is configured', async () => {
    const result = await registerGuestSessionWithBackend(durableGuestSession, null)

    expect(result).toEqual({
      reason: 'missing_backend_config',
      status: 'local_only',
    })
  })

  it('does not register temporary in-memory sessions with the backend', async () => {
    const mutation: GuestSessionRegistrationClient['mutation'] = vi.fn()

    const result = await registerGuestSessionWithBackend(
      {
        ...durableGuestSession,
        persistence: 'memory',
      },
      { mutation },
    )

    expect(mutation).not.toHaveBeenCalled()
    expect(result).toEqual({
      reason: 'volatile_session',
      status: 'local_only',
    })
  })

  it('registers durable guest sessions when Convex is available', async () => {
    const mutation: GuestSessionRegistrationClient['mutation'] = vi
      .fn()
      .mockResolvedValue({
      migrationState: 'local_only',
      })

    const result = await registerGuestSessionWithBackend(durableGuestSession, {
      mutation,
    })

    expect(mutation).toHaveBeenCalledWith(api.myFunctions.registerGuestSession, {
      createdAt: durableGuestSession.createdAt,
      sessionId: durableGuestSession.sessionId,
    })
    expect(result).toEqual({
      migrationState: 'local_only',
      status: 'registered',
    })
  })

  it('surfaces backend registration failure without changing local ownership', async () => {
    const mutation: GuestSessionRegistrationClient['mutation'] = vi
      .fn()
      .mockRejectedValue(new Error('backend unavailable'))

    const result = await registerGuestSessionWithBackend(durableGuestSession, {
      mutation,
    })

    expect(result).toEqual({
      reason: 'request_failed',
      status: 'unavailable',
    })
  })

  it('fails closed when backend registration times out', async () => {
    vi.useFakeTimers()
    const mutation = vi.fn().mockImplementation(
      () =>
        new Promise<{ migrationState: 'local_only' | 'migration_pending' | 'migrated' }>(
          () => {
            // Intentionally unresolved to exercise the timeout path.
          },
        ),
    ) as GuestSessionRegistrationClient['mutation']

    const registrationPromise = registerGuestSessionWithBackend(
      durableGuestSession,
      { mutation },
      1_000,
    )

    await vi.advanceTimersByTimeAsync(1_000)

    await expect(registrationPromise).resolves.toEqual({
      reason: 'request_timed_out',
      status: 'unavailable',
    })
  })
})
