const NOTE_EDITOR_PRESENCE_PREFIX = 'notes:note-editor-presence'
const NOTE_EDITOR_PRESENCE_CHANNEL_NAME = 'notes:note-editor-presence'
const NOTE_EDITOR_PRESENCE_HEARTBEAT_MS = 4000
const NOTE_EDITOR_PRESENCE_STALE_MS = 10000

interface StorageLike {
  getItem: (key: string) => string | null
  key: (index: number) => string | null
  length: number
  removeItem: (key: string) => void
  setItem: (key: string, value: string) => void
}

function createPresenceId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `note-editor-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createPresencePrefix(noteId: string) {
  return `${NOTE_EDITOR_PRESENCE_PREFIX}:${noteId}:`
}

function createPresenceKey(noteId: string, presenceId: string) {
  return `${createPresencePrefix(noteId)}${presenceId}`
}

function getDefaultStorage(): StorageLike | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function isPresenceKeyForNote(
  noteId: string,
  key: string | null,
): key is string {
  return typeof key === 'string' && key.startsWith(createPresencePrefix(noteId))
}

function hasForeignNoteEditorPresence({
  noteId,
  presenceId,
  storage,
}: {
  noteId: string
  presenceId: string
  storage: StorageLike
}) {
  const ownKey = createPresenceKey(noteId, presenceId)
  const now = Date.now()
  let hasForeignPresence = false

  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index)

    if (typeof key !== 'string' || !isPresenceKeyForNote(noteId, key)) {
      continue
    }

    const presenceKey = key

    const rawHeartbeat = storage.getItem(presenceKey)
    const heartbeatAt = rawHeartbeat ? Number(rawHeartbeat) : Number.NaN

    if (!Number.isFinite(heartbeatAt) || now - heartbeatAt > NOTE_EDITOR_PRESENCE_STALE_MS) {
      storage.removeItem(presenceKey)
      continue
    }

    if (presenceKey !== ownKey) {
      hasForeignPresence = true
    }
  }

  return hasForeignPresence
}

export function observeNoteEditorPresence({
  noteId,
  onPresenceChange,
  storage = getDefaultStorage(),
}: {
  noteId: string
  onPresenceChange: (hasForeignPresence: boolean) => void
  storage?: StorageLike | null
}) {
  if (typeof window === 'undefined' || !storage) {
    onPresenceChange(false)
    return () => {}
  }

  const presenceId = createPresenceId()
  const presenceKey = createPresenceKey(noteId, presenceId)
  let channel: BroadcastChannel | null = null

  const emitPresence = () => {
    onPresenceChange(
      hasForeignNoteEditorPresence({
        noteId,
        presenceId,
        storage,
      }),
    )
  }

  const writeHeartbeat = () => {
    try {
      storage.setItem(presenceKey, String(Date.now()))
    } catch {
      onPresenceChange(false)
      return
    }

    try {
      channel?.postMessage({
        noteId,
        presenceId,
        kind: 'heartbeat',
      })
    } catch {
      // BroadcastChannel is best-effort only.
    }

    emitPresence()
  }

  const removePresence = () => {
    try {
      storage.removeItem(presenceKey)
    } catch {
      // Ignore cleanup failures.
    }

    try {
      channel?.postMessage({
        noteId,
        presenceId,
        kind: 'closed',
      })
    } catch {
      // BroadcastChannel is best-effort only.
    }
  }

  const handleStorage = (event: StorageEvent) => {
    if (!isPresenceKeyForNote(noteId, event.key)) {
      return
    }

    emitPresence()
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      writeHeartbeat()
    }
  }

  const handleChannelMessage = (event: MessageEvent) => {
    const data = event.data as
      | {
          kind?: string
          noteId?: string
          presenceId?: string
        }
      | undefined

    if (
      !data ||
      data.noteId !== noteId ||
      data.presenceId === presenceId ||
      (data.kind !== 'heartbeat' && data.kind !== 'closed')
    ) {
      return
    }

    emitPresence()
  }

  const handlePageHide = () => {
    removePresence()
  }

  const handleBeforeUnload = () => {
    removePresence()
  }

  writeHeartbeat()

  const heartbeatIntervalId = window.setInterval(
    writeHeartbeat,
    NOTE_EDITOR_PRESENCE_HEARTBEAT_MS,
  )

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(NOTE_EDITOR_PRESENCE_CHANNEL_NAME)
      channel.addEventListener('message', handleChannelMessage)
    } catch {
      channel = null
    }
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener('beforeunload', handleBeforeUnload)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('pagehide', handlePageHide)

  return () => {
    window.clearInterval(heartbeatIntervalId)
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener('beforeunload', handleBeforeUnload)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('pagehide', handlePageHide)
    channel?.removeEventListener('message', handleChannelMessage)
    channel?.close()
    removePresence()
  }
}
