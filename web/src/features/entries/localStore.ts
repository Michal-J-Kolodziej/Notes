import type {
  EntryRecord,
  EntryStore,
  EntryStoreSnapshot,
} from './types'
import { sortEntriesByUpdatedAtDesc } from './selectors'
import {
  ENTRY_AUDIO_STORE_NAME,
  ENTRY_DATABASE_NAME,
  ENTRY_STORE_NAME,
  hasIndexedDbSupport,
  openEntryDatabase,
  type StoredAudioFileRecord,
} from '~/lib/platform/indexedDb'
import { publishEntryStoreMutation } from './storeMutationEvents'

function cloneEntry(entry: EntryRecord): EntryRecord {
  return structuredClone(entry)
}

function cloneAudioFile(blob: Blob): Blob {
  return blob.slice(0, blob.size, blob.type)
}

function cloneStoredAudioRecord(record: StoredAudioFileRecord): StoredAudioFileRecord {
  return {
    data: record.data.slice(0),
    id: record.id,
    type: record.type,
  }
}

function getRetainedAudioFileId(entry: EntryRecord | undefined) {
  if (!entry) return null

  if (entry.hasAudio && entry.storageMode === 'transcript_plus_audio') {
    return entry.audioFileId
  }

  return null
}

function getStoredAudioFileId(entry: EntryRecord | undefined) {
  return entry?.audioFileId ?? null
}

function normalizeAudioEntry(entry: EntryRecord, audio: Blob) {
  const audioFileId = entry.audioFileId ?? crypto.randomUUID()

  return {
    entry: {
      ...cloneEntry(entry),
      audioFileId,
      hasAudio: true,
      storageMode: 'transcript_plus_audio' as const,
    },
    audio,
    audioFileId,
  }
}

async function toStoredAudioRecord(
  id: string,
  audio: Blob,
): Promise<StoredAudioFileRecord> {
  const data = await audio.arrayBuffer()

  return {
    data: data.slice(0),
    id,
    type: audio.type,
  }
}

function toAudioBlob(record: StoredAudioFileRecord) {
  return new Blob([record.data.slice(0)], { type: record.type })
}

export class LocalEntryStoreUnavailableError extends Error {
  cause?: unknown

  constructor(message: string, options?: { cause?: unknown }) {
    super(message)
    this.name = 'LocalEntryStoreUnavailableError'
    this.cause = options?.cause
  }
}

