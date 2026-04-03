import { Link, createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useEntryStore, type EntryRecord } from '~/features/entries'

export const Route = createFileRoute('/recent')({
  component: RecentRoute,
})

function RecentRoute() {
  const store = useEntryStore()
  const [entries, setEntries] = useState<EntryRecord[]>([])

  useEffect(() => {
    void store.listEntries().then((items) => {
      setEntries(
        items.filter((item) => ['saved_local', 'saved_remote'].includes(item.status)),
      )
    })
  }, [store])

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
          The first implementation pass keeps this screen simple, local, and
          thumb-readable.
        </p>
        <div className="mt-6 grid gap-3">
          {entries.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-[rgba(58,34,29,0.14)] bg-white/55 p-4 text-sm leading-6 text-[var(--muted)]">
              Save a note locally and it will show up here.
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
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                    {entry.sourceType === 'voice' ? 'Voice note' : 'Text note'}
                  </p>
                  <p className="rounded-full bg-[rgba(45,26,22,0.06)] px-3 py-1 text-[11px] font-semibold text-[var(--ink)]">
                    Saved on device
                  </p>
                </div>
                <h2 className="mt-2 text-lg font-semibold text-[var(--ink)]">
                  {entry.title || 'Untitled note'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {entry.transcript || 'No preview yet.'}
                </p>
              </Link>
            ))
          )}
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
