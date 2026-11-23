import type { User } from 'firebase/auth'
import { resolveLang } from '../../i18n'
import { MISSIONS } from '../maze/missions'
import { mayStorePersonalDataInCloud, profileStore, type AgeGroup, type Gender } from '../profile/profile'
import { ACHIEVEMENT_IDS, achievementsStore, mergeAchievements, type AchievementId } from '../progress/achievements'
import {
  EMPTY_PROGRESS,
  levelProgressSchema,
  mergeProgress,
  progressStore,
  settingsStore,
  type LevelProgress,
  type Progress,
  type Settings,
} from '../progress/store'
import type { Services } from './firebaseClient'

/**
 * Firestore layout (validated by firestore.rules):
 *   users/{uid}                      profile-safe fields + preferences
 *   users/{uid}/progress/{levelId}   completed, stars, bestScore, bestMoves, attempts, completedAt
 *   users/{uid}/achievements/{id}    unlockedAt
 * Reads happen once per sign-in; writes are debounced diffs. Local stores
 * stay the source of truth on this device.
 */
export const SCHEMA_VERSION = 2
const LEVEL_IDS = new Set(MISSIONS.map((m) => m.id))

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error'

export interface CloudUser {
  accountType: 'anonymous' | 'google'
  ageGroup: AgeGroup
  language: 'id' | 'en'
  onboardingCompleted: boolean
  displayName?: string
  gender?: Gender
  preferences?: Partial<Pick<Settings, 'muted' | 'volume' | 'motion' | 'cloudPhotos' | 'cloudHints' | 'autoPrepareAI'>>
}

export interface CloudSnapshot {
  user: CloudUser | null
  progress: Progress
  achievements: Partial<Record<AchievementId, number>>
  /** A v1 `progress/{uid}` document existed and was merged in. */
  hadLegacy: boolean
}

const tsToMs = (v: unknown): number | null => {
  const t = v as { toMillis?: () => number } | null
  return t && typeof t.toMillis === 'function' ? t.toMillis() : null
}

export async function pullAll(s: Services, uid: string): Promise<CloudSnapshot> {
  const { F, db } = s
  const [u, prog, ach, legacy] = await Promise.all([
    F.getDoc(F.doc(db, 'users', uid)),
    F.getDocs(F.collection(db, 'users', uid, 'progress')),
    F.getDocs(F.collection(db, 'users', uid, 'achievements')),
    F.getDoc(F.doc(db, 'progress', uid)).catch(() => null),
  ])

  const levels: Progress['levels'] = {}
  prog.forEach((d) => {
    if (!LEVEL_IDS.has(d.id)) return
    const x = d.data()
    const parsed = levelProgressSchema.safeParse({
      completed: x.completed,
      bestStars: x.stars,
      attempts: x.attempts,
      bestScore: x.bestScore ?? 0,
      bestBlocks: x.bestMoves ?? null,
      completedAt: tsToMs(x.completedAt),
    })
    if (parsed.success) levels[d.id] = parsed.data
  })
  let progress: Progress = { levels, updatedAt: Date.now() }

  // One-time migration from the v1 single-document backup (progress/{uid}).
  if (legacy?.exists()) {
    const old = legacy.data().levels as Record<string, { completed: boolean; bestStars: number; attempts: number }> | undefined
    const migrated: Progress = { levels: {}, updatedAt: 0 }
    for (const [id, l] of Object.entries(old ?? {})) {
      const p = levelProgressSchema.safeParse(l)
      if (LEVEL_IDS.has(id) && p.success) migrated.levels[id] = p.data
    }
    progress = mergeProgress(progress, migrated)
  }

  const achievements: Partial<Record<AchievementId, number>> = {}
  ach.forEach((d) => {
    if (!(ACHIEVEMENT_IDS as readonly string[]).includes(d.id)) return
    const ms = tsToMs(d.data().unlockedAt)
    if (ms !== null) achievements[d.id as AchievementId] = ms
  })

  const user = u.exists() ? (u.data() as CloudUser) : null
  return { user, progress, achievements, hadLegacy: Boolean(legacy?.exists()) }
}

