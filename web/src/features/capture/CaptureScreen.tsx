import type { EntryRecord } from '~/features/entries'

interface CaptureScreenProps {
  audioPlaybackUrl?: string
  audioReviewState: 'loading' | 'ready' | 'transcript_only' | 'unavailable'
  canDiscard: boolean
  canDeleteStoredAudio: boolean
  canSwitchToText: boolean
  entry: EntryRecord
  fallbackNotice?: string
  isDeletingStoredAudio: boolean
  isRecording: boolean
  mode: 'text' | 'voice'
  onDeleteStoredAudio: () => void
  onDiscardDraft: () => void
  onSave: () => void
  onStartRecording: () => void
  onStopRecording: () => void
  onSwitchToText: () => void
  onTitleChange: (value: string) => void
  onTranscriptChange: (value: string) => void
}

export function CaptureScreen({
  audioPlaybackUrl,
  audioReviewState,
  canDiscard,
  canDeleteStoredAudio,
  canSwitchToText,
  entry,
  fallbackNotice,
  isDeletingStoredAudio,
  isRecording,
  mode,
  onDeleteStoredAudio,
  onDiscardDraft,
  onSave,
  onStartRecording,
  onStopRecording,
  onSwitchToText,
  onTitleChange,
  onTranscriptChange,
}: CaptureScreenProps) {
  const isInteractionLocked = isDeletingStoredAudio
  const statusLabel =
    entry.status === 'saved_local'
      ? 'Saved on this device'
      : entry.status === 'recording'
        ? 'Recording'
        : entry.status === 'processing'
          ? 'Processing'
          : entry.status === 'review_ready'
            ? 'Ready to review'
            : entry.status === 'needs_retry'
              ? 'Needs retry'
              : 'Draft only on this device'

  return (
    <section className="rounded-[1.75rem] border border-[rgba(58,34,29,0.08)] bg-white/75 p-5 shadow-[0_14px_35px_rgba(38,23,18,0.07)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--muted)]">
          {mode === 'voice' ? 'Voice note' : 'Text note'}
        </p>
        <p className="rounded-full bg-[rgba(45,26,22,0.06)] px-3 py-1 text-xs font-semibold text-[var(--ink)]">
          {statusLabel}
        </p>
      </div>

      {fallbackNotice ? (
        <div className="mt-4 rounded-[1.25rem] border border-[rgba(230,113,96,0.16)] bg-[rgba(230,113,96,0.08)] px-4 py-3 text-sm leading-6 text-[var(--ink)]">
          {fallbackNotice}
        </div>
      ) : null}

      <label className="mt-5 block">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Title
        </span>
        <input
          className="mt-2 min-h-12 w-full rounded-[1rem] border border-[rgba(58,34,29,0.12)] bg-white/85 px-4 py-3 text-base text-[var(--ink)] outline-none transition focus:border-[var(--accent)]"
          disabled={isInteractionLocked}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Give this note a short anchor"
          value={entry.title}
        />
      </label>

      {mode === 'voice' ? (
        <div className="mt-5 rounded-[1.25rem] border border-[rgba(58,34,29,0.08)] bg-[rgba(255,255,255,0.82)] p-4">
          <p className="text-sm leading-6 text-[var(--muted)]">
            Your recording stays on this device so you can review it after you
            stop. It is not synced or shared in this local-first stage.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            {isRecording ? (
              <button
                className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isInteractionLocked}
                onClick={onStopRecording}
                type="button"
              >
                Stop recording
              </button>
            ) : (
              <button
                className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isInteractionLocked}
                onClick={onStartRecording}
                type="button"
              >
                {entry.status === 'review_ready'
                  ? 'Record again'
                  : 'Start recording'}
              </button>
            )}
            {canSwitchToText ? (
              <button
                className="inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-[rgba(58,34,29,0.12)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isInteractionLocked}
                onClick={onSwitchToText}
                type="button"
              >
                Use text instead
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {mode === 'voice' && entry.status !== 'draft_local' ? (
        <div className="mt-5 rounded-[1.25rem] border border-[rgba(58,34,29,0.08)] bg-[rgba(255,255,255,0.82)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Audio review
          </p>
          <div className="mt-3">
            {audioReviewState === 'ready' && audioPlaybackUrl ? (
                <audio
                  aria-label="Retained audio playback"
                  className="w-full"
                  controls
                  preload="metadata"
                  src={audioPlaybackUrl}
                />
            ) : (
              <p className="text-sm leading-6 text-[var(--muted)]">
                {audioReviewState === 'loading'
                  ? 'Loading audio stored on this device.'
                  : audioReviewState === 'unavailable'
                    ? 'Stored audio could not be opened for playback on this device.'
                    : 'This voice note only kept text review, so playback is unavailable.'}
              </p>
            )}
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {entry.status === 'processing'
              ? 'Recording saved locally. Transcript is still processing.'
              : audioReviewState === 'unavailable'
                ? 'Keep the transcript or record again on this device.'
                : audioReviewState === 'transcript_only'
                  ? 'This note is stored as transcript text only on this device.'
                  : 'Audio stored only on this device.'}
          </p>
          {canDeleteStoredAudio ? (
            <button
              className="mt-4 inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-[rgba(178,57,38,0.18)] bg-[rgba(178,57,38,0.06)] px-4 py-3 text-sm font-semibold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isDeletingStoredAudio}
              onClick={onDeleteStoredAudio}
              type="button"
            >
              {isDeletingStoredAudio ? 'Removing stored audio...' : 'Remove stored audio'}
            </button>
          ) : null}
        </div>
      ) : null}

      <label className="mt-5 block">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          {mode === 'voice' ? 'Review note' : 'Write note'}
        </span>
        <textarea
          className="mt-2 min-h-44 w-full rounded-[1.25rem] border border-[rgba(58,34,29,0.12)] bg-white/88 px-4 py-4 text-base leading-7 text-[var(--ink)] outline-none transition focus:border-[var(--accent)]"
          disabled={isInteractionLocked}
          onChange={(event) => onTranscriptChange(event.target.value)}
          placeholder={
            mode === 'voice'
              ? 'Add notes about this recording or edit any transcript text.'
              : 'Say what happened, what mattered, or what you need to remember.'
          }
          value={entry.transcript}
        />
      </label>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          className="inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(230,113,96,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isInteractionLocked}
          onClick={onSave}
          type="button"
        >
          Save locally
        </button>
        <p className="text-sm leading-6 text-[var(--muted)]">
          This proof of concept keeps notes on this device first and makes state
          visible instead of pretending sync already exists.
        </p>
      </div>

      {canDiscard ? (
        <button
          className="mt-4 inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-[rgba(58,34,29,0.12)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isInteractionLocked}
          onClick={onDiscardDraft}
          type="button"
        >
          Discard draft
        </button>
      ) : null}
    </section>
  )
}
