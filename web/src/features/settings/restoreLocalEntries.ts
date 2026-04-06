import type {
  EntryOwnerMode,
  EntryRecord,
  EntrySourceType,
  EntryStatus,
  EntryStorageMode,
  EntryStore,
  EntryStoreSnapshot,
} from '~/features/entries'

const ENTRY_STATUSES = new Set<EntryStatus>([
  'draft_local',
  'recording',
  'processing',
  'review_ready',
  'saved_local',
  'syncing',
  'saved_remote',
  'needs_retry',
])

const ENTRY_SOURCE_TYPES = new Set<EntrySourceType>(['voice', 'text'])
const ENTRY_OWNER_MODES = new Set<EntryOwnerMode>([
  'guest_local',
  'account_local',
  'account_synced',
])
const ENTRY_STORAGE_MODES = new Set<EntryStorageMode>([
  'transcript_only',
  'transcript_plus_audio',
])
const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

type RestoreStore = Pick<EntryStore, 'getEntryAudio' | 'listEntries' | 'replaceAll'>

interface ParsedRecoveryPayload {
  entries: Array<unknown>
  exportedAt: string
  retainedAudio: Array<unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isEntryOwnerMode(value: unknown): value is EntryOwnerMode {
  return typeof value === 'string' && ENTRY_OWNER_MODES.has(value as EntryOwnerMode)
}

function isEntrySourceType(value: unknown): value is EntrySourceType {
  return typeof value === 'string' && ENTRY_SOURCE_TYPES.has(value as EntrySourceType)
}

function isEntryStatus(value: unknown): value is EntryStatus {
  return typeof value === 'string' && ENTRY_STATUSES.has(value as EntryStatus)
}

function isEntryStorageMode(value: unknown): value is EntryStorageMode {
  return (
    typeof value === 'string' &&
    ENTRY_STORAGE_MODES.has(value as EntryStorageMode)
  )
}

function cloneEntry(entry: EntryRecord) {
  return structuredClone(entry)
}

function toValidatedEntry(entry: unknown): EntryRecord {
  if (!isRecord(entry)) {
    throw new Error('Recovery file contains an invalid note record.')
  }

  const candidate = entry

  if (
    !isString(candidate.id) ||
    !isString(candidate.deviceLocalId) ||
    !isEntryOwnerMode(candidate.ownerMode) ||
    !isEntrySourceType(candidate.sourceType) ||
    !isEntryStatus(candidate.status) ||
    !isString(candidate.title) ||
    !isString(candidate.transcript) ||
    typeof candidate.hasAudio !== 'boolean' ||
    !(candidate.audioFileId === null || isString(candidate.audioFileId)) ||
    !isEntryStorageMode(candidate.storageMode) ||
    !isFiniteNumber(candidate.createdAt) ||
    !isFiniteNumber(candidate.updatedAt) ||
    !(
      candidate.userId === undefined ||
      candidate.userId === null ||
      isString(candidate.userId)
    )
  ) {
    throw new Error('Recovery file contains an invalid note record.')
  }

  if (
    (candidate.storageMode === 'transcript_plus_audio' &&
      (!candidate.hasAudio || !isString(candidate.audioFileId))) ||
    (candidate.storageMode === 'transcript_only' &&
      (candidate.hasAudio || candidate.audioFileId !== null))
  ) {
    throw new Error(`Recovery file contains inconsistent audio metadata for note ${candidate.id}.`)
  }

  return structuredClone({
    audioFileId: candidate.audioFileId,
    createdAt: candidate.createdAt,
    deviceLocalId: candidate.deviceLocalId,
    hasAudio: candidate.hasAudio,
    id: candidate.id,
    ownerMode: candidate.ownerMode,
    sourceType: candidate.sourceType,
    status: candidate.status,
    storageMode: candidate.storageMode,
    title: candidate.title,
    transcript: candidate.transcript,
    updatedAt: candidate.updatedAt,
    ...(isString(candidate.userId) ? { userId: candidate.userId } : {}),
  } satisfies EntryRecord)
}

function base64ToBytes(value: string) {
  const normalized = value.replace(/\s+/g, '')

  if (!normalized || normalized.length % 4 !== 0) {
    throw new Error('Recovery file contains invalid retained audio encoding.')
  }

  const bytes: Array<number> = []

  for (let index = 0; index < normalized.length; index += 4) {
    const chunk = normalized.slice(index, index + 4)
    const sextets = chunk.split('').map((character) => {
      if (character === '=') {
        return -1
      }

      return BASE64_ALPHABET.indexOf(character)
    })

    if (sextets.some((sextet) => sextet < -1)) {
      throw new Error('Recovery file contains invalid retained audio encoding.')
    }

    if (sextets[2] === -1 && sextets[3] !== -1) {
      throw new Error('Recovery file contains invalid retained audio encoding.')
    }

    const combined =
      ((sextets[0] & 0x3f) << 18) |
      ((sextets[1] & 0x3f) << 12) |
      (((sextets[2] < 0 ? 0 : sextets[2]) & 0x3f) << 6) |
      ((sextets[3] < 0 ? 0 : sextets[3]) & 0x3f)

    bytes.push((combined >> 16) & 0xff)

    if (sextets[2] !== -1) {
      bytes.push((combined >> 8) & 0xff)
    }

    if (sextets[3] !== -1) {
      bytes.push(combined & 0xff)
    }
  }

  return new Uint8Array(bytes)
}

function parseRecoveryPayload(json: string): ParsedRecoveryPayload {
  let parsed: unknown

  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Recovery file is not valid JSON.')
  }

