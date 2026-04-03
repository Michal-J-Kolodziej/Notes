import { readFile } from 'node:fs/promises'
import { expect, test } from './helpers/localEntryDb'

test('settings can export local notes and delete all retained local data', async ({
  page,
  localEntryDb,
}) => {
  test.slow()

  const unique = `${Date.now()}`
  const voiceTitle = `voice export ${unique}`
  const draftTitle = `draft export ${unique}`
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
        text: 'voice-audio-export',
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
  await expect(
    page.getByRole('heading', { name: /privacy and recovery stay visible/i }),
  ).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('button', { name: /export local notes/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /delete all local notes/i })).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /export local notes/i }).click()
  const download = await downloadPromise
  const downloadPath = await download.path()
  expect(downloadPath).not.toBeNull()

  const exportPayload = JSON.parse(await readFile(downloadPath!, 'utf8'))

  expect(exportPayload.entries).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: voiceId, title: voiceTitle }),
      expect.objectContaining({ id: draftId, title: draftTitle }),
    ]),
  )
  expect(exportPayload.retainedAudio).toEqual([
    expect.objectContaining({
      audioFileId: `audio-${voiceId}`,
      entryId: voiceId,
      mimeType: 'audio/webm',
    }),
  ])

  await page.getByRole('button', { name: /delete all local notes/i }).click()
  const deleteDialog = page.getByRole('dialog', {
    name: /delete all local notes from this device/i,
  })
  await expect(deleteDialog).toBeVisible()
  await deleteDialog.getByRole('button', { name: /delete all local notes/i }).click()

  await expect(
    page.getByText(/all local notes and retained audio were deleted/i),
  ).toBeVisible()
  await expect.poll(() => localEntryDb.hasRetainedAudio(retainedAudioId)).toBe(false)

  await page.goto('/drafts')
  await expect(page.getByRole('heading', { name: /drafts stay here first/i })).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.getByText(draftTitle)).toHaveCount(0)

  await page.goto('/recent')
  await expect(
    page.getByRole('heading', { name: /your latest entries will land here/i }),
  ).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(voiceTitle)).toHaveCount(0)
})
