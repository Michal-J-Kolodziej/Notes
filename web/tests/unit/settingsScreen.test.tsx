import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'
import { SettingsScreen } from '../../src/features/settings/SettingsScreen'

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
        isDeleting={false}
        isExporting={false}
        isImporting={false}
        onDeleteAll={vi.fn()}
        onExport={vi.fn()}
        onImport={vi.fn()}
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
  })

  it('shows pending labels and a status notice', async () => {
    render(
      <SettingsScreen
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
})
