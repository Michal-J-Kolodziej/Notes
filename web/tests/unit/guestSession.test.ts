import { beforeEach, describe, expect, it } from 'vitest'
import {
  GUEST_SESSION_STORAGE_KEY,
  loadOrCreateGuestSession,
} from '~/lib/auth/guestSession'

describe('guest session', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('creates and persists a guest session when none exists', () => {
    const session = loadOrCreateGuestSession(window.localStorage)

    expect(session.mode).toBe('guest')
    expect(session.guestId).toMatch(/^guest:/)
    expect(session.createdAt).toBeTypeOf('number')

    expect(
      JSON.parse(window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY) ?? '{}'),
    ).toMatchObject({
      guestId: session.guestId,
      mode: 'guest',
    })
  })

  it('reuses an existing guest session instead of rotating ownership', () => {
    window.localStorage.setItem(
      GUEST_SESSION_STORAGE_KEY,
      JSON.stringify({
        createdAt: 123,
        guestId: 'guest:existing',
        mode: 'guest',
      }),
    )

    expect(loadOrCreateGuestSession(window.localStorage)).toEqual({
      createdAt: 123,
      guestId: 'guest:existing',
      mode: 'guest',
    })
  })
})
