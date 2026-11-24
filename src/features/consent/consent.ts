import { z } from 'zod'
import { profileStore, type AgeGroup, type Profile } from '../profile/profile'
import { createStore, useStore } from '../progress/store'

/**
 * Guardian (parent) consent.
 *
 * Indonesia's UU PDP No. 27/2022 (Art. 25) and PP 17/2025 treat everyone
 * under 18 as a child whose personal data needs a parent or guardian's
 * consent. Until a VERIFIED consent exists, a child's PencilLoop runs in
 * local-only mode: no cloud account, no Firestore sync, no cloud AI. The
 * whole game still works on the device.
 *
 * "verified" can only come from the backend (Cloud Functions, see
 * /functions). The client never sets it on its own, and Firestore rules
 * refuse cloud writes for minors without a verified consent document.
 */
export type GuardianStatus = 'not_required' | 'required' | 'pending' | 'verified' | 'rejected' | 'revoked'

/** Whether the consent backend (Cloud Functions + transactional email) is deployed for this build. */
export const CONSENT_BACKEND_ENABLED = import.meta.env.VITE_CONSENT_FUNCTIONS === '1'

export const consentCacheSchema = z.object({
  status: z.enum(['none', 'pending', 'verified', 'rejected', 'revoked']),
  /** Server request id (never the secret token). */
  requestId: z.string().max(64).nullable(),
  /** Opaque client secret used to check the status before an account exists. Device only. */
  clientKey: z.string().max(128).nullable(),
  checkedAt: z.number().int().nullable(),
})
export type ConsentCache = z.infer<typeof consentCacheSchema>
const EMPTY: ConsentCache = { status: 'none', requestId: null, clientKey: null, checkedAt: null }

export const consentStore = createStore<ConsentCache>(
  'pencilloop:consent:v1',
  (raw) => {
    const r = consentCacheSchema.safeParse(raw)
    return r.success ? r.data : undefined
  },
  EMPTY,
)

export function isMinor(group: AgeGroup | undefined | null): boolean {
  return group !== 'adult'
}

export function guardianStatusFor(profile: Pick<Profile, 'ageGroup'> | null, cache: ConsentCache): GuardianStatus {
  if (profile && !isMinor(profile.ageGroup)) return 'not_required'
  if (cache.status === 'none') return 'required'
  return cache.status
}

export function guardianStatus(): GuardianStatus {
  return guardianStatusFor(profileStore.get(), consentStore.get())
}

/** Cloud account, sync and cloud AI are allowed only for adults or with verified guardian consent. */
export function cloudAllowed(): boolean {
  const s = guardianStatus()
  return s === 'not_required' || s === 'verified'
}

export function useGuardianStatus(): GuardianStatus {
  const profile = useStore(profileStore)
  const cache = useStore(consentStore)
  return guardianStatusFor(profile, cache)
}

export function resetConsentCache() {
  consentStore.reset()
}

/* ------------------------------ Validation ------------------------------ */

/** Indonesian mobile numbers (08xx, 628xx, +628xx), 10 to 14 digits in total. */
export function normalizeGuardianPhone(raw: string): string | null {
  const digits = raw.replace(/[\s().-]/g, '')
  const m = /^(?:\+?62|0)(8\d{8,12})$/.exec(digits)
  return m ? `+62${m[1]}` : null
}

export function isValidGuardianEmail(raw: string): boolean {
  const s = raw.trim()
  return s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)
}
