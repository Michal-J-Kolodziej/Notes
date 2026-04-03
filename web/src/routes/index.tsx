import { createFileRoute } from '@tanstack/react-router'
import { HomeScreen } from '~/features/capture/HomeScreen'

export const Route = createFileRoute('/')({
  component: HomeRoute,
})

function HomeRoute() {
  return <HomeScreen />
}
