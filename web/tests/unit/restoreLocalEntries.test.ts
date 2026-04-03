import { describe, expect, it } from 'vitest'
import {
  createEntryRecord,
  createMemoryEntryStore,
} from '~/features/entries'
import { createLocalEntriesExport } from '~/features/settings/exportLocalEntries'
import { restoreLocalEntriesFromJson } from '~/features/settings/restoreLocalEntries'

describe('restoreLocalEntriesFromJson', () => {
  it('replaces existing local notes with the validated recovery payload', async () => {
    const sourceStore = createMemoryEntryStore()
    const voiceEntry = createEntryRecord({
      id: 'restore-voice',
      audioFileId: 'restore-audio',
      hasAudio: true,
      sourceType: 'voice',
      status: 'saved_local',
      storageMode: 'transcript_plus_audio',
      title: 'Voice restore',
      transcript: 'Recovered from export',
    })
    const textEntry = createEntryRecord({
      id: 'restore-text',
      sourceType: 'text',
      status: 'draft_local',
      title: 'Text restore',
      transcript: 'Recovered draft',
    })

    await sourceStore.saveEntryWithAudio(
      voiceEntry,
      new Blob(['voice-restore-audio'], { type: 'audio/webm' }),
    )
    await sourceStore.saveEntry(textEntry)

    const payload = await createLocalEntriesExport(sourceStore)

    const targetStore = createMemoryEntryStore()
    await targetStore.saveEntry(
      createEntryRecord({
        id: 'existing-note',
        title: 'Should be replaced',
        transcript: 'Remove me',
      }),
    )

    const summary = await restoreLocalEntriesFromJson(
      targetStore,
      JSON.stringify(payload),
    )

    expect(summary).toEqual({
      entryCount: 2,
      retainedAudioCount: 1,
    })
    expect(await targetStore.listEntries()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'restore-voice', title: 'Voice restore' }),
        expect.objectContaining({ id: 'restore-text', title: 'Text restore' }),
      ]),
    )
    expect(await targetStore.getEntry('existing-note')).toBeUndefined()
    expect(await (await targetStore.getEntryAudio('restore-audio'))?.text()).toBe(
      'voice-restore-audio',
    )
  })

  it('rejects invalid retained audio metadata before local data is replaced', async () => {
    const targetStore = createMemoryEntryStore()
    const existingEntry = createEntryRecord({
      id: 'existing-note',
      title: 'Keep me safe',
      transcript: 'Existing transcript',
    })
    await targetStore.saveEntry(existingEntry)

    await expect(
      restoreLocalEntriesFromJson(
        targetStore,
        JSON.stringify({
          entries: [
            {
              ...createEntryRecord({
                id: 'broken-voice',
                audioFileId: 'missing-audio',
                hasAudio: true,
                sourceType: 'voice',
                storageMode: 'transcript_plus_audio',
              }),
            },
          ],
          exportedAt: new Date().toISOString(),
          retainedAudio: [],
          schemaVersion: 1,
        }),
      ),
    ).rejects.toThrow(/missing retained audio/i)

    expect(await targetStore.getEntry(existingEntry.id)).toEqual(existingEntry)
  })
})
