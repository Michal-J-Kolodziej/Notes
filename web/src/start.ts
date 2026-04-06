import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { createStart } from '@tanstack/react-start'
import { getOptionalClerkServerConfig } from './lib/auth/clerkConfig'

const clerkConfig = getOptionalClerkServerConfig()

export const startInstance = createStart(() => ({
  requestMiddleware: clerkConfig.enabled
    ? [
        clerkMiddleware({
          publishableKey: clerkConfig.publishableKey,
          secretKey: clerkConfig.secretKey,
        }),
      ]
    : [],
}))
