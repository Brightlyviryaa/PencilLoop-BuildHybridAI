import type { GenerativeModel } from 'firebase/ai'
import type { Command } from '../maze/types'
import type { HintContext } from '../hints/context'
import { CLOUD_MODEL, isFirebaseConfigured } from './config'
import { getFirebaseApp } from './firebase'
import { HINT_JSON_SCHEMA, SCAN_JSON_SCHEMA, hintPrompt, scanPrompt, type PromptLang } from './prompts'
import { SanitizeError, extractJson, sanitizeHint, sanitizeScan, type HintResult } from './sanitize'

/** Exactly what the SDK reported. Never inferred from the browser or timing. */
export type ActualSource = 'on_device' | 'in_cloud' | 'unreported'

/**
 * How a request may be routed, derived from the privacy decision matrix:
 * - 'local-only'   → InferenceMode.ONLY_ON_DEVICE (no consent for cloud)
 * - 'prefer-local' → InferenceMode.PREFER_ON_DEVICE (cloud consent given)
 */
export type Routing = 'local-only' | 'prefer-local'

export interface AIResponseMeta {
  source: ActualSource
  latencyMs: number
  model: string
}

export type AIErrorKind =
  | 'unconfigured'
  | 'offline'
  | 'local-unavailable'
  | 'app-check'
  | 'quota'
  | 'api-not-enabled'
  | 'bad-response'
  | 'blocked'
  | 'unknown'

export class AIUnavailableError extends Error {
  readonly kind: AIErrorKind
  constructor(kind: AIErrorKind, message: string) {
    super(message)
    this.kind = kind
  }
}

type Kind = 'scan' | 'hint'
const modelCache = new Map<string, Promise<GenerativeModel>>()

async function getModel(kind: Kind, routing: Routing): Promise<GenerativeModel> {
  const key = `${kind}:${routing}`
  let p = modelCache.get(key)
  if (!p) {
    p = (async () => {
      const app = await getFirebaseApp()
      if (!app) throw new AIUnavailableError('unconfigured', 'Firebase is not configured for this build.')
      const { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } = await import('firebase/ai')
      const ai = getAI(app, { backend: new GoogleAIBackend() })
      const schema = kind === 'scan' ? SCAN_JSON_SCHEMA : HINT_JSON_SCHEMA
      return getGenerativeModel(ai, {
        mode: routing === 'local-only' ? InferenceMode.ONLY_ON_DEVICE : InferenceMode.PREFER_ON_DEVICE,
        inCloudParams: {
          model: CLOUD_MODEL,
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: schema as unknown as Record<string, unknown>,
            temperature: kind === 'scan' ? 0.1 : 0.6,
            maxOutputTokens: kind === 'scan' ? 1024 : 200,
          },
        },
        onDeviceParams: {
          createOptions: {
            expectedInputs:
              kind === 'scan' ? [{ type: 'text', languages: ['en'] }, { type: 'image' }] : [{ type: 'text', languages: ['en'] }],
            expectedOutputs: [{ type: 'text', languages: ['en'] }],
          },
          promptOptions: { responseConstraint: schema },
        },
      })
    })()
    p.catch(() => modelCache.delete(key))
    modelCache.set(key, p)
  }
  return p
}

/**
 * Builds the model objects ahead of time (no network call, no AI request), so
 * a later initializeDeviceModel() runs while the user activation is fresh.
 */
export function warmModels(): Promise<unknown> {
  return Promise.all([getModel('scan', 'prefer-local'), getModel('hint', 'prefer-local')])
}

/**
 * Must be called from a user gesture. Starts (or joins) the Chrome on-device
 * model download through the SDK's PREFER_ON_DEVICE model. While it runs,
 * PREFER_ON_DEVICE requests fall back to the cloud (when allowed).
 * Progress is reported only if Chrome provides real events.
 */
export async function prepareLocalModel(kind: Kind, onProgress?: (fraction: number) => void): Promise<void> {
  const model = await getModel(kind, 'prefer-local')
  await model.initializeDeviceModel(onProgress)
}

