import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'
import { EntryListCard } from '~/features/entries/EntryListCard'
import { createEntryRecord } from '~/features/entries/selectors'

describe('EntryListCard', () => {
  it('renders saved-note metadata with relative time and kind', () => {
    render(
      <EntryListCard
        entry={createEntryRecord({
          id: 'saved-note',
          sourceType: 'voice',
          status: 'saved_local',
          title: 'Morning reset',
          transcript: 'Walked outside and felt better.',
          updatedAt: Date.UTC(2026, 3, 3, 10, 55, 0),
        })}
        now={Date.UTC(2026, 3, 3, 11, 0, 0)}
      />,
    )

    expect(screen.getByText(/saved on device/i)).toBeInTheDocument()
    expect(screen.getByText(/voice note/i)).toBeInTheDocument()
    expect(screen.getByText(/5 min ago/i)).toBeInTheDocument()
  })

  it('renders active draft-state metadata without losing the transcript preview', () => {
    render(
      <EntryListCard
        entry={createEntryRecord({
          id: 'draft-note',
          sourceType: 'text',
          status: 'needs_retry',
          title: 'Retry later',
          transcript: 'Transcript failed but draft is still here.',
          updatedAt: Date.UTC(2026, 3, 3, 9, 0, 0),
        })}
        now={Date.UTC(2026, 3, 3, 11, 0, 0)}
      />,
    )

    expect(screen.getByText(/needs retry/i)).toBeInTheDocument()
    expect(screen.getByText(/text note/i)).toBeInTheDocument()
    expect(screen.getByText(/2 hr ago/i)).toBeInTheDocument()
    expect(
      screen.getByText(/transcript failed but draft is still here/i),
    ).toBeInTheDocument()
  })
})
