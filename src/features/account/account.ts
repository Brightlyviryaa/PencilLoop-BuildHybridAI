import { useSyncExternalStore } from 'react'
import type { AuthCredential, AuthProvider, User } from 'firebase/auth'
import { isFirebaseConfigured } from '../ai/config'
import { cloudAllowed, consentStore, guardianStatus } from '../consent/consent'
import { claimGuardianConsent } from '../consent/api'
import { profileStore } from '../profile/profile'
import { achievementsStore } from '../progress/achievements'
import { clearLocalPlayerData, progressStore, settingsStore } from '../progress/store'
import { getServices, type Services } from './firebaseClient'
import { deleteCloudData, mergeIntoLocal, pullAll, replaceLocal, startPusher, type CloudSnapshot, type SyncStatus } from './sync'

/**
 * Anonymous-first accounts:
 *  1. A returning player's Firebase session is restored from IndexedDB.
 *  2. A new player gets an anonymous account only when onboarding finishes.
 *  3. "Save progress with Google" LINKS Google to the same UID (linkWithPopup),
 *     so progress, stars, achievements and settings stay put.
 *  4. If that Google account already has a PencilLoop save, nothing is
 *     overwritten: the player chooses what to do (see resolveLinkConflict).
 */

export type AccountErrorCode =
  | 'cancelled'
  | 'network'
  | 'not-enabled'
  | 'unauthorized-domain'
  | 'no-user'
  | 'requires-recent-login'
  | 'guardian'
  | 'unknown'

export interface AccountState {
  /** 'guardian' = local-only until a parent or guardian's consent is verified. */
  phase: 'unconfigured' | 'loading' | 'signed-out' | 'ready' | 'guardian'
  uid: string | null
  kind: 'anonymous' | 'google' | null
  email: string | null
  sync: SyncStatus
  lastSavedAt: number | null
  error: AccountErrorCode | null
}

let state: AccountState = {
  phase: isFirebaseConfigured() ? 'loading' : 'unconfigured',
  uid: null,
  kind: null,
  email: null,
  sync: 'idle',
  lastSavedAt: null,
  error: null,
}
const listeners = new Set<() => void>()
function set(patch: Partial<AccountState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export const accountStore = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
}

export function useAccount(): AccountState {
  return useSyncExternalStore(accountStore.subscribe, accountStore.get, accountStore.get)
}

const kindOf = (u: User): 'anonymous' | 'google' =>
  u.isAnonymous || !u.providerData.some((p) => p.providerId === 'google.com') ? 'anonymous' : 'google'

function describe(u: User) {
  set({ phase: 'ready', uid: u.uid, kind: kindOf(u), email: u.isAnonymous ? null : u.email })
}

function errorCode(e: unknown): AccountErrorCode {
  const code = (e as { code?: string })?.code ?? ''
  if (/popup-closed-by-user|cancelled-popup-request|user-cancelled/.test(code)) return 'cancelled'
  if (/network-request-failed|unavailable/.test(code) || (typeof navigator !== 'undefined' && !navigator.onLine)) return 'network'
  if (/operation-not-allowed|admin-restricted-operation/.test(code)) return 'not-enabled'
  if (/unauthorized-domain/.test(code)) return 'unauthorized-domain'
  if (/requires-recent-login/.test(code)) return 'requires-recent-login'
  if (import.meta.env.DEV) console.warn('[PencilLoop account]', e)
  return 'unknown'
}

/* --------------------------------- Sync --------------------------------- */

let pusher: ReturnType<typeof startPusher> | null = null
let lastSnap: CloudSnapshot | null = null
let attachedUid: string | null = null

function stopPusher() {
  pusher?.stop()
  pusher = null
}