/* ------------------------------ Push (diffs) ----------------------------- */

interface Pusher {
  stop: () => void
  flush: () => Promise<void>
}

function userDoc(s: Services, accountType: 'anonymous' | 'google', isNew: boolean) {
  const p = profileStore.get()
  const st = settingsStore.get()
  const data: Record<string, unknown> = {
    schemaVersion: SCHEMA_VERSION,
    accountType,
    ageGroup: p?.ageGroup ?? 'under13',
    language: resolveLang(st),
    onboardingCompleted: Boolean(p),
    preferences: {
      muted: st.muted,
      volume: Math.round(st.volume * 100) / 100,
      motion: st.motion,
      cloudPhotos: st.cloudPhotos,
      cloudHints: st.cloudHints,
      autoPrepareAI: st.autoPrepareAI,
    },
    updatedAt: s.F.serverTimestamp(),
  }
  if (isNew) data.createdAt = s.F.serverTimestamp()
  if (p && mayStorePersonalDataInCloud(p.ageGroup)) {
    data.displayName = p.name
    data.gender = p.gender ?? s.F.deleteField()
  } else {
    // Children's personal fields are never stored in the cloud.
    data.displayName = s.F.deleteField()
    data.gender = s.F.deleteField()
  }
  // The "signature" ignores server timestamps so unchanged data is not rewritten.
  const sig = JSON.stringify({ ...data, updatedAt: 0, createdAt: 0, displayName: p && mayStorePersonalDataInCloud(p.ageGroup) ? p.name : null, gender: p?.gender ?? null })
  return { data, sig }
}

function levelDoc(s: Services, l: LevelProgress) {
  return {
    completed: l.completed,
    stars: l.bestStars,
    bestScore: l.bestScore,
    bestMoves: l.bestBlocks,
    attempts: l.attempts,
    completedAt: l.completedAt === null ? null : s.F.Timestamp.fromMillis(l.completedAt),
    updatedAt: s.F.serverTimestamp(),
  }
}

/**
 * Starts mirroring local stores to Firestore for this user. `known` holds what
 * the cloud already has, so only real changes are written.
 */
export function startPusher(
  s: Services,
  user: User,
  accountType: () => 'anonymous' | 'google',
  known: CloudSnapshot,
  onStatus: (st: SyncStatus) => void,
): Pusher {
  const { F, db } = s
  const uid = user.uid
  let userExists = known.user !== null
  let lastUserSig = ''
  const lastLevel = new Map<string, string>()
  for (const [id, l] of Object.entries(known.progress.levels)) lastLevel.set(id, JSON.stringify(l))
  const knownAch = new Set(Object.keys(known.achievements))
  let timer: ReturnType<typeof setTimeout> | null = null
  let running: Promise<void> | null = null
  let stopped = false

  const push = async () => {
    if (stopped) return
    const batch = F.writeBatch(db)
    let n = 0
    const u = userDoc(s, accountType(), !userExists)
    if (u.sig !== lastUserSig) {
      batch.set(F.doc(db, 'users', uid), u.data, { merge: true })
      n++
    }
    const levels = progressStore.get().levels
    const pendingLevels: [string, string][] = []
    for (const [id, l] of Object.entries(levels)) {
      if (!LEVEL_IDS.has(id)) continue
      const sig = JSON.stringify(l)
      if (lastLevel.get(id) === sig) continue
      batch.set(F.doc(db, 'users', uid, 'progress', id), levelDoc(s, l))
      pendingLevels.push([id, sig])
      n++
    }
    const ach = achievementsStore.get()
    const pendingAch: string[] = []
    for (const id of ACHIEVEMENT_IDS) {
      const at = ach[id]
      if (at === undefined || knownAch.has(id)) continue
      batch.set(F.doc(db, 'users', uid, 'achievements', id), { unlockedAt: F.Timestamp.fromMillis(at) })
      pendingAch.push(id)
      n++
    }
    if (!n) return
    onStatus(navigator.onLine ? 'saving' : 'offline')
    try {
      await batch.commit()
      userExists = true
      lastUserSig = u.sig
      pendingLevels.forEach(([id, sig]) => lastLevel.set(id, sig))
      pendingAch.forEach((id) => knownAch.add(id))
      onStatus('saved')
    } catch (e) {
      const code = (e as { code?: string }).code ?? ''
      onStatus(code.includes('unavailable') || !navigator.onLine ? 'offline' : 'error')
      if (import.meta.env.DEV) console.warn('[PencilLoop sync]', e)
    }
  }

  const run = () => {
    running = (running ?? Promise.resolve()).then(push).finally(() => {
      running = null
    })
    return running
  }

  const schedule = () => {
    if (stopped) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void run(), 1200)
  }

  const offs = [progressStore.subscribe(schedule), achievementsStore.subscribe(schedule), settingsStore.subscribe(schedule), profileStore.subscribe(schedule)]
  const onOnline = () => schedule()
  window.addEventListener('online', onOnline)
  void run()

  return {
    stop() {
      stopped = true
      if (timer) clearTimeout(timer)
      offs.forEach((o) => o())
      window.removeEventListener('online', onOnline)
    },
    async flush() {
      if (timer) clearTimeout(timer)
      await run()
    },
  }
}

