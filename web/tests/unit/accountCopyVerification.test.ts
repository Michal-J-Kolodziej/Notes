import { describe, expect, it, vi } from 'vitest'
import { api } from '../../convex/_generated/api'
import type { ReadyAccountSession } from '~/lib/auth'
import type { LocalDataSummary } from '~/features/settings/localDataSummary'
import {
  createAccountCopyVerification,
  getRemoteAccountCopyPreview,
  getRemoteAccountCopyStatus,
} from '~/features/settings/accountCopyVerification'

const accountCopyPreviewQuery = (api.myFunctions as {
  getAccountCopyPreview: unknown
}).getAccountCopyPreview

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

function createSummary(
  overrides: Partial<LocalDataSummary> = {},
): LocalDataSummary {
  return {
    accountOwnedCount: 2,
    draftCount: 0,
    entryCount: 2,
    guestOwnedCount: 0,
    latestUpdatedAt: 500,
    retainedAudioCount: 1,
    savedCount: 2,
    totalBytes: 2048,
    ...overrides,
  }
}

describe('createAccountCopyVerification', () => {
  it('marks the account copy as verified when remote counts match and the copy is current', () => {
    expect(
      createAccountCopyVerification({
        dataSummary: createSummary(),
        remoteStatus: {
          snapshot: {
            entryCount: 2,
            lastCopiedAt: 600,
            retainedAudioCount: 1,
          },
          status: 'ready',
        },
      }),
    ).toMatchObject({
      kind: 'verified',
      statusLabel: 'Verified',
    })
  })

  it('marks the account copy as stale when local changes are newer than the verified copy', () => {
    expect(
      createAccountCopyVerification({
        dataSummary: createSummary({
          latestUpdatedAt: 800,
        }),
        remoteStatus: {
          snapshot: {
            entryCount: 2,
            lastCopiedAt: 600,
            retainedAudioCount: 1,
          },
          status: 'ready',
        },
      }),
    ).toMatchObject({
      kind: 'stale',
      statusLabel: 'Needs upload',
    })
  })

  it('marks the account copy as recovery-ready when this device is empty but a copied snapshot exists', () => {
    expect(
      createAccountCopyVerification({
        dataSummary: createSummary({
          accountOwnedCount: 0,
          draftCount: 0,
          entryCount: 0,
          guestOwnedCount: 0,
          latestUpdatedAt: null,
          retainedAudioCount: 0,
          savedCount: 0,
          totalBytes: 0,
        }),
        remoteStatus: {
          snapshot: {
            entryCount: 2,
            lastCopiedAt: 600,
            retainedAudioCount: 1,
          },
          status: 'ready',
        },
      }),
    ).toMatchObject({
      kind: 'recoverable',
      statusLabel: 'Recovery ready',
    })
  })

  it('surfaces unavailable verification without implying live sync already exists', () => {
    expect(
      createAccountCopyVerification({
        dataSummary: createSummary(),
        remoteStatus: {
          reason: 'request_failed',
          status: 'unavailable',
        },
      }),
    ).toMatchObject({
      kind: 'unavailable',
      statusLabel: 'Unavailable',
    })
  })
})

describe('getRemoteAccountCopyStatus', () => {
  it('fails closed when the backend client is unavailable in this build', async () => {
    await expect(
      getRemoteAccountCopyStatus({
        client: null,
        session: readyAccountSession,
      }),
    ).resolves.toEqual({
      reason: 'missing_backend_config',
      status: 'unavailable',
    })
  })

  it('loads the current verified account copy snapshot for this device session', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({
        entryCount: 2,
        lastCopiedAt: 700,
        retainedAudioCount: 1,
      }),
    }

    await expect(
      getRemoteAccountCopyStatus({
        client,
        session: readyAccountSession,
      }),
    ).resolves.toEqual({
      snapshot: {
        entryCount: 2,
        lastCopiedAt: 700,
        latestEntryUpdatedAt: null,
        retainedAudioCount: 1,
      },
      status: 'ready',
    })

    expect(client.query).toHaveBeenCalledWith(
      api.myFunctions.getAccountCopyStatus,
      {
        guestSessionId: readyAccountSession.sessionId,
      },
    )
  })
})

describe('getRemoteAccountCopyPreview', () => {
  it('returns an empty preview when the backend client is unavailable', async () => {
    await expect(
      getRemoteAccountCopyPreview({
        client: null,
        session: readyAccountSession,
      }),
    ).resolves.toEqual([])
  })

  it('loads the latest copied note preview rows for this device session', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({
        entries: [
          {
            deviceLocalId: 'note-2',
            hasAudio: true,
            sourceType: 'voice',
            status: 'saved_remote',
            title: 'Voice reflection',
            updatedAt: 900,
          },
          {
            deviceLocalId: 'note-1',
            hasAudio: false,
            sourceType: 'text',
            status: 'saved_remote',
            title: 'Morning note',
            updatedAt: 700,
          },
        ],
      }),
    }

    await expect(
      getRemoteAccountCopyPreview({
        client,
        session: readyAccountSession,
      }),
    ).resolves.toEqual([
      {
        deviceLocalId: 'note-2',
        hasAudio: true,
        sourceType: 'voice',
        status: 'saved_remote',
        title: 'Voice reflection',
        updatedAt: 900,
      },
      {
        deviceLocalId: 'note-1',
        hasAudio: false,
        sourceType: 'text',
        status: 'saved_remote',
        title: 'Morning note',
        updatedAt: 700,
      },
    ])

    expect(client.query).toHaveBeenCalledWith(
      accountCopyPreviewQuery,
      {
        guestSessionId: readyAccountSession.sessionId,
      },
    )
  })
})
