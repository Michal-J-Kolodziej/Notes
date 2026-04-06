import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ConnectionStatusBanner } from '../../src/features/pwa/ConnectionStatusBanner'

const originalOnLineDescriptor = Object.getOwnPropertyDescriptor(
  Navigator.prototype,
  'onLine',
)

function setNavigatorOnlineValue(value: boolean | undefined) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value,
  })
}

afterEach(() => {
  if (originalOnLineDescriptor) {
    Object.defineProperty(Navigator.prototype, 'onLine', originalOnLineDescriptor)
  }
})

describe('ConnectionStatusBanner', () => {
  it('shows the banner when the browser is explicitly offline', () => {
    setNavigatorOnlineValue(false)

    render(<ConnectionStatusBanner />)

    expect(
      screen.getByText(/you are offline\. local notes still work on this device/i),
    ).toBeInTheDocument()
  })

  it('stays hidden when the runtime does not expose an online state', () => {
    setNavigatorOnlineValue(undefined)

    render(<ConnectionStatusBanner />)

    expect(
      screen.queryByText(/you are offline\. local notes still work on this device/i),
    ).not.toBeInTheDocument()
  })
})
