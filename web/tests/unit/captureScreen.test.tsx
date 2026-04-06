import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CaptureScreen } from '~/features/capture/CaptureScreen'
import { createEntryRecord } from '~/features/entries'

describe('CaptureScreen', () => {
  it('shows a discard action for unsaved drafts', async () => {
    const user = userEvent.setup()
    const onDiscardDraft = vi.fn()

    render(
      <CaptureScreen
        audioPlaybackUrl={undefined}
        audioReviewState="transcript_only"
        canDiscard
        canDeleteStoredAudio={false}
        canSwitchToText
        entry={createEntryRecord({
          status: 'draft_local',
          sourceType: 'voice',
        })}
        isDeletingStoredAudio={false}
        isRecording={false}
        mode="voice"
        onDeleteStoredAudio={vi.fn()}
        onDiscardDraft={onDiscardDraft}
        recordingDurationLabel="00:00"
        onSave={vi.fn()}
        onStartRecording={vi.fn()}
        onStopRecording={vi.fn()}
        onSwitchToText={vi.fn()}
        onTitleChange={vi.fn()}
        onTranscriptChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /discard draft/i }))

    expect(onDiscardDraft).toHaveBeenCalledTimes(1)
  })

  it('renders retained local audio playback when a voice note has audio', () => {
    render(
      <CaptureScreen
        audioPlaybackUrl="blob:notes-audio"
        audioReviewState="ready"
        canDiscard
        canDeleteStoredAudio
        canSwitchToText={false}
        entry={createEntryRecord({
          audioFileId: 'audio-1',
          hasAudio: true,
          sourceType: 'voice',
          status: 'review_ready',
          storageMode: 'transcript_plus_audio',
        })}
        isDeletingStoredAudio={false}
        isRecording={false}
        mode="voice"
        onDeleteStoredAudio={vi.fn()}
        onDiscardDraft={vi.fn()}
        recordingDurationLabel="00:00"
        onSave={vi.fn()}
        onStartRecording={vi.fn()}
        onStopRecording={vi.fn()}
        onSwitchToText={vi.fn()}
        onTitleChange={vi.fn()}
        onTranscriptChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/retained audio playback/i)).toHaveAttribute(
      'src',
      'blob:notes-audio',
    )
  })

  it('offers a stored-audio delete action when the note still retains raw audio', async () => {
    const user = userEvent.setup()
    const onDeleteStoredAudio = vi.fn()

    render(
      <CaptureScreen
        audioPlaybackUrl="blob:notes-audio"
        audioReviewState="ready"
        canDeleteStoredAudio
        canDiscard
        canSwitchToText={false}
        entry={createEntryRecord({
          audioFileId: 'audio-1',
          hasAudio: true,
          sourceType: 'voice',
          status: 'saved_local',
          storageMode: 'transcript_plus_audio',
        })}
        isDeletingStoredAudio={false}
        isRecording={false}
        mode="voice"
        onDeleteStoredAudio={onDeleteStoredAudio}
        onDiscardDraft={vi.fn()}
        recordingDurationLabel="00:00"
        onSave={vi.fn()}
        onStartRecording={vi.fn()}
        onStopRecording={vi.fn()}
        onSwitchToText={vi.fn()}
        onTitleChange={vi.fn()}
        onTranscriptChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /remove stored audio/i }))

    expect(onDeleteStoredAudio).toHaveBeenCalledTimes(1)
  })

  it('shows a clear unavailable message when retained audio metadata exists without a playable blob', () => {
    render(
      <CaptureScreen
        audioPlaybackUrl={undefined}
        audioReviewState="unavailable"
        canDiscard
        canDeleteStoredAudio
        canSwitchToText={false}
        entry={createEntryRecord({
          audioFileId: 'audio-missing',
          hasAudio: true,
          sourceType: 'voice',
          status: 'review_ready',
          storageMode: 'transcript_plus_audio',
        })}
        isDeletingStoredAudio={false}
        isRecording={false}
        mode="voice"
        onDeleteStoredAudio={vi.fn()}
        onDiscardDraft={vi.fn()}
        recordingDurationLabel="00:00"
        onSave={vi.fn()}
        onStartRecording={vi.fn()}
        onStopRecording={vi.fn()}
        onSwitchToText={vi.fn()}
        onTitleChange={vi.fn()}
        onTranscriptChange={vi.fn()}
      />,
    )

    expect(
      screen.getByText(/could not be opened for playback on this device/i),
    ).toBeInTheDocument()
  })

  it('shows a loading message while retained audio is still resolving', () => {
    render(
      <CaptureScreen
        audioPlaybackUrl={undefined}
        audioReviewState="loading"
        canDiscard
        canDeleteStoredAudio
        canSwitchToText={false}
        entry={createEntryRecord({
          audioFileId: 'audio-loading',
          hasAudio: true,
          sourceType: 'voice',
          status: 'review_ready',
          storageMode: 'transcript_plus_audio',
        })}
        isDeletingStoredAudio={false}
        isRecording={false}
        mode="voice"
        onDeleteStoredAudio={vi.fn()}
        onDiscardDraft={vi.fn()}
        recordingDurationLabel="00:00"
        onSave={vi.fn()}
        onStartRecording={vi.fn()}
        onStopRecording={vi.fn()}
        onSwitchToText={vi.fn()}
        onTitleChange={vi.fn()}
        onTranscriptChange={vi.fn()}
      />,
    )

    expect(screen.getByText(/loading audio stored on this device/i)).toBeInTheDocument()
    expect(
      screen.queryByText(/could not be opened for playback on this device/i),
    ).not.toBeInTheDocument()
  })

  it('disables conflicting voice-note actions while stored audio removal is pending', () => {
    render(
      <CaptureScreen
        audioPlaybackUrl="blob:notes-audio"
        audioReviewState="ready"
        canDiscard
        canDeleteStoredAudio
        canSwitchToText
        entry={createEntryRecord({
          audioFileId: 'audio-delete',
          hasAudio: true,
          sourceType: 'voice',
          status: 'saved_local',
          storageMode: 'transcript_plus_audio',
        })}
        isDeletingStoredAudio
        isRecording={false}
        mode="voice"
        onDeleteStoredAudio={vi.fn()}
        onDiscardDraft={vi.fn()}
        recordingDurationLabel="00:00"
        onSave={vi.fn()}
        onStartRecording={vi.fn()}
        onStopRecording={vi.fn()}
        onSwitchToText={vi.fn()}
        onTitleChange={vi.fn()}
        onTranscriptChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /start recording/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /use text instead/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /save locally/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /discard draft/i })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /removing stored audio/i }),
    ).toBeDisabled()
  })

  it('shows a live recording timer while voice capture is active', () => {
    render(
      <CaptureScreen
        audioPlaybackUrl={undefined}
        audioReviewState="transcript_only"
        canDiscard
        canDeleteStoredAudio={false}
        canSwitchToText
        entry={createEntryRecord({
          sourceType: 'voice',
          status: 'recording',
        })}
        isDeletingStoredAudio={false}
        isRecording
        mode="voice"
        onDeleteStoredAudio={vi.fn()}
        onDiscardDraft={vi.fn()}
        recordingDurationLabel="00:05"
        onSave={vi.fn()}
        onStartRecording={vi.fn()}
        onStopRecording={vi.fn()}
        onSwitchToText={vi.fn()}
        onTitleChange={vi.fn()}
        onTranscriptChange={vi.fn()}
      />,
    )

    expect(screen.getByText(/recording now 00:05/i)).toBeInTheDocument()
  })

  it('explains microphone access before the first voice capture prompt', () => {
    render(
      <CaptureScreen
        audioPlaybackUrl={undefined}
        audioReviewState="transcript_only"
        canDiscard
        canDeleteStoredAudio={false}
        canSwitchToText
        entry={createEntryRecord({
          sourceType: 'voice',
          status: 'draft_local',
        })}
        isDeletingStoredAudio={false}
        isRecording={false}
        mode="voice"
        onDeleteStoredAudio={vi.fn()}
        onDiscardDraft={vi.fn()}
        recordingDurationLabel="00:00"
        onSave={vi.fn()}
        onStartRecording={vi.fn()}
        onStopRecording={vi.fn()}
        onSwitchToText={vi.fn()}
        onTitleChange={vi.fn()}
        onTranscriptChange={vi.fn()}
      />,
    )

    expect(
      screen.getByText(/before the browser asks for microphone access/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/used only while you actively record this note/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/not backed up or synced to another device yet/i),
    ).toBeInTheDocument()
  })

  it('shows a warning when the same note is open in another tab', () => {
    render(
      <CaptureScreen
        audioPlaybackUrl={undefined}
        audioReviewState="transcript_only"
        canDiscard
        canDeleteStoredAudio={false}
        canSwitchToText
        editorPresenceNotice="This note is also open in another tab on this device."
        entry={createEntryRecord({
          sourceType: 'text',
          status: 'draft_local',
        })}
        isDeletingStoredAudio={false}
        isRecording={false}
        mode="text"
        onDeleteStoredAudio={vi.fn()}
        onDiscardDraft={vi.fn()}
        recordingDurationLabel="00:00"
        onSave={vi.fn()}
        onStartRecording={vi.fn()}
        onStopRecording={vi.fn()}
        onSwitchToText={vi.fn()}
        onTitleChange={vi.fn()}
        onTranscriptChange={vi.fn()}
      />,
    )

    expect(
      screen.getByText(/this note is also open in another tab on this device/i),
    ).toBeInTheDocument()
  })

  it('offers a note delete action after a note is saved locally', async () => {
    const user = userEvent.setup()
    const onDeleteEntry = vi.fn()

    render(
      <CaptureScreen
        audioPlaybackUrl={undefined}
        audioReviewState="transcript_only"
        canDeleteEntry
        canDiscard={false}
        canDeleteStoredAudio={false}
        canSwitchToText={false}
        entry={createEntryRecord({
          sourceType: 'text',
          status: 'saved_local',
        })}
        isDeletingEntry={false}
        isDeletingStoredAudio={false}
        isRecording={false}
        mode="text"
        onDeleteEntry={onDeleteEntry}
        onDeleteStoredAudio={vi.fn()}
        onDiscardDraft={vi.fn()}
        recordingDurationLabel="00:00"
        onSave={vi.fn()}
        onStartRecording={vi.fn()}
        onStopRecording={vi.fn()}
        onSwitchToText={vi.fn()}
        onTitleChange={vi.fn()}
        onTranscriptChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /delete note/i }))

    expect(onDeleteEntry).toHaveBeenCalledTimes(1)
  })
})