export function createMemoryEntryStore(): EntryStore {
  const entries = new Map<string, EntryRecord>()
  const audioFiles = new Map<string, Blob>()

  async function persistEntry(
    entry: EntryRecord,
    audio?: Blob,
  ): Promise<EntryRecord> {
    const copy = cloneEntry(entry)
    const previous = entries.get(copy.id)
    const previousAudioFileId = getStoredAudioFileId(previous)

    let nextEntry = copy
    if (audio) {
      const normalized = normalizeAudioEntry(copy, audio)
      nextEntry = normalized.entry
      audioFiles.set(normalized.audioFileId, cloneAudioFile(normalized.audio))
    }

    entries.set(nextEntry.id, cloneEntry(nextEntry))

    const nextAudioFileId = getRetainedAudioFileId(nextEntry)
    if (previousAudioFileId && previousAudioFileId !== nextAudioFileId) {
      audioFiles.delete(previousAudioFileId)
    }

    return cloneEntry(nextEntry)
  }

  async function clearAudioForEntry(id: string) {
    const previous = entries.get(id)
    const previousAudioFileId = getStoredAudioFileId(previous)

    entries.delete(id)

    if (previousAudioFileId) {
      audioFiles.delete(previousAudioFileId)
    }
  }

  async function replaceAll({ audioFiles: nextAudioFiles, entries: nextEntries }: EntryStoreSnapshot) {
    const entryCopies = nextEntries.map((entry) => cloneEntry(entry))
    const audioCopies = nextAudioFiles.map((audioFile) => ({
      blob: cloneAudioFile(audioFile.blob),
      id: audioFile.id,
    }))

    entries.clear()
    audioFiles.clear()

    for (const entry of entryCopies) {
      entries.set(entry.id, entry)
    }

    for (const audioFile of audioCopies) {
      audioFiles.set(audioFile.id, audioFile.blob)
    }
  }

  return {
    persistenceMode: 'memory',
    saveEntry(entry) {
      return persistEntry(entry)
    },
    saveEntryWithAudio(entry, audio) {
      return persistEntry(entry, audio)
    },
    async getEntry(id) {
      const entry = entries.get(id)
      return entry ? cloneEntry(entry) : undefined
    },
    async listEntries() {
      return sortEntriesByUpdatedAtDesc(
        Array.from(entries.values(), (entry) => cloneEntry(entry)),
      )
    },
    async deleteEntry(id) {
      const hadEntry = entries.has(id)
      await clearAudioForEntry(id)

      if (hadEntry) {
        publishEntryStoreMutation({
          entryId: id,
          kind: 'entry_deleted',
        })
      }
    },
    async getEntryAudio(audioFileId) {
      const blob = audioFiles.get(audioFileId)
      return blob ? cloneAudioFile(blob) : undefined
    },
    async saveAudioFile(id, blob) {
      const copy = cloneAudioFile(blob)
      audioFiles.set(id, copy)
      return cloneAudioFile(copy)
    },
    async getAudioFile(id) {
      const blob = audioFiles.get(id)
      return blob ? cloneAudioFile(blob) : undefined
    },
    async deleteAudioFile(id) {
      audioFiles.delete(id)
    },
    async replaceAll(snapshot) {
      await replaceAll(snapshot)
      publishEntryStoreMutation({
        kind: 'store_replaced',
      })
    },
    async clear() {
      const hadLocalData = entries.size > 0 || audioFiles.size > 0
      entries.clear()
      audioFiles.clear()

      if (hadLocalData) {
        publishEntryStoreMutation({
          kind: 'store_cleared',
        })
      }
    },
  }
}

export interface CreateLocalEntryStoreOptions {
  databaseName?: string
}

