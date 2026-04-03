import type { EntryRecord } from './types'

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

export function sortEntriesByUpdatedAtDesc(entries: EntryRecord[]) {
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
