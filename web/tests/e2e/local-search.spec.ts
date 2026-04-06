import { expect, test } from './helpers/localEntryDb'

test('local search filters device notes by text and scope without implying audio search', async ({
  page,
  localEntryDb,
}) => {
  const unique = `${Date.now()}`
  const savedTitle = `anchor saved ${unique}`
  const draftTitle = `anchor draft ${unique}`

  await page.goto('/')

  await localEntryDb.seed(
    {
      entry: {
        audioFileId: null,
        createdAt: 100,
        deviceLocalId: `saved-${unique}`,
        hasAudio: false,
        id: `saved-${unique}`,
        ownerMode: 'guest_local',
        sourceType: 'text',
        status: 'saved_local',
        storageMode: 'transcript_only',
        title: savedTitle,
        transcript: 'steady anchor transcript',
        updatedAt: 300,
      },
    },
    {
      entry: {
        audioFileId: null,
        createdAt: 90,
        deviceLocalId: `draft-${unique}`,
        hasAudio: false,
        id: `draft-${unique}`,
        ownerMode: 'guest_local',
        sourceType: 'text',
        status: 'draft_local',
        storageMode: 'transcript_only',
        title: draftTitle,
        transcript: 'anchor draft transcript',
        updatedAt: 200,
      },
    },
    {
      entry: {
        audioFileId: 'audio-only-note',
        createdAt: 80,
        deviceLocalId: `voice-${unique}`,
        hasAudio: true,
        id: `voice-${unique}`,
        ownerMode: 'guest_local',
        sourceType: 'voice',
        status: 'saved_local',
        storageMode: 'transcript_plus_audio',
        title: `voice note ${unique}`,
        transcript: 'spoken memory',
        updatedAt: 100,
      },
    },
  )

  await page.goto('/search')

  await expect(
    page.getByRole('heading', { name: /search your local notes/i }),
  ).toBeVisible()
  await expect(page.getByText(/search stays on this device/i)).toBeVisible()
  await expect(page.getByText(/audio is not searched/i)).toBeVisible()

  await page.getByRole('searchbox', { name: /search notes/i }).fill('anchor')

  const resultLinks = page.getByRole('link').filter({ hasText: /anchor/i })
  await expect(resultLinks).toHaveCount(2)
  await expect(resultLinks.nth(0)).toContainText(savedTitle)
  await expect(resultLinks.nth(1)).toContainText(draftTitle)

  await page.getByRole('button', { name: /saved on device/i }).click()

  await expect(page.getByRole('link').filter({ hasText: savedTitle })).toHaveCount(1)
  await expect(page.getByRole('link').filter({ hasText: draftTitle })).toHaveCount(0)
})
