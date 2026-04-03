import { Link } from '@tanstack/react-router'
import { useId, useRef } from 'react'

interface SettingsScreenProps {
  isDeleting: boolean
  isExporting: boolean
  isImporting: boolean
  notice?: {
    message: string
    tone: 'error' | 'success'
  }
  onDeleteAll: () => void
  onExport: () => void
  onImport: (file: File) => void
}

export function SettingsScreen({
  isDeleting,
  isExporting,
  isImporting,
  notice,
  onDeleteAll,
  onExport,
  onImport,
}: SettingsScreenProps) {
  const restoreInputId = useId()
  const restoreInputRef = useRef<HTMLInputElement | null>(null)
  const noticeStyles =
    notice?.tone === 'error'
      ? 'border-[rgba(178,57,38,0.18)] bg-[rgba(178,57,38,0.08)] text-[var(--ink)]'
      : 'border-[rgba(67,138,92,0.16)] bg-[rgba(67,138,92,0.08)] text-[var(--ink)]'

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[34rem] flex-col gap-5 px-4 py-6 sm:px-6">
      <section className="rounded-[2rem] border border-[rgba(255,255,255,0.45)] bg-[var(--panel)] p-6 shadow-[0_24px_80px_rgba(38,23,18,0.12)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
          Settings
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
          Privacy and recovery stay visible.
        </h1>
        <div className="mt-4 grid gap-3 text-sm leading-6 text-[var(--muted)]">
          <div className="rounded-[1.25rem] border border-[rgba(58,34,29,0.1)] bg-white/70 p-4">
            Guest notes stay on this device until account sync exists. Export and
            delete actions act on local drafts, saved notes, and retained audio.
          </div>
          <div className="rounded-[1.25rem] border border-[rgba(58,34,29,0.1)] bg-white/70 p-4">
            This app is for capture and recovery. It is not crisis support or a
            replacement for personal help.
          </div>
        </div>

        {notice ? (
          <div
            aria-live="polite"
            className={`mt-4 rounded-[1.25rem] border px-4 py-3 text-sm leading-6 ${noticeStyles}`}
            role="status"
          >
            {notice.message}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4">
          <section className="rounded-[1.5rem] border border-[rgba(58,34,29,0.1)] bg-white/75 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Restore
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
              Replace local notes from a recovery file.
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Restore uses the exported recovery file as a full local snapshot.
              Export current notes first if you want a backup before replacing
              what is on this device now.
            </p>
            <label className="sr-only" htmlFor={restoreInputId}>
              Choose recovery file
            </label>
            <input
              accept=".json,application/json"
              className="sr-only"
              id={restoreInputId}
              onChange={(event) => {
                const nextFile = event.currentTarget.files?.[0]
                event.currentTarget.value = ''

                if (nextFile) {
                  onImport(nextFile)
                }
              }}
              ref={restoreInputRef}
              type="file"
            />
            <button
              className="mt-4 inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-[rgba(58,34,29,0.12)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isDeleting || isExporting || isImporting}
              onClick={() => {
                restoreInputRef.current?.click()
              }}
              type="button"
            >
              {isImporting ? 'Restoring recovery file...' : 'Restore recovery file'}
            </button>
          </section>

          <section className="rounded-[1.5rem] border border-[rgba(58,34,29,0.1)] bg-white/75 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Export
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
              Download a local recovery file.
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              The export includes note text, timestamps, status, and retained
              raw audio when this device still has it.
            </p>
            <button
              className="mt-4 inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(230,113,96,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isDeleting || isExporting || isImporting}
              onClick={onExport}
              type="button"
            >
              {isExporting ? 'Preparing export...' : 'Export local notes'}
            </button>
          </section>

          <section className="rounded-[1.5rem] border border-[rgba(178,57,38,0.14)] bg-white/75 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Delete
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
              Remove all local notes from this device.
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              This clears drafts, saved notes, and retained audio from browser
              storage. It does not affect future account sync because none exists
              yet in this build.
            </p>
            <button
              className="mt-4 inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-[rgba(178,57,38,0.18)] bg-[rgba(178,57,38,0.06)] px-4 py-3 text-sm font-semibold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isDeleting || isExporting || isImporting}
              onClick={onDeleteAll}
              type="button"
            >
              {isDeleting ? 'Deleting local notes...' : 'Delete all local notes'}
            </button>
          </section>
        </div>

        <Link
          className="mt-6 inline-flex rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white"
          to="/"
        >
          Back to home
        </Link>
      </section>
    </main>
  )
}
