import { createFileRoute } from '@tanstack/react-router'
import { HomeScreen } from '~/features/capture/HomeScreen'
import { useAppInstallPrompt } from '~/features/pwa/useAppInstallPrompt'
import { summarizeAppSession, useAppSession } from '~/lib/auth'

export const Route = createFileRoute('/')({
  component: HomeRoute,
})

function HomeRoute() {
  const installState = useAppInstallPrompt()
  const session = useAppSession()

  return (
    <HomeScreen
      installState={installState}
      sessionSummary={summarizeAppSession(session)}
    />
  )
}
