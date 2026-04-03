import type { EntryRecord, EntryStore } from '~/features/entries'

export interface ExportedRetainedAudio {
  audioFileId: string
  base64: string
  entryId: string
  mimeType: string
  sizeBytes: number
}

export interface LocalEntriesExport {
  entries: EntryRecord[]
  exportedAt: string
  retainedAudio: ExportedRetainedAudio[]
  schemaVersion: 1
}

type ExportStore = Pick<EntryStore, 'getEntryAudio' | 'listEntries'>

function hasRetainedAudio(entry: EntryRecord) {
  return (
    entry.hasAudio &&
    entry.audioFileId !== null &&
    entry.storageMode === 'transcript_plus_audio'
  )
}

function cloneEntry(entry: EntryRecord) {
  return structuredClone(entry)
}

function bytesToBase64(bytes: Uint8Array) {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

  let output = ''

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0
    const second = bytes[index + 1] ?? 0
    const third = bytes[index + 2] ?? 0
    const combined = (first << 16) | (second << 8) | third

    output += alphabet[(combined >> 18) & 0x3f]
    output += alphabet[(combined >> 12) & 0x3f]
    output += index + 1 < bytes.length ? alphabet[(combined >> 6) & 0x3f] : '='
    output += index + 2 < bytes.length ? alphabet[combined & 0x3f] : '='
  }

  return output
}

async function toRetainedAudioExport(
  store: ExportStore,
  entry: EntryRecord,
): Promise<ExportedRetainedAudio> {
  const audioFileId = entry.audioFileId

  if (!audioFileId) {
    throw new Error(`Retained audio metadata is missing for entry ${entry.id}.`)
  }

  const audioBlob = await store.getEntryAudio(audioFileId)

  if (!audioBlob) {
    throw new Error(`Retained audio is missing for entry ${entry.id}.`)
  }

  const audioBytes = new Uint8Array(
    typeof audioBlob.arrayBuffer === 'function'
      ? await audioBlob.arrayBuffer()
      : await new Response(audioBlob).arrayBuffer(),
  )

  return {
    audioFileId,
    base64: bytesToBase64(audioBytes),
    entryId: entry.id,
    mimeType: audioBlob.type || 'application/octet-stream',
    sizeBytes: audioBlob.size,
  }
}

export async function createLocalEntriesExport(
  store: ExportStore,
): Promise<LocalEntriesExport> {
  const entries = (await store.listEntries()).map(cloneEntry)
  const retainedAudio = await Promise.all(
    entries.filter(hasRetainedAudio).map((entry) => toRetainedAudioExport(store, entry)),
  )

  return {
    entries,
    exportedAt: new Date().toISOString(),
    retainedAudio,
    schemaVersion: 1,
  }
}
