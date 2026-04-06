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

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: () =>
          Promise.resolve({
            getTracks: () => [fakeTrack],
          } as unknown as MediaStream),
      },
    })

    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: FakeMediaRecorder,
    })
  })

  await page.addInitScript((storageKey) => {
    try {
      window.localStorage.setItem(storageKey, 'accepted')
    } catch {}
  }, DISCLOSURE_KEY)
})

test('voice capture shows a live recording timer while recording is active', async ({
  page,
}) => {
  await page.goto('/note/new?mode=voice')
  await page.clock.install()

  await page.getByRole('button', { name: /start recording/i }).click()
  await expect(page.getByText(/recording now 00:00/i)).toBeVisible()

  await page.clock.fastForward(5000)

  await expect(page.getByText(/recording now 00:05/i)).toBeVisible()
})
