import { useEffect, useId, useRef } from 'react'

interface ConfirmationSheetProps {
  cancelLabel: string
  confirmLabel: string
  confirmTone?: 'default' | 'destructive'
  details?: Array<string>
  description: string
  isConfirming?: boolean
  onCancel: () => void
  onConfirm: () => void
  open: boolean
  title: string
}

export function ConfirmationSheet({
  cancelLabel,
  confirmLabel,
  confirmTone = 'destructive',
  details,
  description,
  isConfirming = false,
  onCancel,
  onConfirm,
  open,
  title,
}: ConfirmationSheetProps) {
  const titleId = useId()
  const descriptionId = useId()
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null)
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null)
  const isConfirmingRef = useRef(isConfirming)
  const returnFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    isConfirmingRef.current = isConfirming
  }, [isConfirming])

  useEffect(() => {
    if (open) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
      cancelButtonRef.current?.focus()
      document.body.style.overflow = 'hidden'
      return
    }

    document.body.style.overflow = ''
    returnFocusRef.current?.focus()
    returnFocusRef.current = null
  }, [open])

  useEffect(() => {
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isConfirmingRef.current) {
        event.preventDefault()
        onCancel()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusableButtons = [
        cancelButtonRef.current,
        confirmButtonRef.current,
      ].filter((value): value is HTMLButtonElement => Boolean(value))

      if (focusableButtons.length === 0) {
        return
      }

      const currentIndex = focusableButtons.findIndex(
        (button) => button === document.activeElement,
      )

      if (event.shiftKey) {
        if (currentIndex <= 0) {
          event.preventDefault()
          focusableButtons.at(-1)?.focus()
        }
        return
      }

      if (currentIndex === -1 || currentIndex === focusableButtons.length - 1) {
        event.preventDefault()
        focusableButtons[0]?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onCancel, open])

  if (!open) {
    return null
  }

  const confirmButtonClass =
    confirmTone === 'default'
      ? 'border border-[rgba(58,34,29,0.12)] bg-white text-[var(--ink)]'
      : 'border border-[rgba(178,57,38,0.18)] bg-[rgba(178,57,38,0.08)] text-[var(--ink)]'

  return (
    <div
      aria-hidden={false}
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(35,22,18,0.42)] p-4 sm:items-center"
      data-testid="confirmation-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isConfirming) {
          onCancel()
        }
      }}
    >
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="w-full max-w-[28rem] rounded-[1.75rem] border border-[rgba(255,255,255,0.48)] bg-[var(--panel)] p-6 shadow-[0_32px_90px_rgba(24,16,13,0.26)]"
        role="dialog"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
          Confirm action
        </p>
        <h2
          className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]"
          id={titleId}
        >
          {title}
        </h2>
        <p
          className="mt-3 text-sm leading-6 text-[var(--muted)]"
          id={descriptionId}
        >
          {description}
        </p>
        {details && details.length > 0 ? (
          <ul className="mt-4 grid gap-3 text-sm leading-6 text-[var(--ink)]">
            {details.map((detail) => (
              <li
                className="rounded-[1rem] border border-[rgba(58,34,29,0.08)] bg-white/72 px-4 py-3"
                key={detail}
              >
                {detail}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            className="inline-flex min-h-12 items-center justify-center rounded-[1rem] border border-[rgba(58,34,29,0.12)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isConfirming}
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`inline-flex min-h-12 items-center justify-center rounded-[1rem] px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${confirmButtonClass}`}
            disabled={isConfirming}
            onClick={onConfirm}
            ref={confirmButtonRef}
            type="button"
          >
            {isConfirming ? 'Working...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
