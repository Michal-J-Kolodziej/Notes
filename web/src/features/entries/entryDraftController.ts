import type { EntryRecord } from './types'

export interface EntryDraftMutation {
  nextEntry: EntryRecord | null
  persisted: Promise<EntryRecord | null>
}

export interface EntryDraftPersistOptions {
  persistEntry?: (entry: EntryRecord) => Promise<EntryRecord>
}

export interface CreateEntryDraftControllerOptions {
  initialEntry: EntryRecord
  deleteEntry: (id: string) => Promise<void>
  saveEntry: (entry: EntryRecord) => Promise<EntryRecord>
}

function cloneEntry(entry: EntryRecord) {
  return structuredClone(entry)
}

export function createEntryDraftController({
  initialEntry,
  deleteEntry,
  saveEntry,
}: CreateEntryDraftControllerOptions) {
  let current: EntryRecord | null = cloneEntry(initialEntry)
  let queue = Promise.resolve<void>(undefined)

  const enqueue = <T>(operation: () => Promise<T>) => {
    const result = queue.then(operation)

    queue = result.then(
      () => undefined,
      () => undefined,
    )

    return result
  }

  return {
    discard() {
      if (!current) {
        return Promise.resolve()
      }

      const entryId = current.id
      current = null

      return enqueue(async () => {
        await deleteEntry(entryId)
      })
    },

    getCurrent() {
      return current ? cloneEntry(current) : null
    },

    flush() {
      return queue
    },

    update(
      updater: (entry: EntryRecord) => EntryRecord,
      options: EntryDraftPersistOptions = {},
    ): EntryDraftMutation {
      if (!current) {
        return {
          nextEntry: null,
          persisted: Promise.resolve(null),
        }
      }

      const nextEntry = cloneEntry(updater(cloneEntry(current)))
      const persistEntry = options.persistEntry ?? saveEntry
      current = nextEntry

      return {
        nextEntry: cloneEntry(nextEntry),
        persisted: enqueue(async () => cloneEntry(await persistEntry(nextEntry))),
      }
    },
  }
}
