import type { Routing } from './hybrid'

export interface RoutingInput {
  configured: boolean
  online: boolean
  localReady: boolean
  localPreparable: boolean
  /** Cloud consent for this kind of data (persistent setting OR "allow once"). */
  cloudConsent: boolean
}

export type RoutingDecision =
  | { action: 'run'; routing: Routing }
  | { action: 'needs-choice'; canPrepareLocal: boolean; canUseCloud: boolean }
  | { action: 'unavailable'; reason: 'unconfigured' | 'offline' }

/**
 * The privacy decision matrix from the PRD, as a pure function.
 * Without cloud consent nothing is ever sent off-device.
 */
export function decideRouting(i: RoutingInput): RoutingDecision {
  if (!i.configured) return { action: 'unavailable', reason: 'unconfigured' }
  if (i.cloudConsent) {
    if (i.localReady || i.online) return { action: 'run', routing: 'prefer-local' }
    return { action: 'unavailable', reason: 'offline' }
  }
  if (i.localReady) return { action: 'run', routing: 'local-only' }
  if (!i.online && !i.localPreparable) return { action: 'unavailable', reason: 'offline' }
  return { action: 'needs-choice', canPrepareLocal: i.localPreparable, canUseCloud: i.online }
}
