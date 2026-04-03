import { expect, test } from './helpers/localEntryDb'

test('recent notes refresh when local data is deleted in another tab', async ({
  page,
  localEntryDb,
}) => {
  const unique = `${Date.now()}`
  const noteTitle = `cross tab recent ${unique}`
  const entryId = `recent-${unique}`
  const timestamp = Date.now()

  await page.goto('/')
  await localEntryDb.seed({
    entry: {
      audioFileId: null,
      createdAt: timestamp,
      deviceLocalId: `device-${entryId}`,
      hasAudio: false,
      id: entryId,
      ownerMode: 'guest_local',
      sourceType: 'text',
      status: 'saved_local',
      storageMode: 'transcript_only',
      title: noteTitle,
      transcript: `${noteTitle} transcript`,
      updatedAt: timestamp,
    },
  })

  await page.goto('/recent')
  await expect(page.getByRole('link').filter({ hasText: noteTitle }).first()).toBeVisible()

  const settingsPage = await page.context().newPage()

  try {
    await settingsPage.goto('/settings')
    await expect(
      settingsPage.getByRole('heading', { name: /privacy and recovery stay visible/i }),
    ).toBeVisible()

    await settingsPage.getByRole('button', { name: /delete all local notes/i }).click()
    await expect(
      settingsPage.getByRole('dialog', {
        name: /delete all local notes from this device/i,
      }),
    ).toBeVisible()
    await settingsPage
      .getByRole('button', { name: /delete all local notes/i })
      .last()
      .click()

    await expect(
      settingsPage.getByText(/all local notes and retained audio were deleted/i),
    ).toBeVisible()
    await expect(
      page.getByRole('link').filter({ hasText: noteTitle }).first(),
    ).toHaveCount(0)
  } finally {
    await settingsPage.close()
  }
})

test('open note exits stale editing state when another tab removes it from this device', async ({
  page,
  localEntryDb,
}) => {
  const unique = `${Date.now()}`
  const noteTitle = `cross tab note ${unique}`
  const entryId = `note-${unique}`
  const timestamp = Date.now()

  await page.goto('/')
  await localEntryDb.seed({
    entry: {
      audioFileId: null,
      createdAt: timestamp,
      deviceLocalId: `device-${entryId}`,
      hasAudio: false,
      id: entryId,
      ownerMode: 'guest_local',
      sourceType: 'text',
      status: 'draft_local',
      storageMode: 'transcript_only',
      title: noteTitle,
      transcript: `${noteTitle} transcript`,
      updatedAt: timestamp,
    },
  })

  await page.goto(`/note/${entryId}?mode=text`)
  await expect(page.getByLabel('Title')).toHaveValue(noteTitle)

  const settingsPage = await page.context().newPage()

  try {
    await settingsPage.goto('/settings')
    await expect(
      settingsPage.getByRole('heading', { name: /privacy and recovery stay visible/i }),
    ).toBeVisible()

    await settingsPage.getByRole('button', { name: /delete all local notes/i }).click()
    await settingsPage
      .getByRole('dialog', {
        name: /delete all local notes from this device/i,
      })
      .getByRole('button', { name: /delete all local notes/i })
      .click()

    await expect(
      page.getByRole('heading', {
        name: /this note is no longer available on this device/i,
      }),
    ).toBeVisible()
    await expect(page.getByLabel('Title')).toHaveCount(0)
  } finally {
    await settingsPage.close()
  }
})
