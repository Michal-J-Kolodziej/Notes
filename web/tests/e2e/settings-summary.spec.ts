import { expect, test } from './helpers/localEntryDb'

test('settings shows a live summary of local notes and retained audio on this device', async ({
  page,
  localEntryDb,
}) => {
  const unique = `${Date.now()}`
  const noteId = `settings-summary-${unique}`

  await page.goto('/')
  await localEntryDb.seed(
    {
      entry: {
        audioFileId: null,
        createdAt: 1,
        deviceLocalId: `saved-${unique}`,
        hasAudio: false,
        id: `saved-${unique}`,
        ownerMode: 'guest_local',
        sourceType: 'text',
        status: 'saved_local',
        storageMode: 'transcript_only',
        title: 'Saved note',
        transcript: 'Saved transcript',
        updatedAt: 2,
      },
    },
    {
      entry: {
        audioFileId: null,
        createdAt: 3,
        deviceLocalId: `draft-${unique}`,
        hasAudio: false,
        id: `draft-${unique}`,
        ownerMode: 'guest_local',
        sourceType: 'text',
        status: 'draft_local',
        storageMode: 'transcript_only',
        title: 'Draft note',
        transcript: 'Draft transcript',
        updatedAt: 4,
      },
    },
    {
      audio: { kind: 'text', text: 'pretend-audio' },
      entry: {
        audioFileId: `local-audio:${noteId}`,
        createdAt: 5,
        deviceLocalId: `voice-${unique}`,
        hasAudio: true,
        id: noteId,
        ownerMode: 'guest_local',
        sourceType: 'voice',
        status: 'saved_local',
        storageMode: 'transcript_plus_audio',
        title: 'Voice note',
        transcript: 'Voice transcript',
        updatedAt: 6,
      },
    },
  )

  await page.goto('/settings')

  await expect(
    page.getByRole('heading', { name: /on this device/i }),
  ).toBeVisible()
  await expect(page.getByText(/2 saved notes/i)).toBeVisible()
  await expect(page.getByText(/1 draft/i)).toBeVisible()
  await expect(page.getByText(/1 retained audio/i)).toBeVisible()
  await expect(page.getByText(/local app data/i)).toBeVisible()
})
