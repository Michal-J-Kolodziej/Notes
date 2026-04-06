import { Link } from '@tanstack/react-router'
import { useId, useRef } from 'react'
import type { AppSessionSummary } from '~/lib/auth'
import type { AccountMigrationPlan } from './accountMigration'
import type {
  AccountCopyVerification,
  RemoteAccountCopyPreviewItem,
} from './accountCopyVerification'
import type { LocalDataSummary } from '~/features/settings/localDataSummary'
import { formatLocalDataSize } from '~/features/settings/localDataSummary'

interface SettingsAccountSnapshotItem {
  entryCount: number
  guestSessionId: string
  isCurrentDevice: boolean
  isRestorable: boolean
  label: string
  lastCopiedAt: number | null
  previewTitles: Array<string>
  retainedAudioCount: number
}

interface SettingsScreenProps {
  accountSnapshots?: Array<SettingsAccountSnapshotItem>
  accountCopyPreview?: Array<RemoteAccountCopyPreviewItem>
  accountCopyVerification?: AccountCopyVerification
  accountControls?: React.ReactNode
  accountMigration?: AccountMigrationPlan
  canRetryAccountPreparation?: boolean
  canRestoreFromAccountCopy?: boolean
  canRestoreOtherAccountSnapshots?: boolean
  dataSummary?: LocalDataSummary
  installState?: 'hidden' | 'installable' | 'installed' | 'manual_ios'
  isCopyingToAccount?: boolean
  isDeleting: boolean
  isDeletingAccountCopy?: boolean
  isExporting: boolean
  isImporting: boolean
  restoringAccountSnapshotGuestSessionId?: string | null
  isRestoringAccountCopy?: boolean
  isSummaryLoading: boolean
  sessionSummary?: AppSessionSummary
  notice?: {
    message: string
    tone: 'error' | 'success'
  }
  onCopyToAccount?: () => void
  onDeleteAccountCopy?: () => void
  onDeleteAll: () => void
  onExport: () => void
  onImport: (file: File) => void
  onRestoreAccountSnapshot?: (guestSessionId: string, label: string) => void
  onRestoreFromAccountCopy?: () => void
  onRetryAccountPreparation?: () => void
}

