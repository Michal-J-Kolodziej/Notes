import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  OptionalClerkProvider,
  OptionalSettingsAccountControls,
  getOptionalClerkClientConfig,
  getOptionalClerkServerConfig,
} from '~/lib/auth/clerkRuntime'

const mockAuthState: {
  getToken: (options?: {
    skipCache?: boolean
    template?: 'convex'
  }) => Promise<string | null>
  isLoaded: boolean
  isSignedIn: boolean
  sessionClaims: Record<string, unknown> | null
  userId: string | null
} = {
  getToken: vi.fn(() => Promise.resolve('clerk-token')),
  isLoaded: true,
  isSignedIn: false,
  sessionClaims: null,
  userId: null,
}

const mockUserState = {
  isLoaded: true,
  user: null as
    | {
        firstName?: string | null
        fullName?: string | null
        primaryEmailAddress?: {
          emailAddress?: string | null
        } | null
      }
    | null,
}

vi.mock('@clerk/tanstack-react-start', () => ({
  ClerkProvider: ({
    children,
    publishableKey,
  }: {
    children: React.ReactNode
    publishableKey?: string
  }) => (
    <div data-publishable-key={publishableKey} data-testid="mock-clerk-provider">
      {children}
    </div>
  ),
  SignInButton: ({
    children,
    fallbackRedirectUrl,
  }: {
    children: React.ReactNode
    fallbackRedirectUrl?: string
  }) => (
    <div
      data-fallback-redirect-url={fallbackRedirectUrl}
      data-testid="mock-sign-in-button"
    >
      {children}
    </div>
  ),
  UserButton: ({ afterSignOutUrl }: { afterSignOutUrl?: string }) => (
    <button
      data-after-sign-out-url={afterSignOutUrl}
      data-testid="mock-user-button"
      type="button"
    >
      User button
    </button>
  ),
  useAuth: () => mockAuthState,
  useUser: () => mockUserState,
}))

describe('clerkRuntime', () => {
  beforeEach(() => {
    mockAuthState.isLoaded = true
    mockAuthState.isSignedIn = false
    mockAuthState.sessionClaims = null
    mockAuthState.userId = null
    mockUserState.isLoaded = true
    mockUserState.user = null
  })

  it('keeps the client runtime disabled without the public auth flag', () => {
    expect(
      getOptionalClerkClientConfig({
        VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_123',
      }),
    ).toMatchObject({
      accountPreparationEnabled: false,
      enabled: false,
      publishableKey: undefined,
    })
  })

  it('enables the client runtime when the public auth flag and publishable key exist', () => {
    expect(
      getOptionalClerkClientConfig({
        VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_123',
        VITE_ENABLE_OPTIONAL_AUTH: '1',
      }),
    ).toMatchObject({
      accountPreparationEnabled: false,
      enabled: true,
      publishableKey: 'pk_test_123',
    })
  })

  it('marks account preparation as available only when Convex and Clerk issuer config are public too', () => {
    expect(
      getOptionalClerkClientConfig({
        VITE_CLERK_JWT_ISSUER_DOMAIN: 'https://clerk.example.com',
        VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_123',
        VITE_CONVEX_URL: 'https://kind-otter-123.convex.cloud',
        VITE_ENABLE_OPTIONAL_AUTH: '1',
      }),
    ).toMatchObject({
      accountPreparationEnabled: true,
      enabled: true,
      publishableKey: 'pk_test_123',
    })
  })

  it('requires the public flag, publishable key, and secret key on the server', () => {
    expect(
      getOptionalClerkServerConfig({
        CLERK_PUBLISHABLE_KEY: 'pk_test_123',
        CLERK_SECRET_KEY: 'sk_test_123',
        VITE_ENABLE_OPTIONAL_AUTH: '1',
      }),
    ).toMatchObject({
      accountPreparationEnabled: false,
      enabled: true,
      publishableKey: 'pk_test_123',
      secretKey: 'sk_test_123',
    })

    expect(
      getOptionalClerkServerConfig({
        CLERK_PUBLISHABLE_KEY: 'pk_test_123',
        VITE_ENABLE_OPTIONAL_AUTH: '1',
      }),
    ).toMatchObject({
      accountPreparationEnabled: false,
      enabled: false,
      publishableKey: undefined,
      secretKey: undefined,
    })
  })

  it('passes children through directly when optional auth is disabled', () => {
    render(
      <OptionalClerkProvider
        config={{
          accountPreparationEnabled: false,
          enabled: false,
          publishableKey: undefined,
        }}
      >
        <div>notes app</div>
      </OptionalClerkProvider>,
    )

    expect(screen.getByText(/notes app/i)).toBeInTheDocument()
    expect(screen.queryByTestId('mock-clerk-provider')).not.toBeInTheDocument()
  })

  it('wraps children in ClerkProvider when optional auth is enabled', () => {
    render(
      <OptionalClerkProvider
        config={{
          accountPreparationEnabled: false,
          enabled: true,
          publishableKey: 'pk_test_123',
        }}
      >
        <div>notes app</div>
      </OptionalClerkProvider>,
    )

    expect(screen.getByTestId('mock-clerk-provider')).toHaveAttribute(
      'data-publishable-key',
      'pk_test_123',
    )
    expect(screen.getByText(/notes app/i)).toBeInTheDocument()
  })

  it('hides settings account controls when optional auth is disabled', () => {
    render(
      <OptionalSettingsAccountControls
        config={{
          accountPreparationEnabled: false,
          enabled: false,
          publishableKey: undefined,
        }}
      />,
    )

    expect(
      screen.queryByRole('button', { name: /sign in to prepare account/i }),
    ).not.toBeInTheDocument()
  })

  it('renders a settings sign-in control when optional auth is enabled and signed out', () => {
    mockAuthState.isSignedIn = false
    mockAuthState.userId = null
    mockUserState.user = null

    render(
      <OptionalSettingsAccountControls
        config={{
          accountPreparationEnabled: true,
          enabled: true,
          publishableKey: 'pk_test_123',
        }}
      />,
    )

    expect(
      screen.getByRole('button', { name: /sign in to prepare account/i }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('mock-sign-in-button')).toHaveAttribute(
      'data-fallback-redirect-url',
      '/settings',
    )
    expect(
      screen.getByText(/notes still stay on this device until migration/i),
    ).toBeInTheDocument()
  })

  it('renders account management controls when optional auth is enabled and signed in', () => {
    mockAuthState.isSignedIn = true
    mockAuthState.userId = 'user_123'
    mockUserState.user = {
      fullName: 'Mila Example',
      primaryEmailAddress: {
        emailAddress: 'mila@example.com',
      },
    }

    render(
      <OptionalSettingsAccountControls
        config={{
          accountPreparationEnabled: true,
          enabled: true,
          publishableKey: 'pk_test_123',
        }}
      />,
    )

    expect(screen.getByText(/signed in as/i)).toBeInTheDocument()
    expect(screen.getByText(/mila example/i)).toBeInTheDocument()
    expect(screen.getByTestId('mock-user-button')).toBeInTheDocument()
  })

  it('withholds the sign-in CTA when account preparation is not configured honestly enough', () => {
    render(
      <OptionalSettingsAccountControls
        config={{
          accountPreparationEnabled: false,
          enabled: true,
          publishableKey: 'pk_test_123',
        }}
      />,
    )

    expect(
      screen.queryByRole('button', { name: /sign in to prepare account/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(/account copy is not configured in this build yet/i),
    ).toBeInTheDocument()
  })
})
