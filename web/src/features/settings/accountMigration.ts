import { api } from '../../../convex/_generated/api'
import type { EntryRecord, EntryStore } from '~/features/entries'
import type {
  ReadyAccountPendingSession,
  ReadyAccountSession,
} from '~/lib/auth'
import type { LocalDataSummary } from './localDataSummary'

type UploadableAudioFile = {
  audioFileId: string
  blob: Blob
  entryDeviceLocalId: string
  mimeType: string
  sizeBytes: number
}

export type AccountMigrationPlan =
  | {
      actionLabel: 'Checking local notes'
      detail: string
      heading: string
      kind: 'loading'
      statusLabel: 'Checking'
    }
  | {
      actionLabel: 'Checking account prep'
      detail: string
      heading: string
      kind: 'blocked'
      statusLabel: 'Preparing account'
    }
  | {
      actionLabel: 'Account prep unavailable'
      detail: string
      heading: string
      kind: 'blocked'
      statusLabel: 'Blocked'
    }
  | {
      actionLabel: 'Nothing to copy'
      detail: string
      heading: string
      kind: 'empty'
      statusLabel: 'No local notes'
    }
  | {
      actionLabel: 'Copy notes into account' | 'Update account copy'
      detail: string
      heading: string
      kind: 'ready'
      statusLabel: 'Local-only notes' | 'Manual account copy'
    }

export interface AccountMigrationClient {
  mutation: (...args: Array<any>) => Promise<any>
  query?: (...args: Array<any>) => Promise<any>
}

export interface AccountMigrationResult {
  entryCount: number
  retainedAudioCount: number
}

export interface RemoteAccountCopySummary {
  entryCount: number
  guestSessionId: string
  hasAccountCopy: boolean
  lastCopiedAt: number | null
  migrationState: 'local_only' | 'migration_pending' | 'migrated'
  retainedAudioCount: number
}

export type AccountCopyVerificationState =
  | {
      detail: string
      heading: string
      kind: 'empty'
      statusLabel: 'No verified copy'
    }
  | {
      detail: string
      heading: string
      kind: 'mismatch'
      statusLabel: 'Needs review'
    }
  | {
      detail: string
      heading: string
      kind: 'unavailable'
      statusLabel: 'Verification unavailable'
    }
  | {
      detail: string
      heading: string
      kind: 'verified'
      statusLabel: 'Verified'
    }

function createEntryAndAudioSummary({
  entryCount,
  retainedAudioCount,
}: {
  entryCount: number
  retainedAudioCount: number
}) {
  const parts = [
    `${entryCount} ${entryCount === 1 ? 'local note' : 'local notes'}`,
  ]

  if (retainedAudioCount > 0) {
    parts.push(
      `${retainedAudioCount} retained audio ${
        retainedAudioCount === 1 ? 'item' : 'items'
      }`,
    )
  }

  return parts.join(' and ')
}

function createSummaryDetail(summary: LocalDataSummary) {
  return createEntryAndAudioSummary(summary)
}

