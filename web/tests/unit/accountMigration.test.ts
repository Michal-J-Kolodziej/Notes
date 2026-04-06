import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../convex/_generated/api'
import type { LocalDataSummary } from '~/features/settings/localDataSummary'
import type { ReadyAccountPendingSession, ReadyAccountSession } from '~/lib/auth'
import { createEntryRecord, createMemoryEntryStore } from '~/features/entries'
import {
  copyLocalEntriesToAccount,
  createAccountMigrationPlan,
  deleteRemoteAccountCopy,
} from '~/features/settings/accountMigration'

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

const pendingAccountSession: ReadyAccountPendingSession = {
  ...readyAccountSession,
  mode: 'account_pending',
  reason: 'request_failed',
}

function createSummary(
  overrides: Partial<LocalDataSummary> = {},
): LocalDataSummary {
  return {
    accountOwnedCount: 0,
    draftCount: 0,
    entryCount: 0,
    guestOwnedCount: 0,
    latestUpdatedAt: null,
    retainedAudioCount: 0,
    savedCount: 0,
    totalBytes: 0,
    ...overrides,
  }
}

describe('createAccountMigrationPlan', () => {
  it('blocks account copy when the account is not prepared', () => {
    expect(
      createAccountMigrationPlan({
        dataSummary: createSummary({
          entryCount: 2,
          guestOwnedCount: 2,
        }),
        session: pendingAccountSession,
      }),
    ).toMatchObject({
      actionLabel: 'Account prep unavailable',
      kind: 'blocked',
    })
  })

  it('shows an empty state when there is no local data to copy', () => {
    expect(
      createAccountMigrationPlan({
        dataSummary: createSummary(),
        session: readyAccountSession,
      }),
    ).toMatchObject({
      actionLabel: 'Nothing to copy',
      kind: 'empty',
    })
  })

  it('offers the first account copy when guest-owned notes are still local-only', () => {
    expect(
      createAccountMigrationPlan({
        dataSummary: createSummary({
          draftCount: 1,
          entryCount: 3,
          guestOwnedCount: 3,
          retainedAudioCount: 1,
          savedCount: 2,
        }),
        session: readyAccountSession,
      }),
    ).toMatchObject({
      actionLabel: 'Copy notes into account',
      kind: 'ready',
      statusLabel: 'Local-only notes',
    })
  })

  it('offers a manual refresh when account-owned notes already exist on this device', () => {
    expect(
      createAccountMigrationPlan({
        dataSummary: createSummary({
          accountOwnedCount: 2,
          entryCount: 2,
          retainedAudioCount: 1,
          savedCount: 2,
        }),
        session: readyAccountSession,
      }),
    ).toMatchObject({
      actionLabel: 'Update account copy',
      kind: 'ready',
      statusLabel: 'Manual account copy',
    })
  })
})

describe('copyLocalEntriesToAccount', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uploads retained audio and marks local notes as account-owned after a successful copy', async () => {
    const store = createMemoryEntryStore()
    const textEntry = createEntryRecord({
      createdAt: 100,
      deviceLocalId: 'saved-1',
      id: 'saved-1',
      status: 'saved_local',
      title: 'Saved note',
      transcript: 'Saved transcript',
      updatedAt: 200,
    })
    const voiceEntry = createEntryRecord({
      audioFileId: 'audio-1',
      createdAt: 150,
      deviceLocalId: 'voice-1',
      hasAudio: true,
      id: 'voice-1',
      sourceType: 'voice',
      status: 'saved_local',
      storageMode: 'transcript_plus_audio',
      title: 'Voice note',
      transcript: 'Voice transcript',
      updatedAt: 250,
    })

    await store.saveEntry(textEntry)
    await store.saveEntryWithAudio(
      voiceEntry,
      new Blob(['voice-bytes'], { type: 'audio/webm' }),
    )

    const client = {
      mutation: vi
        .fn()
        .mockResolvedValueOnce({ jobId: 'jobs:1' })
        .mockResolvedValueOnce('https://upload.example/audio-1')
        .mockResolvedValueOnce({
          entryCount: 2,
          retainedAudioCount: 1,
        }),
    }
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ storageId: 'storage:audio-1' }),
        ok: true,
      } satisfies Partial<Response> as Response),
    )

    vi.stubGlobal('fetch', fetchMock)

    const result = await copyLocalEntriesToAccount({
      client,
      session: readyAccountSession,
      store,
    })

    expect(result).toEqual({
      entryCount: 2,
      retainedAudioCount: 1,
    })
    expect(fetchMock).toHaveBeenCalledWith('https://upload.example/audio-1', {
      body: expect.any(Blob),
      method: 'POST',
    })
    expect(client.mutation).toHaveBeenCalledTimes(3)
    const lastMutationCall = client.mutation.mock.calls.at(-1)

    expect(lastMutationCall?.[1]).toMatchObject({
      guestSessionId: readyAccountSession.sessionId,
      jobId: 'jobs:1',
      uploadedAudioFiles: [
        {
          entryDeviceLocalId: 'voice-1',
          mimeType: 'audio/webm',
          sizeBytes: 11,
          storageId: 'storage:audio-1',
        },
      ],
    })
    expect(lastMutationCall?.[1]?.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          deviceLocalId: 'saved-1',
          ownerMode: 'account_local',
          userId: 'users:1',
        }),
        expect.objectContaining({
          deviceLocalId: 'voice-1',
          ownerMode: 'account_local',
          userId: 'users:1',
        }),
      ]),
    )

    const entries = await store.listEntries()
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'saved-1',
          ownerMode: 'account_local',
          userId: 'users:1',
        }),
        expect.objectContaining({
          id: 'voice-1',
          ownerMode: 'account_local',
          userId: 'users:1',
        }),
      ]),
    )
    expect(await store.getAudioFile('audio-1')).toBeInstanceOf(Blob)
  })

  it('fails closed when retained audio metadata points to a missing local blob', async () => {
    const store = createMemoryEntryStore()

    await store.saveEntry(
      createEntryRecord({
        audioFileId: 'missing-audio',
        createdAt: 100,
        deviceLocalId: 'voice-1',
        hasAudio: true,
        id: 'voice-1',
        ownerMode: 'guest_local',
        sourceType: 'voice',
        status: 'saved_local',
        storageMode: 'transcript_plus_audio',
        title: 'Broken note',
        transcript: 'Broken transcript',
        updatedAt: 200,
      }),
    )

    const client = {
      mutation: vi.fn(),
    }

    await expect(
      copyLocalEntriesToAccount({
        client,
        session: readyAccountSession,
        store,
      }),
    ).rejects.toThrow(/retained audio is missing/i)

    expect(client.mutation).not.toHaveBeenCalled()
  })
})

describe('deleteRemoteAccountCopy', () => {
  it('deletes the current device snapshot from the signed-in account', async () => {
    const client = {
      mutation: vi.fn().mockResolvedValue({
        entryCount: 2,
        retainedAudioCount: 1,
      }),
    }

    await expect(
      deleteRemoteAccountCopy({
        client,
        session: readyAccountSession,
      }),
    ).resolves.toEqual({
      entryCount: 2,
      retainedAudioCount: 1,
    })

    expect(client.mutation).toHaveBeenCalledWith(
      api.myFunctions.deleteAccountCopy,
      {
        guestSessionId: readyAccountSession.sessionId,
      },
    )
  })
})
