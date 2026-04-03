import { expect, test } from './helpers/localEntryDb'

test('retained local voice audio can be reviewed and discarded without reappearing', async ({
  page,
  localEntryDb,
}) => {
  test.slow()

  const unique = `voice discard ${Date.now()}`
  const noteId = `voice-${Date.now()}`
  const audioFileId = `local-audio:${noteId}`
  const timestamp = Date.now()

  await page.goto('/')
  await localEntryDb.seed({
    audio: { kind: 'silent-wav' },
    entry: {
      audioFileId,
      createdAt: timestamp,
      deviceLocalId: `device-${noteId}`,
      hasAudio: true,
      id: noteId,
      ownerMode: 'guest_local',
      sourceType: 'voice',
      status: 'review_ready',
      storageMode: 'transcript_plus_audio',
      title: unique,
      transcript: `${unique} transcript`,
      updatedAt: timestamp,
    },
  })
  await expect.poll(() => localEntryDb.hasRetainedAudio(audioFileId)).toBe(true)

  await page.goto(`/note/${noteId}?mode=voice`)
  await expect(page.getByRole('heading', { name: unique })).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.getByText(/ready to review/i)).toBeVisible({ timeout: 20_000 })
  await expect(page.getByLabel(/retained audio playback/i)).toBeVisible({
    timeout: 20_000,
  })
  await expect
    .poll(() =>
      page
        .getByLabel(/retained audio playback/i)
        .evaluate((node) => (node as HTMLAudioElement).readyState),
    )
    .toBeGreaterThan(0)

  await page.getByRole('button', { name: /discard draft/i }).click()
  await expect(page.getByRole('heading', { name: /make space for a thought/i })).toBeVisible()
  await expect.poll(() => localEntryDb.hasRetainedAudio(audioFileId)).toBe(false)

  await page.reload()
  await expect(page.getByRole('heading', { name: /make space for a thought/i })).toBeVisible()

  await page.getByRole('link', { name: /drafts/i }).click()
  await expect(page.getByRole('heading', { name: /drafts stay here first/i })).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.getByText(unique)).toHaveCount(0)

  await page.getByRole('link', { name: /^back to home$/i }).click()
  await page.getByRole('link', { name: /recent/i }).click()
  await expect(
    page.getByRole('heading', { name: /your latest entries will land here/i }),
  ).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText(unique)).toHaveCount(0)
})
