export const GUEST_SESSION_STORAGE_KEY = 'notes:guest-session'

interface StoredGuestSession {
  createdAt: number
  sessionId: string
}

export interface GuestSession {
  createdAt: number
  mode: 'guest'
  persistence: 'local_storage' | 'memory'
  sessionId: string
}

interface StorageLike {
  getItem: (key: string) => string | null
  removeItem: (key: string) => void
  setItem: (key: string, value: string) => void
}

let memoryGuestSession: StoredGuestSession | null = null

function createSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `guest-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createStoredGuestSession(): StoredGuestSession {
  return {
    createdAt: Date.now(),
    sessionId: createSessionId(),
  }
}

function isStoredGuestSession(value: unknown): value is StoredGuestSession {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  const sessionId =
    typeof candidate.sessionId === 'string' ? candidate.sessionId.trim() : ''

  return (
    sessionId.length > 0 &&
    typeof candidate.createdAt === 'number' &&
    Number.isFinite(candidate.createdAt)
  )
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

function toGuestSession(
  storedGuestSession: StoredGuestSession,
  persistence: GuestSession['persistence'],
): GuestSession {
  return {
    ...storedGuestSession,
    mode: 'guest',
    persistence,
    sessionId: storedGuestSession.sessionId.trim(),
  }
}

function getMemoryGuestSession(): GuestSession {
  if (!memoryGuestSession) {
    memoryGuestSession = createStoredGuestSession()
  }

  return toGuestSession(memoryGuestSession, 'memory')
}

export function ensureGuestSession(storage: StorageLike | null = getDefaultStorage()) {
  if (!storage) {
    return getMemoryGuestSession()
  }

  try {
    const rawValue = storage.getItem(GUEST_SESSION_STORAGE_KEY)

    if (rawValue) {
      try {
        const parsedValue: unknown = JSON.parse(rawValue)

        if (isStoredGuestSession(parsedValue)) {
          return toGuestSession(parsedValue, 'local_storage')
        }
      } catch {
        storage.removeItem(GUEST_SESSION_STORAGE_KEY)
      }
    }
  } catch {
    return getMemoryGuestSession()
  }

  try {
    const nextGuestSession = createStoredGuestSession()
    storage.setItem(
      GUEST_SESSION_STORAGE_KEY,
      JSON.stringify(nextGuestSession),
    )

    return toGuestSession(nextGuestSession, 'local_storage')
  } catch {
    return getMemoryGuestSession()
  }
}

export function formatGuestSessionLabel(sessionId: string) {
  return sessionId.slice(0, 8).toUpperCase()
}
