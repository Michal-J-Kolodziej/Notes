import { expect, test } from '@playwright/test'

const DISCLOSURE_KEY = 'notes:voice-capture-disclosure-v1'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: undefined,
    })
  })

  await page.addInitScript((storageKey) => {
    try {
      window.localStorage.setItem(storageKey, 'accepted')
    } catch {}
  }, DISCLOSURE_KEY)
})

test('unsupported voice capture falls back to text with an explicit notice', async ({
  page,
}) => {
  await page.goto('/note/new?mode=voice')
  await expect(page.getByRole('heading', { name: /^Voice note$/ })).toBeVisible()

  await page.getByRole('button', { name: /start recording/i }).click()

  await expect(
    page.getByText(/browser could not start voice capture here/i),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: /^Text note$/ })).toBeVisible()
  await expect(
    page.getByRole('button', { name: /start recording/i }),
  ).toHaveCount(0)
})
