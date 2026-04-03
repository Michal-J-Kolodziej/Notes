import { describe, expect, it, vi, beforeEach } from 'vitest'

const { publishEntryStoreMutation } = vi.hoisted(() => ({
  publishEntryStoreMutation: vi.fn(),
}))

vi.mock('~/features/entries/storeMutationEvents', () => ({
  publishEntryStoreMutation,
}))

import { createEntryRecord } from '~/features/entries/selectors'
import { createMemoryEntryStore } from '~/features/entries/localStore'

describe('local store cross-tab mutation publishing', () => {
  beforeEach(() => {
    publishEntryStoreMutation.mockReset()
  })

  it('does not publish for ordinary note saves', async () => {
    const store = createMemoryEntryStore()
    const entry = createEntryRecord({
      id: 'save-only',
      title: 'Save only',
    })

    await store.saveEntry(entry)
    await store.saveEntry({
      ...entry,
      title: 'Updated title',
      updatedAt: entry.updatedAt + 1000,
    })

    expect(publishEntryStoreMutation).not.toHaveBeenCalled()
  })

  it('publishes destructive delete, replace, and clear mutations only when they change local data', async () => {
    const store = createMemoryEntryStore()
    const entry = createEntryRecord({
      id: 'delete-me',
      title: 'Delete me',
    })

    await store.deleteEntry(entry.id)
    expect(publishEntryStoreMutation).not.toHaveBeenCalled()

    await store.saveEntry(entry)
    await store.deleteEntry(entry.id)
    expect(publishEntryStoreMutation).toHaveBeenNthCalledWith(1, {
      entryId: entry.id,
      kind: 'entry_deleted',
    })

    await store.clear()
    expect(publishEntryStoreMutation).toHaveBeenCalledTimes(1)

    await store.saveEntry(entry)
    await store.clear()
    expect(publishEntryStoreMutation).toHaveBeenNthCalledWith(2, {
      kind: 'store_cleared',
    })

    await store.replaceAll({
      audioFiles: [],
      entries: [entry],
    })
    expect(publishEntryStoreMutation).toHaveBeenNthCalledWith(3, {
      kind: 'store_replaced',
    })
  })
})
