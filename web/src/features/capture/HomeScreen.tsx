import type { ReactNode } from 'react'
import type { AppInstallState } from '~/features/pwa/useAppInstallPrompt'
import type { AppSessionSummary } from '~/lib/auth'

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

export function HomeScreen({
  accountControls,
  installState = { kind: 'hidden' },
  sessionSummary,
}: {
  accountControls?: ReactNode
  installState?: AppInstallState
  sessionSummary?: AppSessionSummary
}) {
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

        {sessionSummary ? (
          <div className="mt-5 rounded-[1.35rem] border border-[rgba(58,34,29,0.1)] bg-white/82 p-4 shadow-[0_12px_30px_rgba(40,28,25,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Identity
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-base font-semibold text-[var(--ink)]">
                {sessionSummary.heading}
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <p className="rounded-full bg-[rgba(230,113,96,0.12)] px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-[var(--ink)]">
                  {sessionSummary.statusLabel}
                </p>
                {sessionSummary.sessionLabel ? (
                  <p className="rounded-full bg-[rgba(45,26,22,0.06)] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-[var(--ink)]">
                    {sessionSummary.sessionLabel}
                  </p>
                ) : null}
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {sessionSummary.detail}
            </p>
          </div>
        ) : null}

        {accountControls ? (
          <div className="mt-4 rounded-[1.35rem] border border-[rgba(58,34,29,0.1)] bg-white/82 p-4 shadow-[0_12px_30px_rgba(40,28,25,0.06)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Account
            </p>
            <div className="mt-3">{accountControls}</div>
          </div>
        ) : null}

        {installState.kind === 'installable' ? (
          <div className="mt-5 rounded-[1.35rem] border border-[rgba(58,34,29,0.1)] bg-white/82 p-4 shadow-[0_12px_30px_rgba(40,28,25,0.06)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
                  Keep Notes one tap away.
                </h2>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                  Keep capture one tap away and reopen notes in a cleaner app
                  shell.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                  onClick={() => {
                    void installState.onInstall()
                  }}
                  type="button"
                >
                  Install app
                </button>
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[rgba(58,34,29,0.12)] bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)]"
                  onClick={installState.onDismiss}
                  type="button"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        ) : null}

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
        <NavLink href="/search">
          <span className="text-sm font-medium text-[var(--muted)]">
            Retrieval
          </span>
          <span className="text-lg font-semibold tracking-[-0.03em]">
            Search
          </span>
        </NavLink>
      </section>
    </main>
  )
}
