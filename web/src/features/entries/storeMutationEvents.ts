import { useEffect, useState } from 'react'

const ENTRY_STORE_MUTATION_CHANNEL_NAME = 'notes:entry-store:mutations'
const ENTRY_STORE_MUTATION_STORAGE_KEY = 'notes:entry-store:mutation'
const MAX_SEEN_MESSAGE_IDS = 32

type EntryStoreMutationKind =
  | 'entry_deleted'
  | 'store_cleared'
  | 'store_replaced'

interface EntryStoreMutationMessage {
  entryId?: string
  id: string
  kind: EntryStoreMutationKind
  occurredAt: number
  sourceId: string
}

let cachedSourceId: string | null = null

function createMessageId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `mutation-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getSourceId() {
  if (cachedSourceId) {
    return cachedSourceId
  }

  cachedSourceId = createMessageId()
  return cachedSourceId
}

function isMutationMessage(value: unknown): value is EntryStoreMutationMessage {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    (candidate.kind === 'entry_deleted' ||
      candidate.kind === 'store_cleared' ||
      candidate.kind === 'store_replaced') &&
    typeof candidate.id === 'string' &&
    typeof candidate.occurredAt === 'number' &&
    Number.isFinite(candidate.occurredAt) &&
    typeof candidate.sourceId === 'string' &&
    (candidate.entryId === undefined || typeof candidate.entryId === 'string')
  )
}

function rememberMessageId(
  seenMessageIds: Set<string>,
  messageOrder: string[],
  messageId: string,
) {
  if (seenMessageIds.has(messageId)) {
    return false
  }

  seenMessageIds.add(messageId)
  messageOrder.push(messageId)

  if (messageOrder.length > MAX_SEEN_MESSAGE_IDS) {
    const oldestMessageId = messageOrder.shift()

    if (oldestMessageId) {
      seenMessageIds.delete(oldestMessageId)
    }
  }

  return true
}

function createMutationMessage(
  mutation: Omit<EntryStoreMutationMessage, 'id' | 'occurredAt' | 'sourceId'>,
): EntryStoreMutationMessage {
  return {
    ...mutation,
    id: createMessageId(),
    occurredAt: Date.now(),
    sourceId: getSourceId(),
  }
}

export function publishEntryStoreMutation(
  mutation: Omit<EntryStoreMutationMessage, 'id' | 'occurredAt' | 'sourceId'>,
) {
  if (typeof window === 'undefined') {
    return
  }

  const message = createMutationMessage(mutation)

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(ENTRY_STORE_MUTATION_CHANNEL_NAME)
      channel.postMessage(message)
      channel.close()
    }
  } catch {
    // Cross-tab refresh is best-effort and should never break local persistence.
  }

  try {
    window.localStorage.setItem(
      ENTRY_STORE_MUTATION_STORAGE_KEY,
      JSON.stringify(message),
    )
  } catch {
    // Ignore fallback transport failures.
  }
}

export function subscribeToForeignEntryStoreMutations(
  listener: (message: EntryStoreMutationMessage) => void,
) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const seenMessageIds = new Set<string>()
  const messageOrder: string[] = []

  const handleMessage = (value: unknown) => {
    if (!isMutationMessage(value) || value.sourceId === getSourceId()) {
      return
    }

    if (!rememberMessageId(seenMessageIds, messageOrder, value.id)) {
      return
    }

    listener(value)
  }

  const handleStorage = (event: StorageEvent) => {
    if (
      event.key !== ENTRY_STORE_MUTATION_STORAGE_KEY ||
      !event.newValue
    ) {
      return
    }

    try {
      handleMessage(JSON.parse(event.newValue))
    } catch {
      // Ignore malformed storage payloads.
    }
  }

  window.addEventListener('storage', handleStorage)

  let channel: BroadcastChannel | null = null

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(ENTRY_STORE_MUTATION_CHANNEL_NAME)
      channel.addEventListener('message', (event) => {
        handleMessage(event.data)
      })
    } catch {
      channel = null
    }
  }

  return () => {
    channel?.close()
    window.removeEventListener('storage', handleStorage)
  }
}

export function useForeignEntryStoreMutationVersion() {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    return subscribeToForeignEntryStoreMutations(() => {
      setVersion((currentVersion) => currentVersion + 1)
    })
  }, [])

  return version
}
