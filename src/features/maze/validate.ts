import { LIMITS } from './limits'
import type { Command, ProgramAST } from './types'

export interface ValidationResult {
  ok: boolean
  errors: string[]
  nodeCount: number
  expandedSteps: number
}

/** Count every AST node (a Repeat counts as one node plus its children). */
export function countNodes(commands: readonly Command[]): number {
  let n = 0
  for (const c of commands) {
    n += 1
    if (c.type === 'repeat') n += countNodes(c.commands)
  }
  return n
}

/** Number of atomic robot actions the program would produce if fully executed. */
export function countExpandedSteps(commands: readonly Command[]): number {
  let n = 0
  for (const c of commands) {
    if (c.type === 'move') n += c.steps
    else if (c.type === 'turn') n += 1
    else n += c.times * countExpandedSteps(c.commands)
    // Short-circuit on absurd values so we never do unbounded work.
    if (n > 100_000) return n
  }
  return n
}

function isInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v)
}

/**
 * Strict structural validation used right before the interpreter runs.
 * Everything that reaches the interpreter has passed this check.
 */
export function validateProgram(program: ProgramAST): ValidationResult {
  const errors: string[] = []

  const walk = (cmds: readonly unknown[], depth: number, path: string) => {
    if (!Array.isArray(cmds)) {
      errors.push(`${path || 'program'}: commands must be a list`)
      return
    }
    cmds.forEach((raw, i) => {
      const where = `${path}${path ? '.' : ''}${i + 1}`
      if (typeof raw !== 'object' || raw === null) {
        errors.push(`Step ${where} is not a command`)
        return
      }
      const c = raw as Record<string, unknown>
      switch (c.type) {
        case 'move':
          if (!isInt(c.steps) || c.steps < LIMITS.move.min || c.steps > LIMITS.move.max)
            errors.push(`Step ${where}: move steps must be ${LIMITS.move.min}–${LIMITS.move.max}`)
          break
        case 'turn':
          if (c.direction !== 'left' && c.direction !== 'right')
            errors.push(`Step ${where}: turn must be left or right`)
          break
        case 'repeat':
          if (depth >= LIMITS.maxRepeatDepth) {
            errors.push(`Step ${where}: repeats can only be nested ${LIMITS.maxRepeatDepth} deep`)
            break
          }
          if (!isInt(c.times) || c.times < LIMITS.repeat.min || c.times > LIMITS.repeat.max)
            errors.push(`Step ${where}: repeat times must be ${LIMITS.repeat.min}–${LIMITS.repeat.max}`)
          if (!Array.isArray(c.commands) || c.commands.length === 0)
            errors.push(`Step ${where}: repeat needs at least one step inside`)
          else walk(c.commands, depth + 1, where)
          break
        default:
          errors.push(`Step ${where}: unknown command`)
      }
    })
  }

  if (!program || program.version !== 1) errors.push('Unsupported program version')
  walk(program?.commands ?? [], 0, '')

  const safeCommands = errors.length === 0 ? program.commands : []
  const nodeCount = errors.length === 0 ? countNodes(safeCommands) : 0
  const expandedSteps = errors.length === 0 ? countExpandedSteps(safeCommands) : 0

  if (errors.length === 0) {
    if (program.commands.length === 0) errors.push('Add at least one step')
    if (nodeCount > LIMITS.maxNodes) errors.push(`Programs can have at most ${LIMITS.maxNodes} blocks`)
  }

  return { ok: errors.length === 0, errors, nodeCount, expandedSteps }
}
