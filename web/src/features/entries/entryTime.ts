import { useEffect, useState } from 'react'

const MINUTE_IN_MS = 60_000
const HOUR_IN_MS = 60 * MINUTE_IN_MS
const DAY_IN_MS = 24 * HOUR_IN_MS

export function formatEntryUpdatedAtLabel(
  updatedAt: number,
  now: number = Date.now(),
) {
  const elapsedMs = Math.max(0, now - updatedAt)

  if (elapsedMs < MINUTE_IN_MS) {
    return 'just now'
  }

  if (elapsedMs < HOUR_IN_MS) {
    const elapsedMinutes = Math.floor(elapsedMs / MINUTE_IN_MS)
    return `${elapsedMinutes} min ago`
  }

  if (elapsedMs < DAY_IN_MS) {
    const elapsedHours = Math.floor(elapsedMs / HOUR_IN_MS)
    return `${elapsedHours} hr ago`
  }

  const elapsedDays = Math.floor(elapsedMs / DAY_IN_MS)
  return `${elapsedDays} day${elapsedDays === 1 ? '' : 's'} ago`
}

export function formatEntryUpdatedAtTitle(
  updatedAt: number,
  locale?: string,
) {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(updatedAt)
}

export function useRelativeTimeNow() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now())
    }, MINUTE_IN_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  return now
}
