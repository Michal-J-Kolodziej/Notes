import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { SettingsScreen } from '../../src/features/settings/SettingsScreen'
import type { ReactNode } from 'react'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: ReactNode
    to: string
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

describe('SettingsScreen', () => {
  it('renders export and delete actions with trust copy', () => {
    render(
      <SettingsScreen
        accountCopyPreview={[
          {
            deviceLocalId: 'voice-1',
            hasAudio: true,
            sourceType: 'voice',
            status: 'saved_remote',
            title: 'Voice reflection',
            updatedAt: 456,
          },
          {
            deviceLocalId: 'text-1',
            hasAudio: false,
            sourceType: 'text',
            status: 'saved_remote',
            title: 'Morning note',
            updatedAt: 123,
          },
        ]}
        accountCopyVerification={{
          detail:
            'Verified 3 local notes and 1 retained audio item in this account from this device.',
          heading: 'Verified account copy from this device.',
          kind: 'verified',
          statusLabel: 'Verified',
        }}
        dataSummary={{
          accountOwnedCount: 0,
          draftCount: 1,
          entryCount: 3,
          guestOwnedCount: 3,
          latestUpdatedAt: 123,
          retainedAudioCount: 1,
          savedCount: 2,
          totalBytes: 2048,
        }}
        isDeleting={false}
        isExporting={false}
        isImporting={false}
        isSummaryLoading={false}
        onDeleteAll={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        sessionSummary={{
          detail:
            'This device is using a durable guest session. Notes stay local-first and are not backed up to the cloud yet.',
          heading: 'Guest mode on this device',
          sessionLabel: 'AB12CD34',
          statusLabel: 'Local only',
        }}
      />,
    )

    expect(
      screen.getByRole('heading', { name: /privacy and recovery stay visible/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /export local notes/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /delete all local notes/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /restore recovery file/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/support resources/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /call or text 988/i }),
    ).toHaveAttribute('href', 'https://988lifeline.org/get-help/')
    expect(screen.getByText(/verified account copy from this device/i)).toBeInTheDocument()
    expect(screen.getByText(/latest copied notes/i)).toBeInTheDocument()
    expect(screen.getByText(/voice reflection/i)).toBeInTheDocument()
    expect(screen.getByText(/morning note/i)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /guest mode on this device/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/2 saved notes/i)).toBeInTheDocument()
    expect(screen.getByText(/1 draft/i)).toBeInTheDocument()
    expect(screen.getAllByText(/1 retained audio/i).length).toBeGreaterThan(0)
  })

  it('shows pending labels and a status notice', () => {
    render(
      <SettingsScreen
        isSummaryLoading
        isDeleting={false}
        isExporting={true}
        isImporting={false}
        notice={{
          message: 'Local notes export downloaded for this device.',
          tone: 'success',
        }}
        onDeleteAll={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: /preparing export/i }),
    ).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent(
      /local notes export downloaded for this device/i,
    )
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('shows an importing state for recovery restore', () => {
    render(
      <SettingsScreen
        isSummaryLoading
        isDeleting={false}
        isExporting={false}
        isImporting
        onDeleteAll={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: /restoring recovery file/i }),
    ).toBeDisabled()
  })

  it('renders manual install guidance for browsers without an install prompt', () => {
    render(
      <SettingsScreen
        isSummaryLoading
        isDeleting={false}
        isExporting={false}
        isImporting={false}
        onDeleteAll={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('heading', { name: /add notes to your home screen/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/safari share menu/i),
    ).toBeInTheDocument()
  })

  it('renders guest identity summary when a local session is available', () => {
    render(
      <SettingsScreen
        dataSummary={{
          accountOwnedCount: 0,
          draftCount: 1,
          entryCount: 3,
          guestOwnedCount: 3,
          latestUpdatedAt: 123,
          retainedAudioCount: 1,
          savedCount: 2,
          totalBytes: 2048,
        }}
        isDeleting={false}
        isExporting={false}
        isImporting={false}
        isSummaryLoading={false}
        onDeleteAll={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        sessionSummary={{
          detail:
            'This device is using a durable guest session. Notes stay local-first and are not backed up to the cloud yet.',
          heading: 'Guest mode on this device',
          sessionLabel: 'AB12CD34',
          statusLabel: 'Local only',
        }}
      />,
    )

    expect(
      screen.getByRole('heading', { name: /guest mode on this device/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/local app data: 2\.0 kb/i)).toBeInTheDocument()
    expect(screen.getByText(/ab12cd34/i)).toBeInTheDocument()
    expect(screen.getByText(/local only/i)).toBeInTheDocument()
  })

  it('renders account controls when provided', () => {
    render(
      <SettingsScreen
        accountControls={<button type="button">Prepare account</button>}
        accountMigration={{
          actionLabel: 'Copy notes into account',
          detail:
            '3 local notes and 1 retained audio item will be copied into this account.',
          heading: 'Copy the current local notes into this account.',
          kind: 'ready',
          statusLabel: 'Local-only notes',
        }}
        isSummaryLoading
        isDeleting={false}
        isExporting={false}
        isImporting={false}
        onCopyToAccount={vi.fn()}
        onDeleteAll={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: /prepare account/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        name: /copy the current local notes into this account/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /copy notes into account/i }),
    ).toBeInTheDocument()
  })

  it('renders a busy label while account copy is running', () => {
    render(
      <SettingsScreen
        accountMigration={{
          actionLabel: 'Update account copy',
          detail:
            '2 local notes can be uploaded again so the account gets the latest local snapshot.',
          heading: 'Refresh the account copy from this device.',
          kind: 'ready',
          statusLabel: 'Manual account copy',
        }}
        isCopyingToAccount
        isSummaryLoading
        isDeleting={false}
        isExporting={false}
        isImporting={false}
        onCopyToAccount={vi.fn()}
        onDeleteAll={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: /copying local notes/i }),
    ).toBeDisabled()
  })

  it('renders a destructive account-copy removal action when a verified snapshot exists', () => {
    render(
      <SettingsScreen
        accountCopyVerification={{
          detail:
            'Verified 2 local notes and 1 retained audio item in this account from this device.',
          heading: 'Verified account copy from this device.',
          kind: 'verified',
          statusLabel: 'Verified',
        }}
        isDeleting={false}
        isDeletingAccountCopy={false}
        isExporting={false}
        isImporting={false}
        isSummaryLoading
        onDeleteAccountCopy={vi.fn()}
        onDeleteAll={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: /delete account copy/i }),
    ).toBeInTheDocument()
  })

  it('renders an account-copy restore action when this device is empty', () => {
    render(
      <SettingsScreen
        accountSnapshots={[
          {
            entryCount: 3,
            guestSessionId: 'guest-session-other',
            isCurrentDevice: false,
            isRestorable: true,
            label: 'Session GUEST-SE',
            lastCopiedAt: 700,
            previewTitles: ['Travel note', 'Voice reflection'],
            retainedAudioCount: 1,
          },
        ]}
        accountCopyVerification={{
          detail:
            'Verified 2 local notes and 1 retained audio item in this account from this device.',
          heading: 'Verified account copy from this device.',
          kind: 'verified',
          statusLabel: 'Verified',
        }}
        canRestoreOtherAccountSnapshots
        canRestoreFromAccountCopy
        isDeleting={false}
        isDeletingAccountCopy={false}
        isExporting={false}
        isImporting={false}
        isRestoringAccountCopy={false}
        isSummaryLoading={false}
        onDeleteAll={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onRestoreAccountSnapshot={vi.fn()}
        onRestoreFromAccountCopy={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: /restore from account copy/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/other account snapshots/i)).toBeInTheDocument()
    expect(screen.getByText(/session guest-se/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /restore this snapshot/i }),
    ).toBeInTheDocument()
  })

  it('renders other account snapshots with the empty-device restore gate', () => {
    render(
      <SettingsScreen
        accountSnapshots={[
          {
            entryCount: 2,
            guestSessionId: 'guest-session-999',
            isCurrentDevice: false,
            isRestorable: true,
            label: 'Session 9999ABCD',
            lastCopiedAt: 456,
            previewTitles: ['Voice reflection'],
            retainedAudioCount: 1,
          },
        ]}
        canRestoreOtherAccountSnapshots={false}
        isDeleting={false}
        isDeletingAccountCopy={false}
        isExporting={false}
        isImporting={false}
        isRestoringAccountCopy={false}
        isSummaryLoading={false}
        onDeleteAll={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onRestoreAccountSnapshot={vi.fn()}
      />,
    )

    expect(screen.getByText(/other account snapshots/i)).toBeInTheDocument()
    expect(screen.getByText(/session 9999abcd/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /empty this device to restore/i }),
    ).toBeDisabled()
  })

  it('renders a retry action when account preparation can be retried', () => {
    render(
      <SettingsScreen
        canRetryAccountPreparation
        isSummaryLoading
        isDeleting={false}
        isExporting={false}
        isImporting={false}
        onDeleteAll={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onRetryAccountPreparation={vi.fn()}
        sessionSummary={{
          detail:
            'This account is signed in on this device, but the app could not prepare account migration right now.',
          heading: 'Signed-in account on this device',
          statusLabel: 'Account prep unavailable',
        }}
      />,
    )

    expect(
      screen.getByRole('button', { name: /retry account prep/i }),
    ).toBeInTheDocument()
  })
})
