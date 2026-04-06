import { expect, test } from './helpers/localEntryDb'

test('open note warns when the same note is also open in another tab', async ({
  page,
  localEntryDb,
}) => {
  const unique = `${Date.now()}`
  const noteTitle = `same note ${unique}`
  const entryId = `same-note-${unique}`
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
  await expect(
    page.getByText(/this note is also open in another tab/i),
  ).toHaveCount(0)

  const secondPage = await page.context().newPage()

  try {
    await secondPage.goto(`/note/${entryId}?mode=text`)
    await expect(secondPage.getByLabel('Title')).toHaveValue(noteTitle)

    await expect(
      page.getByText(/this note is also open in another tab/i),
    ).toBeVisible()
    await expect(
      secondPage.getByText(/this note is also open in another tab/i),
    ).toBeVisible()

    await secondPage.close()

    await expect(
      page.getByText(/this note is also open in another tab/i),
    ).toHaveCount(0)
  } finally {
    if (!secondPage.isClosed()) {
      await secondPage.close()
    }
  }
})
