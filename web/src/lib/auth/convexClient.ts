import { ConvexReactClient } from 'convex/react'

let convexClient: ConvexReactClient | null | undefined

export function getOptionalSharedConvexClient() {
  const convexUrl =
    typeof import.meta.env.VITE_CONVEX_URL === 'string'
      ? import.meta.env.VITE_CONVEX_URL.trim()
      : ''

  if (!convexUrl) {
    return null
  }

  if (!convexClient) {
    convexClient = new ConvexReactClient(convexUrl, {
      unsavedChangesWarning: false,
    })
  }

  return convexClient
}
