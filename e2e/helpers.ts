import { expect, type Page } from '@playwright/test'

interface Seed {
  /** Skip onboarding with a ready-made local profile (default true). */
  onboarded?: boolean
  progress?: object
  lang?: 'en' | 'id'
  ageGroup?: 'under13' | 'teen' | 'adult'
}

/** Clean slate: muted, reduced motion, English, and (by default) a finished onboarding. */
export async function freshStart(page: Page, opts: Seed = {}) {
  await page.addInitScript(
    ({ onboarded, progress, lang, ageGroup }) => {
      if (sessionStorage.getItem('__seeded')) return
      sessionStorage.setItem('__seeded', '1')
      localStorage.clear()
      localStorage.setItem(
        'pencilloop:settings:v1',
        JSON.stringify({ language: lang, muted: true, volume: 0.7, motion: 'reduced', cloudPhotos: false, cloudHints: false, autoPrepareAI: false }),
      )
      if (onboarded) {
        const birthDate = ageGroup === 'adult' ? '1990-01-01' : ageGroup === 'teen' ? '2011-01-01' : '2016-01-01'
        localStorage.setItem('pencilloop:profile:v1', JSON.stringify({ name: 'Tester', birthDate, gender: null, ageGroup, completedAt: 1 }))
      }
      if (progress) localStorage.setItem('pencilloop:progress:v1', JSON.stringify(progress))
    },
    { onboarded: opts.onboarded ?? true, progress: opts.progress ?? null, lang: opts.lang ?? 'en', ageGroup: opts.ageGroup ?? 'under13' },
  )
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1000) < 768

/** The run button differs between the mobile action bar and the desktop stage. */
export function runButton(page: Page) {
  return page.getByTestId(isMobile(page) ? 'run-button-mobile' : 'run-button')
}

export async function clearPlan(page: Page) {
  if (isMobile(page)) {
    const toggle = page.getByTestId('tray-toggle')
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
    const clear = page.getByRole('button', { name: 'Clear' })
    if (await clear.isVisible()) await clear.click()
  } else {
    await page.getByRole('button', { name: 'Clear' }).click()
  }
}

/** Palette buttons exist in both tray and desktop panel; pick the visible one. */
export function palette(page: Page, key: 'move' | 'left' | 'right' | 'repeat') {
  return page.locator(`[data-testid="add-${key}"]:visible`).first()
}

/** Walk through onboarding like a player would. */
export async function onboard(page: Page, o: { name: string; birthday: string; lang?: 'en' | 'id'; gender?: 'male' | 'female' }) {
  await expect(page).toHaveURL(/\/welcome$/)
  if (o.lang) await page.getByTestId(`lang-${o.lang}`).click()
  await page.getByTestId('welcome-start').click()
  await page.getByTestId('welcome-name').fill(o.name)
  await page.getByTestId('welcome-next').click()
  await page.getByTestId('welcome-birthday').fill(o.birthday)
  await page.getByTestId('welcome-next').click()
  if (o.gender) {
    await page.getByTestId(`gender-${o.gender}`).click()
    await page.getByTestId('welcome-next').click()
  } else await page.getByTestId('gender-skip').click()
  await page.getByTestId('welcome-finish').click()
}
