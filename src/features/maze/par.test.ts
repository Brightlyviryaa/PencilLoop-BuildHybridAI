import { describe, expect, it } from 'vitest'
import { runProgram, toProgram } from './interpreter'
import { MISSIONS } from './missions'
import { starsFor } from './scoring'
import type { Command } from './types'
import { countNodes } from './validate'

const LEAVES: Command[] = [
  ...[1, 2, 3, 4, 5].map((steps) => ({ type: 'move', steps }) as Command),
  { type: 'turn', direction: 'left' },
  { type: 'turn', direction: 'right' },
]

/** Every program with exactly `n` nodes (repeat depth <= 2, repeats only when allowed). */
function* programs(n: number, allowRepeat: boolean, depth = 0): Generator<Command[]> {
  if (n === 0) {
    yield []
    return
  }
  for (const first of blocks(n, allowRepeat, depth)) {
    const used = countNodes([first])
    for (const rest of programs(n - used, allowRepeat, depth)) yield [first, ...rest]
  }
}
function* blocks(max: number, allowRepeat: boolean, depth: number): Generator<Command> {
  yield* LEAVES
  if (!allowRepeat || depth >= 2 || max < 2) return
  for (let inner = 1; inner <= max - 1; inner++)
    for (const body of programs(inner, allowRepeat, depth + 1)) for (const times of [2, 3, 4, 5]) yield { type: 'repeat', times, commands: body }
}

describe('three stars are always reachable', () => {
  for (const m of MISSIONS) {
    it(`${m.id}: some program with ${m.par} blocks or fewer reaches the flag`, () => {
      let found: Command[] | null = null
      for (let n = 1; n <= m.par && !found; n++) {
        for (const p of programs(n, m.allowRepeat)) {
          if (runProgram(m, toProgram(p)).outcome === 'SUCCESS') {
            found = p
            break
          }
        }
      }
      expect(found, `par ${m.par} is not reachable`).not.toBeNull()
      expect(starsFor(m, found!)).toBe(3)
    })
  }
})
