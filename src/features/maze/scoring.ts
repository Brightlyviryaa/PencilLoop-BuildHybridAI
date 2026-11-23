import type { Command, Mission } from './types'
import { countNodes } from './validate'

/** 1 to 3 stars. Reaching the goal always earns at least one star. */
export function starsFor(mission: Mission, commands: readonly Command[]): 1 | 2 | 3 {
  const n = countNodes(commands)
  if (n <= mission.par) return 3
  if (n <= mission.par + 2) return 2
  return 1
}

/**
 * Points shown after a win: 100 per star, a bonus for tidy programs and a
 * small bonus for solving it on the first run of this visit.
 */
export function scoreFor(mission: Mission, commands: readonly Command[], firstTry: boolean): number {
  const stars = starsFor(mission, commands)
  const blocks = countNodes(commands)
  const tidy = Math.max(0, mission.par + 3 - blocks) * 10
  return stars * 100 + tidy + (firstTry ? 50 : 0)
}

export function usesRepeat(commands: readonly Command[]): boolean {
  return commands.some((c) => c.type === 'repeat')
}
