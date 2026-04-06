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

  it('restores the previous local snapshot when post-restore verification fails', async () => {
    const sourceStore = createMemoryEntryStore()
    const restoredVoiceEntry = createEntryRecord({
      id: 'restore-voice',
      audioFileId: 'restore-audio',
      hasAudio: true,
      sourceType: 'voice',
      status: 'saved_local',
      storageMode: 'transcript_plus_audio',
      title: 'Voice restore',
      transcript: 'Recovered from export',
    })

    await sourceStore.saveEntryWithAudio(
      restoredVoiceEntry,
      new Blob(['voice-restore-audio'], { type: 'audio/webm' }),
    )

    const payload = await createLocalEntriesExport(sourceStore)
    const targetStore = createMemoryEntryStore()
    const existingEntry = createEntryRecord({
      id: 'existing-note',
      audioFileId: 'existing-audio',
      hasAudio: true,
      sourceType: 'voice',
      status: 'saved_local',
      storageMode: 'transcript_plus_audio',
      title: 'Keep me safe',
      transcript: 'Existing transcript',
    })

    await targetStore.saveEntryWithAudio(
      existingEntry,
      new Blob(['existing-audio'], { type: 'audio/webm' }),
    )

    let breakRestoredAudioVerification = false
    const wrappedStore = {
      getEntryAudio(audioFileId: string) {
        if (breakRestoredAudioVerification && audioFileId === 'restore-audio') {
          return Promise.resolve(undefined)
        }

        return targetStore.getEntryAudio(audioFileId)
      },
      listEntries() {
        return targetStore.listEntries()
      },
      async replaceAll(snapshot: Parameters<typeof targetStore.replaceAll>[0]) {
        await targetStore.replaceAll(snapshot)
        breakRestoredAudioVerification = snapshot.entries.some(
          (entry) => entry.id === 'restore-voice',
        )
      },
    }

    await expect(
      restoreLocalEntriesFromJson(
        wrappedStore,
        JSON.stringify(payload),
      ),
    ).rejects.toThrow(/could not be verified/i)

    expect(await targetStore.listEntries()).toEqual([
      expect.objectContaining({
        id: 'existing-note',
        title: 'Keep me safe',
      }),
    ])
    await expect((await targetStore.getEntryAudio('existing-audio'))?.text()).resolves.toBe(
      'existing-audio',
    )
  })
})
