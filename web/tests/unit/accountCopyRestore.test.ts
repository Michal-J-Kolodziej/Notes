import { describe, expect, it, vi } from 'vitest'
import type { ReadyAccountSession } from '~/lib/auth'
import { createEntryRecord, createMemoryEntryStore } from '~/features/entries'
import {
  restoreLocalEntriesFromAccountCopy,
} from '~/features/settings/accountCopyRestore'

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

describe('restoreLocalEntriesFromAccountCopy', () => {
  it('restores an empty device from the verified account snapshot for this device', async () => {
    const store = createMemoryEntryStore()

    const client = {
      query: vi.fn().mockResolvedValue({
        entries: [
          {
            createdAt: 100,
            deviceLocalId: 'voice-1',
            hasAudio: true,
            localAudioFileId: 'voice-audio-1',
            localEntryId: 'entry-voice-1',
            retainedAudio: {
              downloadUrl: 'https://files.example/voice-1',
              mimeType: 'audio/webm',
              sizeBytes: 11,
            },
            sourceType: 'voice',
            status: 'saved_local',
            storageMode: 'transcript_plus_audio',
            title: 'Voice reflection',
            transcript: 'Voice transcript',
            updatedAt: 150,
          },
          {
            createdAt: 110,
            deviceLocalId: 'text-1',
            hasAudio: false,
            localAudioFileId: null,
            localEntryId: 'entry-text-1',
            retainedAudio: null,
            sourceType: 'text',
            status: 'saved_local',
            storageMode: 'transcript_only',
            title: 'Morning note',
            transcript: 'Text transcript',
            updatedAt: 160,
          },
        ],
      }),
    }
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        arrayBuffer: () => Promise.resolve(new TextEncoder().encode('voice-bytes').buffer),
        ok: true,
      } as Response),
    )

    await expect(
      restoreLocalEntriesFromAccountCopy({
        client,
        fetchImpl,
        snapshotGuestSessionId: 'guest-session-other',
        session: readyAccountSession,
        store,
      }),
    ).resolves.toEqual({
      entryCount: 2,
      retainedAudioCount: 1,
    })

    expect(client.query).toHaveBeenCalledTimes(1)
    expect(client.query.mock.calls[0]?.[1]).toEqual({
      guestSessionId: 'guest-session-other',
    })
    expect(fetchImpl).toHaveBeenCalledWith('https://files.example/voice-1')

    const restoredEntries = await store.listEntries()
    expect(restoredEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          audioFileId: 'voice-audio-1',
          deviceLocalId: 'voice-1',
          hasAudio: true,
          id: 'entry-voice-1',
          ownerMode: 'account_local',
          title: 'Voice reflection',
          userId: readyAccountSession.userId,
        }),
        expect.objectContaining({
          audioFileId: null,
          deviceLocalId: 'text-1',
          hasAudio: false,
          id: 'entry-text-1',
          ownerMode: 'account_local',
          title: 'Morning note',
          userId: readyAccountSession.userId,
        }),
      ]),
    )
    await expect(store.getAudioFile('voice-audio-1')).resolves.toBeInstanceOf(
      Blob,
    )
  })

  it('fails closed when the device already has local notes', async () => {
    const store = createMemoryEntryStore()

    await store.saveEntry(
      createEntryRecord({
        id: 'local-safe-note',
        title: 'Keep local note',
      }),
    )

    const client = {
      query: vi.fn().mockResolvedValue({
        entries: [
          {
            createdAt: 100,
            deviceLocalId: 'voice-1',
            hasAudio: true,
            localAudioFileId: 'voice-audio-1',
            localEntryId: 'entry-voice-1',
            retainedAudio: {
              downloadUrl: 'https://files.example/voice-1',
              mimeType: 'audio/webm',
              sizeBytes: 11,
            },
            sourceType: 'voice',
            status: 'saved_local',
            storageMode: 'transcript_plus_audio',
            title: 'Voice reflection',
            transcript: 'Voice transcript',
            updatedAt: 150,
          },
        ],
      }),
    }
    const fetchImpl = vi.fn()

    await expect(
      restoreLocalEntriesFromAccountCopy({
        client,
        fetchImpl,
        session: readyAccountSession,
        store,
      }),
    ).rejects.toThrow(/local notes must be empty/i)

    expect(client.query).not.toHaveBeenCalled()
    expect(fetchImpl).not.toHaveBeenCalled()

    const currentEntries = await store.listEntries()
    expect(currentEntries).toEqual([
      expect.objectContaining({
        id: 'local-safe-note',
        title: 'Keep local note',
      }),
    ])
  })

  it('fails closed when retained audio from the verified account copy cannot be downloaded', async () => {
    const store = createMemoryEntryStore()
    const client = {
      query: vi.fn().mockResolvedValue({
        entries: [
          {
            createdAt: 100,
            deviceLocalId: 'voice-1',
            hasAudio: true,
            localAudioFileId: 'voice-audio-1',
            localEntryId: 'entry-voice-1',
            retainedAudio: {
              downloadUrl: 'https://files.example/voice-1',
              mimeType: 'audio/webm',
              sizeBytes: 11,
            },
            sourceType: 'voice',
            status: 'saved_local',
            storageMode: 'transcript_plus_audio',
            title: 'Voice reflection',
            transcript: 'Voice transcript',
            updatedAt: 150,
          },
        ],
      }),
    }
    const fetchImpl = vi.fn(() => Promise.resolve(new Response(null, { status: 404 })))

    await expect(
      restoreLocalEntriesFromAccountCopy({
        client,
        fetchImpl,
        session: readyAccountSession,
        store,
      }),
    ).rejects.toThrow(/retained audio could not be downloaded/i)

    const currentEntries = await store.listEntries()
    expect(currentEntries).toEqual([])
  })

  it('restores from a chosen account snapshot guest session when provided', async () => {
    const store = createMemoryEntryStore()
    const client = {
      query: vi.fn().mockResolvedValue({
        entries: [
          {
            createdAt: 100,
            deviceLocalId: 'text-1',
            hasAudio: false,
            localAudioFileId: null,
            localEntryId: 'entry-text-1',
            retainedAudio: null,
            sourceType: 'text',
            status: 'saved_local',
            storageMode: 'transcript_only',
            title: 'Remote snapshot note',
            transcript: 'Copied from another device session',
            updatedAt: 160,
          },
        ],
      }),
    }

    await expect(
      restoreLocalEntriesFromAccountCopy({
        client,
        session: readyAccountSession,
        snapshotGuestSessionId: 'guest-session-999',
        store,
      }),
    ).resolves.toEqual({
      entryCount: 1,
      retainedAudioCount: 0,
    })

    expect(client.query).toHaveBeenCalledTimes(1)
    expect(client.query.mock.calls[0]?.[1]).toEqual({
      guestSessionId: 'guest-session-999',
    })
  })
})
