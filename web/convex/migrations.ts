import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

async function getAuthenticatedViewer(ctx: any) {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new Error('Authenticated user required.')
  }

  const user = await ctx.db
    .query('users')
    .withIndex('by_auth_subject', (queryBuilder: any) =>
      queryBuilder.eq('authSubject', identity.subject),
    )
    .unique()

  if (!user) {
    throw new Error('Account record is not ready for migration.')
  }

  return {
    identity,
    user,
  }
}

async function ensureGuestSessionForMigration(
  ctx: any,
  {
    guestSessionId,
    userId,
  }: {
    guestSessionId: string
    userId: string
  },
) {
  const existingGuestSession = await ctx.db
    .query('guestSessions')
    .withIndex('by_session_id', (queryBuilder: any) =>
      queryBuilder.eq('sessionId', guestSessionId),
    )
    .unique()
  const now = Date.now()

  if (!existingGuestSession) {
    const guestSessionDocId = await ctx.db.insert('guestSessions', {
      createdAt: now,
      lastSeenAt: now,
      migratedUserId: userId,
      migrationState: 'migration_pending',
      sessionId: guestSessionId,
    })

    return await ctx.db.get('guestSessions', guestSessionDocId)
  }

  if (
    existingGuestSession.migratedUserId &&
    existingGuestSession.migratedUserId !== userId
  ) {
    throw new Error('This device session is already linked to another account.')
  }

  await ctx.db.patch('guestSessions', existingGuestSession._id, {
    lastSeenAt: now,
    migratedUserId: userId,
    migrationState: 'migration_pending',
  })

  return await ctx.db.get('guestSessions', existingGuestSession._id)
}

async function deleteRemoteAudioForEntry(ctx: any, entry: any) {
  if (!entry.audioFileId) {
    return
  }

  const audioFile = await ctx.db.get('audioFiles', entry.audioFileId)

  if (!audioFile) {
    return
  }

  if (audioFile.storageId) {
    await ctx.storage.delete(audioFile.storageId)
  }

  await ctx.db.delete('audioFiles', audioFile._id)
}

export const beginAccountMigration = mutation({
  args: {
    entryCount: v.number(),
    guestSessionId: v.string(),
    retainedAudioCount: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedViewer(ctx)
    await ensureGuestSessionForMigration(ctx, {
      guestSessionId: args.guestSessionId,
      userId: user._id,
    })

    const existingJobs = await ctx.db
      .query('migrationJobs')
      .withIndex('by_guest_session', (queryBuilder) =>
        queryBuilder.eq('guestSessionId', args.guestSessionId),
      )
      .collect()
    const now = Date.now()
    const matchingJob = existingJobs.find(
      (job) => job.targetUserId === user._id && job.state !== 'failed',
    )

    if (matchingJob) {
      await ctx.db.patch('migrationJobs', matchingJob._id, {
        lastError: undefined,
        state: 'running',
        updatedAt: now,
      })

      return {
        jobId: matchingJob._id,
      }
    }

    const jobId = await ctx.db.insert('migrationJobs', {
      createdAt: now,
      guestSessionId: args.guestSessionId,
      state: 'running',
      targetUserId: user._id,
      updatedAt: now,
    })

    return {
      jobId,
    }
  },
})

