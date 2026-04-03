import { expect, test } from './helpers/localEntryDb'

test('stored audio can be removed while keeping the note transcript', async ({
  page,
  localEntryDb,
}) => {
  test.slow()

  const unique = `audio delete ${Date.now()}`
  const noteId = `audio-delete-${Date.now()}`
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
      status: 'saved_local',
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
  await expect(page.getByLabel(/retained audio playback/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /remove stored audio/i })).toBeVisible()
  await page.getByLabel(/title/i).fill(`${unique} edited`)
  await page
    .getByLabel(/review note/i)
    .fill(`${unique} transcript edited before audio removal`)

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: /remove stored audio/i }).click()

  await expect(
    page.getByText(/stored as transcript text only on this device/i),
  ).toBeVisible()
  await expect(page.getByLabel(/retained audio playback/i)).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: /remove stored audio/i }),
  ).toHaveCount(0)
  await expect.poll(() => localEntryDb.hasRetainedAudio(audioFileId)).toBe(false)
  await expect
    .poll(() => localEntryDb.getEntry(noteId))
    .toMatchObject({
      audioFileId: null,
      hasAudio: false,
      id: noteId,
      storageMode: 'transcript_only',
      title: `${unique} edited`,
      transcript: `${unique} transcript edited before audio removal`,
    })

  await page.reload()
  await expect(page.getByRole('heading', { name: `${unique} edited` })).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.getByLabel(/retained audio playback/i)).toHaveCount(0)
  await expect(
    page.getByLabel(/review note/i),
  ).toHaveValue(`${unique} transcript edited before audio removal`)

  await page.goto('/recent')
  await expect(
    page.getByRole('heading', { name: /your latest entries will land here/i }),
  ).toBeVisible({ timeout: 60_000 })
  await expect(
    page.getByRole('link').filter({ hasText: `${unique} edited` }).first(),
  ).toBeVisible({ timeout: 60_000 })
})
