import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createLocalEntryStore } = vi.hoisted(() => ({
  createLocalEntryStore: vi.fn(),
}))

vi.mock('~/features/entries/localStore', () => ({
  createLocalEntryStore,
}))

import { EntryStoreProvider } from '~/features/entries/storeContext'

describe('EntryStoreProvider', () => {
  beforeEach(() => {
    createLocalEntryStore.mockReset()
  })

  it('renders children when durable storage opens successfully', async () => {
    createLocalEntryStore.mockResolvedValueOnce({
      clear: vi.fn(async () => {}),
      deleteEntry: vi.fn(async () => {}),
      getEntry: vi.fn(async () => undefined),
      getEntryAudio: vi.fn(async () => undefined),
      getAudioFile: vi.fn(async () => undefined),
      listEntries: vi.fn(async () => []),
      persistenceMode: 'indexeddb',
      replaceAll: vi.fn(async () => {}),
      saveAudioFile: vi.fn(async (_, blob) => blob),
      saveEntry: vi.fn(async (entry) => entry),
      saveEntryWithAudio: vi.fn(async (entry) => entry),
      deleteAudioFile: vi.fn(async () => {}),
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
