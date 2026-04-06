import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type {EntryRecord} from '~/features/entries';
import {
  EntryListCard,
  
  isSavedEntry,
  useEntryStore,
  useForeignEntryStoreMutationVersion,
  useRelativeTimeNow
} from '~/features/entries'

export const Route = createFileRoute('/recent')({
  component: RecentRoute,
})

function RecentRoute() {
  const store = useEntryStore()
  const foreignMutationVersion = useForeignEntryStoreMutationVersion()
  const now = useRelativeTimeNow()
  const [entries, setEntries] = useState<Array<EntryRecord>>([])

  useEffect(() => {
    let active = true

    void store.listEntries().then((items) => {
      if (!active) {
        return
      }

      setEntries(items.filter(isSavedEntry))
    })

    return () => {
      active = false
    }
  }, [foreignMutationVersion, store])

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[34rem] flex-col gap-5 px-4 py-6 sm:px-6">
      <section className="rounded-[2rem] border border-[rgba(255,255,255,0.45)] bg-[var(--panel)] p-6 shadow-[0_24px_80px_rgba(38,23,18,0.12)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
          Recent
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
          Your latest entries will land here.
        </h1>
        <p className="mt-3 text-[1rem] leading-7 text-[var(--muted)]">
          Recent stays simple, local, and easy to scan with one hand.
        </p>
        <div className="mt-6 grid gap-3">
          {entries.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-[rgba(58,34,29,0.14)] bg-white/55 p-4 text-sm leading-6 text-[var(--muted)]">
              Save a note locally and it will show up here.
            </div>
          ) : (
            entries.map((entry) => (
              <Link
                className="block"
                key={entry.id}
                params={{ noteId: entry.id }}
                search={{ mode: entry.sourceType }}
                to="/note/$noteId"
              >
                <EntryListCard entry={entry} now={now} />
              </Link>
            ))
          )}
          <Link
            className="inline-flex rounded-full border border-[rgba(58,34,29,0.12)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--ink)]"
            to="/search"
          >
            Search local notes
          </Link>
          <Link
            className="mt-2 inline-flex rounded-full border border-[rgba(58,34,29,0.12)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--ink)]"
            to="/"
          >
            Back to home
          </Link>
        </div>
      </section>
    </main>
  )
}
