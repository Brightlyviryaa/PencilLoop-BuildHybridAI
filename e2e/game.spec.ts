import { expect, test } from '@playwright/test'
import { clearPlan, expectNoHorizontalOverflow, freshStart, isMobile, onboard, palette, runButton } from './helpers.ts'

test.describe('PencilLoop core game (no Firebase configured)', () => {
  test('first visit: onboarding in Indonesian, validation, then straight into level 1', async ({ page }) => {
    await freshStart(page, { onboarded: false, lang: 'id' })
    await page.goto('/')
    await expect(page).toHaveURL(/\/welcome$/)
    await expect(page.getByRole('heading', { name: 'Siap main?' })).toBeVisible()
    await page.getByTestId('welcome-start').click()
    await page.getByTestId('welcome-next').click()
    await expect(page.getByText('Tulis nama panggilanmu dulu, ya.')).toBeVisible()
    await page.getByTestId('welcome-name').fill('Rara')
    await page.getByTestId('welcome-next').click()
    await expect(page.getByRole('heading', { name: 'Kapan ulang tahunmu, Rara?' })).toBeVisible()
    await page.getByTestId('welcome-birthday').fill('2099-01-01')
    await page.getByTestId('welcome-next').click()
    await expect(page.getByText('Tanggal itu belum terjadi, lho!')).toBeVisible()
    await page.getByTestId('welcome-birthday').fill('2016-03-14')
    await page.getByTestId('welcome-next').click()
    await page.getByTestId('gender-skip').click()
    await expect(page.getByText('Catatan untuk orang tua')).toBeVisible()
    await page.getByTestId('welcome-finish').click()
    await expect(page).toHaveURL(/\/play\/first-steps$/)
    await expect(page.getByTestId('maze-board')).toBeVisible()
    const profile = await page.evaluate(() => JSON.parse(localStorage.getItem('pencilloop:profile:v1') || 'null'))
    expect(profile).toMatchObject({ name: 'Rara', ageGroup: 'under13', gender: null })
    await expectNoHorizontalOverflow(page)
  })

  test('language switch applies instantly and persists without a reload', async ({ page }) => {
    await freshStart(page)
    await page.goto('/profile')
    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible()
    await page.getByTestId('setting-language').getByRole('radio', { name: 'Indonesia' }).click()
    await expect(page.getByRole('heading', { name: 'Profil', exact: true })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'id')
    await expect(page.getByTestId(isMobile(page) ? 'nav-play' : 'rail-nav-play')).toContainText('Main')
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Profil', exact: true })).toBeVisible()
  })

  test('solve level 1 with the visual editor, earn badges and unlock level 2', async ({ page }) => {
    await freshStart(page)
    await page.goto('/play/first-steps')
    await expect(page.getByTestId('maze-board')).toBeVisible()
    await clearPlan(page)
    await palette(page, 'move').click()
    await palette(page, 'left').click()
    await palette(page, 'move').click()
    const blocks = page.locator('[data-testid="program-block"][data-block-type="move"]:visible')
    await expect(blocks).toHaveCount(2)
    for (let b = 0; b < 2; b++) {
      const inc = blocks.nth(b).getByRole('button', { name: 'More squares' })
      await inc.click()
      await inc.click()
    }
    await runButton(page).click()
    const victory = page.getByTestId('victory')
    await expect(victory).toBeVisible({ timeout: 15_000 })
    await expect(victory.getByRole('img', { name: '3 of 3 stars' })).toBeVisible()
    await expect(page.getByTestId('victory-unlocked')).toContainText('Level 2 unlocked!')
    await expect(page.getByTestId('toast-achievement').first()).toBeVisible({ timeout: 10_000 })
    await page.getByTestId('next-level').click()
    await expect(page).toHaveURL(/around-the-blocks/)

    const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('pencilloop:progress:v1') || '{}'))
    expect(progress.levels['first-steps']).toMatchObject({ completed: true, bestStars: 3, bestBlocks: 3 })
    const badges = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('pencilloop:achievements:v1') || '{}')))
    expect(badges).toEqual(expect.arrayContaining(['first-run', 'first-win', 'three-stars']))

    // Progress survives a refresh and shows up on the Progress tab.
    await page.goto('/progress')
    await expect(page.getByTestId('badge-first-win')).toHaveAttribute('data-earned', 'true')
  })

  test('collision points at the failing step and offers a labelled built-in tip', async ({ page }) => {
    await freshStart(page)
    await page.goto('/play/first-steps')
    await clearPlan(page)
    await palette(page, 'move').click()
    const inc = page.locator('[data-testid="program-block"]:visible').first().getByRole('button', { name: 'More squares' })
    for (let i = 0; i < 4; i++) await inc.click() // move 5 bumps the edge on step 1
    await runButton(page).click()
    const status = page.getByTestId('status-message').filter({ visible: true }).first()
    await expect(status).toHaveAttribute('data-tone', 'error', { timeout: 15_000 })
    await expect(status).toContainText('Step 1')
    await expect(page.getByTestId('blocked-cell')).toBeVisible()
    await status.getByTestId('clue-button').click()
    await expect(page.getByTestId('builtin-tip').filter({ visible: true }).first()).toBeVisible()
    await expect(page.getByTestId('hint-text').filter({ visible: true }).first()).toContainText(/step 1/i)
  })

  test('scan without Firebase never uploads and explains why', async ({ page }) => {
    await freshStart(page)
    const external: string[] = []
    page.on('request', (r) => {
      const u = new URL(r.url())
      if ((u.protocol === 'http:' || u.protocol === 'https:') && u.hostname !== 'localhost') external.push(r.url())
    })
    await page.goto('/play/first-steps')
    await page.getByTestId(isMobile(page) ? 'scan-button-mobile' : 'scan-button').click()
    const sheet = page.getByTestId('scan-sheet')
    await expect(sheet).toBeVisible()
    await sheet.getByTestId('scan-file-input').setInputFiles('e2e/fixtures/sample-plan.png')
    await expect(sheet.getByRole('img', { name: 'Your photographed plan' })).toBeVisible()
    await sheet.getByTestId('read-plan').click()
    await expect(sheet).toContainText("Photo scanning isn't set up here")
    expect(external).toEqual([])
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
  })

  test('locked levels cannot be opened directly; the level map shows them locked', async ({ page }) => {
    await freshStart(page)
    await page.goto('/play/smart-loop')
    await expect(page.getByRole('heading', { name: /Level 3 is locked/ })).toBeVisible()
    await page.goto('/levels')
    const id = isMobile(page) ? 'level-node-smart-loop' : 'level-card-smart-loop'
    await expect(page.getByTestId(id)).toHaveAttribute('data-state', 'locked')
    await expect(page.getByTestId(isMobile(page) ? 'level-node-first-steps' : 'level-card-first-steps')).toHaveAttribute('data-state', 'next')
  })

  test('level 3 offers Repeat and the loop solution wins', async ({ page }) => {
    await freshStart(page, {
      progress: {
        levels: {
          'first-steps': { completed: true, bestStars: 3, attempts: 1 },
          'around-the-blocks': { completed: true, bestStars: 3, attempts: 1 },
        },
        updatedAt: 1,
      },
    })
    await page.goto('/play/smart-loop')
    await clearPlan(page)
    await palette(page, 'repeat').click() // selects the new Repeat as insertion target
    await palette(page, 'move').click()
    await palette(page, 'left').click()
    await palette(page, 'move').click()
    await palette(page, 'right').click()
    const repeat = page.locator('[data-testid="program-block"][data-block-type="repeat"]:visible').first()
    const incTimes = repeat.getByRole('button', { name: 'More times' }).first()
    for (let i = 0; i < 3; i++) await incTimes.click()
    await runButton(page).click()
    await expect(page.getByTestId('victory')).toBeVisible({ timeout: 20_000 })
  })

  test('AI information: friendly status plus the real capability matrix', async ({ page }) => {
    await freshStart(page)
    await page.goto('/about/hybrid')
    await expect(page).toHaveURL(/\/profile\/ai$/)
    await expect(page.getByTestId('ai-status')).toBeVisible()
    await page.getByTestId('tech-toggle').click()
    await expect(page.getByTestId('capability-matrix')).toContainText('Not configured in this build')
    await page.getByTestId('ai-test').click()
    await expect(page.getByText('No Firebase project is configured in this build.')).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test('profile: sound toggle and volume persist; no cloud account without Firebase', async ({ page }) => {
    await freshStart(page)
    await page.goto('/profile')
    await expect(page.getByTestId('account-local')).toBeVisible()
    const toggle = page.getByTestId('toggle-sound')
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    await page.getByRole('slider', { name: 'Volume' }).fill('40')
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pencilloop:settings:v1') || '{}'))
    expect(saved).toMatchObject({ muted: false, volume: 0.4 })
  })

  test('delete all my data returns to onboarding with a clean device', async ({ page }) => {
    await freshStart(page, { progress: { levels: { 'first-steps': { completed: true, bestStars: 2, attempts: 3 } }, updatedAt: 1 } })
    await page.goto('/profile')
    await page.getByTestId('toggle-cloud-photos').click()
    await expect(page.getByTestId('toggle-cloud-photos')).toHaveAttribute('aria-checked', 'true')
    await page.getByTestId('delete-all').click()
    await page.getByTestId('confirm-delete').click()
    await expect(page).toHaveURL(/\/welcome$/)
    const left = await page.evaluate(() => Object.keys(localStorage).filter((k) => /profile|progress|achievements|guest-backup/.test(k)))
    expect(left).toEqual([])
    // Consent belongs to the previous player: the next one must give their own.
    const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('pencilloop:settings:v1') || '{}'))
    expect(settings).toMatchObject({ cloudPhotos: false, cloudHints: false })
  })

  test('offline: the game keeps working', async ({ page, context }) => {
    await freshStart(page)
    await page.goto('/play/first-steps')
    await expect(page.getByTestId('maze-board')).toBeVisible()
    await context.setOffline(true)
    await runButton(page).click()
    await expect(page.getByTestId('status-message').filter({ visible: true }).first()).toHaveAttribute('data-tone', /warn|error|success/, { timeout: 15_000 })
    await context.setOffline(false)
  })
})

test('onboarding helper smoke (English)', async ({ page }) => {
  await freshStart(page, { onboarded: false })
  await page.goto('/')
  await onboard(page, { name: 'Sam', birthday: '2014-06-01', gender: 'male' })
  await expect(page).toHaveURL(/\/play\/first-steps$/)
})
