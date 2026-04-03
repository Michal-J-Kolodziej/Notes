import { describe, expect, it, vi } from 'vitest'
import { createEntryRecord } from '~/features/entries'
import { createEntryDraftController } from '~/features/entries/entryDraftController'
import { removeStoredAudioFromCurrentEntry } from '~/features/entries/removeStoredAudio'

describe('removeStoredAudioFromCurrentEntry', () => {
  it('waits for queued edits before persisting transcript-only storage', async () => {
    const controllerWrites: Array<ReturnType<typeof createEntryRecord>> = []
    let releaseFirstWrite: (() => void) | undefined
    const firstWriteGate = new Promise<void>((resolve) => {
      releaseFirstWrite = resolve
    })
    let saveCalls = 0

    const controller = createEntryDraftController({
      initialEntry: createEntryRecord({
        audioFileId: 'audio-1',
        hasAudio: true,
        id: 'note-audio-delete',
        sourceType: 'voice',
        status: 'saved_local',
        storageMode: 'transcript_plus_audio',
      }),
      deleteEntry: vi.fn(async () => {}),
      saveEntry: vi.fn(async (entry) => {
        controllerWrites.push(structuredClone(entry))
        saveCalls += 1

        if (saveCalls === 1) {
          await firstWriteGate
        }

        return structuredClone(entry)
      }),
    })

    const pendingEdit = controller.update((current) => ({
      ...current,
      title: 'Edited before delete',
      transcript: 'Keep this edit.',
      updatedAt: current.updatedAt + 1,
    }))

    const store = {
      saveEntry: vi.fn(async (entry) => structuredClone(entry)),
    }

    const removalPromise = removeStoredAudioFromCurrentEntry({
      controller,
      now: () => 123_456,
      store,
    })

    releaseFirstWrite?.()
    const savedEntry = await removalPromise
    await pendingEdit.persisted

    expect(controllerWrites).toHaveLength(1)
    expect(store.saveEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        audioFileId: null,
        hasAudio: false,
        storageMode: 'transcript_only',
        title: 'Edited before delete',
        transcript: 'Keep this edit.',
        updatedAt: 123_456,
      }),
    )
    expect(savedEntry).toMatchObject({
      audioFileId: null,
      hasAudio: false,
      storageMode: 'transcript_only',
      title: 'Edited before delete',
      transcript: 'Keep this edit.',
      updatedAt: 123_456,
    })
  })

  it('preserves the retained-audio state when the transcript-only save fails', async () => {
    const initialEntry = createEntryRecord({
      audioFileId: 'audio-2',
      hasAudio: true,
      id: 'note-audio-failure',
      sourceType: 'voice',
      status: 'saved_local',
      storageMode: 'transcript_plus_audio',
    })
    const controller = createEntryDraftController({
      initialEntry,
      deleteEntry: vi.fn(async () => {}),
      saveEntry: vi.fn(async (entry) => structuredClone(entry)),
    })

    await expect(
      removeStoredAudioFromCurrentEntry({
        controller,
        store: {
          saveEntry: vi.fn(async () => {
            throw new Error('IndexedDB write failed')
          }),
        },
      }),
    ).rejects.toThrow(/indexeddb write failed/i)

    expect(controller.getCurrent()).toMatchObject({
      audioFileId: 'audio-2',
      hasAudio: true,
      storageMode: 'transcript_plus_audio',
    })
  })
})
