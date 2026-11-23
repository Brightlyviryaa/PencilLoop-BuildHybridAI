import { useSyncExternalStore } from 'react'
import { z } from 'zod'

/* ------------------------------------------------------------------------ */
/* A tiny typed localStorage-backed store. Local storage is the source of    */
/* truth on this device; Firestore (see account/sync.ts) mirrors it per UID. */
/* ------------------------------------------------------------------------ */

export interface Store<T> {
  get: () => T
  set: (next: T | ((prev: T) => T)) => void
  subscribe: (l: () => void) => () => void
  reset: () => void
}

export function createStore<T>(key: string, parse: (raw: unknown) => T | undefined, fallback: T): Store<T> {
  let state: T = fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw) state = parse(JSON.parse(raw)) ?? fallback
  } catch {
    /* storage unavailable (private mode): keep defaults */
  }
  const listeners = new Set<() => void>()
  const write = () => {
    try {
      if (state === fallback) localStorage.removeItem(key)
      else localStorage.setItem(key, JSON.stringify(state))
    } catch {
      /* ignore quota / private mode */
    }
  }
  return {
    get: () => state,
    set(next) {
      state = typeof next === 'function' ? (next as (p: T) => T)(state) : next
      write()
      listeners.forEach((l) => l())
    },
    subscribe(l) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    reset() {
      state = fallback
      write()
      listeners.forEach((l) => l())
    },
  }
}

export function useStore<T>(s: Store<T>): T {
  return useSyncExternalStore(s.subscribe, s.get, s.get)
}

/* -------------------------------- Settings ------------------------------- */

export const LANGS = ['id', 'en'] as const
export type Lang = (typeof LANGS)[number]

export const settingsSchema = z.object({
  /** null = follow the browser language. */
  language: z.enum(LANGS).nullable(),
  muted: z.boolean(),
  /** 0..1, applied on top of a quiet master gain. */
  volume: z.number().min(0).max(1),
  motion: z.enum(['system', 'reduced', 'full']),
  /** Persistent permission to send scan photos to the cloud model. */
  cloudPhotos: z.boolean(),
  /** Persistent permission to send short, anonymous game-state text to the cloud for hints. */
  cloudHints: z.boolean(),
  /** Start preparing the on-device model after the first tap (Chrome desktop only). */
  autoPrepareAI: z.boolean(),
})
export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  language: null,
  muted: false,
  volume: 0.7,
  motion: 'system',
  cloudPhotos: false,
  cloudHints: false,
  autoPrepareAI: true,
}

export const settingsStore = createStore<Settings>(
  'pencilloop:settings:v1',
  (raw) => {
    const r = settingsSchema.partial().safeParse(raw)
    return r.success ? { ...DEFAULT_SETTINGS, ...r.data } : undefined
  },
  DEFAULT_SETTINGS,
)

export function updateSettings(patch: Partial<Settings>) {
  settingsStore.set((p) => ({ ...p, ...patch }))
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  return [useStore(settingsStore), updateSettings]
}

/* -------------------------------- Progress ------------------------------- */

export const levelProgressSchema = z.object({
  completed: z.boolean(),
  bestStars: z.number().int().min(0).max(3),
  attempts: z.number().int().min(0).max(100000),
  bestScore: z.number().int().min(0).max(100000).default(0),
  /** Fewest blocks used in a winning program. */
  bestBlocks: z.number().int().min(1).max(100).nullable().default(null),
  completedAt: z.number().int().nullable().default(null),
})
export const progressSchema = z.object({
  levels: z.record(z.string().max(40), levelProgressSchema),
  updatedAt: z.number().int(),
})
export type LevelProgress = z.infer<typeof levelProgressSchema>
export type Progress = z.infer<typeof progressSchema>

export const EMPTY_PROGRESS: Progress = { levels: {}, updatedAt: 0 }
const EMPTY_LEVEL: LevelProgress = { completed: false, bestStars: 0, attempts: 0, bestScore: 0, bestBlocks: null, completedAt: null }