export const generateMigrationUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getAuthenticatedViewer(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const listAccountSnapshots = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await getAuthenticatedViewer(ctx)
    const remoteEntries = await ctx.db
      .query('entries')
      .withIndex('by_user', (queryBuilder) => queryBuilder.eq('userId', user._id))
      .collect()
    const remoteAudioFiles = await ctx.db
      .query('audioFiles')
      .withIndex('by_owner_user', (queryBuilder) =>
        queryBuilder.eq('ownerUserId', user._id),
      )
      .collect()
    const migrationJobs = await ctx.db
      .query('migrationJobs')
      .withIndex('by_target_user', (queryBuilder) =>
        queryBuilder.eq('targetUserId', user._id),
      )
      .collect()
    const guestSessionIds = new Set(
      [
        ...remoteEntries.map((entry) => entry.guestSessionId),
        ...remoteAudioFiles.map((audioFile) => audioFile.guestSessionId),
        ...migrationJobs.map((job) => job.guestSessionId),
      ].filter((guestSessionId): guestSessionId is string => Boolean(guestSessionId)),
    )

    return {
      snapshots: Array.from(guestSessionIds, (guestSessionId) => {
        const entriesForGuestSession = remoteEntries.filter(
          (entry) => entry.guestSessionId === guestSessionId,
        )
        const retainedAudioForGuestSession = remoteAudioFiles.filter(
          (audioFile) =>
            audioFile.guestSessionId === guestSessionId &&
            audioFile.retentionMode === 'retained',
        )
        const retainedAudioById = new Map(
          retainedAudioForGuestSession.map((audioFile) => [audioFile._id, audioFile] as const),
        )
        const lastCopiedAt =
          migrationJobs
            .filter(
              (job) =>
                job.guestSessionId === guestSessionId && job.state === 'completed',
            )
            .map((job) => job.updatedAt)
            .sort(
              (leftTimestamp, rightTimestamp) =>
                rightTimestamp - leftTimestamp,
            )[0] ?? null

        return {
          entryCount: entriesForGuestSession.length,
          guestSessionId,
          isRestorable:
            entriesForGuestSession.length > 0 &&
            entriesForGuestSession.every((entry) => {
              if (
                !entry.hasAudio ||
                entry.storageMode !== 'transcript_plus_audio'
              ) {
                return true
              }

              if (!entry.audioFileId) {
                return false
              }

              const audioFile = retainedAudioById.get(entry.audioFileId)

              return Boolean(audioFile?.storageId)
            }),
          lastCopiedAt,
          retainedAudioCount: retainedAudioForGuestSession.length,
        }
      }),
    }
  },
})

export const getAccountCopyStatus = query({
  args: {
    guestSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedViewer(ctx)
    const guestSession = await ctx.db
      .query('guestSessions')
      .withIndex('by_session_id', (queryBuilder) =>
        queryBuilder.eq('sessionId', args.guestSessionId),
      )
      .unique()

    if (
      guestSession?.migratedUserId &&
      guestSession.migratedUserId !== user._id
    ) {
      throw new Error('This device session is linked to another account.')
    }

    const remoteEntries = await ctx.db
      .query('entries')
      .withIndex('by_user_and_guest_session', (queryBuilder) =>
        queryBuilder
          .eq('userId', user._id)
          .eq('guestSessionId', args.guestSessionId),
      )
      .collect()
    const remoteAudioFiles = await ctx.db
      .query('audioFiles')
      .withIndex('by_owner_and_guest_session', (queryBuilder) =>
        queryBuilder
          .eq('ownerUserId', user._id)
          .eq('guestSessionId', args.guestSessionId),
      )
      .collect()
    const migrationJobs = await ctx.db
      .query('migrationJobs')
      .withIndex('by_target_user_and_guest_session', (queryBuilder) =>
        queryBuilder
          .eq('targetUserId', user._id)
          .eq('guestSessionId', args.guestSessionId),
      )
      .collect()

    const retainedAudioForGuestSession = remoteAudioFiles.filter(
      (audioFile) => audioFile.retentionMode === 'retained',
    )
    const lastCopiedAt =
      migrationJobs
        .filter((job) => job.state === 'completed')
        .map((job) => job.updatedAt)
        .sort((leftTimestamp, rightTimestamp) => rightTimestamp - leftTimestamp)[0] ??
      null
    const latestEntryUpdatedAt =
      remoteEntries.length > 0
        ? Math.max(...remoteEntries.map((entry) => entry.updatedAt))
        : null

    return {
      entryCount: remoteEntries.length,
      guestSessionId: args.guestSessionId,
      hasAccountCopy:
        remoteEntries.length > 0 ||
        retainedAudioForGuestSession.length > 0,
      lastCopiedAt,
      latestEntryUpdatedAt,
      migrationState: guestSession?.migrationState ?? 'local_only',
      retainedAudioCount: retainedAudioForGuestSession.length,
    }
  },
})

