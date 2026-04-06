export type VoiceCaptureFallback = 'mic-denied' | 'voice-unsupported'

type MediaRecorderConstructorLike<TRecorder extends { mimeType: string }> = {
  new (
    stream: MediaStream,
    options?: {
      mimeType?: string
    },
  ): TRecorder
  isTypeSupported?: (mimeType: string) => boolean
}

const PREFERRED_AUDIO_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
] as const

export function pickSupportedAudioMimeType<TRecorder extends { mimeType: string }>(
  MediaRecorderCtor: MediaRecorderConstructorLike<TRecorder>,
) {
  const isTypeSupported = MediaRecorderCtor.isTypeSupported

  if (typeof isTypeSupported !== 'function') {
    return undefined
  }

  return PREFERRED_AUDIO_MIME_TYPES.find((mimeType) =>
    isTypeSupported(mimeType),
  )
}

export function createPreferredAudioRecorder<TRecorder extends { mimeType: string }>(
  stream: MediaStream,
  MediaRecorderCtor: MediaRecorderConstructorLike<TRecorder>,
) {
  try {
    const mimeType = pickSupportedAudioMimeType(MediaRecorderCtor)
    const recorder = mimeType
      ? new MediaRecorderCtor(stream, { mimeType })
      : new MediaRecorderCtor(stream)

    return {
      kind: 'ready' as const,
      mimeType,
      recorder,
    }
  } catch {
    return {
      kind: 'unsupported' as const,
    }
  }
}

export function classifyVoiceCaptureError(error: unknown): VoiceCaptureFallback {
  const name =
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    typeof error.name === 'string'
      ? error.name
      : ''

  return name === 'NotAllowedError' || name === 'SecurityError'
    ? 'mic-denied'
    : 'voice-unsupported'
}
