import { describe, expect, it, vi } from 'vitest'
import { createEntryRecord } from '~/features/entries'
import { createEntryDraftController } from '~/features/entries/entryDraftController'

describe('entry draft controller', () => {
  it('serializes overlapping updates against the latest local snapshot', async () => {
    const writes = new Array<ReturnType<typeof createEntryRecord>>()
    let releaseFirstWrite: (() => void) | undefined
    const firstWriteGate = new Promise<void>((resolve) => {
      releaseFirstWrite = resolve
    })
    let saveCalls = 0

    const controller = createEntryDraftController({
      initialEntry: createEntryRecord({
        id: 'draft-race',
      }),
      deleteEntry: vi.fn(async () => {}),
      saveEntry: vi.fn(async (entry) => {
        writes.push(structuredClone(entry))
        saveCalls += 1

        if (saveCalls === 1) {
          await firstWriteGate
        }

        return structuredClone(entry)
      }),
    })

    const titleUpdate = controller.update((current) => ({
      ...current,
      title: 'Morning check-in',
      updatedAt: current.updatedAt + 1,
    }))
    const transcriptUpdate = controller.update((current) => ({
      ...current,
      transcript: 'The last keystroke still wins.',
      updatedAt: current.updatedAt + 1,
    }))

    expect(controller.getCurrent()).toMatchObject({
      title: 'Morning check-in',
      transcript: 'The last keystroke still wins.',
    })

    releaseFirstWrite?.()
    await Promise.all([titleUpdate.persisted, transcriptUpdate.persisted])

    expect(writes).toHaveLength(2)
    expect(writes[0]).toMatchObject({
      title: 'Morning check-in',
      transcript: '',
    })
    expect(writes[1]).toMatchObject({
      title: 'Morning check-in',
      transcript: 'The last keystroke still wins.',
    })
  })

  it('deletes the draft after pending writes without resurrecting it', async () => {
    let releaseSave: (() => void) | undefined
    const saveGate = new Promise<void>((resolve) => {
      releaseSave = resolve
    })
    const deleteEntry = vi.fn(async () => {})

    const controller = createEntryDraftController({
      initialEntry: createEntryRecord({
        id: 'draft-delete',
      }),
      deleteEntry,
      saveEntry: vi.fn(async (entry) => {
        await saveGate
        return structuredClone(entry)
      }),
    })

    const pendingUpdate = controller.update((current) => ({
      ...current,
      status: 'recording',
      updatedAt: current.updatedAt + 1,
    }))
    const discardPromise = controller.discard()

    expect(controller.getCurrent()).toBeNull()

    releaseSave?.()
    await Promise.all([pendingUpdate.persisted, discardPromise])

    expect(deleteEntry).toHaveBeenCalledWith('draft-delete')
    expect(controller.getCurrent()).toBeNull()
  })

  it('preserves the latest content when save follows an in-flight edit', async () => {
    const writes = new Array<ReturnType<typeof createEntryRecord>>()
    let releaseFirstWrite: (() => void) | undefined
    const firstWriteGate = new Promise<void>((resolve) => {
      releaseFirstWrite = resolve
    })
    let saveCalls = 0

    const controller = createEntryDraftController({
      initialEntry: createEntryRecord({
        id: 'draft-save-race',
      }),
      deleteEntry: vi.fn(async () => {}),
      saveEntry: vi.fn(async (entry) => {
        writes.push(structuredClone(entry))
        saveCalls += 1

        if (saveCalls === 1) {
          await firstWriteGate
        }

        return structuredClone(entry)
      }),
    })

    const editMutation = controller.update((current) => ({
      ...current,
      transcript: 'Keep this text.',
      updatedAt: current.updatedAt + 1,
    }))
    const saveMutation = controller.update((current) => ({
      ...current,
      status: 'saved_local',
      updatedAt: current.updatedAt + 1,
    }))

    releaseFirstWrite?.()
    await Promise.all([editMutation.persisted, saveMutation.persisted])

    expect(writes.at(-1)).toMatchObject({
      status: 'saved_local',
      transcript: 'Keep this text.',
    })
  })

  it('serializes a custom persisted operation so discard cannot overtake audio attachment writes', async () => {
    const operationOrder: string[] = []
    let releaseAudioSave: (() => void) | undefined
    const audioSaveGate = new Promise<void>((resolve) => {
      releaseAudioSave = resolve
    })
    const deleteEntry = vi.fn(async () => {
      operationOrder.push('delete')
    })

    const controller = createEntryDraftController({
      initialEntry: createEntryRecord({
        id: 'draft-audio-race',
      }),
      deleteEntry,
      saveEntry: vi.fn(async (entry) => structuredClone(entry)),
    })

    const audioMutation = controller.update(
      (current) => ({
        ...current,
        audioFileId: 'audio-1',
        hasAudio: true,
        storageMode: 'transcript_plus_audio',
        updatedAt: current.updatedAt + 1,
      }),
      {
        persistEntry: async (entry) => {
          operationOrder.push('audio-save:start')
          await audioSaveGate
          operationOrder.push('audio-save:finish')
          return structuredClone(entry)
        },
      },
    )

    const discardPromise = controller.discard()

    releaseAudioSave?.()
    await Promise.all([audioMutation.persisted, discardPromise])

    expect(operationOrder).toEqual([
      'audio-save:start',
      'audio-save:finish',
      'delete',
    ])
    expect(deleteEntry).toHaveBeenCalledWith('draft-audio-race')
    expect(controller.getCurrent()).toBeNull()
  })

  it('flush waits for queued writes before later persistence work starts', async () => {
    const operationOrder: string[] = []
    let releaseSave: (() => void) | undefined
    const saveGate = new Promise<void>((resolve) => {
      releaseSave = resolve
    })

    const controller = createEntryDraftController({
      initialEntry: createEntryRecord({
        id: 'draft-flush',
      }),
      deleteEntry: vi.fn(async () => {}),
      saveEntry: vi.fn(async (entry) => {
        operationOrder.push('save:start')
        await saveGate
        operationOrder.push('save:finish')
        return structuredClone(entry)
      }),
    })

    const pendingUpdate = controller.update((current) => ({
      ...current,
      transcript: 'Persist me before delete-audio runs.',
      updatedAt: current.updatedAt + 1,
    }))

    const flushPromise = controller.flush().then(() => {
      operationOrder.push('flush:finish')
    })

    operationOrder.push('after-flush-call')
    releaseSave?.()
    await Promise.all([pendingUpdate.persisted, flushPromise])

    expect(operationOrder).toEqual([
      'after-flush-call',
      'save:start',
      'save:finish',
      'flush:finish',
    ])
  })
})
