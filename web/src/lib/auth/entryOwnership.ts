import type { AppSession } from './sessionContext'

export function getNewEntryOwnershipForSession(session: AppSession) {
  if (session.status === 'ready' && session.mode === 'account') {
    return {
      ownerMode: 'account_local' as const,
      userId: session.userId,
    }
  }

  return {
    ownerMode: 'guest_local' as const,
  }
}
