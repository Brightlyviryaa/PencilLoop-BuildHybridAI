import { describe, expect, it } from 'vitest'
import { ageGroupFor, ageOn, checkBirthDate, checkName, mayLinkGoogle, mayStorePersonalDataInCloud } from './profile'

const today = new Date(2026, 10, 23) // 23 Nov 2026

describe('profile validation', () => {
  it('nicknames: letters only, 1 to 20 characters, trimmed', () => {
    expect(checkName('Rara')).toBe('ok')
    expect(checkName('  Ana Maria ')).toBe('ok')
    expect(checkName("D'Arcy")).toBe('ok')
    expect(checkName('')).toBe('empty')
    expect(checkName('   ')).toBe('empty')
    expect(checkName('R2D2')).toBe('invalid')
    expect(checkName('me@mail.com')).toBe('invalid')
    expect(checkName('a'.repeat(21))).toBe('too-long')
  })

  it('birthdays: no future dates, no impossible dates', () => {
    expect(checkBirthDate('2016-03-14', today)).toBe('ok')
    expect(checkBirthDate('', today)).toBe('empty')
    expect(checkBirthDate('2026-11-24', today)).toBe('future')
    expect(checkBirthDate('2026-11-23', today)).toBe('ok')
    expect(checkBirthDate('2015-02-30', today)).toBe('invalid')
    expect(checkBirthDate('1900-01-01', today)).toBe('too-old')
  })

  it('age and age groups respect the exact birthday', () => {
    expect(ageOn('2013-11-23', today)).toBe(13)
    expect(ageOn('2013-11-24', today)).toBe(12)
    expect(ageGroupFor('2013-11-24', today)).toBe('under13')
    expect(ageGroupFor('2013-11-23', today)).toBe('teen')
    expect(ageGroupFor('2008-11-23', today)).toBe('adult')
  })

  it('children never store personal data in the cloud or link Google', () => {
    expect(mayStorePersonalDataInCloud('under13')).toBe(false)
    expect(mayStorePersonalDataInCloud('teen')).toBe(false)
    expect(mayStorePersonalDataInCloud('adult')).toBe(true)
    expect(mayLinkGoogle('under13')).toBe(false)
    expect(mayLinkGoogle('teen')).toBe(true)
  })
})
