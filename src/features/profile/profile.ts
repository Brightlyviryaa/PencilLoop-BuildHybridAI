import { z } from 'zod'
import { createStore, useStore } from '../progress/store'

/**
 * The player's profile. It lives ONLY on this device. Personal fields
 * (nickname, birthday, gender) are never sent to AI, analytics or logs, and
 * are mirrored to Firestore only for adult players (see account/sync.ts and
 * docs/PRIVACY.md). Children's profiles stay on the device.
 */

export const AGE_GROUPS = ['under13', 'teen', 'adult'] as const
export type AgeGroup = (typeof AGE_GROUPS)[number]
export const GENDERS = ['male', 'female'] as const
export type Gender = (typeof GENDERS)[number]

export const NAME_MAX = 20

export const profileSchema = z.object({
  name: z.string().min(1).max(NAME_MAX),
  /** YYYY-MM-DD. Device only, used to keep the age group up to date. */
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  gender: z.enum(GENDERS).nullable(),
  ageGroup: z.enum(AGE_GROUPS),
  completedAt: z.number().int(),
})
export type Profile = z.infer<typeof profileSchema>

export const profileStore = createStore<Profile | null>(
  'pencilloop:profile:v1',
  (raw) => {
    const r = profileSchema.safeParse(raw)
    return r.success ? r.data : undefined
  },
  null,
)

export function useProfile(): Profile | null {
  return useStore(profileStore)
}

/* ------------------------------ Validation ------------------------------ */

export type NameCheck = 'ok' | 'empty' | 'too-long' | 'invalid'

export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

/** Letters (any script), spaces, apostrophes, dots and hyphens. No digits, no @, no links. */
export function checkName(raw: string): NameCheck {
  const s = cleanName(raw)
  if (!s) return 'empty'
  if ([...s].length > NAME_MAX) return 'too-long'
  if (!/^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u.test(s)) return 'invalid'
  return 'ok'
}

export type BirthCheck = 'ok' | 'empty' | 'invalid' | 'future' | 'too-old'

export function todayISO(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseISO(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
  return { y, m: mo, d }
}

export function ageOn(birthDate: string, now = new Date()): number | null {
  const b = parseISO(birthDate)
  if (!b) return null
  const t = parseISO(todayISO(now))!
  let age = t.y - b.y
  if (t.m < b.m || (t.m === b.m && t.d < b.d)) age--
  return age
}

export function checkBirthDate(s: string, now = new Date()): BirthCheck {
  if (!s) return 'empty'
  if (!parseISO(s)) return 'invalid'
  if (s > todayISO(now)) return 'future'
  const age = ageOn(s, now)
  if (age === null) return 'invalid'
  if (age > 110) return 'too-old'
  return 'ok'
}

export function ageGroupFor(birthDate: string, now = new Date()): AgeGroup {
  const age = ageOn(birthDate, now) ?? 0
  if (age < 13) return 'under13'
  if (age < 18) return 'teen'
  return 'adult'
}

/** Personal profile fields may be stored in the cloud only for adults (no verified guardian consent flow yet). */
export function mayStorePersonalDataInCloud(group: AgeGroup): boolean {
  return group === 'adult'
}

/** Google account linking: Google accounts need 13+, and under-13s need a parent-managed account. */
export function mayLinkGoogle(group: AgeGroup): boolean {
  return group !== 'under13'
}

/** Keep the age group fresh as birthdays pass. */
export function refreshAgeGroup() {
  const p = profileStore.get()
  if (!p?.birthDate) return
  const g = ageGroupFor(p.birthDate)
  if (g !== p.ageGroup) profileStore.set({ ...p, ageGroup: g })
}
