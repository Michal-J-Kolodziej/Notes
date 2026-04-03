import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { useEntryStore } from '~/features/entries'
import { createLocalEntriesExport } from '~/features/settings/exportLocalEntries'
import { restoreLocalEntriesFromJson } from '~/features/settings/restoreLocalEntries'
import { SettingsScreen } from '~/features/settings/SettingsScreen'

export const Route = createFileRoute('/settings')({
  component: SettingsRoute,
})

function SettingsRoute() {
  const store = useEntryStore()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
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

  const handleDeleteAll = useCallback(async () => {
    if (
      !window.confirm('Delete all local notes and retained audio from this device?')
    ) {
      return
    }

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

  const handleImport = useCallback(async (file: File) => {
    setIsImporting(true)
    setNotice(undefined)

    try {
      const json = await file.text()
      const existingEntries = await store.listEntries()

      if (
        existingEntries.length > 0 &&
        !window.confirm(
          'Replace all local notes and retained audio on this device with the selected recovery file?',
        )
      ) {
        return
      }

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

  return (
    <SettingsScreen
      isDeleting={isDeleting}
      isExporting={isExporting}
      isImporting={isImporting}
      notice={notice}
      onDeleteAll={() => {
        void handleDeleteAll()
      }}
      onExport={() => {
        void handleExport()
      }}
      onImport={(file) => {
        void handleImport(file)
      }}
    />
  )
}
