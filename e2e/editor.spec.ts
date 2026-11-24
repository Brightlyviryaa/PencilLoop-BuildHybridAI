import { expect, test, type Locator, type Page } from '@playwright/test'
import { freshStart, isMobile, openPlan, runButton } from './helpers.ts'

/** Level 3 unlocked, with the plan from the v0.5 brief: Move, Turn right, Move, Turn left, and an empty Repeat. */
async function setup(page: Page) {
  await freshStart(page, {
    progress: {
      levels: { 'first-steps': { completed: true, bestStars: 3, attempts: 1 }, 'around-the-blocks': { completed: true, bestStars: 3, attempts: 1 } },
      updatedAt: 1,
    },
  })
  await page.addInitScript(() => {
    if (sessionStorage.getItem('__draft')) return
    sessionStorage.setItem('__draft', '1')
    localStorage.setItem(
      'pencilloop:draft:smart-loop',
      JSON.stringify([
        { type: 'move', steps: 1 },
        { type: 'turn', direction: 'right' },
        { type: 'move', steps: 1 },
        { type: 'turn', direction: 'left' },
        { type: 'repeat', times: 2, commands: [] },
      ]),
    )
  })
  await page.goto('/play/smart-loop')
  await openPlan(page)
  await expect(blocks(page)).toHaveCount(5)
}

const blocks = (page: Page) => page.locator('[data-testid="program-block"]:visible')

/** "type:depth" for every block, in order, e.g. "move:0,repeat:0,turn:1". */
async function shape(page: Page) {
  return (await blocks(page).evaluateAll((els) => els.map((e) => `${(e as HTMLElement).dataset.blockType}:${(e as HTMLElement).dataset.depth}`))).join(',')
}

/** Tap a block on its empty right edge (the middle holds the steppers and the swap button). */
async function select(block: Locator) {
  const surface = block.getByTestId('block-surface').first()
  const b = (await surface.boundingBox())!
  await surface.click({ position: { x: b.width - 10, y: Math.min(24, b.height / 2) } })
}

const draft = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('pencilloop:draft:smart-loop') || '[]'))

async function mouseDrag(page: Page, from: Locator, to: { x: number; y: number }) {
  const b = (await from.boundingBox())!
  await page.mouse.move(b.x + b.width - 30, b.y + b.height / 2)
  await page.mouse.down()
  const steps = 14
  for (let i = 1; i <= steps; i++) await page.mouse.move(b.x + b.width - 30 + ((to.x - b.x - b.width + 30) * i) / steps, b.y + b.height / 2 + ((to.y - b.y - b.height / 2) * i) / steps)
  await page.waitForTimeout(80)
  await page.mouse.up()
}

/** A real touch drag: hold to pick up (long press), then move and release. */
async function touchDrag(page: Page, from: Locator, to: { x: number; y: number }) {
  const cdp = await page.context().newCDPSession(page)
  const b = (await from.boundingBox())!
  const start = { x: b.x + b.width - 30, y: b.y + b.height / 2 }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
  await page.waitForTimeout(400)
  const steps = 14
  for (let i = 1; i <= steps; i++)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + ((to.x - start.x) * i) / steps, y: start.y + ((to.y - start.y) * i) / steps }] })
  await page.waitForTimeout(80)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

async function dragTo(page: Page, from: Locator, to: { x: number; y: number }) {
  if (isMobile(page)) await touchDrag(page, from, to)
  else await mouseDrag(page, from, to)
  // Let the move animation settle before measuring the next target.
  await page.waitForTimeout(450)
}

