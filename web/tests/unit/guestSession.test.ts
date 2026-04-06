import { beforeEach, describe, expect, it } from 'vitest'
import {
  GUEST_SESSION_STORAGE_KEY,
  ensureGuestSession,
} from '~/lib/auth/guestSession'

describe('guestSession', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('creates and reuses a durable guest session in local storage', () => {
    const firstSession = ensureGuestSession()
    const secondSession = ensureGuestSession()

    expect(firstSession.mode).toBe('guest')
    expect(firstSession.persistence).toBe('local_storage')
    expect(secondSession).toEqual(firstSession)
    expect(
      JSON.parse(window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY) ?? '{}'),
    ).toMatchObject({
      createdAt: firstSession.createdAt,
      sessionId: firstSession.sessionId,
    })
  })

  it('replaces malformed stored session data with a fresh guest session', () => {
    window.localStorage.setItem(GUEST_SESSION_STORAGE_KEY, '{"bad":true}')

    const session = ensureGuestSession()

    expect(session.mode).toBe('guest')
    expect(session.persistence).toBe('local_storage')
    expect(session.sessionId).toBeTruthy()
  })

  it('replaces syntactically invalid stored session data instead of falling back to memory mode', () => {
    window.localStorage.setItem(GUEST_SESSION_STORAGE_KEY, '{not-json')

    const session = ensureGuestSession()

    expect(session.persistence).toBe('local_storage')
    expect(session.sessionId).toBeTruthy()
    expect(window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY)).toContain(
      session.sessionId,
    )
  })

  it('rejects stored guest sessions with an empty session id', () => {
    window.localStorage.setItem(
      GUEST_SESSION_STORAGE_KEY,
      JSON.stringify({
        createdAt: 123,
        sessionId: '',
      }),
    )

    const session = ensureGuestSession()

    expect(session.persistence).toBe('local_storage')
    expect(session.sessionId).not.toBe('')
  })

  it('falls back to an in-memory guest session when storage is unavailable', () => {
    const brokenStorage = {
      getItem() {
        throw new Error('storage blocked')
      },
      removeItem() {
        throw new Error('storage blocked')
      },
      setItem() {
        throw new Error('storage blocked')
      },
    }

    const session = ensureGuestSession(brokenStorage)

    expect(session.mode).toBe('guest')
    expect(session.persistence).toBe('memory')
    expect(session.sessionId).toBeTruthy()
  })
})
