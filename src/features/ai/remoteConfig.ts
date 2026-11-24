import type { FirebaseApp } from 'firebase/app'
import { CLOUD_MODEL } from './config'

/**
 * Cloud-side AI settings served by Firebase Remote Config, so the cloud model
 * and its sampling can be changed (or the cloud fallback paused) without a
 * redeploy. Pattern from Firebase's "Remote Config for AI Logic" guide.
 *
 * Privacy: Remote Config is only fetched right before a request that is
 * allowed to go to the cloud (cloud consent given). Players in local-only
 * mode never contact it; they use the built-in defaults below.
 */
export interface CloudAIConfig {
  /** Kill switch: false turns every request into ONLY_ON_DEVICE. */
  enabled: boolean
  model: string
  hintTemperature: number
  scanTemperature: number
}

export type RemoteConfigStatus = 'not-fetched' | 'remote' | 'defaults' | 'error' | 'unsupported'

/** Parameter names, mirrored in remoteconfig.template.json. */
export const RC_KEYS = {
  enabled: 'ai_cloud_enabled',
  model: 'ai_cloud_model',
  hintTemperature: 'ai_hint_temperature',
  scanTemperature: 'ai_scan_temperature',
} as const

export const RC_DEFAULTS: CloudAIConfig = {
  enabled: true,
  model: CLOUD_MODEL,
  hintTemperature: 0.6,
  scanTemperature: 0.1,
}

const MODEL_NAME = /^gemini-[a-z0-9][a-z0-9.-]{1,60}$/

function clamp(raw: string | undefined, lo: number, hi: number, fallback: number) {
  // Number('') is 0, so blank values must be caught before converting.
  const n = raw === undefined || raw.trim() === '' ? NaN : Number(raw)
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback
}

/** Validates raw Remote Config values. Anything unexpected falls back to the defaults. */
export function parseCloudConfig(raw: { enabled?: string; model?: string; hintTemperature?: string; scanTemperature?: string }): CloudAIConfig {
  const enabled = raw.enabled?.trim().toLowerCase()
  const model = raw.model?.trim() ?? ''
  return {
    enabled: enabled === undefined || enabled === '' ? RC_DEFAULTS.enabled : !['false', '0', 'off', 'no'].includes(enabled),
    model: MODEL_NAME.test(model) ? model : RC_DEFAULTS.model,
    hintTemperature: clamp(raw.hintTemperature, 0, 1.2, RC_DEFAULTS.hintTemperature),
    scanTemperature: clamp(raw.scanTemperature, 0, 1, RC_DEFAULTS.scanTemperature),
  }
}

let current: CloudAIConfig = RC_DEFAULTS
let status: RemoteConfigStatus = 'not-fetched'
let loading: Promise<CloudAIConfig> | null = null

/** The last activated values (defaults until a cloud-allowed request fetched them). */
export function currentCloudConfig(): CloudAIConfig {
  return current
}

export function getRemoteConfigStatus(): RemoteConfigStatus {
  return status
}

/**
 * Fetches and activates once per page load (cached for an hour by the SDK).
 * Never throws and never blocks longer than the fetch timeout.
 */
export function loadCloudConfig(app: FirebaseApp): Promise<CloudAIConfig> {
  if (import.meta.env.VITE_USE_EMULATORS === 'true') {
    status = 'defaults'
    return Promise.resolve(current)
  }
  if (!loading) {
    loading = (async () => {
      try {
        const RC = await import('firebase/remote-config')
        if (!(await RC.isSupported())) {
          status = 'unsupported'
          return current
        }
        const rc = RC.getRemoteConfig(app)
        rc.settings.minimumFetchIntervalMillis = import.meta.env.DEV ? 60_000 : 3_600_000
        rc.settings.fetchTimeoutMillis = 3_000
        rc.defaultConfig = {
          [RC_KEYS.enabled]: RC_DEFAULTS.enabled,
          [RC_KEYS.model]: RC_DEFAULTS.model,
          [RC_KEYS.hintTemperature]: RC_DEFAULTS.hintTemperature,
          [RC_KEYS.scanTemperature]: RC_DEFAULTS.scanTemperature,
        }
        try {
          await RC.fetchAndActivate(rc)
        } catch (e) {
          // Offline or blocked: keep any previously activated values, else defaults.
          if (import.meta.env.DEV) console.warn('[PencilLoop RC]', e)
          status = 'error'
        }
        current = parseCloudConfig({
          enabled: RC.getValue(rc, RC_KEYS.enabled).asString(),
          model: RC.getValue(rc, RC_KEYS.model).asString(),
          hintTemperature: RC.getValue(rc, RC_KEYS.hintTemperature).asString(),
          scanTemperature: RC.getValue(rc, RC_KEYS.scanTemperature).asString(),
        })
        if (status !== 'error') status = RC.getValue(rc, RC_KEYS.model).getSource() === 'remote' ? 'remote' : 'defaults'
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[PencilLoop RC]', e)
        status = 'error'
      }
      return current
    })()
  }
  return loading
}
