import { describe, expect, it, vi } from 'vitest'
import type { ReadyAccountSession } from '~/lib/auth'
import { getRemoteAccountCopySnapshots } from '~/features/settings/accountCopySnapshots'

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

describe('getRemoteAccountCopySnapshots', () => {
  it('returns restorable account snapshots with provenance for the current and other device sessions', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({
        snapshots: [
          {
            entryCount: 3,
            guestSessionId: 'guest-session-other',
            isRestorable: true,
            lastCopiedAt: 700,
            previewTitles: ['Travel note', 'Voice reflection'],
            retainedAudioCount: 1,
          },
          {
            entryCount: 2,
            guestSessionId: readyAccountSession.sessionId,
            isRestorable: true,
            lastCopiedAt: 600,
            previewTitles: ['Morning note'],
            retainedAudioCount: 0,
          },
        ],
      }),
    }

    await expect(
      getRemoteAccountCopySnapshots({
        client,
        session: readyAccountSession,
      }),
    ).resolves.toEqual([
      {
        entryCount: 3,
        guestSessionId: 'guest-session-other',
        isCurrentSession: false,
        isRestorable: true,
        lastCopiedAt: 700,
        previewTitles: ['Travel note', 'Voice reflection'],
        retainedAudioCount: 1,
        sessionLabel: 'GUEST-SE',
      },
      {
        entryCount: 2,
        guestSessionId: readyAccountSession.sessionId,
        isCurrentSession: true,
        isRestorable: true,
        lastCopiedAt: 600,
        previewTitles: ['Morning note'],
        retainedAudioCount: 0,
        sessionLabel: 'GUEST-SE',
      },
    ])
  })

  it('fails closed to an empty list when the backend snapshot query is unavailable', async () => {
    await expect(
      getRemoteAccountCopySnapshots({
        client: null,
        session: readyAccountSession,
      }),
    ).resolves.toEqual([])
  })
})
