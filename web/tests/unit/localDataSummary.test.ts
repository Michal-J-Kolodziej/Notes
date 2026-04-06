import { describe, expect, it } from 'vitest'
import { createEntryRecord, createMemoryEntryStore } from '~/features/entries'
import {
  createLocalDataSummary,
  formatLocalDataSize,
} from '~/features/settings/localDataSummary'

describe('localDataSummary', () => {
  it('counts drafts, saved notes, retained audio, and app-owned bytes', async () => {
    const store = createMemoryEntryStore()

    await store.saveEntry(
      createEntryRecord({
        id: 'saved-note',
        status: 'saved_local',
        title: 'Saved note',
        transcript: 'Saved transcript',
      }),
    )
    await store.saveEntry(
      createEntryRecord({
        id: 'draft-note',
        status: 'draft_local',
        title: 'Draft note',
        transcript: 'Draft transcript',
      }),
    )
    await store.saveEntryWithAudio(
      createEntryRecord({
        audioFileId: 'audio-1',
        hasAudio: true,
        id: 'voice-note',
        sourceType: 'voice',
        status: 'saved_local',
        storageMode: 'transcript_plus_audio',
        title: 'Voice note',
        transcript: 'Voice transcript',
      }),
      new Blob(['audio-bytes'], { type: 'audio/webm' }),
    )

    const summary = await createLocalDataSummary(store)

    expect(summary.entryCount).toBe(3)
    expect(summary.guestOwnedCount).toBe(3)
    expect(summary.accountOwnedCount).toBe(0)
    expect(summary.latestUpdatedAt).toBeGreaterThan(0)
    expect(summary.draftCount).toBe(1)
    expect(summary.savedCount).toBe(2)
    expect(summary.retainedAudioCount).toBe(1)
    expect(summary.totalBytes).toBeGreaterThan(0)
  })

  it('formats byte counts for quick settings copy', () => {
    expect(formatLocalDataSize(980)).toBe('980 B')
    expect(formatLocalDataSize(1_536)).toBe('1.5 KB')
    expect(formatLocalDataSize(2_097_152)).toBe('2.0 MB')
  })
})
