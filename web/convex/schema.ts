import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const entryOwnerMode = v.union(
  v.literal('guest_local'),
  v.literal('account_local'),
  v.literal('account_synced'),
)

const entrySourceType = v.union(v.literal('voice'), v.literal('text'))

const entryStatus = v.union(
  v.literal('draft_local'),
  v.literal('recording'),
  v.literal('processing'),
  v.literal('review_ready'),
  v.literal('saved_local'),
  v.literal('syncing'),
  v.literal('saved_remote'),
  v.literal('needs_retry'),
)

const entryStorageMode = v.union(
  v.literal('transcript_only'),
  v.literal('transcript_plus_audio'),
)

const guestSessionMigrationState = v.union(
  v.literal('local_only'),
  v.literal('migration_pending'),
  v.literal('migrated'),
)

const migrationJobState = v.union(
  v.literal('pending'),
  v.literal('running'),
  v.literal('completed'),
  v.literal('failed'),
)

export default defineSchema({
  guestSessions: defineTable({
    createdAt: v.number(),
    lastSeenAt: v.number(),
    migrationState: guestSessionMigrationState,
    migratedUserId: v.optional(v.id('users')),
    sessionId: v.string(),
  })
    .index('by_session_id', ['sessionId'])
    .index('by_migrated_user', ['migratedUserId']),

  users: defineTable({
    authSubject: v.string(),
    createdAt: v.number(),
    displayName: v.optional(v.string()),
    email: v.optional(v.string()),
    lastSeenAt: v.number(),
  }).index('by_auth_subject', ['authSubject']),

  audioFiles: defineTable({
    createdAt: v.number(),
    entryDeviceLocalId: v.optional(v.string()),
    guestSessionId: v.optional(v.string()),
    localAudioFileId: v.optional(v.string()),
    mimeType: v.string(),
    ownerUserId: v.optional(v.id('users')),
    retentionMode: v.union(v.literal('transient'), v.literal('retained')),
    sizeBytes: v.number(),
    storageId: v.optional(v.string()),
  })
    .index('by_guest_session', ['guestSessionId'])
    .index('by_owner_and_entry_device_local_id', [
      'ownerUserId',
      'entryDeviceLocalId',
    ])
    .index('by_owner_and_guest_session', ['ownerUserId', 'guestSessionId'])
    .index('by_owner_user', ['ownerUserId']),

  entries: defineTable({
    audioFileId: v.optional(v.id('audioFiles')),
    createdAt: v.number(),
    deviceLocalId: v.string(),
    guestSessionId: v.optional(v.string()),
    hasAudio: v.boolean(),
    localEntryId: v.optional(v.string()),
    ownerMode: entryOwnerMode,
    sourceType: entrySourceType,
    status: entryStatus,
    storageMode: entryStorageMode,
    title: v.string(),
    transcript: v.string(),
    updatedAt: v.number(),
    userId: v.optional(v.id('users')),
  })
    .index('by_device_local_id', ['deviceLocalId'])
    .index('by_guest_session', ['guestSessionId'])
    .index('by_user_and_guest_session', ['userId', 'guestSessionId'])
    .index('by_user_and_device_local_id', ['userId', 'deviceLocalId'])
    .index('by_user', ['userId']),

  migrationJobs: defineTable({
    createdAt: v.number(),
    guestSessionId: v.string(),
    lastError: v.optional(v.string()),
    state: migrationJobState,
    targetUserId: v.id('users'),
    updatedAt: v.number(),
  })
    .index('by_guest_session', ['guestSessionId'])
    .index('by_target_user_and_guest_session', ['targetUserId', 'guestSessionId'])
    .index('by_target_user', ['targetUserId']),
})
