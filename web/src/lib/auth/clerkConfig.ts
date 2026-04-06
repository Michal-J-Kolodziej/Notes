type EnvLike = Record<string, string | undefined>

export interface OptionalClerkClientConfig {
  accountPreparationEnabled: boolean
  enabled: boolean
  publishableKey?: string
}

export interface OptionalClerkServerConfig extends OptionalClerkClientConfig {
  secretKey?: string
}

function readEnvValue(env: EnvLike, names: Array<string>) {
  for (const name of names) {
    const value = env[name]?.trim()

    if (value) {
      return value
    }
  }

  return undefined
}

function isOptionalAuthFlagEnabled(env: EnvLike) {
  return readEnvValue(env, ['VITE_ENABLE_OPTIONAL_AUTH']) === '1'
}

function hasPublicAccountPreparationConfig(env: EnvLike) {
  const convexUrl = readEnvValue(env, ['VITE_CONVEX_URL', 'CONVEX_URL'])
  const clerkJwtIssuerDomain = readEnvValue(env, [
    'VITE_CLERK_JWT_ISSUER_DOMAIN',
    'CLERK_JWT_ISSUER_DOMAIN',
  ])

  return Boolean(convexUrl && clerkJwtIssuerDomain)
}

export function getOptionalClerkClientConfig(
  env: EnvLike = import.meta.env as unknown as EnvLike,
): OptionalClerkClientConfig {
  const publishableKey = readEnvValue(env, [
    'VITE_CLERK_PUBLISHABLE_KEY',
    'CLERK_PUBLISHABLE_KEY',
  ])
  const enabled = isOptionalAuthFlagEnabled(env) && Boolean(publishableKey)
  const accountPreparationEnabled =
    enabled && hasPublicAccountPreparationConfig(env)

  return {
    accountPreparationEnabled,
    enabled,
    publishableKey: enabled ? publishableKey : undefined,
  }
}

export function getOptionalClerkServerConfig(
  env: EnvLike = process.env as EnvLike,
): OptionalClerkServerConfig {
  const publishableKey = readEnvValue(env, [
    'CLERK_PUBLISHABLE_KEY',
    'VITE_CLERK_PUBLISHABLE_KEY',
  ])
  const secretKey = readEnvValue(env, ['CLERK_SECRET_KEY'])
  const enabled =
    isOptionalAuthFlagEnabled(env) &&
    Boolean(publishableKey) &&
    Boolean(secretKey)
  const accountPreparationEnabled =
    enabled && hasPublicAccountPreparationConfig(env)

  return {
    accountPreparationEnabled,
    enabled,
    publishableKey: enabled ? publishableKey : undefined,
    secretKey: enabled ? secretKey : undefined,
  }
}