export const getAccountCopyPreview = query({
  args: {
    guestSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedViewer(ctx)
    const guestSession = await ctx.db
      .query('guestSessions')
      .withIndex('by_session_id', (queryBuilder) =>
        queryBuilder.eq('sessionId', args.guestSessionId),
      )
      .unique()

    if (
      guestSession?.migratedUserId &&
      guestSession.migratedUserId !== user._id
    ) {
      throw new Error('This device session is linked to another account.')
    }

    const remoteEntries = await ctx.db
      .query('entries')
      .withIndex('by_user_and_guest_session', (queryBuilder) =>
        queryBuilder
          .eq('userId', user._id)
          .eq('guestSessionId', args.guestSessionId),
      )
      .collect()

    return {
      entries: remoteEntries
        .slice()
        .sort((leftEntry, rightEntry) => rightEntry.updatedAt - leftEntry.updatedAt)
        .slice(0, 5)
        .map((entry) => ({
          deviceLocalId: entry.deviceLocalId,
          hasAudio: entry.hasAudio,
          sourceType: entry.sourceType,
          status: entry.status,
          title: entry.title,
          updatedAt: entry.updatedAt,
        })),
    }
  },
})

export const getAccountCopyRestoreSnapshot = query({
  args: {
    guestSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedViewer(ctx)
    const guestSession = await ctx.db
      .query('guestSessions')
      .withIndex('by_session_id', (queryBuilder) =>
        queryBuilder.eq('sessionId', args.guestSessionId),
      )
      .unique()

    if (
      guestSession?.migratedUserId &&
      guestSession.migratedUserId !== user._id
    ) {
      throw new Error('This device session is linked to another account.')
    }

    const remoteEntries = (
      await ctx.db
        .query('entries')
        .withIndex('by_user_and_guest_session', (queryBuilder) =>
          queryBuilder
            .eq('userId', user._id)
            .eq('guestSessionId', args.guestSessionId),
        )
        .collect()
    ).sort((leftEntry, rightEntry) => rightEntry.updatedAt - leftEntry.updatedAt)

    if (remoteEntries.length === 0) {
      return {
        entries: [],
      }
    }

    return {
      entries: await Promise.all(
        remoteEntries.map(async (entry) => {
          if (
            entry.hasAudio &&
            entry.storageMode === 'transcript_plus_audio'
          ) {
            if (!entry.audioFileId) {
              throw new Error(
                `Retained audio metadata is missing for ${entry.deviceLocalId}.`,
              )
            }

            const audioFile = await ctx.db.get('audioFiles', entry.audioFileId)

            if (!audioFile || !audioFile.storageId) {
              throw new Error(
                `Retained audio is unavailable for ${entry.deviceLocalId}.`,
              )
            }

            const downloadUrl = await ctx.storage.getUrl(audioFile.storageId)

            if (!downloadUrl) {
              throw new Error(
                `Retained audio download is unavailable for ${entry.deviceLocalId}.`,
              )
            }

            return {
              createdAt: entry.createdAt,
              deviceLocalId: entry.deviceLocalId,
              hasAudio: true,
              localAudioFileId:
                audioFile.localAudioFileId ??
                `account-copy-audio:${entry.deviceLocalId}`,
              localEntryId: entry.localEntryId ?? entry.deviceLocalId,
              retainedAudio: {
                downloadUrl,
                mimeType: audioFile.mimeType,
                sizeBytes: audioFile.sizeBytes,
              },
              sourceType: entry.sourceType,
              status: entry.status,
              storageMode: entry.storageMode,
              title: entry.title,
              transcript: entry.transcript,
              updatedAt: entry.updatedAt,
            }
          }

          return {
            createdAt: entry.createdAt,
            deviceLocalId: entry.deviceLocalId,
            hasAudio: false,
            localAudioFileId: null,
            localEntryId: entry.localEntryId ?? entry.deviceLocalId,
            retainedAudio: null,
            sourceType: entry.sourceType,
            status: entry.status,
            storageMode: entry.storageMode,
            title: entry.title,
            transcript: entry.transcript,
            updatedAt: entry.updatedAt,
          }
        }),
      ),
    }
  },
})

