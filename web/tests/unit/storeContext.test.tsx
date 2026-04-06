import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EntryStoreProvider } from '~/features/entries/storeContext'

const { createLocalEntryStore } = vi.hoisted(() => ({
  createLocalEntryStore: vi.fn(),
}))

vi.mock('~/features/entries/localStore', () => ({
  createLocalEntryStore,
}))

describe('EntryStoreProvider', () => {
  beforeEach(() => {
    createLocalEntryStore.mockReset()
  })

  it('renders children when durable storage opens successfully', async () => {
    createLocalEntryStore.mockResolvedValueOnce({
      clear: vi.fn(() => Promise.resolve()),
      deleteEntry: vi.fn(() => Promise.resolve()),
      getEntry: vi.fn(() => Promise.resolve(undefined)),
      getEntryAudio: vi.fn(() => Promise.resolve(undefined)),
      getAudioFile: vi.fn(() => Promise.resolve(undefined)),
      listEntries: vi.fn(() => Promise.resolve([])),
      persistenceMode: 'indexeddb',
      replaceAll: vi.fn(() => Promise.resolve()),
      saveAudioFile: vi.fn((_, blob) => Promise.resolve(blob)),
      saveEntry: vi.fn((entry) => Promise.resolve(entry)),
      saveEntryWithAudio: vi.fn((entry) => Promise.resolve(entry)),
      deleteAudioFile: vi.fn(() => Promise.resolve()),
    })

    render(
      <EntryStoreProvider>
        <div>app ready</div>
      </EntryStoreProvider>,
    )

    expect(await screen.findByText('app ready')).toBeInTheDocument()
  })

  it('shows a blocking storage error when durable storage cannot be opened', async () => {
    createLocalEntryStore.mockRejectedValueOnce(
      new Error('IndexedDB was blocked in this browser session.'),
    )

    render(
      <EntryStoreProvider>
        <div>app ready</div>
      </EntryStoreProvider>,
    )

    expect(
      await screen.findByRole('heading', {
        name: /could not open durable browser storage/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/indexeddb was blocked in this browser session/i),
    ).toBeInTheDocument()
  })
})
