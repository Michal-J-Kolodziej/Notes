import type { EntryRecord, EntryStore } from '~/features/entries'
import { isDraftEntry, isSavedEntry } from '~/features/entries'

export interface LocalDataSummary {
  accountOwnedCount: number
  draftCount: number
  entryCount: number
  guestOwnedCount: number
  latestUpdatedAt: number | null
  retainedAudioCount: number
  savedCount: number
  totalBytes: number
}

const textEncoder = new TextEncoder()

function getEntryTextBytes(entry: EntryRecord) {
  return (
    textEncoder.encode(entry.title).byteLength +
    textEncoder.encode(entry.transcript).byteLength
  )
}

export async function createLocalDataSummary(
  store: EntryStore,
): Promise<LocalDataSummary> {
  const entries = await store.listEntries()
  const retainedAudioIds = [
    ...new Set(
      entries
        .filter(
          (entry) =>
            entry.hasAudio &&
            entry.storageMode === 'transcript_plus_audio' &&
            Boolean(entry.audioFileId),
        )
        .map((entry) => entry.audioFileId!)
    ),
  ]

  const retainedAudioBlobs = await Promise.all(
    retainedAudioIds.map(async (audioFileId) => await store.getAudioFile(audioFileId)),
  )

  const retainedAudioBytes = retainedAudioBlobs.reduce(
    (total, blob) => total + (blob?.size ?? 0),
    0,
  )

  return {
    accountOwnedCount: entries.filter((entry) => entry.ownerMode !== 'guest_local').length,
    draftCount: entries.filter(isDraftEntry).length,
    entryCount: entries.length,
    guestOwnedCount: entries.filter((entry) => entry.ownerMode === 'guest_local').length,
    latestUpdatedAt:
      entries.length > 0
        ? Math.max(...entries.map((entry) => entry.updatedAt))
        : null,
    retainedAudioCount: retainedAudioIds.length,
    savedCount: entries.filter(isSavedEntry).length,
    totalBytes:
      entries.reduce((total, entry) => total + getEntryTextBytes(entry), 0) +
      retainedAudioBytes,
  }
}

export function formatLocalDataSize(totalBytes: number) {
  if (totalBytes < 1024) {
    return `${totalBytes} B`
  }

  if (totalBytes < 1024 * 1024) {
    return `${(totalBytes / 1024).toFixed(1)} KB`
  }

  return `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
}
