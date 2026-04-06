import { expect, test } from './helpers/localEntryDb'

const DISCLOSURE_KEY = 'notes:voice-capture-disclosure-v1'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {},
    })

    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: () =>
        Promise.reject(new Error('Microphone permission denied for replacement')),
    })
  })

  await page.addInitScript((storageKey) => {
    try {
      window.localStorage.setItem(storageKey, 'accepted')
    } catch {}
  }, DISCLOSURE_KEY)
})

test('failed rerecord leaves the previous stored audio intact', async ({
  page,
  localEntryDb,
}) => {
  const unique = `replace recording ${Date.now()}`
  const noteId = `replace-recording-${Date.now()}`
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

  await page.goto(`/note/${noteId}?mode=voice`)
  await expect(page.getByRole('heading', { name: unique })).toBeVisible()
  await expect(page.getByLabel(/retained audio playback/i)).toBeVisible()

  await page.getByRole('button', { name: /record again/i }).click()
  await expect(
    page.getByRole('dialog', { name: /replace this recording/i }),
  ).toBeVisible()
  await page.getByRole('button', { name: /replace recording/i }).click()

  await expect(
    page.getByText(/existing recording stays on this device/i),
  ).toBeVisible()
  await expect(page.getByLabel(/retained audio playback/i)).toBeVisible()
  await expect.poll(() => localEntryDb.hasRetainedAudio(audioFileId)).toBe(true)
})
