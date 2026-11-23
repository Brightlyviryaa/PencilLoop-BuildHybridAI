import { labelForPath } from '../editor/ast'
import { distance } from '../maze/interpreter'
import type { Mission } from '../maze/types'
import type { Dict } from '../../i18n'
import type { GameRunner } from './useGameRunner'

export interface StatusInfo {
  tone: 'neutral' | 'running' | 'success' | 'warn' | 'error'
  title: string
  detail?: string
  failedStepIndex?: number
}

export function getStatus(g: GameRunner, m: Mission, t: Dict): StatusInfo {
  const tr = g.trace
  if (!tr || g.status === 'idle') {
    return g.nodes.length === 0 ? { tone: 'neutral', ...t.status.empty } : { tone: 'neutral', ...t.status.ready }
  }
  if (tr.outcome === 'INVALID_PROGRAM') return { tone: 'warn', ...t.status.invalid }
  if (!g.finished) {
    const s = g.currentStep
    return {
      tone: 'running',
      title: s ? t.status.running(labelForPath(s.commandPath), t.status.kinds[s.kind]) : t.status.starting,
      detail: t.status.moveOf(Math.max(0, g.index + 1), tr.steps.length),
    }
  }
  switch (tr.outcome) {
    case 'SUCCESS':
      return { tone: 'success', title: t.status.success.title, detail: t.status.success.detail(tr.steps.length) }
    case 'COLLISION': {
      const f = tr.failedStepIndex !== undefined ? tr.steps[tr.failedStepIndex] : undefined
      const label = f ? labelForPath(f.commandPath) : '?'
      return {
        tone: 'error',
        title: f?.blockedBy === 'edge' ? t.status.edge(label) : t.status.wall(label),
        detail: t.status.bumpDetail,
        failedStepIndex: tr.failedStepIndex,
      }
    }
    case 'INCOMPLETE':
      return { tone: 'warn', title: t.status.incomplete(distance(tr.final, m.goal)), detail: t.status.incompleteDetail }
    case 'STEP_LIMIT':
      return { tone: 'warn', title: t.status.limit, detail: t.status.limitDetail, failedStepIndex: tr.failedStepIndex }
    default:
      return { tone: 'neutral', title: '' }
  }
}

export function runLabel(g: GameRunner, t: Dict): string {
  if (g.status === 'running') return t.game.pause
  if (g.status === 'paused') return t.game.resume
  if (g.status === 'finished') return t.game.runAgain
  return t.game.run
}
