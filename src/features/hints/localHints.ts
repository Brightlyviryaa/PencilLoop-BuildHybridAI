import type { HintResult } from '../ai/sanitize'
import type { Mission, Trace } from '../maze/types'
import { distance } from '../maze/interpreter'
import { labelForPath } from '../editor/ast'
import { getT, type Dict } from '../../i18n'

/**
 * Deterministic "Built-in tip" used when AI is unavailable or not permitted.
 * Always labelled differently from AI hints in the UI.
 */
export function localHint(m: Mission, trace: Trace, attempt: number, t: Dict = getT()): HintResult {
  const L = t.hint.local
  switch (trace.outcome) {
    case 'COLLISION': {
      const idx = trace.failedStepIndex ?? trace.steps.length - 1
      const step = trace.steps[idx]
      const label = step ? labelForPath(step.commandPath) : '?'
      const where = step?.blockedBy === 'edge' ? L.where.edge : L.where.wall
      // How many squares did this same move block manage before bumping?
      const key = step?.commandPath.join('.')
      let moved = 0
      for (let i = idx - 1; i >= 0 && trace.steps[i].kind === 'move' && trace.steps[i].commandPath.join('.') === key; i--) moved++
      if (moved > 0) return { hint: L.movedThenBump(label, moved, where), question: L.countQ }
      return {
        hint: L.bumpNow(label, where, L.facing[trace.final.dir]),
        question: attempt > 2 ? L.slowQ(label) : L.faceQ,
      }
    }
    case 'INCOMPLETE':
      return { hint: L.incomplete(distance(trace.final, m.goal)), question: L.incompleteQ }
    case 'STEP_LIMIT':
      return { hint: L.limit, question: L.limitQ }
    case 'INVALID_PROGRAM':
      return { hint: L.invalid, question: L.invalidQ }
    default:
      return m.allowRepeat ? { hint: L.wonRepeat, question: L.wonRepeatQ } : { hint: L.won, question: L.wonQ }
  }
}
