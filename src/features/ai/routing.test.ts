import { describe, expect, it } from 'vitest'
import { decideRouting, type RoutingInput } from './routing'

const base: RoutingInput = { configured: true, online: true, localReady: false, localPreparable: false, cloudConsent: false }

describe('decideRouting — privacy matrix', () => {
  it('desktop, local ready, no consent → ONLY_ON_DEVICE', () => {
    expect(decideRouting({ ...base, localReady: true })).toEqual({ action: 'run', routing: 'local-only' })
  })
  it('desktop, local ready, consent → PREFER_ON_DEVICE', () => {
    expect(decideRouting({ ...base, localReady: true, cloudConsent: true })).toEqual({ action: 'run', routing: 'prefer-local' })
  })
  it('local unavailable, no consent → never sends; asks the user', () => {
    const d = decideRouting(base)
    expect(d.action).toBe('needs-choice')
  })
  it('local unavailable, consent + online → cloud fallback allowed', () => {
    expect(decideRouting({ ...base, cloudConsent: true })).toEqual({ action: 'run', routing: 'prefer-local' })
  })
  it('mobile (no local), no consent → choice, not upload', () => {
    expect(decideRouting({ ...base })).toEqual({ action: 'needs-choice', canPrepareLocal: false, canUseCloud: true })
  })
  it('offline and no local → unavailable regardless of consent', () => {
    expect(decideRouting({ ...base, online: false })).toEqual({ action: 'unavailable', reason: 'offline' })
    expect(decideRouting({ ...base, online: false, cloudConsent: true })).toEqual({ action: 'unavailable', reason: 'offline' })
  })
  it('offline but local ready → still runs on device', () => {
    expect(decideRouting({ ...base, online: false, localReady: true })).toEqual({ action: 'run', routing: 'local-only' })
  })
  it('downloadable local model, no consent → offer to prepare local AI', () => {
    expect(decideRouting({ ...base, localPreparable: true })).toEqual({ action: 'needs-choice', canPrepareLocal: true, canUseCloud: true })
  })
  it('unconfigured → unavailable', () => {
    expect(decideRouting({ ...base, configured: false, localReady: true })).toEqual({ action: 'unavailable', reason: 'unconfigured' })
  })
})