function ensurePusher(s: Services) {
  const u = s.auth.currentUser
  // Nothing is written before onboarding is complete, or for a child without verified guardian consent.
  if (!cloudAllowed()) return
  if (!u || pusher || !lastSnap || attachedUid !== u.uid || !profileStore.get()) return
  pusher = startPusher(
    s,
    u,
    () => (s.auth.currentUser ? kindOf(s.auth.currentUser) : 'anonymous'),
    lastSnap,
    (sync) => set({ sync, ...(sync === 'saved' ? { lastSavedAt: Date.now() } : {}) }),
  )
  if (lastSnap.hadLegacy) {
    const uid = u.uid
    void pusher.flush().then(() => s.F.deleteDoc(s.F.doc(s.db, 'progress', uid)).catch(() => {}))
  }
}

async function attach(s: Services, u: User, mode: 'merge' | 'replace'): Promise<CloudSnapshot | null> {
  stopPusher()
  describe(u)
  attachedUid = u.uid
  try {
    const snap = await pullAll(s, u.uid)
    if (attachedUid !== u.uid) return null
    lastSnap = snap
    if (mode === 'replace') replaceLocal(snap)
    else mergeIntoLocal(snap)
    ensurePusher(s)
    return snap
  } catch (e) {
    // Offline: keep playing locally and try again when the network is back.
    lastSnap = null
    set({ sync: errorCode(e) === 'network' ? 'offline' : 'error' })
    let done = false
    const retry = () => {
      if (done) return
      done = true
      clearTimeout(timer)
      window.removeEventListener('online', retry)
      if (s.auth.currentUser?.uid === u.uid) void attach(s, u, 'merge')
    }
    const timer = setTimeout(retry, 15_000)
    window.addEventListener('online', retry)
    return null
  }
}

/* --------------------------------- Flows -------------------------------- */

let initStarted = false

/** Restore an existing session. Never creates an account by itself unless onboarding already finished. */
export async function initAccount(): Promise<void> {
  if (initStarted) return
  initStarted = true
  if (!isFirebaseConfigured()) return set({ phase: 'unconfigured' })
  try {
    const s = await getServices()
    if (!s) return set({ phase: 'unconfigured' })
    await s.auth.authStateReady()
    try {
      // Completes a linkWithRedirect() started on a browser that blocked popups.
      const r = await s.A.getRedirectResult(s.auth)
      if (import.meta.env.DEV && r) console.info('[PencilLoop account] redirect result', r.operationType, r.user.uid)
      if (r?.user) describe(r.user)
    } catch (e) {
      if (!handleCredentialError(s, e)) set({ error: errorCode(e) })
    }
    s.A.onAuthStateChanged(s.auth, (u) => {
      if (!u) {
        stopPusher()
        attachedUid = null
        set({ phase: cloudAllowed() ? 'signed-out' : 'guardian', uid: null, kind: null, email: null, sync: 'idle' })
      } else if (cloudAllowed()) describe(u)
      else set({ phase: 'guardian', uid: u.uid, kind: kindOf(u) })
    })
    profileStore.subscribe(() => ensurePusher(s))
    consentStore.subscribe(() => {
      if (cloudAllowed() && profileStore.get()) void ensurePlayerAccount()
    })
    const u = s.auth.currentUser
    if (!cloudAllowed()) {
      // A child's existing cloud save is left untouched (and can be deleted from Profile),
      // but nothing is read or written until a guardian's consent is verified.
      set({ phase: 'guardian', uid: u?.uid ?? null, kind: u ? kindOf(u) : null })
      return
    }
    if (u) await attach(s, u, 'merge')
    else {
      set({ phase: 'signed-out' })
      if (profileStore.get()) void ensurePlayerAccount()
    }
  } catch (e) {
    set({ phase: 'signed-out', error: errorCode(e) })
  }
}

let retryCount = 0
let retryTimer: ReturnType<typeof setTimeout> | null = null
/** Flaky network: retry with backoff (5s, 15s, 45s, then every 2 min) and as soon as we are back online. */
function scheduleAccountRetry() {
  if (retryTimer) return
  const delay = [5_000, 15_000, 45_000][retryCount] ?? 120_000
  retryCount++
  const run = () => {
    if (retryTimer) clearTimeout(retryTimer)
    retryTimer = null
    window.removeEventListener('online', run)
    void ensurePlayerAccount()
  }
  retryTimer = setTimeout(run, delay)
  window.addEventListener('online', run)
}

