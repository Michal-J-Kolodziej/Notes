import { deleteDB, openDB } from 'idb'
import type { EntryRecord } from '~/features/entries'

export const ENTRY_DATABASE_NAME = 'notes-local-entries'
export const ENTRY_DATABASE_VERSION = 3
export const ENTRY_STORE_NAME = 'entries'
export const ENTRY_AUDIO_STORE_NAME = 'entryAudio'

export interface StoredAudioFileRecord {
  data: ArrayBuffer
  id: string
  type: string
}

interface EntryDbSchema {
  [ENTRY_STORE_NAME]: {
    key: string
    value: EntryRecord
  }
  [ENTRY_AUDIO_STORE_NAME]: {
    key: string
    value: StoredAudioFileRecord
  }
}

export function hasIndexedDbSupport() {
  return typeof indexedDB !== 'undefined'
}

export async function openEntryDatabase(databaseName: string) {
  if (!hasIndexedDbSupport()) {
    throw new Error('IndexedDB is not available')
  }

  return openDB<EntryDbSchema>(databaseName, ENTRY_DATABASE_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(ENTRY_STORE_NAME)) {
        database.createObjectStore(ENTRY_STORE_NAME, { keyPath: 'id' })
      }

      if (!database.objectStoreNames.contains(ENTRY_AUDIO_STORE_NAME)) {
        database.createObjectStore(ENTRY_AUDIO_STORE_NAME, { keyPath: 'id' })
      }
    },
  })
}

export async function deleteEntryDatabase(databaseName: string) {
  if (!hasIndexedDbSupport()) {
    return
  }

  await deleteDB(databaseName)
}
