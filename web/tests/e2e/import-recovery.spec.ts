import { expect, test } from './helpers/localEntryDb'

test('settings can restore a downloaded recovery file back into local storage', async ({
  page,
  localEntryDb,
}) => {
  const unique = `${Date.now()}`
  const voiceTitle = `voice restore ${unique}`
  const draftTitle = `draft restore ${unique}`
  const timestamp = Date.now()
  const voiceId = `voice-${unique}`
  const draftId = `draft-${unique}`
  const retainedAudioId = `audio-${voiceId}`

  await page.goto('/')
  await localEntryDb.seed(
    {
      audio: {
        kind: 'text',
        mimeType: 'audio/webm',
        text: 'voice-audio-restore',
      },
      entry: {
        audioFileId: retainedAudioId,
        createdAt: timestamp,
        deviceLocalId: `device-${voiceId}`,
        hasAudio: true,
        id: voiceId,
        ownerMode: 'guest_local',
        sourceType: 'voice',
        status: 'saved_local',
        storageMode: 'transcript_plus_audio',
        title: voiceTitle,
        transcript: `${voiceTitle} transcript`,
        updatedAt: timestamp + 100,
      },
    },
    {
      entry: {
        audioFileId: null,
        createdAt: timestamp,
        deviceLocalId: `device-${draftId}`,
        hasAudio: false,
        id: draftId,
        ownerMode: 'guest_local',
        sourceType: 'text',
        status: 'draft_local',
        storageMode: 'transcript_only',
        title: draftTitle,
        transcript: `${draftTitle} transcript`,
        updatedAt: timestamp,
      },
    },
  )

  await page.goto('/settings')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /export local notes/i }).click()
  const download = await downloadPromise
  const downloadPath = await download.path()
  expect(downloadPath).not.toBeNull()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: /delete all local notes/i }).click()
  await expect(
    page.getByText(/all local notes and retained audio were deleted/i),
  ).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.locator('input[type="file"]').setInputFiles(downloadPath!)

  await expect(
    page.getByText(/recovery file restored 2 notes and 1 retained audio item/i),
  ).toBeVisible()
  await expect.poll(() => localEntryDb.hasRetainedAudio(retainedAudioId)).toBe(true)

  await page.goto('/recent')
  await expect(
    page.getByRole('link').filter({ hasText: voiceTitle }).first(),
  ).toBeVisible()
  await page.goto('/drafts')
  await expect(
    page.getByRole('link').filter({ hasText: draftTitle }).first(),
  ).toBeVisible()
})
