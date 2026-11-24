import { describe, expect, it } from 'vitest'
import { guardianStatusFor, isValidGuardianEmail, normalizeGuardianPhone } from './consent'

const cache = (status: 'none' | 'pending' | 'verified' | 'rejected' | 'revoked') => ({ status, requestId: null, clientKey: null, checkedAt: null })

describe('guardian consent status', () => {
  it('adults never need guardian consent', () => {
    expect(guardianStatusFor({ ageGroup: 'adult' }, cache('none'))).toBe('not_required')
  })
  it('children and teens need it until verified', () => {
    expect(guardianStatusFor({ ageGroup: 'under13' }, cache('none'))).toBe('required')
    expect(guardianStatusFor({ ageGroup: 'teen' }, cache('pending'))).toBe('pending')
    expect(guardianStatusFor({ ageGroup: 'teen' }, cache('verified'))).toBe('verified')
    expect(guardianStatusFor({ ageGroup: 'under13' }, cache('revoked'))).toBe('revoked')
    expect(guardianStatusFor(null, cache('none'))).toBe('required')
  })
})

describe('guardian contact validation', () => {
  it('normalizes Indonesian mobile numbers', () => {
    expect(normalizeGuardianPhone('0812-3456-7890')).toBe('+6281234567890')
    expect(normalizeGuardianPhone('+62 812 3456 789')).toBe('+628123456789')
    expect(normalizeGuardianPhone('628123456789')).toBe('+628123456789')
    expect(normalizeGuardianPhone('6281234567')).toBeNull()
    expect(normalizeGuardianPhone('021-555-1234')).toBeNull()
    expect(normalizeGuardianPhone('abc')).toBeNull()
  })
  it('checks email shape', () => {
    expect(isValidGuardianEmail('ibu@example.com')).toBe(true)
    expect(isValidGuardianEmail('ibu@example')).toBe(false)
    expect(isValidGuardianEmail('not an email')).toBe(false)
  })
})
