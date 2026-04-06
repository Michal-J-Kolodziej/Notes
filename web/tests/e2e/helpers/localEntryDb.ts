import {  test as base, expect } from '@playwright/test'
import {
  ENTRY_AUDIO_STORE_NAME,
  ENTRY_DATABASE_NAME,
  ENTRY_DATABASE_VERSION,
  ENTRY_STORE_NAME,
} from '../../../src/lib/platform/indexedDb'
import type {Page} from '@playwright/test';
import type { EntryRecord } from '../../../src/features/entries'

export type LocalEntrySeed = {
  entry: EntryRecord
  audio?:
    | { kind: 'silent-wav' }
    | { kind: 'text'; text: string; mimeType?: string }
}

export interface LocalEntryDbHarness {
  getEntry: (entryId: string) => Promise<EntryRecord | undefined>
  seed: (...seeds: Array<LocalEntrySeed>) => Promise<void>
  hasRetainedAudio: (audioFileId: string) => Promise<boolean>
}

interface RegisterLocalEntryDbHelpersArgs {
  entryAudioStoreName: string
  entryDatabaseName: string
  entryDatabaseVersion: number
  entryStoreName: string
}

interface SeedLocalEntryOptions {
  audioText?: string
  mimeType?: string
}

interface WindowWithLocalEntryDbHelpers extends Window {
  __getLocalEntry: (entryId: string) => Promise<EntryRecord | undefined>
  __hasRetainedAudioRecord: (audioFileId: string) => Promise<boolean>
  __seedLocalEntry: (
    entry: EntryRecord,
    options?: SeedLocalEntryOptions,
  ) => Promise<void>
}

export const test = base.extend<{ localEntryDb: LocalEntryDbHarness }>({
  localEntryDb: async ({ page }, use) => {
    await installLocalEntryDbSidecar(page)
    await use(createLocalEntryDbHarness(page))
  },
})

export { expect }

async function installLocalEntryDbSidecar(page: Page) {
  await page.addInitScript(registerLocalEntryDbHelpers, {
    entryAudioStoreName: ENTRY_AUDIO_STORE_NAME,
    entryStoreName: ENTRY_STORE_NAME,
    entryDatabaseName: ENTRY_DATABASE_NAME,
    entryDatabaseVersion: ENTRY_DATABASE_VERSION,
  })
}

function createLocalEntryDbHarness(page: Page): LocalEntryDbHarness {
  return {
    async seed(...seeds) {
      for (const seed of seeds) {
        await page.evaluate(
          async ({ entry, options }) => {
            await (
              window as unknown as WindowWithLocalEntryDbHelpers
            ).__seedLocalEntry(entry, options)
          },
          {
            entry: seed.entry,
            options: toSeedLocalEntryOptions(seed.audio),
          },
        )
      }
    },

    async hasRetainedAudio(audioFileId) {
      return await page.evaluate(
        async ({ audioFileId: id }) => {
          return await (
            window as unknown as WindowWithLocalEntryDbHelpers
          ).__hasRetainedAudioRecord(id)
        },
        { audioFileId },
      )
    },

    async getEntry(entryId) {
      return await page.evaluate(
        async ({ entryId: id }) => {
          return await (window as unknown as WindowWithLocalEntryDbHelpers).__getLocalEntry(
            id,
          )
        },
        { entryId },
      )
    },
  }
}

function toSeedLocalEntryOptions(
  audio: LocalEntrySeed['audio'],
): SeedLocalEntryOptions | undefined {
  if (!audio || audio.kind === 'silent-wav') {
    return undefined
  }

  return {
    audioText: audio.text,
    mimeType: audio.mimeType,
  }
}

