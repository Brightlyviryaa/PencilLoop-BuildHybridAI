import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, freshStart } from './helpers.ts'

const VIEWPORTS = [
  [320, 700],
  [360, 800],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1024, 768],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
] as const

test.describe('responsive layout', () => {
  test.skip(({ isMobile }) => isMobile, 'viewport sweep runs once (desktop project)')

  for (const [w, h] of VIEWPORTS) {
    test(`game workspace at ${w}×${h}: board fully visible, Run reachable, no sideways scroll`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h })
      await freshStart(page)
      await page.goto('/play/first-steps')
      const board = page.getByTestId('maze-board')
      await expect(board).toBeVisible()
      const box = (await board.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(w + 0.5)
      expect(box.y + box.height).toBeLessThanOrEqual(h + 0.5)
      expect(box.width).toBeGreaterThan(Math.min(w, h) * (w < 768 ? 0.4 : 0.35))

      const run = page.getByTestId(w < 768 ? 'run-button-mobile' : 'run-button')
      await expect(run).toBeVisible()
      const rb = (await run.boundingBox())!
      expect(rb.y + rb.height).toBeLessThanOrEqual(h + 0.5)
      expect(rb.height).toBeGreaterThanOrEqual(44)

      if (w >= 768) {
        // Editor and maze side by side.
        await expect(page.getByRole('region', { name: 'Program editor' })).toBeVisible()
      }
      await expectNoHorizontalOverflow(page)
      if ((w === 360 && h === 800) || (w === 1440 && h === 900) || (w === 768 && h === 1024)) {
        await page.screenshot({ path: `docs/screenshots/play-${w}x${h}.png` })
      }
    })

    test(`home, levels, progress, profile and welcome at ${w}×${h}: no sideways scroll`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h })
      await freshStart(page)
      await page.goto('/')
      await expect(page.getByTestId('hero-play')).toBeVisible()
      await expectNoHorizontalOverflow(page)
      // Phones/tablets get the bottom tab bar, desktops the side rail.
      if (w < 1024) await expect(page.getByTestId('bottom-nav')).toBeVisible()
      else await expect(page.getByTestId('bottom-nav')).toBeHidden()
      const shoot = (w === 360 && h === 800) || (w === 1440 && h === 900) || (w === 768 && h === 1024)
      if (shoot) await page.screenshot({ path: `docs/screenshots/home-${w}x${h}.png` })
      for (const path of ['/levels', '/progress', '/profile']) {
        await page.goto(path)
        await expect(page.locator('main h1').first()).toBeVisible()
        await expectNoHorizontalOverflow(page)
        if (shoot) await page.screenshot({ path: `docs/screenshots/${path.slice(1)}-${w}x${h}.png` })
      }
      await page.evaluate(() => localStorage.removeItem('pencilloop:profile:v1'))
      await page.goto('/welcome')
      await expect(page.getByTestId('welcome-start')).toBeVisible()
      await expectNoHorizontalOverflow(page)
      if (shoot) await page.screenshot({ path: `docs/screenshots/welcome-${w}x${h}.png` })
    })
  }
})
