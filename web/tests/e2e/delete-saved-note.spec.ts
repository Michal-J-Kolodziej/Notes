import { expect, test } from '@playwright/test'

test('saved notes can be deleted from the note screen', async ({ page }) => {
  await page.goto('/note/new?mode=text')

  await page.getByLabel('Title').fill('Delete me')
  await page
    .getByLabel('Write note')
    .fill('This note should disappear from local recent notes.')
  await page.getByRole('button', { name: /save locally/i }).click()

  await page.getByRole('link', { name: /delete me/i }).click()
  await page.getByRole('button', { name: /^delete note$/i }).click()
  await page.getByRole('button', { name: /^delete note$/i }).nth(1).click()

  await expect(page).toHaveURL(/\/recent$/)
  await expect(page.getByText(/save a note locally and it will show up here/i)).toBeVisible()
  await expect(page.getByText(/^delete me$/i)).toHaveCount(0)
})
