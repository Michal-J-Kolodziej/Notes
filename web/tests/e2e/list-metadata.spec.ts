import { expect, test } from './helpers/localEntryDb'

test('drafts and recent cards show clear state and relative time metadata', async ({
  page,
  localEntryDb,
}) => {
  const unique = `${Date.now()}`
  const recentTitle = `recent meta ${unique}`
  const draftTitle = `draft meta ${unique}`
  const now = Date.UTC(2026, 3, 3, 11, 0, 0)

  await page.goto('/')
  await page.clock.setFixedTime(new Date(now))

  await localEntryDb.seed(
    {
      entry: {
        audioFileId: null,
        createdAt: now - 5 * 60_000,
        deviceLocalId: `device-recent-${unique}`,
        hasAudio: false,
        id: `recent-${unique}`,
        ownerMode: 'guest_local',
        sourceType: 'voice',
        status: 'saved_local',
        storageMode: 'transcript_only',
        title: recentTitle,
        transcript: `${recentTitle} transcript`,
        updatedAt: now - 5 * 60_000,
      },
    },
    {
      entry: {
        audioFileId: null,
        createdAt: now - 2 * 60 * 60_000,
        deviceLocalId: `device-draft-${unique}`,
        hasAudio: false,
        id: `draft-${unique}`,
        ownerMode: 'guest_local',
        sourceType: 'text',
        status: 'draft_local',
        storageMode: 'transcript_only',
        title: draftTitle,
        transcript: `${draftTitle} transcript`,
        updatedAt: now - 2 * 60 * 60_000,
      },
    },
  )

  await page.goto('/recent')
  const recentCard = page.getByRole('link').filter({ hasText: recentTitle }).first()
  await expect(recentCard).toBeVisible()
  await expect(recentCard).toContainText(/voice note/i)
  await expect(recentCard).toContainText(/saved on device/i)
  await expect(recentCard).toContainText(/5 min ago/i)

  await page.goto('/drafts')
  const draftCard = page.getByRole('link').filter({ hasText: draftTitle }).first()
  await expect(draftCard).toBeVisible()
  await expect(draftCard).toContainText(/text note/i)
  await expect(draftCard).toContainText(/draft only on device/i)
  await expect(draftCard).toContainText(/2 hr ago/i)
})
