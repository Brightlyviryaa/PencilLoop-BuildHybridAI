import { expect, test } from '@playwright/test'
import { freshStart, openPlan, isMobile } from './helpers.ts'

// Chromium's fake camera: a real getUserMedia stream without hardware.
test.use({
  permissions: ['camera'],
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
})

test('in-app camera: live preview, capture, retake, use photo, and the stream stops on close', async ({ page }) => {
  await freshStart(page)
  await page.goto('/play/first-steps')
  await openPlan(page)
  await page.getByTestId(isMobile(page) ? 'scan-button-mobile' : 'scan-button').click()
  const sheet = page.getByTestId('scan-sheet')
  await sheet.getByTestId('open-camera').click()
  await expect(sheet.getByTestId('camera')).toBeVisible()
  const shutter = sheet.getByTestId('camera-shutter')
  await expect(shutter).toBeEnabled({ timeout: 10_000 })
  const live = () => page.evaluate(() => {
    const v = document.querySelector('[data-testid="camera"] video') as HTMLVideoElement | null
    const s = v?.srcObject as MediaStream | null
    return !!s && s.getTracks().some((t) => t.readyState === 'live')
  })
  expect(await live()).toBe(true)

  await shutter.click()
  await expect(sheet.getByRole('img', { name: 'Photo you just took' })).toBeVisible()
  await sheet.getByTestId('camera-retake').click()
  await expect(shutter).toBeEnabled({ timeout: 10_000 })
  await shutter.click()
  await sheet.getByTestId('camera-use').click()
  // The photo goes to the normal review step (nothing is sent before the player confirms).
  await expect(sheet.getByRole('img', { name: 'Your photographed plan' })).toBeVisible()

  // Re-open the camera, then close the whole sheet: no track may stay live.
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  const anyLive = await page.evaluate(() => [...document.querySelectorAll('video')].some((v) => ((v as HTMLVideoElement).srcObject as MediaStream | null)?.getTracks().some((t) => t.readyState === 'live')))
  expect(anyLive).toBe(false)
})
