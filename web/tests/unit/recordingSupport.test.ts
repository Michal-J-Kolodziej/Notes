import { describe, expect, it, vi } from 'vitest'
import {
  classifyVoiceCaptureError,
  createPreferredAudioRecorder,
  pickSupportedAudioMimeType,
} from '../../src/lib/audio/recordingSupport'

class FakeRecorder {
  static isTypeSupported = vi.fn<(mimeType: string) => boolean>()
  mimeType: string

  constructor(
    _stream: MediaStream,
    options?: {
      mimeType?: string
    },
  ) {
    this.mimeType = options?.mimeType ?? 'audio/default'
  }
}

describe('recordingSupport', () => {
  it('prefers the first supported audio mime type', () => {
    FakeRecorder.isTypeSupported.mockImplementation(
      (mimeType) => mimeType === 'audio/mp4',
    )

    expect(pickSupportedAudioMimeType(FakeRecorder)).toBe('audio/mp4')
  })

  it('creates a recorder with a supported mime type when one is available', () => {
    FakeRecorder.isTypeSupported.mockImplementation(
      (mimeType) => mimeType === 'audio/webm',
    )

    const result = createPreferredAudioRecorder(
      {} as MediaStream,
      FakeRecorder as unknown as typeof MediaRecorder,
    )

    expect(result.kind).toBe('ready')
    if (result.kind === 'ready') {
      expect(result.mimeType).toBe('audio/webm')
      expect(result.recorder.mimeType).toBe('audio/webm')
    }
  })

  it('falls back to the browser default recorder when support probing is unavailable', () => {
    class RecorderWithoutProbe {
      mimeType: string

      constructor(_stream: MediaStream) {
        this.mimeType = 'audio/default'
      }
    }

    const result = createPreferredAudioRecorder(
      {} as MediaStream,
      RecorderWithoutProbe as unknown as typeof MediaRecorder,
    )

    expect(result).toMatchObject({
      kind: 'ready',
      mimeType: undefined,
    })
  })

  it('classifies permission-denied microphone errors separately from generic recorder failures', () => {
    expect(classifyVoiceCaptureError({ name: 'NotAllowedError' })).toBe(
      'mic-denied',
    )
    expect(classifyVoiceCaptureError({ name: 'SecurityError' })).toBe(
      'mic-denied',
    )
    expect(classifyVoiceCaptureError(new Error('unsupported'))).toBe(
      'voice-unsupported',
    )
  })
})
