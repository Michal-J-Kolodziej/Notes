import { createFileRoute } from '@tanstack/react-router'
import { HomeScreen } from '~/features/capture/HomeScreen'
import { useAppInstallPrompt } from '~/features/pwa/useAppInstallPrompt'

export const Route = createFileRoute('/')({
  component: HomeRoute,
})

function HomeRoute() {
  const installState = useAppInstallPrompt()

  return <HomeScreen installState={installState} />
}
