/**
 * Pure guardian-consent rules (no Firebase imports), shared by the Cloud
 * Functions and their unit tests.
 *
 * Security model
 * - The email link carries a random 256-bit token. Only its SHA-256 hash is
 *   stored, so a database leak does not expose usable links.
 * - The child's device keeps a random client key; only its hash is stored.
 *   It lets the device check the status and bind a verified consent to its
 *   new anonymous account, without creating an account before consent.
 * - Requests expire after 7 days. Requests are rate limited per device and
 *   per guardian email.
 * - Guardian contact details are used only for this request (no marketing)
 *   and are deleted when the request is answered or expires.
 */
import { createHash, randomBytes } from 'node:crypto'

export type ConsentStatus = 'pending' | 'verified' | 'rejected' | 'revoked' | 'expired'
export type Lang = 'id' | 'en'

export const REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const LIMIT_PER_DAY = 3

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
export const newToken = () => randomBytes(32).toString('base64url')

export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const m = /^(?:\+?62|0)(8\d{8,12})$/.exec(raw.replace(/[\s().-]/g, ''))
  return m ? `+62${m[1]}` : null
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim().toLowerCase()
  return s.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? s : null
}

export interface RequestInput {
  phone: unknown
  email: unknown
  lang: unknown
  ageGroup: unknown
  clientKey: unknown
}

export interface ValidRequest {
  phone: string
  email: string
  lang: Lang
  ageGroup: 'under13' | 'teen'
  clientKeyHash: string
}

export function validateRequest(i: RequestInput): ValidRequest | { error: string } {
  const phone = normalizePhone(i.phone)
  const email = normalizeEmail(i.email)
  if (!phone) return { error: 'phone' }
  if (!email) return { error: 'email' }
  if (i.lang !== 'id' && i.lang !== 'en') return { error: 'lang' }
  if (i.ageGroup !== 'under13' && i.ageGroup !== 'teen') return { error: 'ageGroup' }
  if (typeof i.clientKey !== 'string' || !/^[0-9a-f]{48}$/.test(i.clientKey)) return { error: 'clientKey' }
  return { phone, email, lang: i.lang, ageGroup: i.ageGroup, clientKeyHash: sha256(i.clientKey) }
}

/** True when another request is allowed, given the creation times of recent ones. */
export function underRateLimit(recent: number[], now: number): boolean {
  return recent.filter((t) => now - t < 24 * 60 * 60 * 1000).length < LIMIT_PER_DAY
}

export function effectiveStatus(status: ConsentStatus, expiresAt: number, now: number): ConsentStatus {
  return status === 'pending' && now > expiresAt ? 'expired' : status
}

/** Allowed transitions. Everything else is refused. */
export function nextStatus(current: ConsentStatus, action: 'approve' | 'reject' | 'revoke'): ConsentStatus | null {
  if (current === 'pending' && action === 'approve') return 'verified'
  if (current === 'pending' && action === 'reject') return 'rejected'
  if (current === 'verified' && action === 'revoke') return 'revoked'
  return null
}

/** Transactional email (never promotional). */
export function approvalEmail(lang: Lang, links: { approve: string; privacy: string; terms: string }, operator: string) {
  if (lang === 'id')
    return {
      subject: 'Anak Anda meminta izin untuk PencilLoop',
      text: [
        'Halo,',
        '',
        'Anak Anda sedang memainkan PencilLoop, permainan edukasi coding dengan robot dan labirin, dan meminta izin Anda untuk menyimpan progres secara online.',
        '',
        'Jika Anda setuju:',
        '- ID pemain anonim dibuat di Firebase Authentication (Google).',
        '- Progres, lencana, dan pengaturan disimpan di Cloud Firestore (Google).',
        '- Foto gambar rencana di kertas dapat diproses oleh Gemini melalui Firebase AI Logic. Foto tidak disimpan.',
        '- Nama panggilan, tanggal lahir, dan jenis kelamin anak tetap di perangkat.',
        '',
        `Setujui atau tolak di sini (berlaku 7 hari): ${links.approve}`,
        'Anda dapat mencabut izin kapan saja lewat link yang sama.',
        '',
        `Kebijakan privasi: ${links.privacy}`,
        `Ketentuan layanan: ${links.terms}`,
        '',
        'Kontak Anda hanya dipakai untuk permintaan ini dan tidak untuk promosi.',
        `Pengelola: ${operator}`,
      ].join('\n'),
    }
  return {
    subject: 'Your child is asking for permission to use PencilLoop',
    text: [
      'Hello,',
      '',
      'Your child is playing PencilLoop, an educational coding game with a robot and mazes, and asks for your permission to save progress online.',
      '',
      'If you agree:',
      '- An anonymous player ID is created in Firebase Authentication (Google).',
      '- Progress, badges and settings are stored in Cloud Firestore (Google).',
      '- Photos of paper plans may be processed by Gemini through Firebase AI Logic. Photos are not stored.',
      "- The child's nickname, birthday and gender stay on the device.",
      '',
      `Approve or decline here (valid for 7 days): ${links.approve}`,
      'You can withdraw permission at any time with the same link.',
      '',
      `Privacy policy: ${links.privacy}`,
      `Terms of service: ${links.terms}`,
      '',
      'Your contact details are used only for this request and never for promotions.',
      `Operator: ${operator}`,
    ].join('\n'),
  }
}
