import { expect, type Page } from '@playwright/test'

interface Seed {
  /** Skip onboarding with a ready-made local profile (default true). */
  onboarded?: boolean
  progress?: object
  lang?: 'en' | 'id'
  ageGroup?: 'under13' | 'teen' | 'adult'
  /** Seed "tutorial already done" on this device (default true). */
  tutorialDone?: boolean
}

/** Clean slate: muted, reduced motion, English, and (by default) a finished onboarding. */
export async function freshStart(page: Page, opts: Seed = {}) {
  await page.addInitScript(
    ({ onboarded, progress, lang, ageGroup, tutorialDone }) => {
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
      if (tutorialDone) localStorage.setItem('pencilloop:device:v1', JSON.stringify({ tutorialDone: true, dragHintSeen: true, voice: false }))
    },
    { onboarded: opts.onboarded ?? true, progress: opts.progress ?? null, lang: opts.lang ?? 'en', ageGroup: opts.ageGroup ?? 'under13', tutorialDone: opts.tutorialDone ?? true },
  )
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1000) < 768

/** Desktop: the stage Run button. Phone: Run inside the plan editor, or on the map bar. */
export function runButton(page: Page) {
  if (!isMobile(page)) return page.getByTestId('run-button')
  // When the full-screen editor is open, its own Run button is the one on top.
  return page.locator('[data-testid="plan-screen"] [data-testid="plan-run"], body:not(:has([data-testid="plan-screen"])) [data-testid="run-button-mobile"]').first()
}

/** Phone: open the full-screen plan editor (no-op when it is already open or on desktop). */
export async function openPlan(page: Page) {
  // The game page is lazy-loaded: wait for it before looking for its controls.
  await expect(page.getByTestId('maze-board')).toBeVisible()
  if (!isMobile(page)) return
  if (await page.getByTestId('plan-screen').isVisible()) return
  await page.getByTestId('open-plan').click()
  await expect(page.getByTestId('plan-screen')).toBeVisible()
}

export async function clearPlan(page: Page) {
  await openPlan(page)
  await expect(page.locator('[data-testid="plan-count"]:visible').first()).toBeVisible()
  const clear = page.locator('[data-testid="clear-plan"]:visible').first()
  if ((await clear.count()) && (await clear.isEnabled())) await clear.click()
  await expect(page.locator('[data-testid="program-block"]:visible')).toHaveCount(0)
}

/** Palette buttons exist in the phone editor and the desktop panel; pick the visible one. */
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
