// Real end-to-end scan check against the local dev server (Firebase configured via .env.local).
// Usage (with `npm run dev` running and Firebase configured in .env.local):
//   node scripts/scan-check.mjs "$PWD" fixtures/scan/*.jpg
// Sends REAL requests; each one goes through the app's own "Allow once" cloud consent.
import { chromium } from '@playwright/test'
import path from 'node:path'

const [, , projectDir, ...files] = process.argv
const browser = await chromium.launch()
const results = []
for (const file of files) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.addInitScript(() => {
    if (sessionStorage.getItem('s')) return
    sessionStorage.setItem('s', '1')
    localStorage.setItem('pencilloop:settings:v1', JSON.stringify({ muted: true, motion: 'reduced', cloudPhotos: false, cloudHints: false, onboarded: true, cloudSync: false }))
  })
  const logs = []
  page.on('console', (m) => { if (/PencilLoop AI|error/i.test(m.text())) logs.push(m.text().slice(0, 600)) })
  await page.goto('http://localhost:5173/play/first-steps')
  await page.getByTestId('scan-button').click()
  await page.getByTestId('scan-file-input').setInputFiles(path.join(projectDir, file))
  await page.getByTestId('read-plan').click()
  // Consent is required first — nothing has been sent yet.
  await page.getByTestId('allow-cloud-once').waitFor({ timeout: 5000 })
  const t0 = Date.now()
  await page.getByTestId('allow-cloud-once').click()
  try {
    await page.locator('[data-testid="scan-sheet"] [data-testid="inference-source"], [data-testid="scan-sheet"] [role="alert"]').first().waitFor({ timeout: 60000 })
    const source = await page.getByTestId('inference-source').getAttribute('data-source').catch(() => null)
    const blocks = await page.locator('[data-testid="scan-sheet"] [data-testid="program-block"] > [role="button"]').evaluateAll((els) =>
      els.map((e) => e.getAttribute('aria-label')?.replace(/^Step ([\d.]+): /, '$1 ')),
    )
    const badge = await page.getByTestId('inference-source').innerText().catch(() => null)
    const reqs = await page.evaluate(() => performance.getEntriesByType('resource').filter((r) => /googleapis|recaptcha|gstatic/.test(r.name)).map((r) => `${Math.round(r.startTime)}+${Math.round(r.duration)}ms ${r.name.split('?')[0].slice(0, 110)}`))
    const alert = await page.locator('[data-testid="scan-sheet"] [role="alert"]').innerText().catch(() => null)
    const warnings = await page.locator('[data-testid="scan-sheet"] ul li').allInnerTexts().catch(() => [])
    results.push({ file, ms: Date.now() - t0, source, badge, blocks, warnings, alert: alert?.split('\n')[2] ?? null, logs })
  } catch (e) {
    results.push({ file, error: String(e).slice(0, 200) })
  }
  await page.close()
}
await browser.close()
console.log(JSON.stringify(results, null, 2))
