import { api } from '../../../convex/_generated/api'
import type { LocalDataSummary } from './localDataSummary'
import type { ReadyAccountSession } from '~/lib/auth'

export interface RemoteAccountCopySnapshot {
  entryCount: number
  lastCopiedAt: number | null
  latestEntryUpdatedAt?: number | null
  retainedAudioCount: number
}

export interface RemoteAccountCopyPreviewItem {
  deviceLocalId: string
  hasAudio: boolean
  sourceType: 'voice' | 'text'
  status:
    | 'draft_local'
    | 'recording'
    | 'processing'
    | 'review_ready'
    | 'saved_local'
    | 'syncing'
    | 'saved_remote'
    | 'needs_retry'
  title: string
  updatedAt: number
}

export type RemoteAccountCopyStatus =
  | {
      snapshot: RemoteAccountCopySnapshot
      status: 'ready'
    }
  | {
      reason: 'missing_backend_config' | 'request_failed'
      status: 'unavailable'
    }

export type AccountCopyVerification =
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
      kind: 'verified'
      statusLabel: 'Verified'
    }
  | {
      detail: string
      heading: string
      kind: 'loading'
      statusLabel: 'Checking'
    }
  | {
      detail: string
      heading: string
      kind: 'recoverable'
      statusLabel: 'Recovery ready'
    }
  | {
      detail: string
      heading: string
      kind: 'stale'
      statusLabel: 'Needs upload'
    }
  | {
      detail: string
      heading: string
      kind: 'unavailable'
      statusLabel: 'Unavailable'
    }

export interface AccountCopyStatusClient {
  query: (...args: Array<any>) => Promise<any>
}

const accountCopyPreviewQuery = (api.myFunctions as {
  getAccountCopyPreview: unknown
}).getAccountCopyPreview

function formatCopyCounts(snapshot: Pick<RemoteAccountCopySnapshot, 'entryCount' | 'retainedAudioCount'>) {
  const parts = [
    `${snapshot.entryCount} ${snapshot.entryCount === 1 ? 'local note' : 'local notes'}`,
  ]

  if (snapshot.retainedAudioCount > 0) {
    parts.push(
      `${snapshot.retainedAudioCount} retained audio ${
        snapshot.retainedAudioCount === 1 ? 'item' : 'items'
      }`,
    )
  }

  return parts.join(' and ')
}

export async function getRemoteAccountCopyStatus({
  client,
  session,
}: {
  client: AccountCopyStatusClient | null
  session: ReadyAccountSession
}): Promise<RemoteAccountCopyStatus> {
  if (!client) {
    return {
      reason: 'missing_backend_config',
      status: 'unavailable',
    }
  }

  try {
    const result = (await client.query(api.myFunctions.getAccountCopyStatus, {
      guestSessionId: session.sessionId,
    })) as Partial<RemoteAccountCopySnapshot>

    return {
      snapshot: {
        entryCount: result.entryCount ?? 0,
        lastCopiedAt: result.lastCopiedAt ?? null,
        latestEntryUpdatedAt: result.latestEntryUpdatedAt ?? null,
        retainedAudioCount: result.retainedAudioCount ?? 0,
      },
      status: 'ready',
    }
  } catch {
    return {
      reason: 'request_failed',
      status: 'unavailable',
    }
  }
}

export async function getRemoteAccountCopyPreview({
  client,
  session,
}: {
  client: AccountCopyStatusClient | null
  session: ReadyAccountSession
}): Promise<Array<RemoteAccountCopyPreviewItem>> {
  if (!client) {
    return []
  }

  try {
    const result = (await client.query(accountCopyPreviewQuery, {
      guestSessionId: session.sessionId,
    })) as {
      entries?: Array<RemoteAccountCopyPreviewItem>
    }

    return result.entries ?? []
  } catch {
    return []
  }
}

export function createAccountCopyVerification({
  dataSummary,
  remoteStatus,
}: {
  dataSummary?: LocalDataSummary
  remoteStatus?: RemoteAccountCopyStatus
}): AccountCopyVerification {
  if (!remoteStatus || !dataSummary) {
    return {
      detail:
        'Checking whether the signed-in account already has a verified copied snapshot from this device.',
      heading: 'Checking the signed-in account.',
      kind: 'loading',
      statusLabel: 'Checking',
    }
  }

  if (remoteStatus.status === 'unavailable') {
    return {
      detail:
        remoteStatus.reason === 'missing_backend_config'
          ? 'This build cannot verify copied account data yet because the backend account-copy check is not configured.'
          : 'The app could not verify the current account copy right now. Local notes stay on this device until you upload again.',
      heading: 'Account-copy verification is unavailable.',
      kind: 'unavailable',
      statusLabel: 'Unavailable',
    }
  }

  const snapshot = remoteStatus.snapshot
  const isLocalDeviceEmpty =
    dataSummary.entryCount === 0 && dataSummary.retainedAudioCount === 0

  if (snapshot.entryCount === 0 && snapshot.retainedAudioCount === 0) {
    return {
      detail:
        'This signed-in account does not yet show a verified copied snapshot from this device.',
      heading: 'No verified account copy yet.',
      kind: 'empty',
      statusLabel: 'No verified copy',
    }
  }

  if (isLocalDeviceEmpty) {
    return {
      detail:
        'This device is currently empty, but the signed-in account still has a copied snapshot from this same device session that can repopulate local notes.',
      heading: 'A copied account snapshot is ready to restore.',
      kind: 'recoverable',
      statusLabel: 'Recovery ready',
    }
  }

  const remoteFreshnessMarker =
    snapshot.latestEntryUpdatedAt ?? snapshot.lastCopiedAt ?? null
  const localFreshnessMarker = dataSummary.latestUpdatedAt ?? null
  const isBehindCurrentDevice =
    snapshot.entryCount !== dataSummary.entryCount ||
    snapshot.retainedAudioCount !== dataSummary.retainedAudioCount ||
    (remoteFreshnessMarker !== null &&
      localFreshnessMarker !== null &&
      localFreshnessMarker > remoteFreshnessMarker)

  if (isBehindCurrentDevice) {
    return {
      detail: `${formatCopyCounts(snapshot)} are verified in this account from this device, but the current local snapshot has changed since then. Upload again before treating the account copy as current.`,
      heading: 'The verified account copy is behind this device.',
      kind: 'stale',
      statusLabel: 'Needs upload',
    }
  }

  return {
    detail: `Verified ${formatCopyCounts(snapshot)} in this account from this device.`,
    heading: 'Verified account copy from this device.',
    kind: 'verified',
    statusLabel: 'Verified',
  }
}