/** Called when onboarding completes: create the anonymous account (once). */
export async function ensurePlayerAccount(): Promise<void> {
  if (!cloudAllowed()) {
    if (state.phase !== 'unconfigured') set({ phase: 'guardian' })
    return
  }
  const s = await getServices().catch(() => null)
  if (!s) return
  if (s.auth.currentUser) {
    ensurePusher(s)
    return
  }
  try {
    set({ phase: 'loading', error: null })
    const cred = await s.A.signInAnonymously(s.auth)
    retryCount = 0
    // A child's cloud data is accepted by the rules only once the consent is bound to this UID.
    if (guardianStatus() === 'verified') await claimGuardianConsent()
    await attach(s, cred.user, 'merge')
  } catch (e) {
    const code = errorCode(e)
    set({ phase: 'signed-out', error: code })
    if (code === 'network') scheduleAccountRetry()
  }
}

function googleProvider(s: Services): AuthProvider {
  const p = new s.A.GoogleAuthProvider()
  p.setCustomParameters({ prompt: 'select_account' })
  return p
}

let pendingCredential: AuthCredential | null = null
let pendingEmail: string | null = null

export type LinkResult =
  | { status: 'linked'; email: string | null }
  | { status: 'redirecting' }
  | { status: 'conflict'; email: string | null }
  | { status: 'error'; code: AccountErrorCode }

function handleCredentialError(s: Services, e: unknown): LinkResult | null {
  const code = (e as { code?: string })?.code ?? ''
  if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
    pendingCredential = s.A.GoogleAuthProvider.credentialFromError(e as Parameters<typeof s.A.GoogleAuthProvider.credentialFromError>[0])
    pendingEmail = (e as { customData?: { email?: string } }).customData?.email ?? null
    conflictListeners.forEach((l) => l(pendingEmail))
    return { status: 'conflict', email: pendingEmail }
  }
  return null
}

const conflictListeners = new Set<(email: string | null) => void>()
/** A conflict can also surface after a redirect, so the UI subscribes to it. */
export function onLinkConflict(l: (email: string | null) => void) {
  conflictListeners.add(l)
  return () => {
    conflictListeners.delete(l)
  }
}
export function hasPendingConflict() {
  return pendingCredential !== null
}

/** "Save your progress with Google": links Google to the current UID. */
export async function linkGoogle(): Promise<LinkResult> {
  // Linking stores an email in Firebase Auth: never for a child without verified guardian consent.
  if (!cloudAllowed()) return { status: 'error', code: 'guardian' }
  const s = await getServices().catch(() => null)
  const u = s?.auth.currentUser
  if (!s || !u) return { status: 'error', code: 'no-user' }
  const provider = googleProvider(s)
  try {
    const r = await s.A.linkWithPopup(u, provider)
    await r.user.reload()
    describe(s.auth.currentUser ?? r.user)
    await pusher?.flush()
    return { status: 'linked', email: r.user.email }
  } catch (e) {
    const conflict = handleCredentialError(s, e)
    if (conflict) return conflict
    const code = (e as { code?: string })?.code ?? ''
    if (code === 'auth/provider-already-linked') {
      describe(u)
      return { status: 'linked', email: u.email }
    }
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await pusher?.flush().catch(() => {})
      await s.A.linkWithRedirect(u, provider)
      return { status: 'redirecting' }
    }
    return { status: 'error', code: errorCode(e) }
  }
}

export type ConflictChoice = 'switch' | 'combine' | 'stay'

/**
 * The Google account already belongs to another PencilLoop save.
 *  - 'stay'    keep playing as the guest; nothing changes.
 *  - 'switch'  open the Google save as it is (guest progress kept as a local backup).
 *  - 'combine' open the Google save and add this device's best results to it (never lowers anything).
 */
