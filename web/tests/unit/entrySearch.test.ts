import { describe, expect, it } from 'vitest'
import {
  
  filterEntriesForSearch
} from '../../src/features/entries'
import { createEntryRecord } from '../../src/features/entries/selectors'
import type {EntrySearchScope} from '../../src/features/entries';

function searchTitles(
  scope: EntrySearchScope,
  query: string,
  entries = [
    createEntryRecord({
      createdAt: 10,
      id: 'saved-newest',
      status: 'saved_local',
      title: 'Morning anchor',
      transcript: 'Today felt steady',
      updatedAt: 40,
    }),
    createEntryRecord({
      createdAt: 9,
      id: 'draft-match',
      status: 'draft_local',
      title: 'Unfinished thought',
      transcript: 'anchor draft transcript',
      updatedAt: 30,
    }),
    createEntryRecord({
      createdAt: 8,
      id: 'saved-older',
      status: 'saved_local',
      title: 'Evening reflection',
      transcript: 'Different note',
      updatedAt: 20,
    }),
  ],
) {
  return filterEntriesForSearch(entries, { query, scope }).map((entry) => entry.id)
}

describe('filterEntriesForSearch', () => {
  it('matches title and transcript text case-insensitively', () => {
    expect(searchTitles('all', 'ANCHOR')).toEqual([
      'saved-newest',
      'draft-match',
    ])
  })

  it('returns scope-filtered results sorted by latest update when the query is empty', () => {
    expect(searchTitles('saved', '')).toEqual(['saved-newest', 'saved-older'])
    expect(searchTitles('drafts', '')).toEqual(['draft-match'])
  })

  it('trims whitespace before filtering', () => {
    expect(searchTitles('all', '  reflection  ')).toEqual(['saved-older'])
  })
})
