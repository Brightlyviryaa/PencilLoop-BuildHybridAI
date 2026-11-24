import { describe, expect, it } from 'vitest'
import { approvalEmail, effectiveStatus, nextStatus, newToken, sha256, underRateLimit, validateRequest } from './logic'

const key = 'a'.repeat(48)

describe('guardian consent logic', () => {
  it('validates and normalizes a request', () => {
    const r = validateRequest({ phone: '0812 3456 7890', email: ' Ibu@Example.com ', lang: 'id', ageGroup: 'teen', clientKey: key })
    expect(r).toEqual({ phone: '+6281234567890', email: 'ibu@example.com', lang: 'id', ageGroup: 'teen', clientKeyHash: sha256(key) })
    expect(validateRequest({ phone: '123', email: 'x@y.co', lang: 'id', ageGroup: 'teen', clientKey: key })).toEqual({ error: 'phone' })
    expect(validateRequest({ phone: '081234567890', email: 'nope', lang: 'id', ageGroup: 'teen', clientKey: key })).toEqual({ error: 'email' })
    expect(validateRequest({ phone: '081234567890', email: 'x@y.co', lang: 'id', ageGroup: 'adult', clientKey: key })).toEqual({ error: 'ageGroup' })
  })

  it('tokens are random and only hashes are compared', () => {
    const a = newToken()
    expect(a).not.toEqual(newToken())
    expect(a.length).toBeGreaterThanOrEqual(43)
    expect(sha256(a)).toHaveLength(64)
  })

  it('only allows sensible status changes; a child can never approve themselves', () => {
    expect(nextStatus('pending', 'approve')).toBe('verified')
    expect(nextStatus('pending', 'reject')).toBe('rejected')
    expect(nextStatus('verified', 'revoke')).toBe('revoked')
    expect(nextStatus('rejected', 'approve')).toBeNull()
    expect(nextStatus('revoked', 'approve')).toBeNull()
    expect(nextStatus('expired', 'approve')).toBeNull()
  })

  it('pending requests expire', () => {
    expect(effectiveStatus('pending', 1000, 999)).toBe('pending')
    expect(effectiveStatus('pending', 1000, 1001)).toBe('expired')
    expect(effectiveStatus('verified', 1000, 5000)).toBe('verified')
  })

  it('rate limits to 3 requests per day', () => {
    const now = 10 * 86_400_000
    expect(underRateLimit([now - 1000, now - 2000], now)).toBe(true)
    expect(underRateLimit([now - 1000, now - 2000, now - 3000], now)).toBe(false)
    expect(underRateLimit([now - 2 * 86_400_000, now - 3 * 86_400_000, now - 4 * 86_400_000], now)).toBe(true)
  })

  it('the email explains data, purpose, AI and withdrawal, with no promotion', () => {
    for (const lang of ['id', 'en'] as const) {
      const m = approvalEmail(lang, { approve: 'https://x/guardian#t', privacy: 'https://x/privacy', terms: 'https://x/terms' }, 'OP')
      expect(m.text).toContain('https://x/guardian#t')
      expect(m.text).toContain('https://x/privacy')
      expect(m.text).toContain('Firebase')
      expect(m.text).toMatch(/Gemini/)
      expect(m.text).toMatch(/promo/i)
    }
  })
})
