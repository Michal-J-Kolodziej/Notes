import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppSession, ExternalAccountState } from '~/lib/auth'
import {
  AppSessionProvider,
  getGuestSessionForBackendSync,
  summarizeAppSession,
  useAppSession,
  useAppSessionControls,
} from '~/lib/auth'

function SessionProbe() {
  const session = useAppSession()

  if (session.status === 'loading') {
    return <div>loading session</div>
  }

  return (
    <div>
      {session.mode} {session.persistence} {session.backendRegistration.status}{' '}
      {session.sessionId}
    </div>
  )
}

function SessionJsonProbe() {
  const session = useAppSession()

  return <pre data-testid="session-json">{JSON.stringify(session)}</pre>
}

function RetryAccountPreparationButton() {
  const { retryAccountPreparation } = useAppSessionControls()

  return (
    <button onClick={retryAccountPreparation} type="button">
      Retry account prep
    </button>
  )
}

function readSessionJson() {
  return JSON.parse(screen.getByTestId('session-json').textContent)
}

const signedInAccountState: ExternalAccountState = {
  authSubject: 'user_123',
  displayName: 'Mila Example',
  email: 'mila@example.com',
  getToken: vi.fn(() => Promise.resolve('clerk-token-123')),
  sessionClaims: { aud: 'convex' },
  status: 'signed_in',
}

