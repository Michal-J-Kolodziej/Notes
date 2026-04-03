import { describe, expect, it } from 'vitest'
import { createEntryRecord, createMemoryEntryStore } from '~/features/entries'
import { createLocalEntriesExport } from '~/features/settings/exportLocalEntries'

describe('createLocalEntriesExport', () => {
  it('exports saved entries together with retained local audio', async () => {
    const store = createMemoryEntryStore()
    const textEntry = createEntryRecord({
      id: 'text-note',
      sourceType: 'text',
      status: 'saved_local',
      title: 'Morning note',
      transcript: 'Remember the quiet part.',
      updatedAt: 10,
    })
    const voiceEntry = createEntryRecord({
      id: 'voice-note',
      audioFileId: 'audio-1',
      hasAudio: true,
      sourceType: 'voice',
      status: 'saved_local',
      storageMode: 'transcript_plus_audio',
      title: 'Voice reflection',
      transcript: 'Spoken draft.',
      updatedAt: 20,
    })

    await store.saveEntry(textEntry)
    await store.saveEntryWithAudio(
      voiceEntry,
      new Blob(['voice-bytes'], { type: 'audio/webm' }),
    )

    const exported = await createLocalEntriesExport(store)

    expect(exported.schemaVersion).toBe(1)
    expect(exported.entries.map((entry) => entry.id)).toEqual([
      'voice-note',
      'text-note',
    ])
    expect(exported.retainedAudio).toEqual([
      {
        audioFileId: 'audio-1',
        base64: 'dm9pY2UtYnl0ZXM=',
        entryId: 'voice-note',
        mimeType: 'audio/webm',
        sizeBytes: 11,
      },
    ])
    expect(new Date(exported.exportedAt).toString()).not.toBe('Invalid Date')
  })

  it('skips transcript-only notes when building the retained audio export section', async () => {
    const store = createMemoryEntryStore()
    const entry = createEntryRecord({
      id: 'voice-transcript-only',
      audioFileId: null,
      hasAudio: false,
      sourceType: 'voice',
      status: 'saved_local',
      storageMode: 'transcript_only',
    })

    await store.saveEntry(entry)

    const exported = await createLocalEntriesExport(store)

    expect(exported.entries).toHaveLength(1)
    expect(exported.retainedAudio).toEqual([])
  })

  it('fails loudly when entry metadata says retained audio exists but the blob is missing', async () => {
    const store = createMemoryEntryStore()
    const entry = createEntryRecord({
      id: 'voice-missing-audio',
      audioFileId: 'audio-missing',
      hasAudio: true,
      sourceType: 'voice',
      status: 'saved_local',
      storageMode: 'transcript_plus_audio',
    })

    await store.saveEntry(entry)

    await expect(createLocalEntriesExport(store)).rejects.toThrow(
      /retained audio .*missing/i,
    )
  })
})