export async function resolveLinkConflict(choice: ConflictChoice): Promise<{ ok: boolean; code?: AccountErrorCode }> {
  const cred = pendingCredential
  if (choice === 'stay' || !cred) {
    pendingCredential = null
    pendingEmail = null
    return { ok: true }
  }
  const s = await getServices().catch(() => null)
  if (!s) return { ok: false, code: 'unknown' }
  const guest = s.auth.currentUser
  try {
    localStorage.setItem(
      'pencilloop:guest-backup:v1',
      JSON.stringify({ at: Date.now(), progress: progressStore.get(), achievements: achievementsStore.get() }),
    )
  } catch {
    /* ignore */
  }
  stopPusher()
  // The guest account becomes unreachable after switching, so remove its cloud
  // copy first (while still signed in as the guest). Its data stays on this
  // device and in the local backup above. The empty anonymous Auth record is
  // left behind on purpose: User.delete() would also sign out the new user.
  if (guest?.isAnonymous) await deleteCloudData(s, guest.uid).catch(() => {})
  try {
    const r = await s.A.signInWithCredential(s.auth, cred)
    pendingCredential = null
    pendingEmail = null
    await attach(s, r.user, choice === 'switch' ? 'replace' : 'merge')
    return { ok: true }
  } catch (e) {
    if (s.auth.currentUser) await attach(s, s.auth.currentUser, 'merge')
    return { ok: false, code: errorCode(e) }
  }
}

/** Sign in to an existing Google save (welcome screen, or after signing out). */
export async function signInWithGoogle(): Promise<{ ok: true; snap: CloudSnapshot | null } | { ok: false; code: AccountErrorCode }> {
  const s = await getServices().catch(() => null)
  if (!s) return { ok: false, code: 'unknown' }
  try {
    const r = await s.A.signInWithPopup(s.auth, googleProvider(s))
    const snap = await attach(s, r.user, 'replace')
    return { ok: true, snap }
  } catch (e) {
    return { ok: false, code: errorCode(e) }
  }
}

/** Only offered to Google-linked players (a guest would lose everything). */
export async function signOutPlayer(): Promise<void> {
  const s = await getServices().catch(() => null)
  await pusher?.flush().catch(() => {})
  stopPusher()
  if (s) await s.A.signOut(s.auth).catch(() => {})
  wipeLocal()
}

/**
 * Forget the player on this device. Cloud consents are personal, so they are
 * reset too: the next player on this device must give their own permission.
 * Language, sound and motion are device preferences and are kept.
 */
export function wipeLocal() {
  clearLocalPlayerData()
  achievementsStore.reset()
  profileStore.reset()
  settingsStore.set((st) => ({ ...st, cloudPhotos: false, cloudHints: false }))
  try {
    localStorage.removeItem('pencilloop:guest-backup:v1')
  } catch {
    /* ignore */
  }
  lastSnap = null
  attachedUid = null
}

/** "Delete my data": cloud documents, the Firebase account, and everything on this device. */
export async function deleteEverything(): Promise<{ ok: boolean; code?: AccountErrorCode }> {
  const s = isFirebaseConfigured() ? await getServices().catch(() => null) : null
  const u = s?.auth.currentUser
  stopPusher()
  if (s && u) {
    try {
      await deleteCloudData(s, u.uid)
    } catch (e) {
      ensurePusher(s)
      return { ok: false, code: errorCode(e) }
    }
    try {
      await s.A.deleteUser(u)
    } catch (e) {
      if (errorCode(e) === 'requires-recent-login' && kindOf(u) === 'google') {
        try {
          await s.A.reauthenticateWithPopup(u, googleProvider(s))
          await s.A.deleteUser(u)
        } catch (e2) {
          return { ok: false, code: errorCode(e2) }
        }
      } else {
        await s.A.signOut(s.auth).catch(() => {})
      }
    }
  }
  wipeLocal()
  set({ phase: isFirebaseConfigured() ? 'signed-out' : 'unconfigured', uid: null, kind: null, email: null, sync: 'idle' })
  return { ok: true }
}
