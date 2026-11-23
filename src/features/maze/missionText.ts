import type { Dict } from '../../i18n'
import type { Mission } from './types'

/** Localized title, goal and tip for a mission (falls back to the English data). */
export function missionText(t: Dict, m: Mission): { title: string; goal: string; tip: string } {
  return t.missions[m.id] ?? { title: m.title, goal: m.goalText, tip: m.tip }
}

export function idleFrame(m: Mission) {
  return {
    robot: { ...m.start },
    tick: 0,
    kind: 'idle' as const,
    trail: [{ x: m.start.x, y: m.start.y }],
    mood: 'idle' as const,
  }
}
