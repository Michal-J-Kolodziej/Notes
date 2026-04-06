import type { EntryRecord, EntryStatus } from './types'

export type EntrySearchScope = 'all' | 'drafts' | 'saved'

const DRAFT_ENTRY_STATUSES: Array<EntryStatus> = [
  'draft_local',
  'recording',
  'processing',
  'review_ready',
  'needs_retry',
]

const SAVED_ENTRY_STATUSES: Array<EntryStatus> = ['saved_local', 'saved_remote']

function now() {
  return Date.now()
}

function randomId() {
  return crypto.randomUUID()
}

export function createEntryRecord(overrides: Partial<EntryRecord> = {}): EntryRecord {
  const timestamp = overrides.createdAt ?? now()
  const updatedAt = overrides.updatedAt ?? timestamp

  return {
    id: overrides.id ?? randomId(),
    deviceLocalId: overrides.deviceLocalId ?? randomId(),
    userId: overrides.userId,
    ownerMode: overrides.ownerMode ?? 'guest_local',
    sourceType: overrides.sourceType ?? 'text',
    status: overrides.status ?? 'draft_local',
    title: overrides.title ?? '',
    transcript: overrides.transcript ?? '',
    hasAudio: overrides.hasAudio ?? false,
    audioFileId: overrides.audioFileId ?? null,
    storageMode: overrides.storageMode ?? 'transcript_only',
    createdAt: timestamp,
    updatedAt,
  }
}

export function sortEntriesByUpdatedAtDesc(entries: Array<EntryRecord>) {
  return [...entries].sort((left, right) => {
    if (right.updatedAt !== left.updatedAt) {
      return right.updatedAt - left.updatedAt
    }

    if (right.createdAt !== left.createdAt) {
      return right.createdAt - left.createdAt
    }

    return right.id.localeCompare(left.id)
  })
}

export function isDraftEntry(entry: EntryRecord) {
  return DRAFT_ENTRY_STATUSES.includes(entry.status)
}

export function isSavedEntry(entry: EntryRecord) {
  return SAVED_ENTRY_STATUSES.includes(entry.status)
}

function normalizeSearchQuery(query: string) {
  return query.trim().toLocaleLowerCase()
}

function matchesSearchQuery(entry: EntryRecord, query: string) {
  if (!query) {
    return true
  }

  const haystack = `${entry.title}\n${entry.transcript}`.toLocaleLowerCase()
  return haystack.includes(query)
}

function matchesScope(entry: EntryRecord, scope: EntrySearchScope) {
  if (scope === 'drafts') {
    return isDraftEntry(entry)
  }

  if (scope === 'saved') {
    return isSavedEntry(entry)
  }

  return true
}

export function filterEntriesForSearch(
  entries: Array<EntryRecord>,
  {
    query,
    scope,
  }: {
    query: string
    scope: EntrySearchScope
  },
) {
  const normalizedQuery = normalizeSearchQuery(query)

  return sortEntriesByUpdatedAtDesc(
    entries.filter(
      (entry) =>
        matchesScope(entry, scope) && matchesSearchQuery(entry, normalizedQuery),
    ),
  )
}