describe('AppSessionProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('loads a guest session for the current browser profile', async () => {
    render(
      <AppSessionProvider>
        <SessionProbe />
      </AppSessionProvider>,
    )

    expect(
      await screen.findByText(/guest local_storage local_only/i),
    ).toBeInTheDocument()
  })

  it('summarizes a registered guest session without implying cloud backup', () => {
    const summary = summarizeAppSession({
      backendRegistration: {
        migrationState: 'local_only',
        status: 'registered',
      },
      createdAt: 1_712_000_000_000,
      mode: 'guest',
      persistence: 'local_storage',
      sessionId: 'guest-session-1234',
      status: 'ready',
    } satisfies AppSession)

    expect(summary?.heading).toMatch(/guest mode on this device/i)
    expect(summary?.statusLabel).toBe('Migration ready')
    expect(summary?.detail).toMatch(/future account migration/i)
    expect(summary?.detail).toMatch(/not backed up to the cloud yet/i)
  })

  it('surfaces backend registration failure without hiding local ownership', () => {
    const summary = summarizeAppSession({
      backendRegistration: {
        reason: 'request_failed',
        status: 'unavailable',
      },
      createdAt: 1_712_000_000_000,
      mode: 'guest',
      persistence: 'local_storage',
      sessionId: 'guest-session-1234',
      status: 'ready',
    } satisfies AppSession)

    expect(summary?.statusLabel).toBe('Cloud prep unavailable')
    expect(summary?.detail).toMatch(/could not reach backend registration/i)
    expect(summary?.detail).toMatch(/remain local to this device/i)
  })

  it('summarizes an authenticated account without implying notes are already synced', () => {
    const summary = summarizeAppSession({
      authSubject: 'user_123',
      backendRegistration: {
        migrationState: 'local_only',
        status: 'registered',
      },
      createdAt: 1_712_000_000_000,
      displayName: 'Mila Example',
      email: 'mila@example.com',
      mode: 'account',
      persistence: 'local_storage',
      sessionId: 'guest-session-1234',
      status: 'ready',
      userId: 'users:1',
    } as AppSession)

    expect(summary?.heading).toMatch(/mila example/i)
    expect(summary?.statusLabel).toBe('Account ready')
    expect(summary?.detail).toMatch(/still stay local to this device until migration/i)
    expect(summary?.detail).not.toMatch(/backed up/i)
  })

  it('surfaces account-prep failures without implying migration or backup', () => {
    const summary = summarizeAppSession({
      authSubject: 'user_123',
      backendRegistration: {
        reason: 'missing_backend_config',
        status: 'local_only',
      },
      createdAt: 1_712_000_000_000,
      displayName: 'Mila Example',
      email: 'mila@example.com',
      mode: 'account_pending',
      persistence: 'local_storage',
      reason: 'request_failed',
      sessionId: 'guest-session-1234',
      status: 'ready',
    } as AppSession)

    expect(summary?.heading).toMatch(/mila example/i)
    expect(summary?.statusLabel).toBe('Account prep unavailable')
    expect(summary?.detail).toMatch(/could not prepare account migration/i)
    expect(summary?.detail).toMatch(/notes still stay local to this device/i)
    expect(summary?.detail).not.toMatch(/backed up/i)
  })

  it('keeps durable guest-session sync eligible even after account overlay exists', () => {
    expect(
      getGuestSessionForBackendSync({
        backendRegistration: {
          reason: 'missing_backend_config',
          status: 'local_only',
        },
        createdAt: 1_712_000_000_000,
        mode: 'guest',
        persistence: 'local_storage',
        sessionId: 'guest-session-1234',
        status: 'ready',
      } satisfies AppSession),
    ).toMatchObject({
      mode: 'guest',
      persistence: 'local_storage',
      sessionId: 'guest-session-1234',
    })

    expect(
      getGuestSessionForBackendSync({
        authSubject: 'user_123',
        backendRegistration: {
          reason: 'missing_backend_config',
          status: 'local_only',
        },
        createdAt: 1_712_000_000_000,
        displayName: 'Mila Example',
        email: 'mila@example.com',
        mode: 'account',
        persistence: 'local_storage',
        sessionId: 'guest-session-1234',
        status: 'ready',
        userId: 'users:1',
      } as AppSession),
    ).toMatchObject({
      mode: 'guest',
      persistence: 'local_storage',
      sessionId: 'guest-session-1234',
    })
  })

  it('promotes a signed-in Clerk user into backend-verified account mode', async () => {
    const syncAuthenticatedAccount = vi.fn().mockResolvedValue({
      status: 'ready',
      userId: 'users:1',
    })
    const accountClient = {
      clearAuth: vi.fn(),
      mutation: vi.fn(),
      setAuth: vi.fn(),
    }

    render(
      <AppSessionProvider
        externalAccountState={signedInAccountState}
        getAccountClient={() => accountClient}
        syncAuthenticatedAccount={syncAuthenticatedAccount}
      >
      <SessionJsonProbe />
      </AppSessionProvider>,
    )

    await waitFor(() => {
      expect(readSessionJson()).toMatchObject({
        authSubject: 'user_123',
        displayName: 'Mila Example',
        mode: 'account',
        userId: 'users:1',
      })
    })

    expect(syncAuthenticatedAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'guest',
      }),
      signedInAccountState,
      accountClient,
    )
  })

  it('falls back to the same guest session after account sign-out', async () => {
    const syncAuthenticatedAccount = vi.fn().mockResolvedValue({
      status: 'ready',
      userId: 'users:1',
    })
    const accountClient = {
      clearAuth: vi.fn(),
      mutation: vi.fn(),
      setAuth: vi.fn(),
    }

    const { rerender } = render(
      <AppSessionProvider
        externalAccountState={signedInAccountState}
        getAccountClient={() => accountClient}
        syncAuthenticatedAccount={syncAuthenticatedAccount}
      >
        <SessionJsonProbe />
      </AppSessionProvider>,
    )

    let guestSessionId = ''

    await waitFor(() => {
      const session = readSessionJson() as AppSession & { sessionId: string }

      expect(session).toMatchObject({
        mode: 'account',
        userId: 'users:1',
      })

      guestSessionId = session.sessionId
    })

    rerender(
      <AppSessionProvider
        externalAccountState={{ status: 'signed_out' }}
        getAccountClient={() => accountClient}
        syncAuthenticatedAccount={syncAuthenticatedAccount}
      >
        <SessionJsonProbe />
      </AppSessionProvider>,
    )

    await waitFor(() => {
      expect(readSessionJson()).toMatchObject({
        mode: 'guest',
        sessionId: guestSessionId,
      })
    })

    expect(accountClient.clearAuth).toHaveBeenCalled()
  })

  it('retries account preparation after a transient backend failure', async () => {
    const syncAuthenticatedAccount = vi
      .fn()
      .mockResolvedValueOnce({
        reason: 'request_failed',
        status: 'unavailable',
      })
      .mockResolvedValueOnce({
        status: 'ready',
        userId: 'users:1',
      })
    const accountClient = {
      clearAuth: vi.fn(),
      mutation: vi.fn(),
      setAuth: vi.fn(),
    }

    render(
      <AppSessionProvider
        externalAccountState={signedInAccountState}
        getAccountClient={() => accountClient}
        syncAuthenticatedAccount={syncAuthenticatedAccount}
      >
        <SessionJsonProbe />
        <RetryAccountPreparationButton />
      </AppSessionProvider>,
    )

    await waitFor(() => {
      expect(readSessionJson()).toMatchObject({
        mode: 'account_pending',
        reason: 'request_failed',
      })
    })

    fireEvent.click(screen.getByRole('button', { name: /retry account prep/i }))

    await waitFor(() => {
      expect(readSessionJson()).toMatchObject({
        mode: 'account',
        userId: 'users:1',
      })
    })

    expect(syncAuthenticatedAccount).toHaveBeenCalledTimes(2)
  })
})