export const listAccountCopySnapshots = query({
  args: {},
  handler: async (ctx) => {
    type AccountCopySnapshotSummary = {
      entryCount: number
      guestSessionId: string
      isRestorable: boolean
      lastCopiedAt: number | null
      previewTitles: Array<string>
      retainedAudioCount: number
    }
    const { user } = await getAuthenticatedViewer(ctx)
    const guestSessions = await ctx.db
      .query('guestSessions')
      .withIndex('by_migrated_user', (queryBuilder) =>
        queryBuilder.eq('migratedUserId', user._id),
      )
      .collect()

    const snapshots = (
      await Promise.all(
        guestSessions.map(async (guestSession): Promise<AccountCopySnapshotSummary | null> => {
          const remoteEntries = await ctx.db
            .query('entries')
            .withIndex('by_user_and_guest_session', (queryBuilder) =>
              queryBuilder
                .eq('userId', user._id)
                .eq('guestSessionId', guestSession.sessionId),
            )
            .collect()

          if (remoteEntries.length === 0) {
            return null
          }

          const remoteAudioFiles = await ctx.db
            .query('audioFiles')
            .withIndex('by_owner_and_guest_session', (queryBuilder) =>
              queryBuilder
                .eq('ownerUserId', user._id)
                .eq('guestSessionId', guestSession.sessionId),
            )
            .collect()
          const migrationJobs = await ctx.db
            .query('migrationJobs')
            .withIndex('by_target_user_and_guest_session', (queryBuilder) =>
              queryBuilder
                .eq('targetUserId', user._id)
                .eq('guestSessionId', guestSession.sessionId),
            )
            .collect()
          const retainedAudioCount = remoteAudioFiles.filter(
            (audioFile) => audioFile.retentionMode === 'retained',
          ).length
          const audioFilesById = new Map(
            remoteAudioFiles.map((audioFile) => [audioFile._id, audioFile] as const),
          )
          const lastCopiedAt =
            migrationJobs
              .filter((job) => job.state === 'completed')
              .map((job) => job.updatedAt)
              .sort(
                (leftTimestamp, rightTimestamp) =>
                  rightTimestamp - leftTimestamp,
              )[0] ?? null

          const snapshot: AccountCopySnapshotSummary = {
            entryCount: remoteEntries.length,
            guestSessionId: guestSession.sessionId,
            isRestorable: remoteEntries.every((entry) => {
              if (!entry.hasAudio || entry.storageMode !== 'transcript_plus_audio') {
                return true
              }

              if (!entry.audioFileId) {
                return false
              }

              const audioFile = audioFilesById.get(entry.audioFileId)

              return Boolean(audioFile?.storageId)
            }),
            lastCopiedAt,
            previewTitles: remoteEntries
              .slice()
              .sort(
                (leftEntry, rightEntry) =>
                  rightEntry.updatedAt - leftEntry.updatedAt,
              )
              .slice(0, 3)
              .map((entry) => entry.title.trim() || 'Untitled note'),
            retainedAudioCount,
          }

          return snapshot
        }),
      )
    )
      .filter(
        (snapshot): snapshot is AccountCopySnapshotSummary => snapshot !== null,
      )
      .sort((leftSnapshot, rightSnapshot) => {
        const leftSortKey = leftSnapshot.lastCopiedAt ?? 0
        const rightSortKey = rightSnapshot.lastCopiedAt ?? 0

        return rightSortKey - leftSortKey
      })

    return {
      snapshots,
    }
  },
})