/* --------------------------- Applying a snapshot ------------------------- */

/** Merge cloud data into local stores, keeping the best of both. */
export function mergeIntoLocal(snap: CloudSnapshot) {
  progressStore.set((p) => mergeProgress(p, snap.progress))
  achievementsStore.set((a) => mergeAchievements(a, snap.achievements))
}

/** Replace local data with the cloud copy (used when switching to an existing Google save). */
export function replaceLocal(snap: CloudSnapshot) {
  progressStore.set(Object.keys(snap.progress.levels).length ? snap.progress : EMPTY_PROGRESS)
  achievementsStore.set(snap.achievements)
  if (snap.user) applyCloudPreferences(snap.user)
}

export function applyCloudPreferences(u: CloudUser) {
  const prefs = u.preferences ?? {}
  settingsStore.set((st) => ({
    ...st,
    language: u.language === 'en' || u.language === 'id' ? u.language : st.language,
    muted: typeof prefs.muted === 'boolean' ? prefs.muted : st.muted,
    volume: typeof prefs.volume === 'number' ? Math.min(1, Math.max(0, prefs.volume)) : st.volume,
    motion: prefs.motion === 'system' || prefs.motion === 'reduced' || prefs.motion === 'full' ? prefs.motion : st.motion,
    cloudPhotos: typeof prefs.cloudPhotos === 'boolean' ? prefs.cloudPhotos : st.cloudPhotos,
    cloudHints: typeof prefs.cloudHints === 'boolean' ? prefs.cloudHints : st.cloudHints,
    autoPrepareAI: typeof prefs.autoPrepareAI === 'boolean' ? prefs.autoPrepareAI : st.autoPrepareAI,
  }))
}

/** Deletes everything this user owns in Firestore. */
export async function deleteCloudData(s: Services, uid: string) {
  const { F, db } = s
  const [prog, ach] = await Promise.all([
    F.getDocs(F.collection(db, 'users', uid, 'progress')),
    F.getDocs(F.collection(db, 'users', uid, 'achievements')),
  ])
  const batch = F.writeBatch(db)
  prog.forEach((d) => batch.delete(d.ref))
  ach.forEach((d) => batch.delete(d.ref))
  batch.delete(F.doc(db, 'users', uid))
  batch.delete(F.doc(db, 'progress', uid))
  await batch.commit()
}
