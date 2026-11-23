import { z } from 'zod'
import { MISSIONS } from '../maze/missions'
import { createStore, progressStore, useStore, type Progress } from './store'

/**
 * Achievements reward learning behaviours (trying, fixing, using loops), not
 * just winning. Ids are part of the Firestore schema and security rules.
 */
export const ACHIEVEMENT_IDS = [
  'first-run',
  'first-win',
  'three-stars',
  'bounce-back',
  'loop-master',
  'paper-planner',
  'clue-detective',
  'explorer',
  'star-collector',
] as const
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number]

export const achievementsStore = createStore<Partial<Record<AchievementId, number>>>(
  'pencilloop:achievements:v1',
  (raw) => {
    const r = z.partialRecord(z.enum(ACHIEVEMENT_IDS), z.number().int()).safeParse(raw)
    return r.success ? r.data : undefined
  },
  {},
)

export function useAchievements() {
  return useStore(achievementsStore)
}

type Listener = (ids: AchievementId[]) => void
const unlockListeners = new Set<Listener>()

/** Subscribe to newly unlocked achievements (used by the toast layer). */
export function onAchievementsUnlocked(l: Listener) {
  unlockListeners.add(l)
  return () => {
    unlockListeners.delete(l)
  }
}

export function unlockAchievements(ids: AchievementId[]): AchievementId[] {
  const have = achievementsStore.get()
  const fresh = [...new Set(ids)].filter((id) => !have[id])
  if (!fresh.length) return []
  const now = Date.now()
  achievementsStore.set((a) => ({ ...a, ...Object.fromEntries(fresh.map((id) => [id, now])) }))
  unlockListeners.forEach((l) => l(fresh))
  return fresh
}

export interface WinContext {
  stars: number
  usedRepeat: boolean
  /** A failed run happened on this level during this visit before the win. */
  hadFailure: boolean
  usedClue: boolean
  usedScan: boolean
}

/** Pure: which achievements a win earns, given progress AFTER the win was recorded. */
export function achievementsForWin(ctx: WinContext, progress: Progress): AchievementId[] {
  const ids: AchievementId[] = ['first-win']
  if (ctx.stars === 3) ids.push('three-stars')
  if (ctx.hadFailure) ids.push('bounce-back')
  if (ctx.usedRepeat) ids.push('loop-master')
  if (ctx.usedScan) ids.push('paper-planner')
  if (ctx.usedClue && ctx.hadFailure) ids.push('clue-detective')
  if (MISSIONS.every((m) => progress.levels[m.id]?.completed)) ids.push('explorer')
  if (MISSIONS.every((m) => (progress.levels[m.id]?.bestStars ?? 0) === 3)) ids.push('star-collector')
  return ids
}

export function evaluateWin(ctx: WinContext): AchievementId[] {
  return unlockAchievements(achievementsForWin(ctx, progressStore.get()))
}

export function mergeAchievements(
  a: Partial<Record<AchievementId, number>>,
  b: Partial<Record<AchievementId, number>>,
): Partial<Record<AchievementId, number>> {
  const out = { ...a }
  for (const id of ACHIEVEMENT_IDS) {
    const vb = b[id]
    if (vb === undefined) continue
    const va = out[id]
    out[id] = va === undefined ? vb : Math.min(va, vb)
  }
  return out
}
