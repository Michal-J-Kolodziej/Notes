import { describe, expect, it, vi } from 'vitest'
import {
  createEntryRecord,
  createLocalEntryStore,
} from '~/features/entries'
import * as indexedDbModule from '~/lib/platform/indexedDb'

describe('local entry store', () => {
  it('creates, updates, and recovers an entry', async () => {
    const databaseName = 'notes-test-create-update-recover'
    const store = await createLocalEntryStore({ databaseName })
    const entry = createEntryRecord({
      id: 'entry-1',
      title: 'First note',
      transcript: 'hello',
    })

    await store.saveEntry(entry)

    expect(await store.getEntry('entry-1')).toEqual(entry)

    const updated = {
      ...entry,
      title: 'Updated note',
      transcript: 'hello again',
      updatedAt: entry.updatedAt + 1000,
    }

    await store.saveEntry(updated)

    expect(await store.getEntry('entry-1')).toEqual(updated)

    const reopenedStore = await createLocalEntryStore({ databaseName })

    expect(await reopenedStore.getEntry('entry-1')).toEqual(updated)
    expect(await reopenedStore.listEntries()).toEqual([updated])
  })

  it('deletes an entry', async () => {
    const store = await createLocalEntryStore({
      databaseName: 'notes-test-delete',
    })
    const entry = createEntryRecord({
      id: 'entry-delete',
      title: 'Delete me',
      transcript: 'temporary',
    })

    await store.saveEntry(entry)
    await store.deleteEntry(entry.id)

    expect(await store.getEntry(entry.id)).toBeUndefined()
    expect(await store.listEntries()).toEqual([])
  })

  it('throws when indexeddb is unavailable so the app never pretends drafts are durable', async () => {
    const indexedDb = globalThis.indexedDB
    // @ts-expect-error test fallback path
    delete globalThis.indexedDB

    try {
      await expect(
        createLocalEntryStore({
          databaseName: 'notes-test-fallback',
        }),
      ).rejects.toThrow(/durable/i)
    } finally {
      globalThis.indexedDB = indexedDb
    }
  })

  it('throws when indexeddb open fails so the provider can show a real storage error', async () => {
    const openEntryDatabaseSpy = vi
      .spyOn(indexedDbModule, 'openEntryDatabase')
      .mockRejectedValueOnce(new Error('Blocked by the browser'))

    await expect(
      createLocalEntryStore({
        databaseName: 'notes-test-fallback',
      }),
    ).rejects.toThrow(/blocked by the browser/i)

    openEntryDatabaseSpy.mockRestore()
  })

  it('persists retained audio across reopen and removes it when the entry is deleted', async () => {
    const databaseName = 'notes-test-audio-retention'
    const store = await createLocalEntryStore({ databaseName })
    const audioBlob = new Blob(['voice-note'], { type: 'audio/webm' })
    const entry = createEntryRecord({
      id: 'entry-audio',
      audioFileId: 'audio-1',
      hasAudio: true,
      sourceType: 'voice',
      storageMode: 'transcript_plus_audio',
    })

    const saved = await store.saveEntryWithAudio(entry, audioBlob)

    const reopenedStore = await createLocalEntryStore({ databaseName })
    const reopenedAudio = await reopenedStore.getEntryAudio(saved.audioFileId!)

    expect(reopenedAudio).toBeInstanceOf(Blob)
    expect(await reopenedAudio?.text()).toBe('voice-note')

    await reopenedStore.deleteEntry(saved.id)

    expect(await reopenedStore.getEntry(saved.id)).toBeUndefined()
    expect(await reopenedStore.getEntryAudio(saved.audioFileId!)).toBeUndefined()
  })

  it('cleans up replaced retained audio when a voice note is re-recorded', async () => {
    const databaseName = 'notes-test-audio-replace'
    const store = await createLocalEntryStore({ databaseName })
    const initialEntry = createEntryRecord({
      id: 'entry-audio-replace',
      audioFileId: 'audio-old',
      hasAudio: true,
      sourceType: 'voice',
      storageMode: 'transcript_plus_audio',
    })

    const saved = await store.saveEntryWithAudio(
      initialEntry,
      new Blob(['old-audio'], { type: 'audio/webm' }),
    )

    const updated = await store.saveEntryWithAudio(
      {
        ...saved,
        audioFileId: 'audio-new',
        updatedAt: saved.updatedAt + 1000,
      },
      new Blob(['new-audio'], { type: 'audio/webm' }),
    )

    expect(await store.getEntryAudio('audio-old')).toBeUndefined()
    expect(await (await store.getEntryAudio('audio-new'))?.text()).toBe('new-audio')
    expect(await store.getEntry(updated.id)).toEqual(updated)
  })

  it('cleans up retained audio when an entry switches to transcript only', async () => {
    const databaseName = 'notes-test-audio-transcript-only'
    const store = await createLocalEntryStore({ databaseName })
    const entry = createEntryRecord({
      id: 'entry-audio-switch',
      audioFileId: 'audio-new',
      hasAudio: true,
      sourceType: 'voice',
      storageMode: 'transcript_plus_audio',
    })

    await store.saveEntryWithAudio(
      entry,
      new Blob(['keep-me'], { type: 'audio/webm' }),
    )

    const updated = {
      ...entry,
      audioFileId: null,
      hasAudio: false,
      storageMode: 'transcript_only' as const,
      updatedAt: entry.updatedAt + 1000,
    }

    await store.saveEntry(updated)

    expect(await store.getEntryAudio('audio-new')).toBeUndefined()
    expect(await store.getEntry(entry.id)).toEqual(updated)
  })

  it('cleans up stale retained audio by file id even when stored metadata drifted out of retained mode', async () => {
    const databaseName = 'notes-test-audio-metadata-drift'
    const database = await indexedDbModule.openEntryDatabase(databaseName)
    const driftedEntry = createEntryRecord({
      id: 'entry-audio-drift',
      audioFileId: 'audio-drifted',
      hasAudio: false,
      sourceType: 'voice',
      storageMode: 'transcript_only',
      transcript: 'Recovered transcript',
    })

    await database.put(indexedDbModule.ENTRY_STORE_NAME, driftedEntry)
    await database.put(indexedDbModule.ENTRY_AUDIO_STORE_NAME, {
      data: await new Blob(['orphaned-audio'], { type: 'audio/webm' }).arrayBuffer(),
      id: 'audio-drifted',
      type: 'audio/webm',
    })
    database.close()

    const store = await createLocalEntryStore({ databaseName })

    await store.saveEntry({
      ...driftedEntry,
      audioFileId: null,
      title: 'Transcript only now',
      updatedAt: driftedEntry.updatedAt + 1000,
    })

    expect(await store.getEntryAudio('audio-drifted')).toBeUndefined()
    expect(await store.getEntry(driftedEntry.id)).toEqual({
      ...driftedEntry,
      audioFileId: null,
      title: 'Transcript only now',
      updatedAt: driftedEntry.updatedAt + 1000,
    })
  })

  it('replaces all stored entries and retained audio in one restore operation', async () => {
    const databaseName = 'notes-test-replace-all'
    const store = await createLocalEntryStore({ databaseName })
    await store.saveEntry(
      createEntryRecord({
        id: 'old-entry',
        title: 'Old note',
        transcript: 'Should disappear',
      }),
    )

    await store.replaceAll({
      audioFiles: [
        {
          blob: new Blob(['restored-audio'], { type: 'audio/webm' }),
          id: 'restored-audio-id',
        },
      ],
      entries: [
        createEntryRecord({
          id: 'restored-entry',
          audioFileId: 'restored-audio-id',
          hasAudio: true,
          sourceType: 'voice',
          status: 'saved_local',
          storageMode: 'transcript_plus_audio',
          title: 'Restored note',
          transcript: 'Recovered transcript',
        }),
      ],
    })

    const reopenedStore = await createLocalEntryStore({ databaseName })

    expect(await reopenedStore.getEntry('old-entry')).toBeUndefined()
    expect(await reopenedStore.getEntry('restored-entry')).toEqual(
      expect.objectContaining({
        id: 'restored-entry',
        title: 'Restored note',
      }),
    )
    expect(await (await reopenedStore.getEntryAudio('restored-audio-id'))?.text()).toBe(
      'restored-audio',
    )
  })
})
