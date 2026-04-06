import {
  getRemoteAccountSnapshots,
} from './accountSnapshots'
import type { ReadyAccountSession } from '~/lib/auth'
import type { RemoteAccountSnapshot } from './accountSnapshots'
import { formatGuestSessionLabel } from '~/lib/auth'

export interface AccountCopySnapshotSummary {
  entryCount: number
  guestSessionId: string
  isCurrentSession: boolean
  isRestorable: boolean
  lastCopiedAt: number | null
  previewTitles: Array<string>
  retainedAudioCount: number
  sessionLabel: string
}

interface AccountCopySnapshotsClient {
  query: (...args: Array<any>) => Promise<any>
}

function toAccountCopySnapshotSummary(
  snapshot: RemoteAccountSnapshot,
  session: ReadyAccountSession,
): AccountCopySnapshotSummary {
  return {
    entryCount: snapshot.entryCount,
    guestSessionId: snapshot.guestSessionId,
    isCurrentSession: snapshot.guestSessionId === session.sessionId,
    isRestorable: snapshot.isRestorable,
    lastCopiedAt: snapshot.lastCopiedAt,
    previewTitles: snapshot.previewTitles,
    retainedAudioCount: snapshot.retainedAudioCount,
    sessionLabel: formatGuestSessionLabel(snapshot.guestSessionId),
  }
}

export async function getRemoteAccountCopySnapshots({
  client,
  session,
}: {
  client: AccountCopySnapshotsClient | null
  session: ReadyAccountSession
}): Promise<Array<AccountCopySnapshotSummary>> {
  if (!client) {
    return []
  }

  const snapshots = await getRemoteAccountSnapshots({
    client,
    session,
  })

  return snapshots.map((snapshot) =>
    toAccountCopySnapshotSummary(snapshot, session),
  )
}