function formatVerificationTimestamp(lastCopiedAt: number | null) {
  if (!lastCopiedAt) {
    return undefined
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(lastCopiedAt)
}

export function createAccountMigrationPlan({
  dataSummary,
  session,
}: {
  dataSummary?: LocalDataSummary
  session: ReadyAccountPendingSession | ReadyAccountSession
}): AccountMigrationPlan {
  if (session.mode === 'account_pending') {
    if (!session.reason) {
      return {
        actionLabel: 'Checking account prep',
        detail:
          'This device is signed in, and the backend account record is still being prepared before manual account copy can run.',
        heading: 'Preparing account copy on this device.',
        kind: 'blocked',
        statusLabel: 'Preparing account',
      }
    }

    return {
      actionLabel: 'Account prep unavailable',
      detail:
        'This device is signed in, but the backend account record is not ready yet. Local notes stay on this device until account preparation succeeds.',
      heading: 'Account copy is blocked for now.',
      kind: 'blocked',
      statusLabel: 'Blocked',
    }
  }

  if (!dataSummary) {
    return {
      actionLabel: 'Checking local notes',
      detail:
        'Checking the current local note set on this device before account copy is offered.',
      heading: 'Preparing account copy.',
      kind: 'loading',
      statusLabel: 'Checking',
    }
  }

  if (dataSummary.entryCount === 0) {
    return {
      actionLabel: 'Nothing to copy',
      detail:
        'There are no local notes on this device yet, so there is nothing to copy into the signed-in account.',
      heading: 'Account copy is ready when notes exist.',
      kind: 'empty',
      statusLabel: 'No local notes',
    }
  }

  if (dataSummary.guestOwnedCount > 0) {
    return {
      actionLabel: 'Copy notes into account',
      detail: `${createSummaryDetail(dataSummary)} will be copied from this device into the signed-in account. This is still a manual account copy, not background sync.`,
      heading: 'Copy the current local notes into this account.',
      kind: 'ready',
      statusLabel: 'Local-only notes',
    }
  }

  return {
    actionLabel: 'Update account copy',
    detail: `${createSummaryDetail(dataSummary)} can be uploaded again so the signed-in account gets the latest local snapshot from this device. This still does not imply live sync in the background.`,
    heading: 'Refresh the account copy from this device.',
    kind: 'ready',
    statusLabel: 'Manual account copy',
  }
}

export async function getRemoteAccountCopySummary({
  client,
  session,
}: {
  client: AccountMigrationClient
  session: ReadyAccountSession
}) {
  if (!client.query) {
    throw new Error('Account copy verification is not configured in this build.')
  }

  return (await client.query(api.myFunctions.getAccountCopyStatus, {
    guestSessionId: session.sessionId,
  })) as RemoteAccountCopySummary
}

export function createAccountCopyVerificationState({
  expectedSnapshot,
  summary,
}: {
  expectedSnapshot?: AccountMigrationResult
  summary: RemoteAccountCopySummary
}): AccountCopyVerificationState {
  if (summary.migrationState === 'migration_pending' && !summary.hasAccountCopy) {
    return {
      detail:
        'This device started an account copy, but the backend has not verified a finished snapshot yet. Upload again before assuming the account has the latest notes.',
      heading: 'Account copy still needs verification.',
      kind: 'mismatch',
      statusLabel: 'Needs review',
    }
  }

  if (!summary.hasAccountCopy) {
    return {
      detail:
        'This account does not yet have a verified note snapshot from this device.',
      heading: 'No verified account copy yet.',
      kind: 'empty',
      statusLabel: 'No verified copy',
    }
  }

  const verifiedSnapshotDetail = createEntryAndAudioSummary({
    entryCount: summary.entryCount,
    retainedAudioCount: summary.retainedAudioCount,
  })
  const formattedVerifiedAt = formatVerificationTimestamp(summary.lastCopiedAt)

  if (
    expectedSnapshot &&
    (summary.entryCount !== expectedSnapshot.entryCount ||
      summary.retainedAudioCount !== expectedSnapshot.retainedAudioCount)
  ) {
    const expectedSnapshotDetail = createEntryAndAudioSummary({
      entryCount: expectedSnapshot.entryCount,
      retainedAudioCount: expectedSnapshot.retainedAudioCount,
    })

    return {
      detail: `This device expected ${expectedSnapshotDetail}, but the verified account snapshot currently shows ${verifiedSnapshotDetail}. Upload again or wait before treating the account copy as current.`,
      heading: 'Account copy needs review.',
      kind: 'mismatch',
      statusLabel: 'Needs review',
    }
  }

  return {
    detail: formattedVerifiedAt
      ? `Verified ${verifiedSnapshotDetail} in this account on ${formattedVerifiedAt}.`
      : `Verified ${verifiedSnapshotDetail} in this account from this device.`,
    heading: 'Verified account copy from this device.',
    kind: 'verified',
    statusLabel: 'Verified',
  }
}

async function collectUploadableAudioFiles(
  store: EntryStore,
  entries: Array<EntryRecord>,
) {
  const audioFiles = await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.hasAudio &&
          entry.storageMode === 'transcript_plus_audio' &&
          entry.audioFileId !== null,
      )
      .map(async (entry) => {
        const audioFileId = entry.audioFileId

        if (!audioFileId) {
          throw new Error(`Retained audio metadata is missing for entry ${entry.id}.`)
        }

        const blob = await store.getAudioFile(audioFileId)

        if (!blob) {
          throw new Error(`Retained audio is missing for entry ${entry.id}.`)
        }

        return {
          audioFileId,
          blob,
          entryDeviceLocalId: entry.deviceLocalId,
          mimeType: blob.type || 'application/octet-stream',
          sizeBytes: blob.size,
        } satisfies UploadableAudioFile
      }),
  )

  return audioFiles
}