test.describe('v0.5 plan editor: restructure existing blocks', () => {
  test('drag existing blocks into a loop, out again, undo and redo', async ({ page }) => {
    await setup(page)
    const empty = page.getByText('Drag blocks in here')
    await empty.scrollIntoViewIfNeeded()
    let zone = (await empty.boundingBox())!
    await dragTo(page, blocks(page).nth(0).getByTestId('block-surface'), { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 })
    await expect.poll(() => shape(page)).toBe('turn:0,move:0,turn:0,repeat:0,move:1')

    // Second existing block (Turn right) below the Move inside the loop.
    const inner = page.locator('[data-testid="program-block"][data-depth="1"]:visible').first()
    await inner.scrollIntoViewIfNeeded()
    zone = (await inner.boundingBox())!
    await dragTo(page, blocks(page).nth(0).getByTestId('block-surface'), { x: zone.x + zone.width / 2, y: zone.y + zone.height * 0.85 })
    await expect.poll(() => shape(page)).toBe('move:0,turn:0,repeat:0,move:1,turn:1')
    expect(await draft(page)).toEqual([
      { type: 'move', steps: 1 },
      { type: 'turn', direction: 'left' },
      { type: 'repeat', times: 2, commands: [{ type: 'move', steps: 1 }, { type: 'turn', direction: 'right' }] },
    ])

    // Drag a block back out, above the first block.
    const first = (await blocks(page).nth(0).boundingBox())!
    await dragTo(page, page.locator('[data-testid="program-block"][data-depth="1"]:visible').last().getByTestId('block-surface'), { x: first.x + first.width / 2, y: first.y + 6 })
    await expect.poll(() => shape(page)).toBe('turn:0,move:0,turn:0,repeat:0,move:1')

    await page.getByTestId('undo').click()
    await expect.poll(() => shape(page)).toBe('move:0,turn:0,repeat:0,move:1,turn:1')
    await page.getByTestId('redo').click()
    await expect.poll(() => shape(page)).toBe('turn:0,move:0,turn:0,repeat:0,move:1')
  })

  test('tap-to-move alternative: put in loop, take out, keep blocks when removing a loop', async ({ page }) => {
    await setup(page)
    await select(blocks(page).nth(0))
    await page.getByTestId('action-into').click()
    await expect.poll(() => shape(page)).toBe('turn:0,move:0,turn:0,repeat:0,move:1')
    await select(page.locator('[data-testid="program-block"][data-depth="1"]:visible').first())
    await page.getByTestId('action-out').click()
    await expect.poll(() => shape(page)).toBe('turn:0,move:0,turn:0,repeat:0,move:0')
    // Move it back in, then delete the loop but keep what was inside.
    await select(blocks(page).nth(4))
    await page.getByTestId('action-up').click()
    await expect.poll(() => shape(page)).toBe('turn:0,move:0,turn:0,move:0,repeat:0')
    // The choices stay open after Up, so the same block can go straight into the loop.
    await page.getByTestId('action-into').click()
    await select(page.locator('[data-testid="program-block"][data-block-type="repeat"]:visible').first())
    await page.getByTestId('action-delete').click()
    await page.getByTestId('action-unwrap').click()
    await expect.poll(() => shape(page)).toBe('turn:0,move:0,turn:0,move:0')
  })

  test('a cancelled drag changes nothing; the restructured plan still runs and wins', async ({ page }) => {
    await setup(page)
    const before = await shape(page)
    if (!isMobile(page)) {
      const b = (await blocks(page).nth(0).boundingBox())!
      await page.mouse.move(b.x + b.width - 30, b.y + 20)
      await page.mouse.down()
      await page.mouse.move(b.x + b.width - 30, b.y + 140, { steps: 8 })
      await page.keyboard.press('Escape')
      await page.mouse.up()
      expect(await shape(page)).toBe(before)
    }
    // Build the stairs solution by restructuring: Repeat 4x [Move 1, Turn left, Move 1, Turn right].
    for (let i = 0; i < 4; i++) {
      await select(blocks(page).nth(0))
      await page.getByTestId('action-into').click()
    }
    await expect.poll(() => shape(page)).toBe('repeat:0,move:1,turn:1,move:1,turn:1')
    // Order inside: Move, Right, Move, Left -> swap the turns to Left/Right.
    const turns = page.locator('[data-testid="program-block"][data-block-type="turn"]:visible')
    await turns.nth(0).getByRole('button', { name: /Tap to switch direction/ }).click()
    await turns.nth(1).getByRole('button', { name: /Tap to switch direction/ }).click()
    const times = page.locator('[data-testid="program-block"][data-block-type="repeat"]:visible').first().getByRole('button', { name: 'More times' }).first()
    for (let i = 0; i < 3; i++) await times.click()
    await runButton(page).click()
    await expect(page.getByTestId('victory')).toBeVisible({ timeout: 20_000 })
  })

  test('phone: scanning from the plan editor opens on top of it', async ({ page }) => {
    test.skip(!isMobile(page), 'phone layout only')
    await setup(page)
    await page.getByTestId('scan-button-mobile').click()
    const sheet = page.getByTestId('scan-sheet')
    await expect(sheet).toBeVisible()
    // The sheet is on top: its buttons can be clicked while the editor stays open underneath.
    await expect(sheet.getByTestId('open-camera')).toBeVisible()
    const onTop = await sheet.getByTestId('open-camera').evaluate((el) => {
      const r = el.getBoundingClientRect()
      return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('[data-testid="scan-sheet"]') !== null
    })
    expect(onTop).toBe(true)
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()
    await expect(page.getByTestId('plan-screen')).toBeVisible()
  })
})
