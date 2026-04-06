import {
  formatEntryUpdatedAtLabel,
  formatEntryUpdatedAtTitle,
} from './entryTime'
import type { EntryRecord } from './types'

function getEntryStatusLabel(entry: EntryRecord) {
  switch (entry.status) {
    case 'saved_local':
      return 'Saved on device'
    case 'saved_remote':
      return 'Saved remotely'
    case 'recording':
      return 'Recording'
    case 'processing':
      return 'Processing'
    case 'review_ready':
      return 'Ready to review'
    case 'needs_retry':
      return 'Needs retry'
    case 'syncing':
      return 'Syncing'
    case 'draft_local':
    default:
      return 'Draft only on device'
  }
}

function getEntryKindLabel(entry: EntryRecord) {
  return entry.sourceType === 'voice' ? 'Voice note' : 'Text note'
}

function getEntryTimeLabelPrefix(entry: EntryRecord) {
  return entry.status === 'saved_local' || entry.status === 'saved_remote'
    ? 'Saved'
    : 'Updated'
}

export function EntryListCard({
  entry,
  now = Date.now(),
}: {
  entry: EntryRecord
  now?: number
}) {
  const relativeTime = formatEntryUpdatedAtLabel(entry.updatedAt, now)
  const absoluteTime = formatEntryUpdatedAtTitle(entry.updatedAt)
  const timeLabelPrefix = getEntryTimeLabelPrefix(entry)

  return (
    <div className="rounded-[1.25rem] border border-[rgba(58,34,29,0.1)] bg-white/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
          {getEntryKindLabel(entry)}
        </p>
        <p className="rounded-full bg-[rgba(45,26,22,0.06)] px-3 py-1 text-[11px] font-semibold text-[var(--ink)]">
          {getEntryStatusLabel(entry)}
        </p>
      </div>
      <h2 className="mt-3 text-lg font-semibold text-[var(--ink)]">
        {entry.title || (entry.status === 'saved_local' ? 'Untitled note' : 'Untitled draft')}
      </h2>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        <time dateTime={new Date(entry.updatedAt).toISOString()} title={absoluteTime}>
          {timeLabelPrefix} {relativeTime}
        </time>
        <span aria-hidden="true">•</span>
        <span>{absoluteTime}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        {entry.transcript || 'No preview yet.'}
      </p>
    </div>
  )
}
