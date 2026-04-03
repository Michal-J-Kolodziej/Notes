import { describe, expect, it } from 'vitest'
import {
  formatEntryUpdatedAtLabel,
  formatEntryUpdatedAtTitle,
} from '~/features/entries/entryTime'

describe('entry time formatting', () => {
  it('formats immediate updates as just now', () => {
    const now = Date.UTC(2026, 3, 3, 12, 0, 0)

    expect(formatEntryUpdatedAtLabel(now, now)).toBe('just now')
  })

  it('formats minute and hour deltas for compact list metadata', () => {
    const now = Date.UTC(2026, 3, 3, 12, 0, 0)

    expect(formatEntryUpdatedAtLabel(now - 2 * 60 * 1000, now)).toBe('2 min ago')
    expect(formatEntryUpdatedAtLabel(now - 3 * 60 * 60 * 1000, now)).toBe('3 hr ago')
  })

  it('formats older updates with day labels and a stable absolute title', () => {
    const now = Date.UTC(2026, 3, 6, 12, 0, 0)
    const updatedAt = Date.UTC(2026, 3, 3, 8, 30, 0)

    expect(formatEntryUpdatedAtLabel(updatedAt, now)).toBe('3 days ago')
    expect(formatEntryUpdatedAtTitle(updatedAt, 'en-US')).toContain('Apr')
    expect(formatEntryUpdatedAtTitle(updatedAt, 'en-US')).toContain('2026')
  })
})
