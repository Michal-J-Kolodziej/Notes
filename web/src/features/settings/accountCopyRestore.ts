import { api } from '../../../convex/_generated/api'
import { bytesToBase64 } from './exportLocalEntries'
import { restoreLocalEntriesFromJson } from './restoreLocalEntries'
import type { EntryRecord, EntryStore } from '~/features/entries'
import type { ReadyAccountSession } from '~/lib/auth'
import type { LocalEntriesExport } from './exportLocalEntries'

interface AccountCopyRestoreClient {
  query?: (...args: Array<any>) => Promise<any>
}

interface RemoteRetainedAudio {
  downloadUrl: string
  mimeType: string
  sizeBytes: number
}

interface RemoteAccountCopyEntry {
  createdAt: number
  deviceLocalId: string
  hasAudio: boolean
  localAudioFileId: string | null
  localEntryId: string
  retainedAudio: RemoteRetainedAudio | null
  sourceType: EntryRecord['sourceType']
  status: EntryRecord['status']
  storageMode: EntryRecord['storageMode']
  title: string
  transcript: string
  updatedAt: number
}

const accountCopyRestoreQuery = (api.myFunctions as {
  getAccountCopyRestoreSnapshot: unknown
}).getAccountCopyRestoreSnapshot

function hasFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isRemoteRetainedAudio(value: unknown): value is RemoteRetainedAudio {
  return (
    typeof value === 'object' &&
    value !== null &&
    isString((value as RemoteRetainedAudio).downloadUrl) &&
    isString((value as RemoteRetainedAudio).mimeType) &&
    hasFiniteNumber((value as RemoteRetainedAudio).sizeBytes) &&
    (value as RemoteRetainedAudio).sizeBytes >= 0
  )
}

function toLocalEntry(
  entry: RemoteAccountCopyEntry,
  session: ReadyAccountSession,
): EntryRecord {
  const expectsRetainedAudio =
    entry.hasAudio && entry.storageMode === 'transcript_plus_audio'

  if (expectsRetainedAudio !== Boolean(entry.retainedAudio)) {
    throw new Error(
      `The verified account copy is inconsistent for note ${entry.deviceLocalId}.`,
    )
  }

  const audioFileId =
    expectsRetainedAudio
      ? entry.localAudioFileId ?? `account-copy-audio:${entry.deviceLocalId}`
      : null

  if (
    entry.hasAudio !== (audioFileId !== null) ||
    (entry.storageMode === 'transcript_only' && audioFileId !== null) ||
    (entry.storageMode === 'transcript_plus_audio' && audioFileId === null)
  ) {
    throw new Error(
      `The verified account copy is inconsistent for note ${entry.deviceLocalId}.`,
    )
  }

  return {
    audioFileId,
    createdAt: entry.createdAt,
    deviceLocalId: entry.deviceLocalId,
    hasAudio: entry.hasAudio,
    id: entry.localEntryId,
    ownerMode: 'account_local',
    sourceType: entry.sourceType,
    status: entry.status,
    storageMode: entry.storageMode,
    title: entry.title,
    transcript: entry.transcript,
    updatedAt: entry.updatedAt,
    userId: session.userId,
  }
}

async function toRetainedAudioExport(
  entry: EntryRecord,
  remoteAudio: RemoteRetainedAudio,
  fetchImpl: typeof fetch,
) {
  const response = await fetchImpl(remoteAudio.downloadUrl)

  if (!response.ok) {
    throw new Error(
      `Verified account copy retained audio could not be downloaded for note ${entry.id}.`,
    )
  }

  const bytes = new Uint8Array(await response.arrayBuffer())

  if (bytes.byteLength !== remoteAudio.sizeBytes) {
    throw new Error(
      `Verified account copy retained audio size is invalid for note ${entry.id}.`,
    )
  }

  return {
    audioFileId: entry.audioFileId!,
    base64: bytesToBase64(bytes),
    entryId: entry.id,
    mimeType: remoteAudio.mimeType || 'application/octet-stream',
    sizeBytes: remoteAudio.sizeBytes,
  }
}

function toValidatedRemoteEntries(value: unknown): Array<RemoteAccountCopyEntry> {
  if (!Array.isArray(value)) {
    throw new Error('The verified account copy snapshot is invalid.')
  }

  return value.map((entry) => {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      !hasFiniteNumber((entry as RemoteAccountCopyEntry).createdAt) ||
      !isString((entry as RemoteAccountCopyEntry).deviceLocalId) ||
      typeof (entry as RemoteAccountCopyEntry).hasAudio !== 'boolean' ||
      !(
        (entry as RemoteAccountCopyEntry).localAudioFileId === null ||
        isString((entry as RemoteAccountCopyEntry).localAudioFileId)
      ) ||
      !isString((entry as RemoteAccountCopyEntry).localEntryId) ||
      !(
        (entry as RemoteAccountCopyEntry).retainedAudio === null ||
        isRemoteRetainedAudio((entry as RemoteAccountCopyEntry).retainedAudio)
      ) ||
      !isString((entry as RemoteAccountCopyEntry).sourceType) ||
      !isString((entry as RemoteAccountCopyEntry).status) ||
      !isString((entry as RemoteAccountCopyEntry).storageMode) ||
      !isString((entry as RemoteAccountCopyEntry).title) ||
      !isString((entry as RemoteAccountCopyEntry).transcript) ||
      !hasFiniteNumber((entry as RemoteAccountCopyEntry).updatedAt)
    ) {
      throw new Error('The verified account copy snapshot is invalid.')
    }

    return entry as RemoteAccountCopyEntry
  })
}

export async function restoreLocalEntriesFromAccountCopy({
  client,
  fetchImpl = fetch,
  session,
  snapshotGuestSessionId,
  store,
}: {
  client: AccountCopyRestoreClient
  fetchImpl?: typeof fetch
  session: ReadyAccountSession
  snapshotGuestSessionId?: string
  store: Pick<EntryStore, 'listEntries' | 'replaceAll' | 'getEntryAudio'>
}) {
  const existingEntries = await store.listEntries()

  if (existingEntries.length > 0) {
    throw new Error(
      'Local notes must be empty before restoring from the verified account copy on this device.',
    )
  }

  if (!client.query) {
    throw new Error('Account restore is not configured in this build.')
  }

  const result = (await client.query(accountCopyRestoreQuery, {
    guestSessionId: snapshotGuestSessionId ?? session.sessionId,
  })) as {
    entries?: Array<unknown>
  }
  const remoteEntries = toValidatedRemoteEntries(result.entries ?? [])

  if (remoteEntries.length === 0) {
    throw new Error(
      'This account does not have a restorable copied snapshot for this device yet.',
    )
  }

  const entries = remoteEntries.map((entry) => toLocalEntry(entry, session))
  const retainedAudio = (
    await Promise.all(
      entries.map(async (localEntry, index) => {
        const remoteAudio = remoteEntries[index].retainedAudio

        if (!remoteAudio) {
          return null
        }

        return await toRetainedAudioExport(localEntry, remoteAudio, fetchImpl)
      }),
    )
  ).filter((audio): audio is LocalEntriesExport['retainedAudio'][number] => Boolean(audio))
  const payload: LocalEntriesExport = {
    entries,
    exportedAt: new Date().toISOString(),
    retainedAudio,
    schemaVersion: 1,
  }

  return await restoreLocalEntriesFromJson(store, JSON.stringify(payload))
}