  if (!isRecord(parsed)) {
    throw new Error('Recovery file is invalid.')
  }

  if (parsed.schemaVersion !== 1) {
    throw new Error('Recovery file schema is unsupported on this device.')
  }

  if (!Array.isArray(parsed.entries) || !Array.isArray(parsed.retainedAudio)) {
    throw new Error('Recovery file is missing notes or retained audio arrays.')
  }

  if (!isString(parsed.exportedAt)) {
    throw new Error('Recovery file is missing export metadata.')
  }

  return {
    entries: parsed.entries,
    exportedAt: parsed.exportedAt,
    retainedAudio: parsed.retainedAudio,
  }
}

function buildSnapshot(payload: ParsedRecoveryPayload): EntryStoreSnapshot {
  const entries = payload.entries.map(toValidatedEntry)
  const entriesById = new Map(entries.map((entry) => [entry.id, entry] as const))
  const seenEntryIds = new Set<string>()

  for (const entry of entries) {
    if (seenEntryIds.has(entry.id)) {
      throw new Error(`Recovery file contains duplicate note id ${entry.id}.`)
    }

    seenEntryIds.add(entry.id)
  }

  const audioFiles = payload.retainedAudio.map((audio) => {
    if (
      !isRecord(audio) ||
      !isString(audio.audioFileId) ||
      !isString(audio.base64) ||
      !isString(audio.entryId) ||
      !isString(audio.mimeType) ||
      !isFiniteNumber(audio.sizeBytes) ||
      audio.sizeBytes < 0
    ) {
      throw new Error('Recovery file contains an invalid retained audio record.')
    }

    const entry = entriesById.get(audio.entryId)

    if (!entry) {
      throw new Error(`Recovery file retained audio points to missing note ${audio.entryId}.`)
    }

    if (
      entry.storageMode !== 'transcript_plus_audio' ||
      !entry.hasAudio ||
      entry.audioFileId !== audio.audioFileId
    ) {
      throw new Error(`Recovery file retained audio does not match note ${audio.entryId}.`)
    }

    const bytes = base64ToBytes(audio.base64)

    if (bytes.byteLength !== audio.sizeBytes) {
      throw new Error(`Recovery file retained audio size is invalid for note ${audio.entryId}.`)
    }

    return {
      blob: new Blob([bytes], {
        type: audio.mimeType || 'application/octet-stream',
      }),
      id: audio.audioFileId,
    }
  })

  const seenAudioIds = new Set<string>()

  for (const audioFile of audioFiles) {
    if (seenAudioIds.has(audioFile.id)) {
      throw new Error(`Recovery file contains duplicate retained audio id ${audioFile.id}.`)
    }

    seenAudioIds.add(audioFile.id)
  }

  for (const entry of entries) {
    if (
      entry.storageMode === 'transcript_plus_audio' &&
      entry.hasAudio &&
      entry.audioFileId &&
      !seenAudioIds.has(entry.audioFileId)
    ) {
      throw new Error(`Recovery file is missing retained audio for note ${entry.id}.`)
    }
  }

  return {
    audioFiles,
    entries,
  }
}

async function captureCurrentSnapshot(
  store: RestoreStore,
): Promise<EntryStoreSnapshot> {
  const entries = (await store.listEntries()).map(cloneEntry)
  const retainedAudioIds = [
    ...new Set(
      entries
        .filter(
          (entry) =>
            entry.hasAudio &&
            entry.storageMode === 'transcript_plus_audio' &&
            entry.audioFileId,
        )
        .map((entry) => entry.audioFileId!),
    ),
  ]
  const audioFiles = (
    await Promise.all(
      retainedAudioIds.map(async (audioFileId) => {
        const blob = await store.getEntryAudio(audioFileId)

        return blob
          ? {
              blob,
              id: audioFileId,
            }
          : null
      }),
    )
  ).filter((audioFile): audioFile is EntryStoreSnapshot['audioFiles'][number] =>
    Boolean(audioFile),
  )

  return {
    audioFiles,
    entries,
  }
}

async function verifyRestoredSnapshot(
  store: RestoreStore,
  snapshot: EntryStoreSnapshot,
) {
  const restoredEntries = await store.listEntries()

  if (restoredEntries.length !== snapshot.entries.length) {
    throw new Error('Recovery file could not be verified after restore.')
  }

  await Promise.all(
    snapshot.audioFiles.map(async (audioFile) => {
      const restoredAudio = await store.getEntryAudio(audioFile.id)

      if (!restoredAudio) {
        throw new Error('Recovery file retained audio could not be verified after restore.')
      }
    }),
  )
}

export async function restoreLocalEntriesFromJson(
  store: RestoreStore,
  json: string,
) {
  const payload = parseRecoveryPayload(json)
  const snapshot = buildSnapshot(payload)
  const previousSnapshot = await captureCurrentSnapshot(store)

  try {
    await store.replaceAll(snapshot)
    await verifyRestoredSnapshot(store, snapshot)
  } catch (error) {
    try {
      await store.replaceAll(previousSnapshot)
    } catch {
      throw error
    }

    throw error
  }

  return {
    entryCount: snapshot.entries.length,
    retainedAudioCount: snapshot.audioFiles.length,
  }
}