async function uploadRetainedAudioFiles({
  audioFiles,
  client,
  fetchImpl,
}: {
  audioFiles: Array<UploadableAudioFile>
  client: AccountMigrationClient
  fetchImpl: typeof fetch
}) {
  return await Promise.all(
    audioFiles.map(async (audioFile) => {
      const uploadUrl = (await client.mutation(
        api.myFunctions.generateMigrationUploadUrl,
        {},
      )) as string

      const response = await fetchImpl(uploadUrl, {
        body: audioFile.blob,
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(
          `Retained audio could not be uploaded for ${audioFile.entryDeviceLocalId}.`,
        )
      }

      const payload = (await response.json()) as {
        storageId?: string
      }

      if (!payload.storageId) {
        throw new Error(
          `Retained audio upload did not return a storage id for ${audioFile.entryDeviceLocalId}.`,
        )
      }

      return {
        localAudioFileId: audioFile.audioFileId,
        entryDeviceLocalId: audioFile.entryDeviceLocalId,
        mimeType: audioFile.mimeType,
        sizeBytes: audioFile.sizeBytes,
        storageId: payload.storageId,
      }
    }),
  )
}

function toAccountOwnedEntry(entry: EntryRecord, session: ReadyAccountSession): EntryRecord {
  return {
    ...structuredClone(entry),
    ownerMode: 'account_local',
    userId: session.userId,
  }
}

export async function copyLocalEntriesToAccount({
  client,
  fetchImpl = fetch,
  session,
  store,
}: {
  client: AccountMigrationClient
  fetchImpl?: typeof fetch
  session: ReadyAccountSession
  store: EntryStore
}): Promise<AccountMigrationResult> {
  const localEntries = await store.listEntries()

  if (localEntries.length === 0) {
    return {
      entryCount: 0,
      retainedAudioCount: 0,
    }
  }

  const uploadableAudioFiles = await collectUploadableAudioFiles(store, localEntries)
  const accountOwnedEntries = localEntries.map((entry) =>
    toAccountOwnedEntry(entry, session),
  )
  const migrationJob = (await client.mutation(
    api.myFunctions.beginAccountMigration,
    {
      entryCount: accountOwnedEntries.length,
      guestSessionId: session.sessionId,
      retainedAudioCount: uploadableAudioFiles.length,
    },
  )) as {
    jobId: string
  }
  const uploadedAudioFiles = await uploadRetainedAudioFiles({
    audioFiles: uploadableAudioFiles,
    client,
    fetchImpl,
  })
  const result = (await client.mutation(api.myFunctions.commitAccountMigration, {
    entries: accountOwnedEntries,
    guestSessionId: session.sessionId,
    jobId: migrationJob.jobId,
    uploadedAudioFiles,
  })) as AccountMigrationResult

  await store.replaceAll({
    audioFiles: uploadableAudioFiles.map((audioFile) => ({
      blob: audioFile.blob,
      id: audioFile.audioFileId,
    })),
    entries: accountOwnedEntries,
  })

  return result
}

export async function deleteRemoteAccountCopy({
  client,
  session,
}: {
  client: AccountMigrationClient
  session: ReadyAccountSession
}): Promise<AccountMigrationResult> {
  return (await client.mutation(api.myFunctions.deleteAccountCopy, {
    guestSessionId: session.sessionId,
  })) as AccountMigrationResult
}
