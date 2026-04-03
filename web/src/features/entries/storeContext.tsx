import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createLocalEntryStore } from './localStore'
import type { EntryStore } from './types'

const EntryStoreContext = createContext<EntryStore | null>(null)

export function EntryStoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<EntryStore | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    void createLocalEntryStore()
      .then((nextStore) => {
        if (mounted) {
          setStore(nextStore)
        }
      })
      .catch((nextError: unknown) => {
        if (mounted) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'Failed to open the local note store.',
          )
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  const value = useMemo(() => store, [store])

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[34rem] items-center px-4 py-8">
        <section className="rounded-[2rem] border border-[rgba(58,34,29,0.1)] bg-white/80 p-6 shadow-[0_18px_50px_rgba(38,23,18,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
            Local storage unavailable
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
            This app could not open durable browser storage.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {error}
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Drafts would be lost on refresh or restart, so note editing stays
            disabled until durable local storage is available.
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Try a regular browser window, disable private browsing, or use a
            different browser profile.
          </p>
        </section>
      </main>
    )
  }

  if (!value) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[34rem] items-center px-4 py-8">
        <section className="rounded-[2rem] border border-[rgba(58,34,29,0.1)] bg-white/80 p-6 shadow-[0_18px_50px_rgba(38,23,18,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
            Preparing notes
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
            Opening the local note space.
          </h1>
        </section>
      </main>
    )
  }

  return (
    <EntryStoreContext.Provider value={value}>
      {children}
    </EntryStoreContext.Provider>
  )
}

export function useEntryStore() {
  const store = useContext(EntryStoreContext)

  if (!store) {
    throw new Error('useEntryStore must be used inside EntryStoreProvider')
  }

  return store
}
