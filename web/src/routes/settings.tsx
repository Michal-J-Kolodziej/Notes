import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import type { RemoteAccountCopyStatus } from '~/features/settings/accountCopyVerification'
import {
  useEntryStore,
  useForeignEntryStoreMutationVersion,
} from '~/features/entries'
import { useAppInstallPrompt } from '~/features/pwa/useAppInstallPrompt'
import {
  copyLocalEntriesToAccount,
  createAccountMigrationPlan,
  deleteRemoteAccountCopy,
} from '~/features/settings/accountMigration'
import {
  createAccountCopyVerification,
  getRemoteAccountCopyPreview,
  getRemoteAccountCopyStatus,
} from '~/features/settings/accountCopyVerification'
import { restoreLocalEntriesFromAccountCopy } from '~/features/settings/accountCopyRestore'
import { getRemoteAccountSnapshots } from '~/features/settings/accountSnapshots'
import {
  OptionalSettingsAccountControls,
  canRetryAccountPreparation,
  formatGuestSessionLabel,
  getOptionalAccountPreparationClient,
  getOptionalSharedConvexClient,
  summarizeAppSession,
  useAppSession,
  useAppSessionControls,
} from '~/lib/auth'
import { createLocalEntriesExport } from '~/features/settings/exportLocalEntries'
import { createLocalDataSummary } from '~/features/settings/localDataSummary'
import { restoreLocalEntriesFromJson } from '~/features/settings/restoreLocalEntries'
import { SettingsScreen } from '~/features/settings/SettingsScreen'
import { ConfirmationSheet } from '~/features/ui/ConfirmationSheet'

export const Route = createFileRoute('/settings')({
  component: SettingsRoute,
})

