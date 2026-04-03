import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CaptureScreen } from '~/features/capture/CaptureScreen'
import {
  createEntryDraftController,
  createEntryRecord,
  removeStoredAudioFromCurrentEntry,
  useEntryStore,
  useForeignEntryStoreMutationVersion,
  type EntryDraftPersistOptions,
  type EntryRecord,
} from '~/features/entries'
import { ConfirmationSheet } from '~/features/ui/ConfirmationSheet'

type NoteSearch = {
  fallback?: 'mic-denied'
  mode?: 'text' | 'voice'
}

export const Route = createFileRoute('/note/$noteId')({
  validateSearch: (search: Record<string, unknown>): NoteSearch => ({
    fallback: search.fallback === 'mic-denied' ? 'mic-denied' : undefined,
    mode: search.mode === 'voice' ? 'voice' : 'text',
  }),
  component: NoteRoute,
})

function NoteRoute() {
  const store = useEntryStore()
  const foreignMutationVersion = useForeignEntryStoreMutationVersion()
  const navigate = useNavigate({ from: Route.fullPath })
  const { noteId } = Route.useParams()
  const { fallback, mode = 'text' } = Route.useSearch()
  const [entry, setEntry] = useState<EntryRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [missingEntryMessage, setMissingEntryMessage] = useState<string | null>(null)
  const [audioPlaybackUrl, setAudioPlaybackUrl] = useState<string | null>(null)
  const [audioReviewState, setAudioReviewState] = useState<
    'loading' | 'ready' | 'transcript_only' | 'unavailable'
  >('transcript_only')
  const [isDeletingStoredAudio, setIsDeletingStoredAudio] = useState(false)
  const [pendingConfirmation, setPendingConfirmation] = useState<
    'delete_stored_audio' | 'replace_recording' | null
  >(null)
  const [persistError, setPersistError] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const draftControllerRef = useRef<ReturnType<typeof createEntryDraftController> | null>(
    null,
  )
  const discardDraftOnStopRef = useRef(false)
  const recordedChunksRef = useRef<Blob[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const initializeDraft = useCallback(
    (nextEntry: EntryRecord | null) => {
      draftControllerRef.current = nextEntry
        ? createEntryDraftController({
            initialEntry: nextEntry,
            deleteEntry: store.deleteEntry,
            saveEntry: store.saveEntry,
          })
        : null
      setEntry(nextEntry)
      setPersistError(null)
    },
    [store],
  )

  const stopRecordingWithoutSaving = useCallback(() => {
    discardDraftOnStopRef.current = true
    setIsRecording(false)
    recordedChunksRef.current = []

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    } else {
      mediaRecorderRef.current = null
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const showMissingEntryState = useCallback((message: string) => {
    stopRecordingWithoutSaving()
    setPendingConfirmation(null)
    setIsDeletingStoredAudio(false)
    setLoading(false)
    setMissingEntryMessage(message)
    initializeDraft(null)
  }, [initializeDraft, stopRecordingWithoutSaving])

  const commitEntry = useCallback(
    (
      updater: (current: EntryRecord) => EntryRecord,
      options: EntryDraftPersistOptions = {},
    ) => {
      const controller = draftControllerRef.current

      if (!controller) {
        return null
      }

      const mutation = controller.update(updater, options)

      if (!mutation.nextEntry) {
        return null
      }

      setEntry(mutation.nextEntry)
      setPersistError(null)
      void mutation.persisted.catch((error: unknown) => {
        setPersistError(
          error instanceof Error
            ? error.message
            : 'The latest local change could not be saved.',
        )
      })

      return mutation
    },
    [],
  )

  useEffect(() => {
    let mounted = true
    setLoading(true)

    async function bootstrap() {
      if (noteId === 'new') {
        const created = createEntryRecord({
          sourceType: mode,
          status: 'draft_local',
        })
        const saved = await store.saveEntry(created)

        if (!mounted) return

        void navigate({
          params: { noteId: saved.id },
          replace: true,
          search: { mode },
          to: '/note/$noteId',
        })
        return
      }

      const saved = await store.getEntry(noteId)

      if (!mounted) {
        return
      }

      if (!saved) {
        showMissingEntryState('This note is no longer available on this device.')
        return
      }

      setMissingEntryMessage(null)
      initializeDraft(saved)
      setLoading(false)
    }

    void bootstrap()

    return () => {
      mounted = false
    }
  }, [initializeDraft, mode, navigate, noteId, showMissingEntryState, store])

  useEffect(() => {
    let active = true

    if (noteId === 'new' || foreignMutationVersion === 0) {
      return () => {
        active = false
      }
    }

    void store.getEntry(noteId).then((saved) => {
      if (!active) {
        return
      }

      if (!saved) {
        showMissingEntryState('This note is no longer available on this device.')
        return
      }

      setMissingEntryMessage(null)
      initializeDraft(saved)
    })

    return () => {
      active = false
    }
  }, [
    foreignMutationVersion,
    initializeDraft,
    noteId,
    showMissingEntryState,
    store,
  ])

  useEffect(() => {
    return () => {
      recordedChunksRef.current = []
      mediaRecorderRef.current?.stream?.getTracks().forEach((track) => track.stop())
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    let revokedUrl: string | null = null
    let active = true

    if (!entry?.audioFileId) {
      setAudioPlaybackUrl(null)
      setAudioReviewState('transcript_only')
      return
    }

    setAudioPlaybackUrl(null)
    setAudioReviewState('loading')

    void store
      .getAudioFile(entry.audioFileId)
      .then((audioBlob) => {
        if (!active) {
          return
        }

        if (!audioBlob) {
          setAudioPlaybackUrl(null)
          setAudioReviewState('unavailable')
          return
        }

        revokedUrl = URL.createObjectURL(audioBlob)
        setAudioPlaybackUrl(revokedUrl)
        setAudioReviewState('ready')
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }

        setPersistError(
          error instanceof Error
            ? error.message
            : 'Stored audio could not be opened for playback.',
        )
        setAudioPlaybackUrl(null)
        setAudioReviewState('unavailable')
      })

    return () => {
      active = false
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl)
      }
    }
  }, [entry?.audioFileId, store])

  const updateEntry = useCallback(
    (updates: Partial<EntryRecord>, options: EntryDraftPersistOptions = {}) => {
      return commitEntry((current) => ({
        ...current,
        ...updates,
        updatedAt: Date.now(),
      }), options)
    },
    [commitEntry],
  )

  const fallbackNotice = useMemo(() => {
    if (persistError) {
      return persistError
    }

    if (fallback === 'mic-denied') {
      return 'Microphone access was denied, so the app moved you into manual text capture instead.'
    }

    return undefined
  }, [fallback, persistError])

  const handleSwitchToText = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      discardDraftOnStopRef.current = true
      setIsRecording(false)
      recordedChunksRef.current = []
      mediaRecorderRef.current.stop()
    }

    const mutation = commitEntry((current) => ({
      ...current,
      audioFileId: null,
      hasAudio: false,
      sourceType: 'text',
      status: current.status === 'saved_local' ? 'saved_local' : 'draft_local',
      storageMode: 'transcript_only',
      updatedAt: Date.now(),
    }))

    if (!mutation?.nextEntry) {
      return
    }

    await mutation.persisted

    void navigate({
      params: { noteId: mutation.nextEntry.id },
      replace: true,
      search: { fallback: 'mic-denied', mode: 'text' },
      to: '/note/$noteId',
    })
  }, [commitEntry, navigate])

  const handleSave = useCallback(async () => {
    const mutation = commitEntry((current) => ({
      ...current,
      status: 'saved_local',
      updatedAt: Date.now(),
    }))

    if (!mutation) {
      return
    }

    await mutation.persisted

    void navigate({
      to: '/recent',
    })
  }, [commitEntry, navigate])

  const handleDeleteStoredAudio = useCallback(async () => {
    const controller = draftControllerRef.current
    const currentEntry = controller?.getCurrent()

    if (
      !controller ||
      isDeletingStoredAudio ||
      !currentEntry?.audioFileId ||
      !currentEntry.hasAudio ||
      currentEntry.storageMode !== 'transcript_plus_audio'
    ) {
      return
    }

    setIsDeletingStoredAudio(true)
    setPersistError(null)

    try {
      const savedEntry = await removeStoredAudioFromCurrentEntry({
        controller,
        store,
      })

      if (!savedEntry) {
        return
      }

      initializeDraft(savedEntry)
    } catch (error) {
      setPersistError(
        error instanceof Error
          ? `Stored audio could not be removed from this note. ${error.message}`
          : 'Stored audio could not be removed from this note.',
      )
    } finally {
      setIsDeletingStoredAudio(false)
    }
  }, [initializeDraft, isDeletingStoredAudio, store])

  const handleDiscardDraft = useCallback(async () => {
    const controller = draftControllerRef.current
    const currentEntry = controller?.getCurrent()

    if (!controller || !currentEntry) {
      return
    }

    stopRecordingWithoutSaving()

    initializeDraft(null)
    await controller.discard()

    void navigate({
      to: '/',
    })
  }, [initializeDraft, navigate, stopRecordingWithoutSaving])

  const startRecordingSession = useCallback(async () => {
    const currentEntry = draftControllerRef.current?.getCurrent()

    if (!currentEntry) {
      return
    }

    const replacementRecoveryEntry =
      currentEntry.hasAudio &&
      currentEntry.audioFileId &&
      currentEntry.storageMode === 'transcript_plus_audio'
        ? currentEntry
        : null

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      if (replacementRecoveryEntry) {
        setPersistError(
          'A new recording could not start. The existing recording stays on this device.',
        )
        return
      }

      await handleSwitchToText()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType =
        typeof MediaRecorder.isTypeSupported === 'function' &&
        MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : undefined
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      discardDraftOnStopRef.current = false
      recordedChunksRef.current = []
      streamRef.current = stream
      mediaRecorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        const nextChunk = event.data

        if (nextChunk && nextChunk.size > 0) {
          recordedChunksRef.current.push(nextChunk)
        }
      }

      recorder.addEventListener(
        'stop',
        () => {
          void (async () => {
            mediaRecorderRef.current = null
            setIsRecording(false)
            stream.getTracks().forEach((track) => track.stop())
            streamRef.current = null

            if (discardDraftOnStopRef.current) {
              recordedChunksRef.current = []
              return
            }

            await new Promise((resolve) => {
              setTimeout(resolve, 0)
            })

            const audioBlob = new Blob(recordedChunksRef.current, {
              type: recorder.mimeType || 'audio/webm',
            })
            recordedChunksRef.current = []

            if (audioBlob.size === 0) {
              if (replacementRecoveryEntry) {
                initializeDraft(replacementRecoveryEntry)
                setPersistError(
                  'New recording could not replace the current one. The existing recording stays on this device.',
                )
                return
              }

              const mutation = commitEntry((current) => ({
                ...current,
                audioFileId: null,
                hasAudio: false,
                sourceType: 'voice',
                status: 'needs_retry',
                storageMode: 'transcript_only',
                updatedAt: Date.now(),
              }))

              void mutation?.persisted
              return
            }

            const currentDraft = draftControllerRef.current?.getCurrent()

            if (!currentDraft) {
              return
            }

            const nextAudioFileId = currentDraft.audioFileId
              ? crypto.randomUUID()
              : `local-audio:${currentDraft.id}`

            const mutation = commitEntry(
              (current) => ({
                ...current,
                audioFileId: nextAudioFileId,
                hasAudio: true,
                sourceType: 'voice',
                status: 'review_ready',
                storageMode: 'transcript_plus_audio',
                updatedAt: Date.now(),
              }),
              {
                persistEntry: (nextEntry) =>
                  store.saveEntryWithAudio(nextEntry, audioBlob),
              },
            )

            try {
              await mutation?.persisted
            } catch (error) {
              if (replacementRecoveryEntry) {
                initializeDraft(replacementRecoveryEntry)
                setPersistError(
                  'New recording could not replace the current one. The existing recording stays on this device.',
                )
                return
              }

              setPersistError(
                error instanceof Error
                  ? error.message
                  : 'Recorded audio could not be stored on this device.',
              )
              const mutation = commitEntry((current) => ({
                ...current,
                audioFileId: null,
                hasAudio: false,
                sourceType: 'voice',
                status: 'needs_retry',
                storageMode: 'transcript_only',
                updatedAt: Date.now(),
              }))

              void mutation?.persisted
            }
          })()
        },
        { once: true },
      )

      recorder.start()
      setIsRecording(true)
      const mutation = commitEntry((current) => ({
        ...current,
        sourceType: 'voice',
        status: 'recording',
        updatedAt: Date.now(),
      }))

      void mutation?.persisted
    } catch {
      if (replacementRecoveryEntry) {
        setPersistError(
          'A new recording could not start. The existing recording stays on this device.',
        )
        return
      }

      await handleSwitchToText()
    }
  }, [commitEntry, handleSwitchToText, initializeDraft, store])

  const handleStartRecording = useCallback(async () => {
    if (isDeletingStoredAudio) {
      return
    }

    const currentEntry = draftControllerRef.current?.getCurrent()

    if (!currentEntry) {
      return
    }

    if (currentEntry.hasAudio) {
      setPendingConfirmation('replace_recording')
      return
    }

    await startRecordingSession()
  }, [isDeletingStoredAudio, startRecordingSession])

  const handleStopRecording = useCallback(() => {
    if (isDeletingStoredAudio) {
      return
    }

    setIsRecording(false)
    const mutation = updateEntry({ status: 'processing' })
    void mutation?.persisted
    mediaRecorderRef.current?.requestData?.()
    mediaRecorderRef.current?.stop()
  }, [isDeletingStoredAudio, updateEntry])

  return (
    <>
      <main className="mx-auto flex min-h-screen w-full max-w-[34rem] flex-col gap-5 px-4 py-6 sm:px-6">
        <section className="rounded-[2rem] border border-[rgba(255,255,255,0.45)] bg-[var(--panel)] p-6 shadow-[0_24px_80px_rgba(38,23,18,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
            Note workspace
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
            {entry?.title || (mode === 'voice' ? 'Voice note' : 'Text note')}
          </h1>
          <p className="mt-3 text-[1rem] leading-7 text-[var(--muted)]">
            Capture fast, keep the draft safe, and make every state visible.
          </p>
          <div className="mt-5">
            {loading ? (
              <div className="rounded-[1.25rem] border border-[rgba(58,34,29,0.1)] bg-white/70 p-4 text-sm text-[var(--muted)]">
                Opening the local note workspace.
              </div>
            ) : missingEntryMessage || !entry ? (
              <section className="rounded-[1.75rem] border border-[rgba(58,34,29,0.08)] bg-white/75 p-5 shadow-[0_14px_35px_rgba(38,23,18,0.07)]">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                  Note unavailable
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
                  {missingEntryMessage ?? 'This note is no longer available on this device.'}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  It may have been deleted or replaced from settings in this tab
                  or another one. Return home to open a different note or start
                  a new capture.
                </p>
                <Link
                  className="mt-5 inline-flex rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white"
                  to="/"
                >
                  Back to home
                </Link>
              </section>
            ) : (
              <CaptureScreen
                audioPlaybackUrl={audioPlaybackUrl ?? undefined}
                audioReviewState={
                  entry.hasAudio && entry.storageMode === 'transcript_plus_audio'
                    ? audioReviewState
                    : 'transcript_only'
                }
                canDiscard={entry.status !== 'saved_local'}
                canDeleteStoredAudio={
                  entry.hasAudio &&
                  entry.storageMode === 'transcript_plus_audio' &&
                  !isRecording
                }
                canSwitchToText={
                  mode === 'voice' &&
                  entry.status === 'draft_local' &&
                  !entry.hasAudio &&
                  !isRecording
                }
                entry={entry}
                fallbackNotice={fallbackNotice}
                isDeletingStoredAudio={isDeletingStoredAudio}
                isRecording={isRecording}
                mode={mode}
                onDeleteStoredAudio={() => {
                  setPendingConfirmation('delete_stored_audio')
                }}
                onDiscardDraft={() => {
                  void handleDiscardDraft()
                }}
                onSave={() => {
                  if (!isDeletingStoredAudio) {
                    void handleSave()
                  }
                }}
                onStartRecording={() => {
                  void handleStartRecording()
                }}
                onStopRecording={handleStopRecording}
                onSwitchToText={() => {
                  if (!isDeletingStoredAudio) {
                    void handleSwitchToText()
                  }
                }}
                onTitleChange={(value) => {
                  if (!isDeletingStoredAudio) {
                    void updateEntry({ title: value })
                  }
                }}
                onTranscriptChange={(value) => {
                  if (!isDeletingStoredAudio) {
                    void updateEntry({ transcript: value })
                  }
                }}
              />
            )}
          </div>
          <Link
            className="mt-6 inline-flex rounded-full border border-[rgba(58,34,29,0.12)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--ink)]"
            to="/"
          >
            Back to home
          </Link>
        </section>
      </main>
      <ConfirmationSheet
        cancelLabel="Cancel"
        confirmLabel={
          pendingConfirmation === 'replace_recording'
            ? 'Replace recording'
            : 'Remove audio'
        }
        confirmTone={
          pendingConfirmation === 'replace_recording' ? 'default' : 'destructive'
        }
        description={
          pendingConfirmation === 'replace_recording'
            ? 'Your current recording for this note will be removed and replaced on this device. Existing note text stays unless you change it.'
            : 'This removes the saved recording from this device. Your note text and transcript stay on this device.'
        }
        isConfirming={isDeletingStoredAudio}
        onCancel={() => {
          if (!isDeletingStoredAudio) {
            setPendingConfirmation(null)
          }
        }}
        onConfirm={() => {
          if (pendingConfirmation === 'replace_recording') {
            setPendingConfirmation(null)
            void startRecordingSession()
            return
          }

          setPendingConfirmation(null)
          void handleDeleteStoredAudio()
        }}
        open={pendingConfirmation !== null}
        title={
          pendingConfirmation === 'replace_recording'
            ? 'Replace this recording?'
            : 'Remove stored audio?'
        }
      />
    </>
  )
}
