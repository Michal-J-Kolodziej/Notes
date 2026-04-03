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
})