export const progressStore = createStore<Progress>(
  'pencilloop:progress:v1',
  (raw) => {
    const r = progressSchema.safeParse(raw)
    return r.success ? r.data : undefined
  },
  EMPTY_PROGRESS,
)

export function useProgress(): Progress {
  return useStore(progressStore)
}

export function recordAttempt(levelId: string) {
  progressStore.set((p) => {
    const cur = p.levels[levelId] ?? EMPTY_LEVEL
    return { levels: { ...p.levels, [levelId]: { ...cur, attempts: Math.min(100000, cur.attempts + 1) } }, updatedAt: Date.now() }
  })
}

export interface WinRecord {
  stars: number
  score: number
  blocks: number
}

export interface WinOutcome {
  firstClear: boolean
  newBestStars: boolean
  newBestScore: boolean
  previousStars: number
}

export function recordWin(levelId: string, w: WinRecord): WinOutcome {
  const before = progressStore.get().levels[levelId] ?? EMPTY_LEVEL
  const outcome: WinOutcome = {
    firstClear: !before.completed,
    newBestStars: w.stars > before.bestStars,
    newBestScore: w.score > before.bestScore,
    previousStars: before.bestStars,
  }
  progressStore.set((p) => {
    const cur = p.levels[levelId] ?? EMPTY_LEVEL
    return {
      levels: {
        ...p.levels,
        [levelId]: {
          ...cur,
          completed: true,
          bestStars: Math.max(cur.bestStars, w.stars),
          bestScore: Math.max(cur.bestScore, w.score),
          bestBlocks: cur.bestBlocks === null ? w.blocks : Math.min(cur.bestBlocks, w.blocks),
          completedAt: cur.completedAt ?? Date.now(),
        },
      },
      updatedAt: Date.now(),
    }
  })
  return outcome
}

export function clearProgress() {
  progressStore.reset()
}

/** Merge two progress snapshots, keeping the best result per level. Never lowers anything. */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const levels: Progress['levels'] = { ...a.levels }
  for (const [id, lb] of Object.entries(b.levels)) {
    const la = levels[id]
    levels[id] = la
      ? {
          completed: la.completed || lb.completed,
          bestStars: Math.max(la.bestStars, lb.bestStars),
          attempts: Math.max(la.attempts, lb.attempts),
          bestScore: Math.max(la.bestScore, lb.bestScore),
          bestBlocks: la.bestBlocks === null ? lb.bestBlocks : lb.bestBlocks === null ? la.bestBlocks : Math.min(la.bestBlocks, lb.bestBlocks),
          completedAt:
            la.completedAt === null ? lb.completedAt : lb.completedAt === null ? la.completedAt : Math.min(la.completedAt, lb.completedAt),
        }
      : lb
  }
  return { levels, updatedAt: Math.max(a.updatedAt, b.updatedAt) }
}

export function isUnlocked(progress: Progress, missionIds: string[], id: string): boolean {
  const i = missionIds.indexOf(id)
  if (i <= 0) return true
  return Boolean(progress.levels[missionIds[i - 1]]?.completed)
}

/* --------------------------- Small UI memory ---------------------------- */

/** Which unlocks the player has already seen animated (purely cosmetic, device only). */
export const seenStore = createStore<{ unlocked: string[] }>(
  'pencilloop:seen:v1',
  (raw) => {
    const r = z.object({ unlocked: z.array(z.string().max(40)).max(50) }).safeParse(raw)
    return r.success ? r.data : undefined
  },
  { unlocked: [] },
)

export function markUnlockSeen(id: string) {
  if (seenStore.get().unlocked.includes(id)) return
  seenStore.set((s) => ({ unlocked: [...s.unlocked, id] }))
}

/** Removes every PencilLoop key from this device (used by sign-out and "delete my data"). */
export function clearLocalPlayerData() {
  progressStore.reset()
  seenStore.reset()
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('pencilloop:draft:'))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignore */
  }
}