export async function createLocalEntryStore(
  options: CreateLocalEntryStoreOptions = {},
): Promise<EntryStore> {
  const databaseName = options.databaseName ?? ENTRY_DATABASE_NAME

  if (!hasIndexedDbSupport()) {
    throw new LocalEntryStoreUnavailableError(
      'Durable local storage is unavailable in this browser session. Notes would be lost on refresh or restart.',
    )
  }

  try {
    const database = await openEntryDatabase(databaseName)

    async function persistEntry(
      entry: EntryRecord,
      audio?: Blob,
    ): Promise<EntryRecord> {
      const copy = cloneEntry(entry)
      const tx = database.transaction(
        [ENTRY_STORE_NAME, ENTRY_AUDIO_STORE_NAME],
        'readwrite',
      )
      const entriesStore = tx.objectStore(ENTRY_STORE_NAME)
      const audioStore = tx.objectStore(ENTRY_AUDIO_STORE_NAME)

      const existing = await entriesStore.get(copy.id)
      const previousAudioFileId = getStoredAudioFileId(existing)

      let nextEntry = copy
      if (audio) {
        const normalized = normalizeAudioEntry(copy, audio)
        nextEntry = normalized.entry
        await audioStore.put(
          await toStoredAudioRecord(normalized.audioFileId, normalized.audio),
        )
      }

      await entriesStore.put(nextEntry)

      const nextAudioFileId = getRetainedAudioFileId(nextEntry)
      if (previousAudioFileId && previousAudioFileId !== nextAudioFileId) {
        await audioStore.delete(previousAudioFileId)
      }

      await tx.done
      return cloneEntry(nextEntry)
    }

    async function clearAudioForEntry(id: string) {
      const tx = database.transaction(
        [ENTRY_STORE_NAME, ENTRY_AUDIO_STORE_NAME],
        'readwrite',
      )
      const entriesStore = tx.objectStore(ENTRY_STORE_NAME)
      const audioStore = tx.objectStore(ENTRY_AUDIO_STORE_NAME)
      const existing = await entriesStore.get(id)
      const retainedAudioFileId = getStoredAudioFileId(existing)

      await entriesStore.delete(id)

      if (retainedAudioFileId) {
        await audioStore.delete(retainedAudioFileId)
      }

      await tx.done
    }

    async function readAudio(audioFileId: string) {
      const audio = await database.get(ENTRY_AUDIO_STORE_NAME, audioFileId)
      return audio ? toAudioBlob(cloneStoredAudioRecord(audio)) : undefined
    }

    async function replaceAll({ audioFiles, entries }: EntryStoreSnapshot) {
      const storedAudioFiles = await Promise.all(
        audioFiles.map(async (audioFile) => ({
          blob: cloneAudioFile(audioFile.blob),
          id: audioFile.id,
          record: await toStoredAudioRecord(audioFile.id, audioFile.blob),
        })),
      )
      const entryCopies = entries.map((entry) => cloneEntry(entry))
      const tx = database.transaction(
        [ENTRY_STORE_NAME, ENTRY_AUDIO_STORE_NAME],
        'readwrite',
      )
      const entriesStore = tx.objectStore(ENTRY_STORE_NAME)
      const audioStore = tx.objectStore(ENTRY_AUDIO_STORE_NAME)

      await entriesStore.clear()
      await audioStore.clear()

      for (const audioFile of storedAudioFiles) {
        await audioStore.put(audioFile.record)
      }

      for (const entry of entryCopies) {
        await entriesStore.put(entry)
      }

      await tx.done
    }

    return {
      persistenceMode: 'indexeddb',
      saveEntry(entry) {
        return persistEntry(entry)
      },
      saveEntryWithAudio(entry, audio) {
        return persistEntry(entry, audio)
      },
      async getEntry(id) {
        const entry = await database.get(ENTRY_STORE_NAME, id)
        return entry ? cloneEntry(entry) : undefined
      },
      async listEntries() {
        const entries = await database.getAll(ENTRY_STORE_NAME)
        return sortEntriesByUpdatedAtDesc(entries.map(cloneEntry))
      },
      async deleteEntry(id) {
        const existing = await database.get(ENTRY_STORE_NAME, id)
        await clearAudioForEntry(id)

        if (existing) {
          publishEntryStoreMutation({
            entryId: id,
            kind: 'entry_deleted',
          })
        }
      },
      getEntryAudio(audioFileId) {
        return readAudio(audioFileId)
      },
      async saveAudioFile(id, blob) {
        const tx = database.transaction(ENTRY_AUDIO_STORE_NAME, 'readwrite')
        await tx
          .objectStore(ENTRY_AUDIO_STORE_NAME)
          .put(await toStoredAudioRecord(id, blob))
        await tx.done
        return cloneAudioFile(blob)
      },
      getAudioFile(id) {
        return readAudio(id)
      },
      async deleteAudioFile(id) {
        await database.delete(ENTRY_AUDIO_STORE_NAME, id)
      },
      async replaceAll(snapshot) {
        await replaceAll(snapshot)
        publishEntryStoreMutation({
          kind: 'store_replaced',
        })
      },
      async clear() {
        const existingEntries = await database.count(ENTRY_STORE_NAME)
        const existingAudioFiles = await database.count(ENTRY_AUDIO_STORE_NAME)
        const tx = database.transaction(
          [ENTRY_STORE_NAME, ENTRY_AUDIO_STORE_NAME],
          'readwrite',
        )
        await tx.objectStore(ENTRY_STORE_NAME).clear()
        await tx.objectStore(ENTRY_AUDIO_STORE_NAME).clear()
        await tx.done

        if (existingEntries > 0 || existingAudioFiles > 0) {
          publishEntryStoreMutation({
            kind: 'store_cleared',
          })
        }
      },
    }
  } catch (error) {
    throw new LocalEntryStoreUnavailableError(
      error instanceof Error
        ? `Durable local storage could not be opened: ${error.message}`
        : 'Durable local storage could not be opened.',
      {
        cause: error,
      },
    )
  }
}
