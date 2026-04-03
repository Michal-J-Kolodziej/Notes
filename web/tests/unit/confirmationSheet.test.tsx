import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmationSheet } from '~/features/ui/ConfirmationSheet'

describe('ConfirmationSheet', () => {
  it('renders destructive copy and action buttons when open', () => {
    render(
      <ConfirmationSheet
        cancelLabel="Keep note"
        confirmLabel="Remove audio"
        description="This keeps the transcript and removes retained raw audio from this device."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        open
        title="Remove stored audio?"
      />,
    )

    expect(screen.getByRole('dialog', { name: /remove stored audio/i })).toBeVisible()
    expect(
      screen.getByText(/keeps the transcript and removes retained raw audio/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /keep note/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove audio/i })).toBeInTheDocument()
  })

  it('dismisses on escape and backdrop click', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(
      <ConfirmationSheet
        cancelLabel="Cancel"
        confirmLabel="Delete"
        description="Delete local data."
        onCancel={onCancel}
        onConfirm={vi.fn()}
        open
        title="Delete local notes?"
      />,
    )

    await user.keyboard('{Escape}')
    await user.click(screen.getByTestId('confirmation-backdrop'))

    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('keeps tab focus inside the sheet and returns focus when it closes', async () => {
    const user = userEvent.setup()

    function TestHarness() {
      const [open, setOpen] = useState(false)

      return (
        <>
          <button onClick={() => setOpen(true)} type="button">
            Open confirm
          </button>
          <ConfirmationSheet
            cancelLabel="Cancel"
            confirmLabel="Delete"
            description="Delete local data."
            onCancel={() => setOpen(false)}
            onConfirm={vi.fn()}
            open={open}
            title="Delete local notes?"
          />
        </>
      )
    }

    render(<TestHarness />)

    await user.click(screen.getByRole('button', { name: /open confirm/i }))
    expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('button', { name: /^delete$/i })).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.getByRole('button', { name: /open confirm/i })).toHaveFocus()
  })
})