function registerLocalEntryDbHelpers({
  entryAudioStoreName,
  entryDatabaseName,
  entryDatabaseVersion,
  entryStoreName,
}: RegisterLocalEntryDbHelpersArgs) {
  function createSilentWavBuffer() {
    const sampleRate = 8_000
    const durationSeconds = 1
    const channelCount = 1
    const bitsPerSample = 16
    const frameCount = sampleRate * durationSeconds
    const blockAlign = (channelCount * bitsPerSample) / 8
    const byteRate = sampleRate * blockAlign
    const dataSize = frameCount * blockAlign
    const buffer = new ArrayBuffer(44 + dataSize)
    const view = new DataView(buffer)
    let offset = 0

    function writeAscii(value: string) {
      for (let index = 0; index < value.length; index += 1) {
        view.setUint8(offset, value.charCodeAt(index))
        offset += 1
      }
    }

    writeAscii('RIFF')
    view.setUint32(offset, 36 + dataSize, true)
    offset += 4
    writeAscii('WAVE')
    writeAscii('fmt ')
    view.setUint32(offset, 16, true)
    offset += 4
    view.setUint16(offset, 1, true)
    offset += 2
    view.setUint16(offset, channelCount, true)
    offset += 2
    view.setUint32(offset, sampleRate, true)
    offset += 4
    view.setUint32(offset, byteRate, true)
    offset += 4
    view.setUint16(offset, blockAlign, true)
    offset += 2
    view.setUint16(offset, bitsPerSample, true)
    offset += 2
    writeAscii('data')
    view.setUint32(offset, dataSize, true)

    return buffer
  }

  function openDatabase() {
    return indexedDB.open(entryDatabaseName, entryDatabaseVersion)
  }

  function hasAudioRecord(audioFileId: string) {
    return new Promise<boolean>((resolve, reject) => {
      const openRequest = openDatabase()

      openRequest.onerror = () => reject(openRequest.error)
      openRequest.onsuccess = () => {
        const database = openRequest.result
        const tx = database.transaction(entryAudioStoreName, 'readonly')
        const getRequest = tx.objectStore(entryAudioStoreName).get(audioFileId)
        getRequest.onerror = () => reject(getRequest.error)
        getRequest.onsuccess = () => {
          database.close()
          resolve(Boolean(getRequest.result))
        }
      }
    })
  }

  function getEntry(entryId: string) {
    return new Promise<EntryRecord | undefined>((resolve, reject) => {
      const openRequest = openDatabase()

      openRequest.onerror = () => reject(openRequest.error)
      openRequest.onsuccess = () => {
        const database = openRequest.result
        const tx = database.transaction(entryStoreName, 'readonly')
        const getRequest = tx.objectStore(entryStoreName).get(entryId)
        getRequest.onerror = () => reject(getRequest.error)
        getRequest.onsuccess = () => {
          database.close()
          resolve(getRequest.result)
        }
      }
    })
  }

  async function seedLocalEntry(
    entry: EntryRecord,
    options: SeedLocalEntryOptions = {},
  ) {
    await new Promise<void>((resolve, reject) => {
      const openRequest = openDatabase()

      openRequest.onupgradeneeded = () => {
        const database = openRequest.result

        if (!database.objectStoreNames.contains(entryStoreName)) {
          database.createObjectStore(entryStoreName, { keyPath: 'id' })
        }

        if (!database.objectStoreNames.contains(entryAudioStoreName)) {
          database.createObjectStore(entryAudioStoreName, { keyPath: 'id' })
        }
      }

      openRequest.onerror = () => reject(openRequest.error)
      openRequest.onsuccess = () => {
        const database = openRequest.result
        const tx = database.transaction(
          [entryStoreName, entryAudioStoreName],
          'readwrite',
        )

        tx.objectStore(entryStoreName).put(entry)

        if (entry.audioFileId && entry.hasAudio) {
          tx.objectStore(entryAudioStoreName).put({
            data:
              options.audioText !== undefined
                ? new TextEncoder().encode(options.audioText).buffer
                : createSilentWavBuffer(),
            id: entry.audioFileId,
            type:
              options.mimeType ??
              (options.audioText !== undefined ? 'audio/webm' : 'audio/wav'),
          })
        }

        tx.onerror = () => reject(tx.error)
        tx.oncomplete = () => {
          database.close()
          resolve()
        }
      }
    })
  }

  ;(window as unknown as WindowWithLocalEntryDbHelpers).__getLocalEntry = getEntry
  ;(window as unknown as WindowWithLocalEntryDbHelpers).__hasRetainedAudioRecord =
    hasAudioRecord
  ;(window as unknown as WindowWithLocalEntryDbHelpers).__seedLocalEntry =
    seedLocalEntry
}
