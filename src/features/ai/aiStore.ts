import { useSyncExternalStore } from 'react'
import { checkLocalModel, isLikelyMobile, type LocalAvailability } from './capabilities'
import { isAppCheckConfigured, isFirebaseConfigured } from './config'
import type { ActualSource } from './hybrid'
import { prepareLocalModel, warmModels } from './hybrid'
import { settingsStore } from '../progress/store'

/**
 * AI status machine (PRD §8). "Actual source" states are only entered after a
 * real SDK response arrives.
 */
export type AIStatus =
  | 'UNCONFIGURED'
  | 'CHECKING'
  | 'LOCAL_DOWNLOADING'
  | 'LOCAL_READY'
  | 'CLOUD_AVAILABLE'
  | 'OFFLINE_NO_AI'
  | 'SCANNING'
  | 'SUCCESS_ON_DEVICE'
  | 'SUCCESS_IN_CLOUD'
  | 'ERROR'

export interface AIState {
  status: AIStatus
  configured: boolean
  appCheckConfigured: boolean
  mobile: boolean
  online: boolean
  localImage: LocalAvailability | 'unknown'
  localText: LocalAvailability | 'unknown'
  downloadProgress: number | null
  lastSource: ActualSource | null
  lastLatencyMs: number | null
  lastError: string | null
  /** Background on-device preparation (initializeDeviceModel) lifecycle. */
  prep: 'idle' | 'preparing' | 'ready' | 'unsupported' | 'skipped' | 'error'
  prepReason: string | null
}

let state: AIState = {
  status: 'CHECKING',
  configured: isFirebaseConfigured(),
  appCheckConfigured: isAppCheckConfigured(),
  mobile: typeof navigator !== 'undefined' ? isLikelyMobile() : false,
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  localImage: 'unknown',
  localText: 'unknown',
  downloadProgress: null,
  lastSource: null,
  lastLatencyMs: null,
  lastError: null,
  prep: 'idle',
  prepReason: null,
}
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function set(patch: Partial<AIState>) {
  state = { ...state, ...patch }
  state = { ...state, status: patch.status ?? deriveIdleStatus(state) }
  emit()
}

function deriveIdleStatus(s: AIState): AIStatus {
  if (s.status === 'SCANNING') return 'SCANNING'
  if (s.downloadProgress !== null && s.downloadProgress < 1) return 'LOCAL_DOWNLOADING'
  const localReady = s.localImage === 'available' || s.localText === 'available'
  if (localReady) return 'LOCAL_READY'
  if (!s.configured) return 'UNCONFIGURED'
  if (!s.online) return 'OFFLINE_NO_AI'
  return 'CLOUD_AVAILABLE'
}

export const aiStore = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l)
    return () => listeners.delete(l)
  },
  async refresh() {
    const [img, txt] = await Promise.all([checkLocalModel(true), checkLocalModel(false)])
    set({ localImage: img, localText: txt, online: navigator.onLine, status: undefined })
  },
  markBusy() {
    set({ status: 'SCANNING', lastError: null })
  },
  markResult(source: ActualSource, latencyMs: number) {
    set({
      status: source === 'on_device' ? 'SUCCESS_ON_DEVICE' : source === 'in_cloud' ? 'SUCCESS_IN_CLOUD' : 'ERROR',
      lastSource: source,
      lastLatencyMs: latencyMs,
      lastError: source === 'unreported' ? 'The SDK did not report an inference source.' : null,
    })
  },
  markError(message: string) {
    set({ status: 'ERROR', lastError: message })
  },
  markIdle() {
    state = { ...state, status: 'CHECKING' }
    set({ status: undefined })
  },
  /** Manual "prepare" (diagnostics page). Must be invoked from a click/tap. */
  async prepareLocal(kind: 'scan' | 'hint') {
    set({ downloadProgress: 0, lastError: null, status: 'LOCAL_DOWNLOADING', prep: 'preparing' })
    try {
      await prepareLocalModel(kind, (p) => set({ downloadProgress: p, status: 'LOCAL_DOWNLOADING' }))
      set({ downloadProgress: null, status: 'CHECKING' })
      await aiStore.refresh()
      set({ prep: isLocalReady(state, kind) ? 'ready' : 'error', prepReason: isLocalReady(state, kind) ? null : 'not-ready-after-prepare' })
    } catch (e) {
      set({ downloadProgress: null, status: 'ERROR', prep: 'error', lastError: e instanceof Error ? e.message : String(e) })
    }
  },
}

/* ------------------- Automatic background preparation ------------------- */

let warmStarted = false
let prepStarted = false

function saveDataOn(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return Boolean(c?.saveData)
}

/** Why the device model can't be prepared automatically here (null = it can). */
function prepBlocker(): string | null {
  if (!state.configured) return 'unconfigured'
  if (state.mobile) return 'mobile'
  if (typeof globalThis.LanguageModel === 'undefined') return 'no-api'
  if (!settingsStore.get().autoPrepareAI) return 'turned-off'
  if (saveDataOn()) return 'data-saver'
  return null
}

/**
 * Preloads Firebase + the SDK model objects while the browser is idle, so the
 * gesture-time call below starts immediately. Makes no AI request.
 */
export function warmupAI() {
  if (warmStarted || prepBlocker()) return
  warmStarted = true
  const go = () => void warmModels().catch(() => {})
  const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback
  if (ric) ric(go, { timeout: 4000 })
  else setTimeout(go, 1500)
}

/**
 * Starts on-device model preparation WITHOUT blocking the UI. Call it
 * synchronously inside a click/key handler (Chrome needs user activation
 * to start a model download). Runs at most once per page load.
 */
export function prepareOnDeviceInBackground(): void {
  if (prepStarted) return
  const blocker = prepBlocker()
  if (blocker) {
    if (state.prep === 'idle') set({ prep: blocker === 'turned-off' || blocker === 'data-saver' ? 'skipped' : 'unsupported', prepReason: blocker })
    return
  }
  prepStarted = true
  set({ prep: 'preparing', prepReason: null, downloadProgress: null })
  const onProgress = (p: number) => set({ downloadProgress: p < 1 ? p : null })
  // Both calls start inside the same gesture. Chrome shares one model download.
  Promise.allSettled([prepareLocalModel('scan', onProgress), prepareLocalModel('hint', onProgress)])
    .then(async (r) => {
      set({ downloadProgress: null })
      await aiStore.refresh()
      const ready = state.localText === 'available' || state.localImage === 'available'
      const failed = r.find((x) => x.status === 'rejected') as PromiseRejectedResult | undefined
      set({
        prep: ready ? 'ready' : state.localText === 'unavailable' && state.localImage === 'unavailable' ? 'unsupported' : 'error',
        prepReason: ready ? null : failed ? String((failed.reason as Error)?.message ?? failed.reason).slice(0, 160) : 'not-ready',
      })
    })
    .catch(() => set({ prep: 'error' }))
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => set({ online: true, status: undefined }))
  window.addEventListener('offline', () => set({ online: false, status: undefined }))
  void aiStore.refresh().then(() => {
    if (state.localText === 'available' || state.localImage === 'available') set({ prep: 'ready' })
  })
}

export function useAI(): AIState {
  return useSyncExternalStore(aiStore.subscribe, aiStore.get, aiStore.get)
}

export function isLocalReady(s: AIState, kind: 'scan' | 'hint') {
  return (kind === 'scan' ? s.localImage : s.localText) === 'available'
}

export function isLocalPreparable(s: AIState, kind: 'scan' | 'hint') {
  const v = kind === 'scan' ? s.localImage : s.localText
  return v === 'downloadable' || v === 'downloading'
}
