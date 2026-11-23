import { expect, test, type Page } from '@playwright/test'
import { freshStart, onboard, palette, runButton, clearPlan } from './helpers.ts'

/**
 * Accounts against the Firebase Emulator Suite (project demo-pencilloop):
 * anonymous auth, Firestore sync, Google linking (emulator IdP popup),
 * account conflict, sign-out and sign-in.
 */
const PROJECT = 'demo-pencilloop'
const AUTH = 'http://127.0.0.1:9099'
const FS = 'http://127.0.0.1:8080'
const owner = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }

async function accounts(): Promise<{ localId: string; email?: string; providerUserInfo?: { providerId: string }[] }[]> {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:query`, { method: 'POST', headers: owner, body: '{}' })
  return ((await r.json()).userInfo ?? []) as never
}

async function fsDoc(path: string): Promise<Record<string, Record<string, unknown>> | null> {
  const r = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`, { headers: owner })
  if (r.status === 404) return null
  return (await r.json()).fields
}

async function fsList(path: string): Promise<string[]> {
  const r = await fetch(`${FS}/v1/projects/${PROJECT}/databases/(default)/documents/${path}`, { headers: owner })
  return (((await r.json()).documents ?? []) as { name: string }[]).map((d) => d.name.split('/').pop()!)
}

async function googlePopup(page: Page, email: string, existing = false) {
  const popupPromise = page.waitForEvent('popup')
  const popup = await popupPromise
  await popup.waitForLoadState()
  if (existing) await popup.getByText(email).click()
  else {
    await popup.getByRole('button', { name: /Add new account/i }).click()
    await popup.locator('input').first().fill(email)
    await popup.getByRole('button', { name: /Sign in with Google/i }).click()
  }
  await popup.waitForEvent('close').catch(() => {})
}

/** Open Profile inside the app (no reload) and wait until the account is saved. */
async function waitForAccount(page: Page) {
  await page.getByTestId('rail-nav-profile').click()
  await expect(page.getByTestId('sync-status')).toHaveText('Saved automatically', { timeout: 15_000 })
}

