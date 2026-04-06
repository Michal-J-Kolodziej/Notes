import { api } from '../../../convex/_generated/api'
import type { ReadyAccountSession } from '~/lib/auth'

export interface RemoteAccountSnapshot {
  entryCount: number
  guestSessionId: string
  isRestorable: boolean
  lastCopiedAt: number | null
  previewTitles: Array<string>
  retainedAudioCount: number
}

interface AccountSnapshotsClient {
  query: (...args: Array<any>) => Promise<any>
}

interface RawRemoteAccountSnapshot {
  entryCount?: number
  guestSessionId?: string
  isRestorable?: boolean
  lastCopiedAt?: number | null
  previewTitles?: Array<string>
  retainedAudioCount?: number
}

const accountSnapshotsQuery = ((api.myFunctions as unknown) as {
  listAccountCopySnapshots: unknown
}).listAccountCopySnapshots

function compareSnapshots(
  leftSnapshot: Pick<RemoteAccountSnapshot, 'guestSessionId' | 'lastCopiedAt'>,
  rightSnapshot: Pick<RemoteAccountSnapshot, 'guestSessionId' | 'lastCopiedAt'>,
) {
  const leftMarker = leftSnapshot.lastCopiedAt ?? 0
  const rightMarker = rightSnapshot.lastCopiedAt ?? 0

  if (leftMarker !== rightMarker) {
    return rightMarker - leftMarker
  }

  return leftSnapshot.guestSessionId.localeCompare(rightSnapshot.guestSessionId)
}

function isRawRemoteAccountSnapshot(
  snapshot: RawRemoteAccountSnapshot | null | undefined,
): snapshot is RawRemoteAccountSnapshot & {
  entryCount: number
  guestSessionId: string
  retainedAudioCount: number
} {
  return (
    typeof snapshot?.guestSessionId === 'string' &&
    typeof snapshot.entryCount === 'number' &&
    typeof snapshot.retainedAudioCount === 'number'
  )
}

export async function getRemoteAccountSnapshots({
  client,
  session: _session,
}: {
  client: AccountSnapshotsClient | null
  session: ReadyAccountSession
}): Promise<Array<RemoteAccountSnapshot>> {
  if (!client) {
    return []
  }

  try {
    const result = (await client.query(accountSnapshotsQuery, {})) as {
      snapshots?: Array<RawRemoteAccountSnapshot>
    }

    return (result.snapshots ?? [])
      .filter(isRawRemoteAccountSnapshot)
      .map((snapshot) => ({
        entryCount: snapshot.entryCount,
        guestSessionId: snapshot.guestSessionId,
        isRestorable:
          typeof snapshot.isRestorable === 'boolean'
            ? snapshot.isRestorable
            : snapshot.entryCount > 0,
        lastCopiedAt:
          typeof snapshot.lastCopiedAt === 'number' ? snapshot.lastCopiedAt : null,
        previewTitles: Array.isArray(snapshot.previewTitles)
          ? snapshot.previewTitles.filter(
              (title): title is string => typeof title === 'string',
            )
          : [],
        retainedAudioCount: snapshot.retainedAudioCount,
      }))
      .sort(compareSnapshots)
  } catch {
    return []
  }
}
