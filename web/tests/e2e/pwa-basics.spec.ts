import { expect, test } from '@playwright/test'

test('manifest exposes install metadata and the app registers a service worker', async ({
  page,
}) => {
  await page.goto('/')

  const manifest = await page.evaluate(async () => {
    const response = await fetch('/site.webmanifest')
    return await response.json()
  })

  expect(manifest).toMatchObject({
    background_color: '#f4eee9',
    display: 'standalone',
    id: '/',
    name: 'Notes',
    scope: '/',
    short_name: 'Notes',
    start_url: '/',
    theme_color: '#f4eee9',
  })

  await expect
    .poll(async () => {
      return await page.evaluate(async () => {
        const registrations = await navigator.serviceWorker.getRegistrations()
        return registrations.length
      })
    })
    .toBe(1)
})

test('home surfaces an install action when the browser offers an install prompt', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: /make space for a thought/i }),
  ).toBeVisible()
  await page.waitForTimeout(50)

  await page.evaluate(() => {
    class MockBeforeInstallPromptEvent extends Event {
      platforms = ['web']
      userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' })

      prompt() {
        ;(window as Window & { __installPromptCalled?: boolean }).__installPromptCalled =
          true
        return Promise.resolve()
      }
    }

    const event = new MockBeforeInstallPromptEvent('beforeinstallprompt')
    event.preventDefault()
    window.dispatchEvent(event)
  })

  await expect(page.getByRole('button', { name: /install app/i })).toBeVisible()

  await page.getByRole('button', { name: /install app/i }).click()

  await expect
    .poll(async () => {
      return await page.evaluate(() => {
        return Boolean(
          (window as Window & { __installPromptCalled?: boolean }).__installPromptCalled,
        )
      })
    })
    .toBe(true)
})

test('offline reload keeps the app shell available and tells the user local notes still work', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: /make space for a thought/i }),
  ).toBeVisible()

  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })

  await expect(
    page.getByRole('heading', { name: /make space for a thought/i }),
  ).toBeVisible()
  await expect(
    page.getByText(/you are offline\. local notes still work on this device/i),
  ).toBeVisible()

  await context.setOffline(false)
})
