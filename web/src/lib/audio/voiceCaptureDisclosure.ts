export const VOICE_CAPTURE_DISCLOSURE_STORAGE_KEY =
  'notes:voice-capture-disclosure-v1'

interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
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

export function hasAcknowledgedVoiceCaptureDisclosure(
  storage: StorageLike | null = getDefaultStorage(),
) {
  if (!storage) {
    return false
  }

  try {
    return (
      storage.getItem(VOICE_CAPTURE_DISCLOSURE_STORAGE_KEY) === 'accepted'
    )
  } catch {
    return false
  }
}

export function markVoiceCaptureDisclosureAcknowledged(
  storage: StorageLike | null = getDefaultStorage(),
) {
  if (!storage) {
    return false
  }

  try {
    storage.setItem(VOICE_CAPTURE_DISCLOSURE_STORAGE_KEY, 'accepted')
    return true
  } catch {
    return false
  }
}
