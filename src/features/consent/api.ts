import { getFirebaseApp } from '../ai/firebase'
import { CONSENT_BACKEND_ENABLED, consentStore } from './consent'

/**
 * Client side of the guardian consent workflow. The real work (tokens,
 * email, expiry, rate limits, the authoritative status) happens in Cloud
 * Functions (see /functions). When the backend is not deployed for this
 * build every call returns 'unavailable' and nothing is sent anywhere.
 */
export type ConsentApiError = 'unavailable' | 'invalid' | 'rate-limited' | 'network' | 'unknown'

async function callable<I, O>(name: string) {
  const app = await getFirebaseApp()
  if (!app) throw Object.assign(new Error('unavailable'), { code: 'unavailable' })
  const F = await import('firebase/functions')
  const fns = F.getFunctions(app, 'asia-southeast2')
  if (import.meta.env.VITE_USE_EMULATORS === 'true') F.connectFunctionsEmulator(fns, '127.0.0.1', 5001)
  return F.httpsCallable<I, O>(fns, name)
}

function errorOf(e: unknown): ConsentApiError {
  const code = String((e as { code?: string })?.code ?? '')
  if (code.includes('resource-exhausted')) return 'rate-limited'
  if (code.includes('invalid-argument') || code.includes('not-found') || code.includes('failed-precondition')) return 'invalid'
  if (code.includes('unavailable') || code.includes('deadline')) return 'network'
  return 'unknown'
}

function randomKey(): string {
  const b = new Uint8Array(24)
  crypto.getRandomValues(b)
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

/** Ask a guardian. Contact details go only to the backend, never to analytics or local storage. */
export async function requestGuardianConsent(input: { phone: string; email: string; lang: 'id' | 'en'; ageGroup: 'under13' | 'teen' }): Promise<{ ok: true } | { ok: false; error: ConsentApiError }> {
  if (!CONSENT_BACKEND_ENABLED) return { ok: false, error: 'unavailable' }
  try {
    const clientKey = consentStore.get().clientKey ?? randomKey()
    const fn = await callable<typeof input & { clientKey: string }, { requestId: string }>('requestGuardianConsent')
    const r = await fn({ ...input, clientKey })
    consentStore.set({ status: 'pending', requestId: r.data.requestId, clientKey, checkedAt: Date.now() })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errorOf(e) }
  }
}

/** Refresh the status from the server (the only source that can say "verified"). */
export async function refreshGuardianConsent(): Promise<void> {
  const c = consentStore.get()
  if (!CONSENT_BACKEND_ENABLED || !c.requestId || !c.clientKey) return
  try {
    const fn = await callable<{ requestId: string; clientKey: string }, { status: 'pending' | 'verified' | 'rejected' | 'revoked' | 'expired' }>('getGuardianConsentStatus')
    const r = await fn({ requestId: c.requestId, clientKey: c.clientKey })
    const status = r.data.status === 'expired' ? 'none' : r.data.status
    consentStore.set({ ...c, status, checkedAt: Date.now() })
  } catch {
    /* keep the cached state; the game does not depend on it */
  }
}

/** Guardian page: answer a request with the token from the email link. */
export async function respondToConsent(token: string, decision: 'approve' | 'reject', attested: boolean): Promise<{ ok: true } | { ok: false; error: ConsentApiError }> {
  if (!CONSENT_BACKEND_ENABLED) return { ok: false, error: 'unavailable' }
  try {
    const fn = await callable<{ token: string; decision: string; attested: boolean }, { ok: boolean }>('respondGuardianConsent')
    await fn({ token, decision, attested })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: errorOf(e) }
  }
}

/** After a verified consent, bind it to the new anonymous account (server writes guardianConsents/{uid}). */
export async function claimGuardianConsent(): Promise<boolean> {
  const c = consentStore.get()
  if (!CONSENT_BACKEND_ENABLED || c.status !== 'verified' || !c.requestId || !c.clientKey) return false
  try {
    const fn = await callable<{ requestId: string; clientKey: string }, { ok: boolean }>('claimGuardianConsent')
    await fn({ requestId: c.requestId, clientKey: c.clientKey })
    return true
  } catch {
    return false
  }
}
