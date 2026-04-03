import type { ReactNode } from 'react'

function ActionLink({
  children,
  href,
  variant = 'primary',
}: {
  children: ReactNode
  href: string
  variant?: 'primary' | 'secondary'
}) {
  const base =
    'inline-flex w-full items-center justify-center rounded-[1.25rem] px-4 py-4 text-left text-base font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel)]'
  const styles =
    variant === 'primary'
      ? 'bg-[var(--accent)] text-white shadow-[0_16px_40px_rgba(230,113,96,0.28)]'
      : 'border border-[rgba(58,34,29,0.12)] bg-white/80 text-[var(--ink)] backdrop-blur-sm'

  return (
    <a className={`${base} ${styles} min-h-14`} href={href}>
      {children}
    </a>
  )
}

function NavLink({
  children,
  href,
}: {
  children: ReactNode
  href: string
}) {
  return (
    <a
      className="flex min-h-24 flex-col justify-between rounded-[1.35rem] border border-[rgba(58,34,29,0.1)] bg-white/75 p-4 text-[var(--ink)] shadow-[0_12px_30px_rgba(40,28,25,0.06)] transition duration-200 hover:-translate-y-0.5 hover:bg-white"
      href={href}
    >
      {children}
    </a>
  )
}

export function HomeScreen() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[34rem] flex-col gap-6 px-4 py-6 sm:px-6">
      <section className="rounded-[2rem] border border-[rgba(255,255,255,0.45)] bg-[var(--panel)] p-6 shadow-[0_24px_80px_rgba(38,23,18,0.12)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
          Private notes, less friction
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.04em] text-[var(--ink)] sm:text-5xl">
          Make space for a thought
        </h1>
        <p className="mt-4 max-w-prose text-[1.02rem] leading-7 text-[var(--muted)]">
          Speak it, type it, save it, and come back to it later without losing
          the thread.
        </p>

        <div className="mt-6 grid gap-3">
          <ActionLink href="/note/new?mode=voice" variant="primary">
            Start a voice note
          </ActionLink>
          <ActionLink href="/note/new?mode=text" variant="secondary">
            Start a text note
          </ActionLink>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <NavLink href="/drafts">
          <span className="text-sm font-medium text-[var(--muted)]">Queue</span>
          <span className="text-xl font-semibold tracking-[-0.03em]">
            Drafts
          </span>
        </NavLink>
        <NavLink href="/recent">
          <span className="text-sm font-medium text-[var(--muted)]">
            Retrieval
          </span>
          <span className="text-xl font-semibold tracking-[-0.03em]">
            Recent
          </span>
        </NavLink>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <NavLink href="/note/new?mode=text">
          <span className="text-sm font-medium text-[var(--muted)]">
            Capture
          </span>
          <span className="text-lg font-semibold tracking-[-0.03em]">
            New note
          </span>
        </NavLink>
        <NavLink href="/settings">
          <span className="text-sm font-medium text-[var(--muted)]">
            Controls
          </span>
          <span className="text-lg font-semibold tracking-[-0.03em]">
            Settings
          </span>
        </NavLink>
        <div className="rounded-[1.35rem] border border-dashed border-[rgba(58,34,29,0.14)] bg-white/55 p-4 text-sm leading-6 text-[var(--muted)]">
          Calm by default. Built for a thumb, a voice, and a quick return later.
        </div>
      </section>
    </main>
  )
}