async function winLevel1(page: Page) {
  await page.goto('/play/first-steps')
  await clearPlan(page)
  await palette(page, 'move').click()
  await palette(page, 'left').click()
  await palette(page, 'move').click()
  const blocks = page.locator('[data-testid="program-block"][data-block-type="move"]:visible')
  for (let b = 0; b < 2; b++) {
    const inc = blocks.nth(b).getByRole('button', { name: 'More squares' })
    await inc.click()
    await inc.click()
  }
  await runButton(page).click()
  await expect(page.getByTestId('victory')).toBeVisible({ timeout: 15_000 })
}

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' })
  await fetch(`${FS}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' })
})

let firstUid = ''

test('onboarding creates one anonymous account and a child-safe Firestore profile', async ({ page }) => {
  await freshStart(page, { onboarded: false })
  await page.goto('/')
  await onboard(page, { name: 'Kiki', birthday: '2016-02-02', gender: 'female' })
  await expect(page).toHaveURL(/\/play\/first-steps$/)
  await waitForAccount(page)
  await expect(page.getByTestId('account-card')).toHaveAttribute('data-kind', 'anonymous')
  // Under 13: no Google linking, a grown-up notice instead.
  await expect(page.getByTestId('link-blocked')).toBeVisible()

  const list = await accounts()
  expect(list).toHaveLength(1)
  const uid = list[0].localId
  const doc = await fsDoc(`users/${uid}`)
  expect(doc).not.toBeNull()
  expect(Object.keys(doc!)).not.toEqual(expect.arrayContaining(['displayName']))
  expect(doc!.ageGroup).toEqual({ stringValue: 'under13' })
  expect(doc!).not.toHaveProperty('gender')
  expect(doc!).not.toHaveProperty('dateOfBirth')

  // Refresh: the same session is restored, no second anonymous account.
  await page.reload()
  await expect(page.getByTestId('account-card')).toHaveAttribute('data-kind', 'anonymous', { timeout: 15_000 })
  expect(await accounts()).toHaveLength(1)
})

test('progress and badges are saved per UID; Google linking keeps the same UID', async ({ page }) => {
  await freshStart(page, { onboarded: false })
  await page.goto('/')
  await onboard(page, { name: 'Dana', birthday: '1990-05-05' })
  await waitForAccount(page)
  await winLevel1(page)
  await page.goto('/profile')
  await expect(page.getByTestId('sync-status')).toHaveText('Saved automatically', { timeout: 15_000 })

  const before = (await accounts()).find((a) => !a.email && !a.providerUserInfo?.length && a.localId)!
  const anon = (await accounts()).map((a) => a.localId)
  // The adult profile is allowed to keep a nickname in the cloud.
  let uid = ''
  for (const id of anon) {
    const d = await fsDoc(`users/${id}`)
    if (d?.displayName) uid = id
  }
  expect(uid).not.toBe('')
  expect(before).toBeTruthy()
  await expect.poll(() => fsList(`users/${uid}/progress`), { timeout: 15_000 }).toContain('first-steps')
  await expect.poll(() => fsList(`users/${uid}/achievements`), { timeout: 15_000 }).toEqual(expect.arrayContaining(['first-run', 'first-win']))

  const popup = googlePopup(page, 'dana@example.com')
  await page.getByTestId('link-google').click()
  await popup
  await expect(page.getByTestId('account-card')).toHaveAttribute('data-kind', 'google', { timeout: 15_000 })
  await expect(page.getByTestId('account-card')).toContainText('dana@example.com')

  const linked = (await accounts()).find((a) => a.email === 'dana@example.com')!
  expect(linked.localId).toBe(uid) // same UID: nothing was lost
  expect(linked.providerUserInfo?.map((p) => p.providerId)).toContain('google.com')
  firstUid = uid
})

test('linking a Google account that already has a save asks first, then combines without lowering anything', async ({ page }) => {
  await freshStart(page, { onboarded: false })
  await page.goto('/')
  await onboard(page, { name: 'Dana', birthday: '1990-05-05' })
  await waitForAccount(page)
  const popup = googlePopup(page, 'dana@example.com', true)
  await page.getByTestId('link-google').click()
  await popup
  const sheet = page.getByTestId('link-conflict')
  await expect(sheet).toBeVisible({ timeout: 15_000 })
  await expect(sheet).toContainText('already has PencilLoop progress')
  await sheet.getByTestId('conflict-combine').click()
  await expect(sheet).toBeHidden({ timeout: 15_000 })
  await expect(page.getByTestId('account-card')).toHaveAttribute('data-kind', 'google', { timeout: 15_000 })
  // The Google save's level 1 win is now on this device too.
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('pencilloop:progress:v1') || '{}'))
  expect(progress.levels?.['first-steps']?.completed).toBe(true)
  expect((await accounts()).find((a) => a.email === 'dana@example.com')!.localId).toBe(firstUid)
})

test('sign out returns to the welcome screen; signing in with Google restores the save', async ({ page }) => {
  await freshStart(page, { onboarded: false })
  await page.goto('/')
  const popup = googlePopup(page, 'dana@example.com', true)
  await page.getByTestId('welcome-google').click()
  await popup
  // Adult save with a cloud nickname: straight to the ready step.
  await expect(page.getByTestId('welcome-finish')).toBeVisible({ timeout: 15_000 })
  await page.getByTestId('welcome-finish').click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId('home-greeting')).toHaveText('Hi, Dana!')
  await page.goto('/profile')
  await expect(page.getByTestId('account-card')).toHaveAttribute('data-kind', 'google', { timeout: 15_000 })
  await page.getByTestId('sign-out').click()
  await page.getByTestId('confirm-sign-out').click()
  await expect(page).toHaveURL(/\/welcome$/)
  expect(await page.evaluate(() => localStorage.getItem('pencilloop:profile:v1'))).toBeNull()
})