function SettingsRoute() {
  const store = useEntryStore()
  const installState = useAppInstallPrompt()
  const session = useAppSession()
  const { retryAccountPreparation } = useAppSessionControls()
  const foreignMutationVersion = useForeignEntryStoreMutationVersion()
  const [dataSummary, setDataSummary] = useState<
    Awaited<ReturnType<typeof createLocalDataSummary>> | undefined
  >(undefined)
  const [accountCopyVerification, setAccountCopyVerification] = useState<
    ReturnType<typeof createAccountCopyVerification> | undefined
  >(undefined)
  const [remoteAccountCopyStatus, setRemoteAccountCopyStatus] = useState<
    RemoteAccountCopyStatus | undefined
  >(undefined)
  const [accountCopyPreview, setAccountCopyPreview] = useState<
    Awaited<ReturnType<typeof getRemoteAccountCopyPreview>> | undefined
  >(undefined)
  const [accountSnapshots, setAccountSnapshots] = useState<
    Awaited<ReturnType<typeof getRemoteAccountSnapshots>> | undefined
  >(undefined)
  const [isCopyingToAccount, setIsCopyingToAccount] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDeletingAccountCopy, setIsDeletingAccountCopy] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isRestoringAccountCopy, setIsRestoringAccountCopy] = useState(false)
  const [restoringAccountSnapshotGuestSessionId, setRestoringAccountSnapshotGuestSessionId] =
    useState<string | null>(null)
  const [isSummaryLoading, setIsSummaryLoading] = useState(true)
  const [pendingAction, setPendingAction] = useState<
    | { kind: 'copy_to_account' }
    | {
        guestSessionId: string
        kind: 'restore_account_snapshot'
        snapshotLabel: string
      }
    | { kind: 'delete_account_copy' }
    | { kind: 'delete_all' }
    | { file: File; kind: 'replace_local_data' }
    | null
  >(null)
  const [notice, setNotice] = useState<
    | {
        message: string
        tone: 'error' | 'success'
      }
    | undefined
  >(undefined)

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    setNotice(undefined)

    try {
      const payload = await createLocalEntriesExport(store)
      const json = JSON.stringify(payload, null, 2)
      const fileName = `notes-local-export-${payload.exportedAt
        .replace(/:/g, '-')
        .replace(/\./g, '-')}.json`
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.download = fileName
      anchor.href = url
      anchor.rel = 'noopener'
      document.body.append(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => {
        URL.revokeObjectURL(url)
      }, 0)

      setNotice({
        message: 'Local notes export downloaded for this device.',
        tone: 'success',
      })
    } catch (error) {
      setNotice({
        message:
          error instanceof Error
            ? error.message
            : 'Local notes could not be exported from this device.',
        tone: 'error',
      })
    } finally {
      setIsExporting(false)
    }
  }, [store])

  const loadAccountCopyVerification = useCallback(async ({
    dataSummaryOverride,
  }: {
    dataSummaryOverride?: Awaited<ReturnType<typeof createLocalDataSummary>>
  } = {}) => {
    if (session.status !== 'ready' || session.mode !== 'account') {
      setAccountCopyVerification(undefined)
      setRemoteAccountCopyStatus(undefined)
      setAccountCopyPreview(undefined)
      return undefined
    }

    const client = getOptionalSharedConvexClient()
    const [remoteStatus, preview] = await Promise.all([
      getRemoteAccountCopyStatus({
        client,
        session,
      }),
      getRemoteAccountCopyPreview({
        client,
        session,
      }),
    ])
    setRemoteAccountCopyStatus(remoteStatus)
    const nextState = createAccountCopyVerification({
      dataSummary: dataSummaryOverride ?? dataSummary,
      remoteStatus,
    })

    setAccountCopyVerification(nextState)
    setAccountCopyPreview(preview)

    return nextState
  }, [dataSummary, session])

  const loadAccountSnapshots = useCallback(async () => {
    if (session.status !== 'ready' || session.mode !== 'account') {
      setAccountSnapshots(undefined)
      return []
    }

    const snapshots = await getRemoteAccountSnapshots({
      client: getOptionalSharedConvexClient(),
      session,
    })

    setAccountSnapshots(snapshots)
    return snapshots
  }, [session])

  const loadSummary = useCallback(async () => {
    setIsSummaryLoading(true)

    try {
      const nextSummary = await createLocalDataSummary(store)
      setDataSummary(nextSummary)
      return nextSummary
    } finally {
      setIsSummaryLoading(false)
    }
  }, [store])

  const performDeleteAll = useCallback(async () => {
    setIsDeleting(true)
    setNotice(undefined)

    try {
      await store.clear()
      await loadSummary()
      setNotice({
        message: 'All local notes and retained audio were deleted.',
        tone: 'success',
      })
    } catch (error) {
      setNotice({
        message:
          error instanceof Error
            ? error.message
            : 'Local notes could not be deleted from this device.',
        tone: 'error',
      })
    } finally {
      setIsDeleting(false)
    }
  }, [store])

  const handleDeleteAll = useCallback(() => {
    if (
      isCopyingToAccount ||
      isDeleting ||
      isExporting ||
      isImporting ||
      isRestoringAccountCopy
    ) {
      return
    }

    setPendingAction({ kind: 'delete_all' })
  }, [isCopyingToAccount, isDeleting, isExporting, isImporting, isRestoringAccountCopy])

  const performCopyToAccount = useCallback(async () => {
    setIsCopyingToAccount(true)
    setNotice(undefined)

    try {
      if (session.status !== 'ready' || session.mode !== 'account') {
        throw new Error('Account copy is not ready on this device.')
      }

      const client = getOptionalAccountPreparationClient()

      if (!client) {
        throw new Error('Account copy is not configured in this build.')
      }

      const result = await copyLocalEntriesToAccount({
        client,
        session,
        store,
      })
      const nextSummary = await loadSummary()
      const verification = await loadAccountCopyVerification({
        dataSummaryOverride: nextSummary,
      })
      await loadAccountSnapshots()

      setNotice({
        message:
          result.entryCount === 0
            ? 'There were no local notes to copy into this account.'
            : verification?.kind === 'verified'
              ? `Verified ${result.entryCount} local note${result.entryCount === 1 ? '' : 's'} in this account from this device. Future changes still stay local until you upload again.`
              : 'Local notes were uploaded, but this device could not verify the same snapshot in the account yet. Review the verified account copy status below before assuming backup is current.',
        tone:
          result.entryCount > 0 && verification?.kind !== 'verified'
            ? 'error'
            : 'success',
      })
    } catch (error) {
      setNotice({
        message:
          error instanceof Error
            ? error.message
            : 'Local notes could not be copied into this account.',
        tone: 'error',
      })
    } finally {
      setIsCopyingToAccount(false)
    }
  }, [loadAccountCopyVerification, loadAccountSnapshots, loadSummary, session, store])

  const handleCopyToAccount = useCallback(() => {
    if (
      isCopyingToAccount ||
      isDeleting ||
      isDeletingAccountCopy ||
      isExporting ||
      isImporting ||
      isRestoringAccountCopy
    ) {
      return
    }

    setPendingAction({ kind: 'copy_to_account' })
  }, [isCopyingToAccount, isDeleting, isDeletingAccountCopy, isExporting, isImporting, isRestoringAccountCopy])

  const performDeleteAccountCopy = useCallback(async () => {
    setIsDeletingAccountCopy(true)
    setNotice(undefined)

    try {
      if (session.status !== 'ready' || session.mode !== 'account') {
        throw new Error('Account copy is not ready on this device.')
      }

      const client = getOptionalAccountPreparationClient()

      if (!client) {
        throw new Error('Account copy is not configured in this build.')
      }

      const result = await deleteRemoteAccountCopy({
        client,
        session,
      })

      await loadAccountCopyVerification()
      await loadAccountSnapshots()
      setNotice({
        message:
          result.entryCount === 0 && result.retainedAudioCount === 0
            ? 'There was no copied account snapshot to remove for this device.'
            : `Removed ${result.entryCount} copied note${result.entryCount === 1 ? '' : 's'} and ${result.retainedAudioCount} retained audio item${result.retainedAudioCount === 1 ? '' : 's'} from this account for this device. Local notes on this device stayed untouched.`,
        tone: 'success',
      })
    } catch (error) {
      setNotice({
        message:
          error instanceof Error
            ? error.message
            : 'The copied account snapshot could not be removed.',
        tone: 'error',
      })
    } finally {
      setIsDeletingAccountCopy(false)
    }
  }, [loadAccountCopyVerification, loadAccountSnapshots, session])

  const handleDeleteAccountCopy = useCallback(() => {
    if (
      isCopyingToAccount ||
      isDeleting ||
      isDeletingAccountCopy ||
      isExporting ||
      isImporting ||
      isRestoringAccountCopy
    ) {
      return
    }

    setPendingAction({ kind: 'delete_account_copy' })
  }, [isCopyingToAccount, isDeleting, isDeletingAccountCopy, isExporting, isImporting, isRestoringAccountCopy])

  const performRestoreFromAccountCopy = useCallback(async ({
    guestSessionId,
    snapshotLabel,
  }: {
    guestSessionId: string
    snapshotLabel: string
  }) => {
    setIsRestoringAccountCopy(true)
    setRestoringAccountSnapshotGuestSessionId(guestSessionId)
    setNotice(undefined)

    try {
      if (session.status !== 'ready' || session.mode !== 'account') {
        throw new Error('Account restore is not ready on this device.')
      }

      if (dataSummary && dataSummary.entryCount > 0) {
        throw new Error(
          'Local notes must be empty before this device can restore from the copied account snapshot.',
        )
      }

      const client = getOptionalAccountPreparationClient()

      if (!client) {
        throw new Error('Account restore is not configured in this build.')
      }

      const result = await restoreLocalEntriesFromAccountCopy({
        client,
        session,
        snapshotGuestSessionId: guestSessionId,
        store,
      })
      const nextSummary = await loadSummary()
      await loadAccountCopyVerification({
        dataSummaryOverride: nextSummary,
      })
      await loadAccountSnapshots()

      setNotice({
        message: `Restored ${result.entryCount} note${result.entryCount === 1 ? '' : 's'} and ${result.retainedAudioCount} retained audio item${result.retainedAudioCount === 1 ? '' : 's'} from ${snapshotLabel}.`,
        tone: 'success',
      })
    } catch (error) {
      setNotice({
        message:
          error instanceof Error
            ? error.message
            : 'The verified account copy could not be restored on this device.',
        tone: 'error',
      })
    } finally {
      setIsRestoringAccountCopy(false)
      setRestoringAccountSnapshotGuestSessionId(null)
    }
  }, [dataSummary, loadAccountCopyVerification, loadSummary, session, store])

  const handleRestoreFromAccountSnapshot = useCallback(({
    guestSessionId,
    snapshotLabel,
  }: {
    guestSessionId: string
    snapshotLabel: string
  }) => {
    if (
      isCopyingToAccount ||
      isDeleting ||
      isDeletingAccountCopy ||
      isExporting ||
      isImporting ||
      isRestoringAccountCopy
    ) {
      return
    }

    setPendingAction({
      guestSessionId,
      kind: 'restore_account_snapshot',
      snapshotLabel,
    })
  }, [
    isCopyingToAccount,
    isDeleting,
    isDeletingAccountCopy,
    isExporting,
    isImporting,
    isRestoringAccountCopy,
  ])

  const performImport = useCallback(async (file: File) => {
    setIsImporting(true)
    setNotice(undefined)

    try {
      const json = await file.text()
      const summary = await restoreLocalEntriesFromJson(store, json)
      await loadSummary()

      setNotice({
        message: `Recovery file restored ${summary.entryCount} notes and ${summary.retainedAudioCount} retained audio item${summary.retainedAudioCount === 1 ? '' : 's'} on this device.`,
        tone: 'success',
      })
    } catch (error) {
      setNotice({
        message:
          error instanceof Error
            ? error.message
            : 'Recovery file could not be restored on this device.',
        tone: 'error',
      })
    } finally {
      setIsImporting(false)
    }
  }, [store])

  const handleImport = useCallback(async (file: File) => {
    const existingEntries = await store.listEntries()

    if (existingEntries.length > 0) {
      setPendingAction({
        file,
        kind: 'replace_local_data',
      })
      return
    }

    await performImport(file)
  }, [performImport, store])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  useEffect(() => {
    void loadAccountCopyVerification()
  }, [loadAccountCopyVerification, dataSummary?.entryCount, dataSummary?.latestUpdatedAt, dataSummary?.retainedAudioCount])

  useEffect(() => {
    void loadAccountSnapshots()
  }, [loadAccountSnapshots])

  useEffect(() => {
    if (foreignMutationVersion === 0) {
      return
    }

    setPendingAction(null)
    void loadSummary()
    void loadAccountCopyVerification()
    void loadAccountSnapshots()
    setNotice({
      message:
        'Local notes changed in another tab. This screen now reflects the latest device state.',
      tone: 'success',
    })
  }, [foreignMutationVersion, loadAccountCopyVerification, loadAccountSnapshots, loadSummary])

  const accountMigration =
    session.status === 'ready' && session.mode !== 'guest'
      ? createAccountMigrationPlan({
          dataSummary: isSummaryLoading ? undefined : dataSummary,
          session,
        })
      : undefined
  const canRestoreFromAccountCopy =
    session.status === 'ready' &&
    session.mode === 'account' &&
    !isSummaryLoading &&
    dataSummary?.entryCount === 0 &&
    remoteAccountCopyStatus?.status === 'ready' &&
    remoteAccountCopyStatus.snapshot.entryCount > 0
  const canRestoreOtherAccountSnapshots =
    session.status === 'ready' &&
    session.mode === 'account' &&
    !isSummaryLoading &&
    dataSummary?.entryCount === 0
  const otherAccountSnapshots =
    session.status === 'ready' && session.mode === 'account'
      ? (accountSnapshots ?? [])
          .filter((snapshot) => snapshot.guestSessionId !== session.sessionId)
          .map((snapshot) => ({
            ...snapshot,
            isCurrentDevice: false,
            label: `Session ${formatGuestSessionLabel(snapshot.guestSessionId)}`,
          }))
      : []

  return (
    <>
      <SettingsScreen
        accountSnapshots={otherAccountSnapshots}
        accountControls={<OptionalSettingsAccountControls />}
        accountCopyPreview={accountCopyPreview}
        accountCopyVerification={accountCopyVerification}
        accountMigration={accountMigration}
        canRetryAccountPreparation={canRetryAccountPreparation(session)}
        canRestoreFromAccountCopy={canRestoreFromAccountCopy}
        canRestoreOtherAccountSnapshots={canRestoreOtherAccountSnapshots}
        dataSummary={dataSummary}
        installState={installState.kind}
        isCopyingToAccount={isCopyingToAccount}
        isDeleting={isDeleting}
        isDeletingAccountCopy={isDeletingAccountCopy}
        isExporting={isExporting}
        isImporting={isImporting}
        restoringAccountSnapshotGuestSessionId={restoringAccountSnapshotGuestSessionId}
        isRestoringAccountCopy={isRestoringAccountCopy}
        isSummaryLoading={isSummaryLoading}
        notice={notice}
        onCopyToAccount={handleCopyToAccount}
        onDeleteAccountCopy={
          session.status === 'ready' && session.mode === 'account'
            ? handleDeleteAccountCopy
            : undefined
        }
        sessionSummary={summarizeAppSession(session)}
        onDeleteAll={handleDeleteAll}
        onExport={() => {
          void handleExport()
        }}
        onImport={(file) => {
          void handleImport(file)
        }}
        onRestoreAccountSnapshot={(guestSessionId, snapshotLabel) => {
          handleRestoreFromAccountSnapshot({
            guestSessionId,
            snapshotLabel,
          })
        }}
        onRestoreFromAccountCopy={
          canRestoreFromAccountCopy
            ? () => {
                handleRestoreFromAccountSnapshot({
                  guestSessionId: session.sessionId,
                  snapshotLabel: 'the copied snapshot from this device session',
                })
              }
            : undefined
        }
        onRetryAccountPreparation={() => {
          setNotice(undefined)
          retryAccountPreparation()
        }}
      />
      <ConfirmationSheet
        cancelLabel="Cancel"
        confirmLabel={
          pendingAction?.kind === 'copy_to_account'
            ? 'Copy into account'
            : pendingAction?.kind === 'restore_account_snapshot'
            ? 'Restore this device'
            : pendingAction?.kind === 'delete_account_copy'
            ? 'Delete account copy'
            : pendingAction?.kind === 'replace_local_data'
            ? 'Replace local notes'
            : 'Delete all local notes'
        }
        description={
          pendingAction?.kind === 'copy_to_account'
            ? 'This uploads the current local note set from this device into the signed-in account. It does not enable live background sync, and later local changes still need another manual upload.'
            : pendingAction?.kind === 'restore_account_snapshot'
            ? `This repopulates the empty local store on this device from ${pendingAction.snapshotLabel}. It does not enable sync.`
            : pendingAction?.kind === 'delete_account_copy'
            ? 'This removes the copied note snapshot for this device from the signed-in account. Local notes and retained audio on this device stay untouched.'
            : pendingAction?.kind === 'replace_local_data'
            ? 'This will replace all drafts, saved notes, and retained audio currently on this device. Current local notes will not be kept.'
            : 'This removes drafts, saved notes, and retained audio from this device. You can only get them back from a recovery file you already exported.'
        }
        isConfirming={
          isCopyingToAccount ||
          isDeleting ||
          isDeletingAccountCopy ||
          isImporting ||
          isRestoringAccountCopy
        }
        onCancel={() => {
          if (
            !isCopyingToAccount &&
            !isDeleting &&
            !isDeletingAccountCopy &&
            !isImporting &&
            !isRestoringAccountCopy
          ) {
            setPendingAction(null)
          }
        }}
        onConfirm={() => {
          if (pendingAction?.kind === 'copy_to_account') {
            setPendingAction(null)
            void performCopyToAccount()
            return
          }

          if (pendingAction?.kind === 'restore_account_snapshot') {
            setPendingAction(null)
            void performRestoreFromAccountCopy({
              guestSessionId: pendingAction.guestSessionId,
              snapshotLabel: pendingAction.snapshotLabel,
            })
            return
          }

          if (pendingAction?.kind === 'delete_account_copy') {
            setPendingAction(null)
            void performDeleteAccountCopy()
            return
          }

          if (pendingAction?.kind === 'replace_local_data') {
            const file = pendingAction.file
            setPendingAction(null)
            void performImport(file)
            return
          }

          setPendingAction(null)
          void performDeleteAll()
        }}
        open={pendingAction !== null}
        title={
          pendingAction?.kind === 'copy_to_account'
            ? 'Copy local notes into this account now?'
            : pendingAction?.kind === 'restore_account_snapshot'
            ? 'Restore this empty device from the copied account snapshot?'
            : pendingAction?.kind === 'delete_account_copy'
            ? 'Delete the copied account snapshot for this device?'
            : pendingAction?.kind === 'replace_local_data'
            ? 'Replace local notes with this recovery file?'
            : 'Delete all local notes from this device?'
        }
      />
    </>
  )
}
