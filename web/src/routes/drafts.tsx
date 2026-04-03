import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useEntryStore, type EntryRecord } from '~/features/entries'

export const Route = createFileRoute('/drafts')({
  component: DraftsRoute,
})

function DraftsRoute() {
  const store = useEntryStore()
  const [entries, setEntries] = useState<EntryRecord[]>([])

  useEffect(() => {
    void store.listEntries().then((items) => {
      setEntries(
        items.filter((item) =>
          ['draft_local', 'recording', 'processing', 'review_ready', 'needs_retry'].includes(
            item.status,
          ),
        ),
      )
    })
  }, [store])

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[34rem] flex-col gap-5 px-4 py-6 sm:px-6">
      <section className="rounded-[2rem] border border-[rgba(255,255,255,0.45)] bg-[var(--panel)] p-6 shadow-[0_24px_80px_rgba(38,23,18,0.12)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
          Drafts
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
          Drafts stay here first.
        </h1>
        <p className="mt-3 text-[1rem] leading-7 text-[var(--muted)]">
          Local drafts and interrupted notes stay visible here before they ever
          become a later-stage sync problem.
        </p>
        <div className="mt-6 grid gap-3">
          {entries.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-[rgba(58,34,29,0.14)] bg-white/55 p-4 text-sm leading-6 text-[var(--muted)]">
              No drafts yet. Start a note from home and it will appear here
              before you save it.
            </div>
          ) : (
            entries.map((entry) => (
              <Link
                className="rounded-[1.25rem] border border-[rgba(58,34,29,0.1)] bg-white/80 p-4"
                key={entry.id}
                params={{ noteId: entry.id }}
                search={{ mode: entry.sourceType }}
                to="/note/$noteId"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  {entry.status.replace('_', ' ')}
                </p>
                <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">
                  {entry.title || 'Untitled draft'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {entry.transcript || 'Still empty.'}
                </p>
              </Link>
            ))
          )}
          <Link
            className="mt-2 inline-flex rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white"
            to="/"
          >
            Back to home
          </Link>
        </div>
      </section>
    </main>
  )
}
