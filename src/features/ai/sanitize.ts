import { LIMITS } from '../maze/limits'
import type { Command } from '../maze/types'
import { countExpandedSteps, countNodes } from '../maze/validate'

export interface ScanResult {
  commands: Command[]
  warnings: string[]
  needsReview: boolean
}

export interface HintResult {
  hint: string
  question: string
}

export class SanitizeError extends Error {}

/** Extract the first JSON object from model text (handles ```json fences). */
export function extractJson(text: string): unknown {
  const trimmed = text.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fence ? fence[1] : trimmed
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) throw new SanitizeError('The AI reply did not contain a program.')
  try {
    return JSON.parse(body.slice(start, end + 1))
  } catch {
    throw new SanitizeError('The AI reply was not valid JSON.')
  }
}

const clampInt = (v: unknown, min: number, max: number): { value: number; changed: boolean } | null => {
  const n = typeof v === 'string' ? Number(v) : v
  if (typeof n !== 'number' || !Number.isFinite(n)) return null
  const r = Math.round(n)
  const c = Math.min(max, Math.max(min, r))
  return { value: c, changed: c !== n }
}

/**
 * Turns untrusted model output into a safe, limited AST.
 * - only move / turn / repeat survive; unknown props are dropped
 * - numbers are clamped to legal ranges (with a warning)
 * - nesting deeper than the limit is flattened away (with a warning)
 * - node and expanded-step limits are enforced
 * Never executes anything.
 */
export function sanitizeScan(raw: unknown): ScanResult {
  if (typeof raw !== 'object' || raw === null) throw new SanitizeError('The AI reply was empty.')
  const obj = raw as Record<string, unknown>
  const warnings: string[] = []
  if (Array.isArray(obj.warnings)) {
    for (const w of obj.warnings.slice(0, 5)) if (typeof w === 'string' && w.trim()) warnings.push(w.trim().slice(0, 140))
  }
  let needsReview = obj.needsReview === true

  const walk = (list: unknown, depth: number): Command[] => {
    if (!Array.isArray(list)) return []
    const out: Command[] = []
    for (const item of list.slice(0, LIMITS.maxNodes)) {
      if (typeof item !== 'object' || item === null) {
        needsReview = true
        continue
      }
      const c = item as Record<string, unknown>
      const type = typeof c.type === 'string' ? c.type.toLowerCase().trim() : ''
      if (type === 'move' || type === 'forward') {
        const s = clampInt(c.steps ?? 1, LIMITS.move.min, LIMITS.move.max)
        if (!s) {
          warnings.push('A move step had an unreadable number, so it was set to 1.')
          needsReview = true
        } else if (s.changed) {
          warnings.push(`A move of ${String(c.steps)} was changed to ${s.value} (allowed: ${LIMITS.move.min}–${LIMITS.move.max}).`)
          needsReview = true
        }
        out.push({ type: 'move', steps: s?.value ?? 1 })
      } else if (type === 'turn' || type === 'left' || type === 'right') {
        const dirRaw = type === 'turn' ? c.direction : type
        const dir = typeof dirRaw === 'string' ? dirRaw.toLowerCase().trim() : ''
        if (dir === 'left' || dir === 'right') out.push({ type: 'turn', direction: dir })
        else {
          warnings.push('A turn without a clear direction was skipped.')
          needsReview = true
        }
      } else if (type === 'repeat' || type === 'loop') {
        if (depth >= LIMITS.maxRepeatDepth) {
          warnings.push('A repeat was nested too deeply and was removed.')
          needsReview = true
          continue
        }
        const t = clampInt(c.times ?? 2, LIMITS.repeat.min, LIMITS.repeat.max)
        if (!t || t.changed) {
          warnings.push(`A repeat count was changed to ${t?.value ?? 2} (allowed: ${LIMITS.repeat.min}–${LIMITS.repeat.max}).`)
          needsReview = true
        }
        const inner = walk(c.commands, depth + 1)
        if (inner.length === 0) {
          warnings.push('An empty repeat was removed.')
          needsReview = true
          continue
        }
        out.push({ type: 'repeat', times: t?.value ?? 2, commands: inner })
      } else {
        warnings.push(`An unknown step${type ? ` “${type.slice(0, 20)}”` : ''} was ignored.`)
        needsReview = true
      }
    }
    if (list.length > LIMITS.maxNodes) {
      warnings.push(`Only the first ${LIMITS.maxNodes} steps were kept.`)
      needsReview = true
    }
    return out
  }

  let commands = walk(obj.commands, 0)

  // Enforce total node budget (trim from the end).
  while (commands.length && countNodes(commands) > LIMITS.maxNodes) {
    commands = commands.slice(0, -1)
    needsReview = true
  }
  if (countExpandedSteps(commands) > LIMITS.maxExpandedSteps) {
    warnings.push(`This plan is longer than ${LIMITS.maxExpandedSteps} robot steps — the robot will stop at the limit.`)
    needsReview = true
  }
  if (commands.length === 0) throw new SanitizeError('No robot steps could be read from the photo.')

  return { commands, warnings: [...new Set(warnings)], needsReview }
}

const MAX_HINT_WORDS = 35

/** Words in a hint that would read like a full solution. */
function looksLikeFullSolution(text: string): boolean {
  const mentions = text.match(/\b(move|forward|turn|left|right|repeat)\b/gi) ?? []
  return mentions.length > 4 || /\bstep\s*\d+\s*[:,-].*\bstep\s*\d+\s*[:,-].*\bstep\s*\d+/i.test(text)
}

function trimWords(s: string, max: number): string {
  const words = s.trim().split(/\s+/)
  return words.length <= max ? s.trim() : `${words.slice(0, max).join(' ')}…`
}

export function sanitizeHint(raw: unknown): HintResult {
  if (typeof raw !== 'object' || raw === null) throw new SanitizeError('Empty hint')
  const o = raw as Record<string, unknown>
  const hint = typeof o.hint === 'string' ? o.hint.replace(/[<>]/g, '').trim() : ''
  const question = typeof o.question === 'string' ? o.question.replace(/[<>]/g, '').trim() : ''
  if (!hint) throw new SanitizeError('Empty hint')
  if (looksLikeFullSolution(`${hint} ${question}`)) throw new SanitizeError('Hint revealed too much')
  return { hint: trimWords(hint, MAX_HINT_WORDS), question: trimWords(question, 20) }
}
