import { expect, test } from '@playwright/test'

const DISCLOSURE_KEY = 'notes:voice-capture-disclosure-v1'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    class FakeMediaRecorder extends EventTarget {
      static isTypeSupported(mimeType: string) {
        return mimeType === 'audio/webm'
      }

      mimeType = 'audio/webm'
      ondataavailable: ((event: BlobEvent) => void) | null = null
      state: 'inactive' | 'recording' = 'inactive'

      constructor(_stream: MediaStream, _options?: MediaRecorderOptions) {
        super()
      }

      requestData() {}

      start() {
        this.state = 'recording'
      }

      stop() {
        this.state = 'inactive'
        this.dispatchEvent(new Event('stop'))
      }
    }

    const fakeTrack = {
      stop() {},
    }

    let getUserMediaCalls = 0

    Object.defineProperty(window, '__notesTestMediaState', {
      configurable: true,
      value: {
        getUserMediaCalls: () => getUserMediaCalls,
      },
    })

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: () => {
          getUserMediaCalls += 1

          return Promise.resolve({
            getTracks: () => [fakeTrack],
          } as unknown as MediaStream)
        },
      },
    })

    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: FakeMediaRecorder,
    })
  })
})

test('first voice capture shows a disclosure before microphone access is requested', async ({
  page,
}) => {
  await page.goto('/note/new?mode=voice')
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey)
  }, DISCLOSURE_KEY)
  await page.reload()

  await page.getByRole('button', { name: /start recording/i }).click()

  await expect(
    page.getByRole('heading', { name: /before you use the microphone/i }),
  ).toBeVisible()
  await expect(
    page.getByText(/microphone is only used while you choose to record/i),
  ).toBeVisible()
  await expect(
    page.getByText(/audio stays on this device for review until you remove it/i),
  ).toBeVisible()
  await expect(
    page.getByText(/does not send audio or notes to cloud sync or a transcription provider/i),
  ).toBeVisible()

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              __notesTestMediaState: { getUserMediaCalls: () => number }
            }
          ).__notesTestMediaState.getUserMediaCalls(),
      ),
    )
    .toBe(0)

  await page.getByRole('button', { name: /continue to microphone/i }).click()

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              __notesTestMediaState: { getUserMediaCalls: () => number }
            }
          ).__notesTestMediaState.getUserMediaCalls(),
      ),
    )
    .toBe(1)

  await expect(page.getByRole('button', { name: /stop recording/i })).toBeVisible()
})

test('acknowledged voice capture can start later without re-showing the disclosure', async ({
  page,
}) => {
  await page.goto('/note/new?mode=voice')
  await page.evaluate((storageKey) => {
    window.localStorage.setItem(storageKey, 'accepted')
  }, DISCLOSURE_KEY)
  await page.reload()

  await page.getByRole('button', { name: /start recording/i }).click()

  await expect(
    page.getByRole('heading', { name: /before you use the microphone/i }),
  ).toHaveCount(0)
  await expect(page.getByRole('button', { name: /stop recording/i })).toBeVisible()
})
