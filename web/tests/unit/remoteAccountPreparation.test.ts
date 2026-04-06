import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  prepareAuthenticatedAccountWithBackend,
} from '../../src/lib/auth/remoteAccountPreparation'
import type {
  AccountPreparationClient,
  ExternalSignedInAccountState,
} from '../../src/lib/auth/remoteAccountPreparation'
import type { GuestSession } from '../../src/lib/auth/guestSession'

const durableGuestSession: GuestSession = {
  createdAt: 1712088000000,
  mode: 'guest',
  persistence: 'local_storage',
  sessionId: 'guest-session-123',
}

const signedInAccountState: ExternalSignedInAccountState = {
  authSubject: 'user_123',
  displayName: 'Mila Example',
  email: 'mila@example.com',
  getToken: vi.fn(() => Promise.resolve('clerk-token-123')),
  sessionClaims: { aud: 'convex' },
  status: 'signed_in',
}

describe('prepareAuthenticatedAccountWithBackend', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('fails closed when no Convex client is configured', async () => {
    const result = await prepareAuthenticatedAccountWithBackend(
      durableGuestSession,
      signedInAccountState,
      null,
    )

    expect(result).toEqual({
      reason: 'missing_backend_config',
      status: 'unavailable',
    })
  })

  it('configures Convex auth and ensures a backend user row for signed-in users', async () => {
    const mutation = vi.fn().mockResolvedValue({
      userId: 'users:1',
    }) as AccountPreparationClient['mutation']
    const setAuth = vi.fn()
    const client: AccountPreparationClient = {
      clearAuth: vi.fn(),
      mutation,
      setAuth: setAuth as AccountPreparationClient['setAuth'],
    }

    const result = await prepareAuthenticatedAccountWithBackend(
      durableGuestSession,
      signedInAccountState,
      client,
    )

    expect(setAuth).toHaveBeenCalledTimes(1)
    const fetchAccessToken = setAuth.mock.calls[0]?.[0]

    await expect(
      fetchAccessToken?.({ forceRefreshToken: false }),
    ).resolves.toBe('clerk-token-123')
    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      guestSessionId: durableGuestSession.sessionId,
    })
    expect(result).toEqual({
      status: 'ready',
      userId: 'users:1',
    })
  })

  it('requests the convex token template when the Clerk audience is not convex', async () => {
    const tokenGetter = vi.fn(() => Promise.resolve('templated-token'))
    const setAuth = vi.fn()
    const client: AccountPreparationClient = {
      clearAuth: vi.fn(),
      mutation: vi.fn().mockResolvedValue({
        userId: 'users:1',
      }),
      setAuth: setAuth as AccountPreparationClient['setAuth'],
    }

    await prepareAuthenticatedAccountWithBackend(
      durableGuestSession,
      {
        ...signedInAccountState,
        getToken: tokenGetter,
        sessionClaims: { aud: 'notes-app' },
      },
      client,
    )

    const fetchAccessToken = setAuth.mock.calls[0]?.[0]
    await fetchAccessToken?.({ forceRefreshToken: true })

    expect(tokenGetter).toHaveBeenCalledWith({
      skipCache: true,
      template: 'convex',
    })
  })

  it('fails closed when a Clerk token cannot be obtained', async () => {
    const client: AccountPreparationClient = {
      clearAuth: vi.fn(),
      mutation: vi.fn(),
      setAuth: vi.fn(),
    }

    const result = await prepareAuthenticatedAccountWithBackend(
      durableGuestSession,
      {
        ...signedInAccountState,
        getToken: vi.fn(() => Promise.resolve(null)),
      },
      client,
    )

    expect(client.mutation).not.toHaveBeenCalled()
    expect(client.clearAuth).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      reason: 'missing_token',
      status: 'unavailable',
    })
  })

  it('fails closed when backend account preparation times out', async () => {
    vi.useFakeTimers()
    const client: AccountPreparationClient = {
      clearAuth: vi.fn(),
      mutation: vi.fn().mockImplementation(
        () =>
          new Promise<{ userId: string }>(() => {
            // Intentionally unresolved to exercise timeout handling.
          }),
      ),
      setAuth: vi.fn(),
    }

    const preparationPromise = prepareAuthenticatedAccountWithBackend(
      durableGuestSession,
      signedInAccountState,
      client,
      1_000,
    )

    await vi.advanceTimersByTimeAsync(1_000)

    await expect(preparationPromise).resolves.toEqual({
      reason: 'request_timed_out',
      status: 'unavailable',
    })
    expect(client.clearAuth).toHaveBeenCalledTimes(1)
  })

  it('clears Convex auth when backend account preparation fails', async () => {
    const client: AccountPreparationClient = {
      clearAuth: vi.fn(),
      mutation: vi.fn(() => Promise.reject(new Error('backend_failed'))),
      setAuth: vi.fn(),
    }

    await expect(
      prepareAuthenticatedAccountWithBackend(
        durableGuestSession,
        signedInAccountState,
        client,
      ),
    ).resolves.toEqual({
      reason: 'request_failed',
      status: 'unavailable',
    })

    expect(client.clearAuth).toHaveBeenCalledTimes(1)
  })
})
