import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const viewerIdentity = query({
  args: {
    guestSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (identity) {
      const existingUser = await ctx.db
        .query('users')
        .withIndex('by_auth_subject', (queryBuilder) =>
          queryBuilder.eq('authSubject', identity.subject),
        )
        .unique()

      if (!existingUser) {
        return {
          authSubject: identity.subject,
          displayName: identity.name ?? null,
          email: identity.email ?? null,
          mode: 'account_pending' as const,
          userId: null,
        }
      }

      return {
        authSubject: identity.subject,
        displayName: existingUser.displayName ?? identity.name ?? null,
        email: existingUser.email ?? identity.email ?? null,
        mode: 'account' as const,
        userId: existingUser._id,
      }
    }

    if (!args.guestSessionId) {
      return {
        guestSessionId: null,
        migrationState: 'local_only' as const,
        mode: 'guest' as const,
        registered: false,
      }
    }

    const guestSession = await ctx.db
      .query('guestSessions')
      .withIndex('by_session_id', (queryBuilder) =>
        queryBuilder.eq('sessionId', args.guestSessionId!),
      )
      .unique()

    return {
      guestSessionId: args.guestSessionId,
      migrationState: guestSession?.migrationState ?? 'local_only',
      mode: 'guest' as const,
      registered: guestSession !== null,
    }
  },
})

export const ensureViewerUser = mutation({
  args: {
    guestSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()

    if (!identity) {
      throw new Error('Authenticated user required.')
    }

    const now = Date.now()
    const displayName = identity.name?.trim() || undefined
    const email = identity.email?.trim() || undefined
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_auth_subject', (queryBuilder) =>
        queryBuilder.eq('authSubject', identity.subject),
      )
      .unique()

    if (args.guestSessionId) {
      const existingSession = await ctx.db
        .query('guestSessions')
        .withIndex('by_session_id', (queryBuilder) =>
          queryBuilder.eq('sessionId', args.guestSessionId!),
        )
        .unique()

      if (existingSession) {
        await ctx.db.patch('guestSessions', existingSession._id, {
          lastSeenAt: now,
        })
      }
    }

    if (existingUser) {
      await ctx.db.patch('users', existingUser._id, {
        displayName,
        email,
        lastSeenAt: now,
      })

      return {
        authSubject: identity.subject,
        displayName: displayName ?? existingUser.displayName ?? null,
        email: email ?? existingUser.email ?? null,
        userId: existingUser._id,
      }
    }

    const userId = await ctx.db.insert('users', {
      authSubject: identity.subject,
      createdAt: now,
      displayName,
      email,
      lastSeenAt: now,
    })

    return {
      authSubject: identity.subject,
      displayName: displayName ?? null,
      email: email ?? null,
      userId,
    }
  },
})

export const registerGuestSession = mutation({
  args: {
    createdAt: v.number(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedSessionId = args.sessionId.trim()

    if (!normalizedSessionId) {
      throw new Error('Guest session id must be a non-empty string.')
    }

    const existingSession = await ctx.db
      .query('guestSessions')
      .withIndex('by_session_id', (queryBuilder) =>
        queryBuilder.eq('sessionId', normalizedSessionId),
      )
      .unique()
    const now = Date.now()

    if (existingSession) {
      await ctx.db.patch('guestSessions', existingSession._id, {
        lastSeenAt: now,
      })

      return {
        guestSessionDocId: existingSession._id,
        migrationState: existingSession.migrationState,
        mode: 'guest' as const,
        sessionId: existingSession.sessionId,
      }
    }

    const guestSessionDocId = await ctx.db.insert('guestSessions', {
      createdAt: args.createdAt,
      lastSeenAt: now,
      migrationState: 'local_only',
      sessionId: normalizedSessionId,
    })

    return {
      guestSessionDocId,
      migrationState: 'local_only' as const,
      mode: 'guest' as const,
      sessionId: normalizedSessionId,
    }
  },
})
