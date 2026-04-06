import { describe, expect, it, vi } from 'vitest'
import { api } from '../../convex/_generated/api'
import type { ReadyAccountSession } from '~/lib/auth'
import { getRemoteAccountSnapshots } from '~/features/settings/accountSnapshots'

const accountSnapshotsQuery = (api.myFunctions as {
  listAccountCopySnapshots: unknown
}).listAccountCopySnapshots

const readyAccountSession: ReadyAccountSession = {
  authSubject: 'user_123',
  backendRegistration: {
    migrationState: 'local_only',
    status: 'registered',
  },
  createdAt: 1712088000000,
  displayName: 'Mila Example',
  email: 'mila@example.com',
  mode: 'account',
  persistence: 'local_storage',
  sessionId: 'guest-session-123',
  status: 'ready',
  userId: 'users:1',
}

describe('getRemoteAccountSnapshots', () => {
  it('returns remote account snapshots sorted by latest copy time', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({
        snapshots: [
          {
            entryCount: 1,
            guestSessionId: 'older-session',
            isRestorable: true,
            lastCopiedAt: 100,
            previewTitles: ['Earlier note'],
            retainedAudioCount: 0,
          },
          {
            entryCount: 3,
            guestSessionId: 'newer-session',
            isRestorable: true,
            lastCopiedAt: 300,
            previewTitles: ['Voice reflection', 'Travel note'],
            retainedAudioCount: 1,
          },
        ],
      }),
    }

    await expect(
      getRemoteAccountSnapshots({
        client,
        session: readyAccountSession,
      }),
    ).resolves.toEqual([
      {
        entryCount: 3,
        guestSessionId: 'newer-session',
        isRestorable: true,
        lastCopiedAt: 300,
        previewTitles: ['Voice reflection', 'Travel note'],
        retainedAudioCount: 1,
      },
      {
        entryCount: 1,
        guestSessionId: 'older-session',
        isRestorable: true,
        lastCopiedAt: 100,
        previewTitles: ['Earlier note'],
        retainedAudioCount: 0,
      },
    ])

    expect(client.query).toHaveBeenCalledWith(accountSnapshotsQuery, {})
  })

  it('fails closed when the backend client is unavailable in this build', async () => {
    await expect(
      getRemoteAccountSnapshots({
        client: null,
        session: readyAccountSession,
      }),
    ).resolves.toEqual([])
  })
})
