import { describe, expect, it } from 'vitest'
import type { AppSession } from '~/lib/auth'
import { getNewEntryOwnershipForSession } from '~/lib/auth/entryOwnership'

describe('getNewEntryOwnershipForSession', () => {
  it('creates account-owned local entries for an account-ready session', () => {
    expect(
      getNewEntryOwnershipForSession({
        authSubject: 'user_123',
        backendRegistration: {
          migrationState: 'migrated',
          status: 'registered',
        },
        createdAt: 1,
        mode: 'account',
        persistence: 'local_storage',
        sessionId: 'guest-session-123',
        status: 'ready',
        userId: 'users:1',
      } as AppSession),
    ).toEqual({
      ownerMode: 'account_local',
      userId: 'users:1',
    })
  })

  it('keeps guest ownership when the account is still pending', () => {
    expect(
      getNewEntryOwnershipForSession({
        authSubject: 'user_123',
        backendRegistration: {
          reason: 'request_failed',
          status: 'unavailable',
        },
        createdAt: 1,
        mode: 'account_pending',
        persistence: 'local_storage',
        sessionId: 'guest-session-123',
        status: 'ready',
      } as AppSession),
    ).toEqual({
      ownerMode: 'guest_local',
    })
  })
})