function mapError(e: unknown): AIUnavailableError {
  if (e instanceof AIUnavailableError) return e
  // Never logs request payloads (no photos) — only the SDK error.
  if (import.meta.env.DEV) console.warn('[PencilLoop AI]', e)
  if (typeof navigator !== 'undefined' && navigator.onLine === false)
    return new AIUnavailableError('offline', 'You are offline and no on-device model is ready.')
  const err = e as { code?: string; message?: string; customErrorData?: { status?: number } }
  const msg = String(err?.message ?? e)
  const status = err?.customErrorData?.status
  const code = err?.code ?? ''
  if (code.includes('unsupported') || /ONLY_ON_DEVICE|on-device model is not available|LanguageModel API not available/i.test(msg))
    return new AIUnavailableError('local-unavailable', 'The on-device model is not available on this device.')
  if (/app.?check|appCheck/i.test(msg) || status === 401)
    return new AIUnavailableError('app-check', 'This app could not be verified by App Check.')
  if (status === 429 || /quota|rate.?limit|RESOURCE_EXHAUSTED/i.test(msg)) return new AIUnavailableError('quota', 'The AI is busy right now (quota reached).')
  if (code.includes('api-not-enabled') || /not been used|is disabled|API_NOT_ENABLED/i.test(msg))
    return new AIUnavailableError('api-not-enabled', 'Firebase AI Logic is not enabled for this project yet.')
  if (status === 400 || /\[400\b/.test(msg)) return new AIUnavailableError('unknown', 'The AI service rejected the request (400).')
  if (/safety|blocked/i.test(msg)) return new AIUnavailableError('blocked', 'The AI could not read this image.')
  if (code.includes('fetch-error') || /Failed to fetch|NetworkError/i.test(msg))
    return new AIUnavailableError('offline', 'Could not reach the cloud model.')
  return new AIUnavailableError('unknown', msg.slice(0, 200))
}

function sourceOf(s: unknown): ActualSource {
  // `inferenceSource` comes straight from the Firebase AI Logic SDK response.
  if (s === 'on_device' || s === 'in_cloud') return s
  return 'unreported'
}

export interface ScanOutput {
  commands: Command[]
  warnings: string[]
  needsReview: boolean
  meta: AIResponseMeta
}

export async function scanPlanImage(
  image: { base64: string; mimeType: 'image/jpeg' | 'image/png' },
  routing: Routing,
  lang: PromptLang = 'en',
): Promise<ScanOutput> {
  if (!isFirebaseConfigured()) throw new AIUnavailableError('unconfigured', 'Firebase is not configured for this build.')
  const t0 = performance.now()
  try {
    const model = await getModel('scan', routing)
    const result = await model.generateContent([
      scanPrompt(lang),
      { type: 'inlineData', inlineData: { data: image.base64, mimeType: image.mimeType } },
    ])
    const text = result.response.text()
    const parsed = sanitizeScan(extractJson(text))
    return {
      ...parsed,
      meta: { source: sourceOf(result.response.inferenceSource), latencyMs: Math.round(performance.now() - t0), model: CLOUD_MODEL },
    }
  } catch (e) {
    if (e instanceof SanitizeError) throw new AIUnavailableError('bad-response', e.message)
    throw mapError(e)
  }
}

export interface HintOutput extends HintResult {
  meta: AIResponseMeta
}

export async function requestHint(ctx: HintContext, routing: Routing, lang: PromptLang = 'en'): Promise<HintOutput> {
  if (!isFirebaseConfigured()) throw new AIUnavailableError('unconfigured', 'Firebase is not configured for this build.')
  const t0 = performance.now()
  try {
    const model = await getModel('hint', routing)
    const result = await model.generateContent(hintPrompt(ctx, lang))
    const parsed = sanitizeHint(extractJson(result.response.text()))
    return {
      ...parsed,
      meta: { source: sourceOf(result.response.inferenceSource), latencyMs: Math.round(performance.now() - t0), model: CLOUD_MODEL },
    }
  } catch (e) {
    if (e instanceof SanitizeError) throw new AIUnavailableError('bad-response', e.message)
    throw mapError(e)
  }
}
