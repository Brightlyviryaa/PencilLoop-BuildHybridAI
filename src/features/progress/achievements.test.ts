import { describe, expect, it } from 'vitest'
import { MISSIONS } from '../maze/missions'
import { achievementsForWin, mergeAchievements } from './achievements'
import { mergeProgress, type Progress } from './store'

const lvl = (stars: number) => ({ completed: true, bestStars: stars, attempts: 1, bestScore: 100 * stars, bestBlocks: 3, completedAt: 1 })
const base = { stars: 1, usedRepeat: false, hadFailure: false, usedClue: false, usedScan: false }

describe('achievements', () => {
  it('rewards learning behaviour, not only winning', () => {
    const p: Progress = { levels: { 'first-steps': lvl(2) }, updatedAt: 1 }
    expect(achievementsForWin(base, p)).toEqual(['first-win'])
    expect(achievementsForWin({ ...base, stars: 3, hadFailure: true, usedClue: true, usedScan: true, usedRepeat: true }, p)).toEqual(
      expect.arrayContaining(['three-stars', 'bounce-back', 'clue-detective', 'paper-planner', 'loop-master']),
    )
    // A clue without an earlier failure is not "detective" work.
    expect(achievementsForWin({ ...base, usedClue: true }, p)).not.toContain('clue-detective')
  })

  it('explorer and star collector need every level', () => {
    const all: Progress = { levels: Object.fromEntries(MISSIONS.map((m) => [m.id, lvl(3)])), updatedAt: 1 }
    expect(achievementsForWin(base, all)).toEqual(expect.arrayContaining(['explorer', 'star-collector']))
    const almost: Progress = { levels: { ...all.levels, [MISSIONS[5].id]: lvl(2) }, updatedAt: 1 }
    expect(achievementsForWin(base, almost)).toContain('explorer')
    expect(achievementsForWin(base, almost)).not.toContain('star-collector')
  })

  it('merging keeps the earliest unlock and the best results', () => {
    expect(mergeAchievements({ 'first-win': 5 }, { 'first-win': 3, explorer: 9 })).toEqual({ 'first-win': 3, explorer: 9 })
    const a: Progress = { levels: { 'first-steps': { ...lvl(2), bestBlocks: 5, attempts: 4 } }, updatedAt: 1 }
    const b: Progress = { levels: { 'first-steps': { ...lvl(3), bestBlocks: 3, attempts: 2, bestScore: 50 } }, updatedAt: 2 }
    expect(mergeProgress(a, b).levels['first-steps']).toMatchObject({ bestStars: 3, bestBlocks: 3, attempts: 4, bestScore: 200 })
  })
})
