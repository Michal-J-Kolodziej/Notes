import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import {
  useEntryStore,
  useForeignEntryStoreMutationVersion,
} from '~/features/entries'
import { useAppInstallPrompt } from '~/features/pwa/useAppInstallPrompt'
import { createLocalEntriesExport } from '~/features/settings/exportLocalEntries'
import { restoreLocalEntriesFromJson } from '~/features/settings/restoreLocalEntries'
import { SettingsScreen } from '~/features/settings/SettingsScreen'
import { ConfirmationSheet } from '~/features/ui/ConfirmationSheet'

export const Route = createFileRoute('/settings')({
  component: SettingsRoute,
})

function SettingsRoute() {
  const store = useEntryStore()
  const installState = useAppInstallPrompt()
  const foreignMutationVersion = useForeignEntryStoreMutationVersion()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [pendingAction, setPendingAction] = useState<
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

  const performDeleteAll = useCallback(async () => {
    setIsDeleting(true)
    setNotice(undefined)

    try {
      await store.clear()
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
    if (isDeleting || isExporting || isImporting) {
      return
    }

    setPendingAction({ kind: 'delete_all' })
  }, [isDeleting, isExporting, isImporting])

  const performImport = useCallback(async (file: File) => {
    setIsImporting(true)
    setNotice(undefined)

    try {
      const json = await file.text()
      const summary = await restoreLocalEntriesFromJson(store, json)

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
    if (foreignMutationVersion === 0) {
      return
    }

    setPendingAction(null)
    setNotice({
      message:
        'Local notes changed in another tab. This screen now reflects the latest device state.',
      tone: 'success',
    })
  }, [foreignMutationVersion])

  return (
    <>
      <SettingsScreen
        installState={installState.kind}
        isDeleting={isDeleting}
        isExporting={isExporting}
        isImporting={isImporting}
        notice={notice}
        onDeleteAll={handleDeleteAll}
        onExport={() => {
          void handleExport()
        }}
        onImport={(file) => {
          void handleImport(file)
        }}
      />
      <ConfirmationSheet
        cancelLabel="Cancel"
        confirmLabel={
          pendingAction?.kind === 'replace_local_data'
            ? 'Replace local notes'
            : 'Delete all local notes'
        }
        description={
          pendingAction?.kind === 'replace_local_data'
            ? 'This will replace all drafts, saved notes, and retained audio currently on this device. Current local notes will not be kept.'
            : 'This removes drafts, saved notes, and retained audio from this device. You can only get them back from a recovery file you already exported.'
        }
        isConfirming={isDeleting || isImporting}
        onCancel={() => {
          if (!isDeleting && !isImporting) {
            setPendingAction(null)
          }
        }}
        onConfirm={() => {
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
          pendingAction?.kind === 'replace_local_data'
            ? 'Replace local notes with this recovery file?'
            : 'Delete all local notes from this device?'
        }
      />
    </>
  )
}
