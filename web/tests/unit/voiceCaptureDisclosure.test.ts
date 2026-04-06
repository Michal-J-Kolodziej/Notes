import { beforeEach, describe, expect, it } from 'vitest'
import {
  VOICE_CAPTURE_DISCLOSURE_STORAGE_KEY,
  hasAcknowledgedVoiceCaptureDisclosure,
  markVoiceCaptureDisclosureAcknowledged,
} from '~/lib/audio/voiceCaptureDisclosure'

describe('voiceCaptureDisclosure', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults to not acknowledged when no marker exists', () => {
    expect(hasAcknowledgedVoiceCaptureDisclosure()).toBe(false)
  })

  it('stores and reuses a durable acknowledgment marker in local storage', () => {
    expect(markVoiceCaptureDisclosureAcknowledged()).toBe(true)
    expect(hasAcknowledgedVoiceCaptureDisclosure()).toBe(true)
    expect(
      window.localStorage.getItem(VOICE_CAPTURE_DISCLOSURE_STORAGE_KEY),
    ).toBe('accepted')
  })

  it('fails closed when storage is unavailable', () => {
    const brokenStorage = {
      getItem() {
        throw new Error('storage blocked')
      },
      setItem() {
        throw new Error('storage blocked')
      },
    }

    expect(hasAcknowledgedVoiceCaptureDisclosure(brokenStorage)).toBe(false)
    expect(markVoiceCaptureDisclosureAcknowledged(brokenStorage)).toBe(false)
  })
})
