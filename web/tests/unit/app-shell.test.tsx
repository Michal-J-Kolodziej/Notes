import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { HomeScreen } from '../../src/features/capture/HomeScreen'

describe('HomeScreen', () => {
  it('renders the primary note actions', () => {
    render(<HomeScreen />)

    expect(
      screen.getByRole('heading', { name: /make space for a thought/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /start a voice note/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /start a text note/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /drafts/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /recent/i }),
    ).toBeInTheDocument()
  })

  it('renders install actions when install is available', () => {
    render(
      <HomeScreen
        installState={{
          kind: 'installable',
          onDismiss: () => {},
          onInstall: async () => {},
        }}
      />,
    )

    expect(
      screen.getByRole('heading', { name: /keep notes one tap away/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /install app/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /not now/i }),
    ).toBeInTheDocument()
  })

  it('renders visible guest-session identity copy when session details are available', () => {
    render(
      <HomeScreen
        sessionSummary={{
          detail:
            'This device is using a durable guest session. Notes stay local-first and are not backed up to the cloud yet.',
          heading: 'Guest mode on this device',
          sessionLabel: 'AB12CD34',
          statusLabel: 'Local only',
        }}
      />,
    )

    expect(
      screen.getByText(/guest mode on this device/i),
    ).toBeInTheDocument()
    expect(screen.getByText(/ab12cd34/i)).toBeInTheDocument()
    expect(screen.getByText(/local only/i)).toBeInTheDocument()
  })

  it('renders account controls when provided', () => {
    render(<HomeScreen accountControls={<button type="button">Sign in now</button>} />)

    expect(
      screen.getByRole('button', { name: /sign in now/i }),
    ).toBeInTheDocument()
  })
})
