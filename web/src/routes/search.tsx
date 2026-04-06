import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import type {EntryRecord, EntrySearchScope} from '~/features/entries';
import {
  EntryListCard,
  
  
  filterEntriesForSearch,
  useEntryStore,
  useForeignEntryStoreMutationVersion,
  useRelativeTimeNow
} from '~/features/entries'

type SearchRouteSearch = {
  q?: string
  scope?: EntrySearchScope
}

const SEARCH_SCOPE_OPTIONS: Array<{
  label: string
  value: EntrySearchScope
}> = [
  { label: 'All local notes', value: 'all' },
  { label: 'Saved on device', value: 'saved' },
  { label: 'Drafts only', value: 'drafts' },
]

export const Route = createFileRoute('/search')({
  validateSearch: (search: Record<string, unknown>): SearchRouteSearch => ({
    q: typeof search.q === 'string' ? search.q : undefined,
    scope:
      search.scope === 'saved' || search.scope === 'drafts' ? search.scope : 'all',
  }),
  component: SearchRoute,
})

function SearchRoute() {
  const store = useEntryStore()
  const foreignMutationVersion = useForeignEntryStoreMutationVersion()
  const navigate = useNavigate({ from: Route.fullPath })
  const now = useRelativeTimeNow()
  const { q = '', scope = 'all' } = Route.useSearch()
  const [entries, setEntries] = useState<Array<EntryRecord>>([])

  useEffect(() => {
    let active = true

    void store.listEntries().then((items) => {
      if (!active) {
        return
      }

      setEntries(items)
    })

    return () => {
      active = false
    }
  }, [foreignMutationVersion, store])

  const results = useMemo(
    () => filterEntriesForSearch(entries, { query: q, scope }),
    [entries, q, scope],
  )

  const trimmedQuery = q.trim()

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[34rem] flex-col gap-5 px-4 py-6 sm:px-6">
      <section className="rounded-[2rem] border border-[rgba(255,255,255,0.45)] bg-[var(--panel)] p-6 shadow-[0_24px_80px_rgba(38,23,18,0.12)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
          Search
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
          Search your local notes.
        </h1>
        <p className="mt-3 text-[1rem] leading-7 text-[var(--muted)]">
          Search stays on this device. Audio is not searched, only note titles
          and note text.
        </p>

        <div className="mt-5 grid gap-3">
          <label className="sr-only" htmlFor="search-notes-input">
            Search notes
          </label>
          <input
            aria-label="Search notes"
            className="min-h-12 rounded-[1.1rem] border border-[rgba(58,34,29,0.12)] bg-white px-4 py-3 text-base text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent)]"
            id="search-notes-input"
            onChange={(event) => {
              const nextQuery = event.currentTarget.value
              void navigate({
                replace: true,
                search: (current) => ({
                  ...current,
                  q: nextQuery.length > 0 ? nextQuery : undefined,
                }),
              })
            }}
            placeholder="Search titles and note text"
            type="search"
            value={q}
          />

          <div className="flex flex-wrap gap-2">
            {SEARCH_SCOPE_OPTIONS.map((option) => {
              const selected = option.value === scope

              return (
                <button
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    selected
                      ? 'bg-[var(--accent)] text-white shadow-[0_12px_24px_rgba(230,113,96,0.2)]'
                      : 'border border-[rgba(58,34,29,0.12)] bg-white/80 text-[var(--ink)]'
                  }`}
                  key={option.value}
                  onClick={() => {
                    void navigate({
                      replace: true,
                      search: (current) => ({
                        ...current,
                        scope: option.value === 'all' ? undefined : option.value,
                      }),
                    })
                  }}
                  type="button"
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {results.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-[rgba(58,34,29,0.14)] bg-white/55 p-4 text-sm leading-6 text-[var(--muted)]">
              {trimmedQuery
                ? `No local matches for “${trimmedQuery}” in this scope yet.`
                : 'No local notes match this scope yet.'}
            </div>
          ) : (
            results.map((entry) => (
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
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            className="inline-flex rounded-full border border-[rgba(58,34,29,0.12)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--ink)]"
            to="/recent"
          >
            Browse recent
          </Link>
          <Link
            className="inline-flex rounded-full border border-[rgba(58,34,29,0.12)] bg-white/80 px-4 py-3 text-sm font-semibold text-[var(--ink)]"
            to="/drafts"
          >
            Browse drafts
          </Link>
          <Link
            className="inline-flex rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white"
            to="/"
          >
            Back to home
          </Link>
        </div>
      </section>
    </main>
  )
}