export function SettingsScreen({
  accountSnapshots,
  accountCopyPreview,
  accountCopyVerification,
  accountControls,
  accountMigration,
  canRetryAccountPreparation = false,
  canRestoreFromAccountCopy = false,
  canRestoreOtherAccountSnapshots = false,
  dataSummary,
  installState = 'hidden',
  isCopyingToAccount = false,
  isDeleting,
  isDeletingAccountCopy = false,
  isExporting,
  isImporting,
  restoringAccountSnapshotGuestSessionId = null,
  isRestoringAccountCopy = false,
  isSummaryLoading,
  sessionSummary,
  notice,
  onCopyToAccount,
  onDeleteAccountCopy,
  onDeleteAll,
  onExport,
  onImport,
  onRestoreAccountSnapshot,
  onRestoreFromAccountCopy,
  onRetryAccountPreparation,
}: SettingsScreenProps) {
  const restoreInputId = useId()
  const restoreInputRef = useRef<HTMLInputElement | null>(null)
  const noticeStyles =
    notice?.tone === 'error'
      ? 'border-[rgba(178,57,38,0.18)] bg-[rgba(178,57,38,0.08)] text-[var(--ink)]'
      : 'border-[rgba(67,138,92,0.16)] bg-[rgba(67,138,92,0.08)] text-[var(--ink)]'
  const previewTimestampFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

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
              On this device
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
              Local notes and audio at a glance.
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Use this snapshot before you export, restore, or delete local data.
            </p>
            {isSummaryLoading || !dataSummary ? (
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                Loading local app data.
              </p>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  <p className="rounded-full bg-[rgba(45,26,22,0.06)] px-3 py-1 text-sm font-semibold text-[var(--ink)]">
                    {dataSummary.savedCount} saved{' '}
                    {dataSummary.savedCount === 1 ? 'note' : 'notes'}
                  </p>
                  <p className="rounded-full bg-[rgba(45,26,22,0.06)] px-3 py-1 text-sm font-semibold text-[var(--ink)]">
                    {dataSummary.draftCount} draft
                    {dataSummary.draftCount === 1 ? '' : 's'}
                  </p>
                  <p className="rounded-full bg-[rgba(45,26,22,0.06)] px-3 py-1 text-sm font-semibold text-[var(--ink)]">
                    {dataSummary.retainedAudioCount} retained audio
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Local app data: {formatLocalDataSize(dataSummary.totalBytes)}
                </p>
              </>
            )}
          </section>

          {sessionSummary ? (
            <section className="rounded-[1.5rem] border border-[rgba(58,34,29,0.1)] bg-white/75 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Identity
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
                  {sessionSummary.heading}
                </h2>
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
              {canRetryAccountPreparation && onRetryAccountPreparation ? (
                <button
                  className="mt-4 inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-[rgba(58,34,29,0.14)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)]"
                  onClick={onRetryAccountPreparation}
                  type="button"
                >
                  Retry account prep
                </button>
              ) : null}
              {accountControls ? <div className="mt-4">{accountControls}</div> : null}
            </section>
          ) : null}

          {!sessionSummary && accountControls ? (
            <section className="rounded-[1.5rem] border border-[rgba(58,34,29,0.1)] bg-white/75 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Account
              </p>
              <div className="mt-4">{accountControls}</div>
            </section>
          ) : null}

          {accountMigration ? (
            <section className="rounded-[1.5rem] border border-[rgba(58,34,29,0.1)] bg-white/75 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Account copy
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
                  {accountMigration.heading}
                </h2>
                <p className="rounded-full bg-[rgba(45,26,22,0.06)] px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-[var(--ink)]">
                  {accountMigration.statusLabel}
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {accountMigration.detail}
              </p>
              <button
                className="mt-4 inline-flex min-h-12 items-center justify-center rounded-[1rem] bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(230,113,96,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={
                  accountMigration.kind !== 'ready' ||
                  isCopyingToAccount ||
                  isDeleting ||
                  isExporting ||
                  isImporting ||
                  isRestoringAccountCopy
                }
                onClick={() => {
                  onCopyToAccount?.()
                }}
                type="button"
              >
                {isCopyingToAccount
                  ? 'Copying local notes'
                  : accountMigration.actionLabel}
              </button>
            </section>
          ) : null}

          {accountCopyVerification ? (
            <section className="rounded-[1.5rem] border border-[rgba(58,34,29,0.1)] bg-white/75 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Verified account copy
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
                  {accountCopyVerification.heading}
                </h2>
                <p className="rounded-full bg-[rgba(45,26,22,0.06)] px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-[var(--ink)]">
                  {accountCopyVerification.statusLabel}
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {accountCopyVerification.detail}
              </p>
              {canRestoreFromAccountCopy && onRestoreFromAccountCopy ? (
                <>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    This only repopulates an empty device from the last copied
                    snapshot for this same device session. It does not enable live
                    sync.
                  </p>
                  <button
                    className="mt-4 inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-[rgba(58,34,29,0.14)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={
                      isCopyingToAccount ||
                      isDeleting ||
                      isDeletingAccountCopy ||
                      isExporting ||
                      isImporting ||
                      isRestoringAccountCopy
                    }
                    onClick={() => {
                      onRestoreFromAccountCopy()
                    }}
                    type="button"
                  >
                    {isRestoringAccountCopy
                      ? 'Restoring account copy...'
                      : 'Restore from account copy'}
                  </button>
                </>
              ) : null}
              {accountCopyPreview && accountCopyPreview.length > 0 ? (
                <div className="mt-4 rounded-[1.1rem] border border-[rgba(58,34,29,0.08)] bg-[rgba(255,255,255,0.66)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Latest copied notes
                  </p>
                  <div className="mt-3 grid gap-3">
                    {accountCopyPreview.map((entry) => (
                      <div
                        className="rounded-[0.95rem] border border-[rgba(58,34,29,0.08)] bg-white/80 px-3 py-3"
                        key={entry.deviceLocalId}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[var(--ink)]">
                            {entry.title.trim() || 'Untitled note'}
                          </p>
                          <div className="flex flex-wrap justify-end gap-2">
                            <p className="rounded-full bg-[rgba(45,26,22,0.06)] px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-[var(--ink)]">
                              {entry.sourceType === 'voice' ? 'Voice' : 'Text'}
                            </p>
                            {entry.hasAudio ? (
                              <p className="rounded-full bg-[rgba(230,113,96,0.12)] px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-[var(--ink)]">
                                Audio kept
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                          Updated {previewTimestampFormatter.format(entry.updatedAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {onDeleteAccountCopy &&
              accountCopyVerification.kind !== 'empty' &&
              accountCopyVerification.kind !== 'loading' &&
              accountCopyVerification.kind !== 'unavailable' ? (
                <button
                  className="mt-4 inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-[rgba(178,57,38,0.18)] bg-[rgba(178,57,38,0.06)] px-4 py-3 text-sm font-semibold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={
                    isCopyingToAccount ||
                    isDeleting ||
                    isDeletingAccountCopy ||
                    isExporting ||
                    isImporting ||
                    isRestoringAccountCopy
                  }
                  onClick={() => {
                    onDeleteAccountCopy()
                  }}
                  type="button"
                >
                  {isDeletingAccountCopy
                    ? 'Removing account copy...'
                    : 'Delete account copy'}
                </button>
              ) : null}
            </section>
          ) : null}

          {accountSnapshots && accountSnapshots.length > 0 ? (
            <section className="rounded-[1.5rem] border border-[rgba(58,34,29,0.1)] bg-white/75 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Other account snapshots
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
                Restore another copied snapshot when this device is empty.
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                These snapshots came from other device sessions in this account.
                Restore stays disabled until local notes on this device are empty.
              </p>
              <div className="mt-4 grid gap-3">
                {accountSnapshots.map((snapshot) => {
                  const restoreDisabled =
                    !snapshot.isRestorable ||
                    !canRestoreOtherAccountSnapshots ||
                    isCopyingToAccount ||
                    isDeleting ||
                    isDeletingAccountCopy ||
                    isExporting ||
                    isImporting ||
                    isRestoringAccountCopy

                  return (
                    <div
                      className="rounded-[1rem] border border-[rgba(58,34,29,0.08)] bg-white/80 p-4"
                      key={snapshot.guestSessionId}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--ink)]">
                          {snapshot.label}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <p className="rounded-full bg-[rgba(45,26,22,0.06)] px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-[var(--ink)]">
                            {snapshot.entryCount} note
                            {snapshot.entryCount === 1 ? '' : 's'}
                          </p>
                          {snapshot.retainedAudioCount > 0 ? (
                            <p className="rounded-full bg-[rgba(230,113,96,0.12)] px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-[var(--ink)]">
                              {snapshot.retainedAudioCount} audio
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                        {snapshot.lastCopiedAt
                          ? `Copied ${previewTimestampFormatter.format(snapshot.lastCopiedAt)}`
                          : 'Copied time unavailable'}
                      </p>
                      {snapshot.previewTitles.length > 0 ? (
                        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                          Recent notes: {snapshot.previewTitles.join(', ')}
                        </p>
                      ) : null}
                      <button
                        className="mt-4 inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-[rgba(58,34,29,0.12)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={restoreDisabled}
                        onClick={() => {
                          onRestoreAccountSnapshot?.(
                            snapshot.guestSessionId,
                            snapshot.label,
                          )
                        }}
                        type="button"
                      >
                        {restoringAccountSnapshotGuestSessionId ===
                        snapshot.guestSessionId
                          ? 'Restoring this snapshot...'
                          : restoreDisabled
                          ? 'Empty this device to restore'
                          : 'Restore this snapshot'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}

          <section className="rounded-[1.5rem] border border-[rgba(58,34,29,0.1)] bg-white/75 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Install
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
              Add Notes to your home screen.
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {installState === 'installed'
                ? 'This app is already installed on this device.'
                : installState === 'installable'
                  ? 'Your browser can install this app now. Use the install action on Home or the browser install control.'
                  : installState === 'manual_ios'
                    ? 'On iPhone or iPad, use the browser Share menu and choose Add to Home Screen when install is not offered automatically.'
                    : 'When your browser supports install prompts, Notes can open in a cleaner app shell with its own icon.'}
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              On iPhone or iPad, open this app in Safari, use the Safari Share
              menu, then choose Add to Home Screen.
            </p>
          </section>

          <section className="rounded-[1.5rem] border border-[rgba(58,34,29,0.1)] bg-white/75 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
              Support resources
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--ink)]">
              Reach real support when you need it.
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              If you are in the U.S. and need immediate emotional support, use
              official crisis resources. This app does not provide crisis care.
            </p>
            <div className="mt-4 grid gap-3">
              <a
                className="rounded-[1rem] border border-[rgba(58,34,29,0.12)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)]"
                href="https://988lifeline.org/get-help/"
                rel="noreferrer"
                target="_blank"
              >
                Call or text 988
              </a>
              <a
                className="rounded-[1rem] border border-[rgba(58,34,29,0.12)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)]"
                href="https://findtreatment.gov/"
                rel="noreferrer"
                target="_blank"
              >
                FindTreatment.gov
              </a>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              If you are outside the U.S., use local emergency or crisis
              support services in your area.
            </p>
          </section>

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
              disabled={
                isDeleting ||
                isExporting ||
                isImporting ||
                isRestoringAccountCopy
              }
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
              disabled={
                isDeleting ||
                isExporting ||
                isImporting ||
                isRestoringAccountCopy
              }
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
              storage on this device. If this device already copied notes into a
              signed-in account, that uploaded snapshot stays separate until you
              remove it from the account.
            </p>
            <button
              className="mt-4 inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-[rgba(178,57,38,0.18)] bg-[rgba(178,57,38,0.06)] px-4 py-3 text-sm font-semibold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={
                isDeleting ||
                isExporting ||
                isImporting ||
                isRestoringAccountCopy
              }
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