export const commitAccountMigration = mutation({
  args: {
    entries: v.array(
      v.object({
        audioFileId: v.union(v.string(), v.null()),
        createdAt: v.number(),
        deviceLocalId: v.string(),
        hasAudio: v.boolean(),
        id: v.string(),
        ownerMode: v.literal('account_local'),
        sourceType: v.union(v.literal('voice'), v.literal('text')),
        status: v.union(
          v.literal('draft_local'),
          v.literal('recording'),
          v.literal('processing'),
          v.literal('review_ready'),
          v.literal('saved_local'),
          v.literal('syncing'),
          v.literal('saved_remote'),
          v.literal('needs_retry'),
        ),
        storageMode: v.union(
          v.literal('transcript_only'),
          v.literal('transcript_plus_audio'),
        ),
        title: v.string(),
        transcript: v.string(),
        updatedAt: v.number(),
        userId: v.string(),
      }),
    ),
    guestSessionId: v.string(),
    jobId: v.id('migrationJobs'),
    uploadedAudioFiles: v.array(
      v.object({
        entryDeviceLocalId: v.string(),
        localAudioFileId: v.string(),
        mimeType: v.string(),
        sizeBytes: v.number(),
        storageId: v.id('_storage'),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedViewer(ctx)
    const job = await ctx.db.get('migrationJobs', args.jobId)

    if (!job || job.targetUserId !== user._id || job.guestSessionId !== args.guestSessionId) {
      throw new Error('Migration job is not available for this account.')
    }

    const guestSession = await ensureGuestSessionForMigration(ctx, {
      guestSessionId: args.guestSessionId,
      userId: user._id,
    })

    if (!guestSession) {
      throw new Error('Guest session could not be prepared for migration.')
    }

    const uploadedAudioFilesByDeviceLocalId = new Map(
      args.uploadedAudioFiles.map((audioFile) => [
        audioFile.entryDeviceLocalId,
        audioFile,
      ]),
    )
    const nextDeviceLocalIds = new Set(
      args.entries.map((entry) => entry.deviceLocalId),
    )

    for (const entry of args.entries) {
      const uploadedAudioFile = uploadedAudioFilesByDeviceLocalId.get(
        entry.deviceLocalId,
      )

      if (
        entry.hasAudio &&
        entry.storageMode === 'transcript_plus_audio' &&
        !uploadedAudioFile
      ) {
        throw new Error(
          `Retained audio upload is missing for ${entry.deviceLocalId}.`,
        )
      }

      if (
        (!entry.hasAudio || entry.storageMode !== 'transcript_plus_audio') &&
        uploadedAudioFile
      ) {
        throw new Error(
          `Retained audio upload does not match ${entry.deviceLocalId}.`,
        )
      }

      const existingEntry = await ctx.db
        .query('entries')
        .withIndex('by_user_and_device_local_id', (queryBuilder) =>
          queryBuilder
            .eq('userId', user._id)
            .eq('deviceLocalId', entry.deviceLocalId),
        )
        .unique()

      let nextAudioFileId = existingEntry?.audioFileId

      if (uploadedAudioFile) {
        const existingAudioFile = await ctx.db
          .query('audioFiles')
          .withIndex('by_owner_and_entry_device_local_id', (queryBuilder) =>
            queryBuilder
              .eq('ownerUserId', user._id)
              .eq('entryDeviceLocalId', entry.deviceLocalId),
          )
          .unique()

        if (existingAudioFile) {
          if (
            existingAudioFile.storageId &&
            existingAudioFile.storageId !== uploadedAudioFile.storageId
          ) {
            await ctx.storage.delete(existingAudioFile.storageId)
          }

          await ctx.db.patch('audioFiles', existingAudioFile._id, {
            entryDeviceLocalId: entry.deviceLocalId,
            guestSessionId: args.guestSessionId,
            localAudioFileId: uploadedAudioFile.localAudioFileId,
            mimeType: uploadedAudioFile.mimeType,
            ownerUserId: user._id,
            retentionMode: 'retained',
            sizeBytes: uploadedAudioFile.sizeBytes,
            storageId: uploadedAudioFile.storageId,
          })
          nextAudioFileId = existingAudioFile._id
        } else {
          nextAudioFileId = await ctx.db.insert('audioFiles', {
            createdAt: Date.now(),
            entryDeviceLocalId: entry.deviceLocalId,
            guestSessionId: args.guestSessionId,
            localAudioFileId: uploadedAudioFile.localAudioFileId,
            mimeType: uploadedAudioFile.mimeType,
            ownerUserId: user._id,
            retentionMode: 'retained',
            sizeBytes: uploadedAudioFile.sizeBytes,
            storageId: uploadedAudioFile.storageId,
          })
        }
      } else if (existingEntry?.audioFileId) {
        await deleteRemoteAudioForEntry(ctx, existingEntry)
        nextAudioFileId = undefined
      }

      const nextEntry = {
        createdAt: entry.createdAt,
        deviceLocalId: entry.deviceLocalId,
        guestSessionId: args.guestSessionId,
        hasAudio: entry.hasAudio,
        localEntryId: entry.id,
        ownerMode: 'account_local' as const,
        sourceType: entry.sourceType,
        status: entry.status,
        storageMode: entry.storageMode,
        title: entry.title,
        transcript: entry.transcript,
        updatedAt: entry.updatedAt,
        userId: user._id,
        ...(nextAudioFileId ? { audioFileId: nextAudioFileId } : {}),
      }

      if (existingEntry) {
        await ctx.db.patch('entries', existingEntry._id, nextEntry)
      } else {
        await ctx.db.insert('entries', nextEntry)
      }
    }

    const remoteEntries = await ctx.db
      .query('entries')
      .withIndex('by_user', (queryBuilder) => queryBuilder.eq('userId', user._id))
      .collect()

    for (const remoteEntry of remoteEntries) {
      if (
        remoteEntry.guestSessionId === args.guestSessionId &&
        !nextDeviceLocalIds.has(remoteEntry.deviceLocalId)
      ) {
        await deleteRemoteAudioForEntry(ctx, remoteEntry)
        await ctx.db.delete('entries', remoteEntry._id)
      }
    }

    await ctx.db.patch('guestSessions', guestSession._id, {
      lastSeenAt: Date.now(),
      migratedUserId: user._id,
      migrationState: 'migrated',
    })
    await ctx.db.patch('migrationJobs', job._id, {
      lastError: undefined,
      state: 'completed',
      updatedAt: Date.now(),
    })

    return {
      entryCount: args.entries.length,
      retainedAudioCount: args.uploadedAudioFiles.length,
    }
  },
})

export const deleteAccountCopy = mutation({
  args: {
    guestSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await getAuthenticatedViewer(ctx)
    const guestSession = await ctx.db
      .query('guestSessions')
      .withIndex('by_session_id', (queryBuilder) =>
        queryBuilder.eq('sessionId', args.guestSessionId),
      )
      .unique()

    if (
      guestSession?.migratedUserId &&
      guestSession.migratedUserId !== user._id
    ) {
      throw new Error('This device session is linked to another account.')
    }

    const remoteEntries = await ctx.db
      .query('entries')
      .withIndex('by_user_and_guest_session', (queryBuilder) =>
        queryBuilder
          .eq('userId', user._id)
          .eq('guestSessionId', args.guestSessionId),
      )
      .collect()
    const remoteAudioFiles = await ctx.db
      .query('audioFiles')
      .withIndex('by_owner_and_guest_session', (queryBuilder) =>
        queryBuilder
          .eq('ownerUserId', user._id)
          .eq('guestSessionId', args.guestSessionId),
      )
      .collect()
    const deletedAudioFileIds = new Set(
      remoteEntries
        .map((entry) => entry.audioFileId)
        .filter((audioFileId): audioFileId is NonNullable<typeof audioFileId> => Boolean(audioFileId)),
    )

    let retainedAudioCount = 0

    for (const entry of remoteEntries) {
      if (entry.audioFileId) {
        const audioFile = await ctx.db.get('audioFiles', entry.audioFileId)

        if (audioFile?.retentionMode === 'retained') {
          retainedAudioCount += 1
        }
      }

      await deleteRemoteAudioForEntry(ctx, entry)
      await ctx.db.delete('entries', entry._id)
    }

    for (const audioFile of remoteAudioFiles) {
      if (deletedAudioFileIds.has(audioFile._id)) {
        continue
      }

      if (audioFile.retentionMode === 'retained') {
        retainedAudioCount += 1
      }

      if (audioFile.storageId) {
        await ctx.storage.delete(audioFile.storageId)
      }

      await ctx.db.delete('audioFiles', audioFile._id)
    }

    const guestSessionDoc = guestSession

    if (
      guestSessionDoc &&
      guestSessionDoc.migratedUserId === user._id
    ) {
      await ctx.db.patch('guestSessions', guestSessionDoc._id, {
        migrationState: 'local_only',
      })
    }

    return {
      entryCount: remoteEntries.length,
      retainedAudioCount,
    }
  },
})
