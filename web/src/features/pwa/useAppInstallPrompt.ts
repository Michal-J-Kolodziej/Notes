import { useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptChoice {
  outcome: 'accepted' | 'dismissed'
  platform: string
}

interface BeforeInstallPromptEvent extends Event {
  platforms?: string[]
  prompt: () => Promise<void>
  userChoice: Promise<BeforeInstallPromptChoice>
}

export type AppInstallState =
  | { kind: 'hidden' }
  | { kind: 'installable'; onInstall: () => Promise<void>; onDismiss: () => void }
  | { kind: 'installed' }
  | { kind: 'manual_ios' }

function isStandaloneMode() {
  if (typeof window === 'undefined') {
    return false
  }

  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    ((navigator as Navigator & { standalone?: boolean }).standalone ?? false) === true
  )
}

function isIosDevice() {
  if (typeof navigator === 'undefined') {
    return false
  }

  const userAgent = navigator.userAgent.toLowerCase()

  return (
    /iphone|ipad|ipod/.test(userAgent) ||
    (userAgent.includes('mac') && navigator.maxTouchPoints > 1)
  )
}

export function useAppInstallPrompt(): AppInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    null,
  )
  const [dismissed, setDismissed] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [manualIos, setManualIos] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const standalone = isStandaloneMode()
    setInstalled(standalone)
    setManualIos(!standalone && isIosDevice())

    const handleBeforeInstallPrompt = (event: Event) => {
      if (standalone) {
        return
      }

      const nextEvent = event as BeforeInstallPromptEvent
      nextEvent.preventDefault()
      setDeferredPrompt(nextEvent)
      setDismissed(false)
    }

    const handleInstalled = () => {
      setDeferredPrompt(null)
      setInstalled(true)
      setDismissed(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const onInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return
    }

    await deferredPrompt.prompt()

    try {
      const choice = await deferredPrompt.userChoice

      if (choice.outcome === 'accepted') {
        setInstalled(true)
      }
    } finally {
      setDeferredPrompt(null)
      setDismissed(false)
    }
  }, [deferredPrompt])

  const onDismiss = useCallback(() => {
    setDismissed(true)
  }, [])

  if (installed) {
    return { kind: 'installed' }
  }

  if (deferredPrompt && !dismissed) {
    return { kind: 'installable', onDismiss, onInstall }
  }

  if (manualIos) {
    return { kind: 'manual_ios' }
  }

  return { kind: 'hidden' }
}
