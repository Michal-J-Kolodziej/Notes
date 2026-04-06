import { useEffect, useState } from 'react'

export function ConnectionStatusBanner() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') {
      return true
    }

    return navigator.onLine !== false
  })

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) {
    return null
  }

  return (
    <div className="sticky top-0 z-50 border-b border-[rgba(58,34,29,0.08)] bg-[rgba(255,250,246,0.94)] px-4 py-3 text-sm leading-6 text-[var(--ink)] shadow-[0_10px_24px_rgba(38,23,18,0.08)] backdrop-blur-sm">
      You are offline. Local notes still work on this device.
    </div>
  )
}
