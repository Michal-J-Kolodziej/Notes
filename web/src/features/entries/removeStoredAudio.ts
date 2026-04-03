import type { EntryRecord, EntryStore } from './types'

interface RemoveStoredAudioController {
  flush(): Promise<void>
  getCurrent(): EntryRecord | null
}

interface RemoveStoredAudioOptions {
  controller: RemoveStoredAudioController
  now?: () => number
  store: Pick<EntryStore, 'saveEntry'>
}

type EntryWithRetainedAudio = EntryRecord & {
  audioFileId: string
  hasAudio: true
  storageMode: 'transcript_plus_audio'
}

function canRemoveStoredAudio(
  entry: EntryRecord | null,
): entry is EntryWithRetainedAudio {
  return Boolean(
    entry &&
      entry.audioFileId &&
      entry.hasAudio &&
      entry.storageMode === 'transcript_plus_audio',
  )
}

export async function removeStoredAudioFromCurrentEntry({
  controller,
  now = () => Date.now(),
  store,
}: RemoveStoredAudioOptions) {
  await controller.flush()

  const currentEntry = controller.getCurrent()

  if (!canRemoveStoredAudio(currentEntry)) {
    return null
  }

  return await store.saveEntry({
    ...currentEntry,
    audioFileId: null,
    hasAudio: false,
    storageMode: 'transcript_only',
    updatedAt: now(),
  })
}
