import { LIMITS } from './limits'
import type {
  Cell,
  Command,
  Direction,
  Mission,
  ProgramAST,
  RobotState,
  Trace,
  TraceStep,
  TurnDirection,
} from './types'
import { validateProgram } from './validate'

const ORDER: Direction[] = ['N', 'E', 'S', 'W']
const DELTA: Record<Direction, Cell> = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
}

export function turn(dir: Direction, side: TurnDirection): Direction {
  const i = ORDER.indexOf(dir)
  return ORDER[(i + (side === 'right' ? 1 : 3)) % 4]
}

export function ahead(state: RobotState): Cell {
  const d = DELTA[state.dir]
  return { x: state.x + d.x, y: state.y + d.y }
}

export const cellKey = (c: Cell) => `${c.x},${c.y}`

class Halt {
  readonly reason: 'goal' | 'bump' | 'limit'
  constructor(reason: 'goal' | 'bump' | 'limit') {
    this.reason = reason
  }
}

/**
 * Pure, deterministic robot interpreter. Validates the program, then expands
 * it into atomic steps. The UI only animates the returned trace; AI never
 * decides an outcome.
 */
export function runProgram(mission: Mission, program: ProgramAST): Trace {
  const startState: RobotState = { x: mission.start.x, y: mission.start.y, dir: mission.start.dir }
  const validation = validateProgram(program)
  if (!validation.ok) {
    return { outcome: 'INVALID_PROGRAM', steps: [], final: startState, errors: validation.errors }
  }

  const walls = new Set(mission.walls.map(cellKey))
  const steps: TraceStep[] = []
  let state = startState
  const atGoal = (s: Cell) => s.x === mission.goal.x && s.y === mission.goal.y

  const push = (step: Omit<TraceStep, 'index'>) => {
    if (steps.length >= LIMITS.maxExpandedSteps) throw new Halt('limit')
    steps.push({ ...step, index: steps.length })
  }

  const exec = (cmds: readonly Command[], path: number[]) => {
    cmds.forEach((cmd, i) => {
      const here = [...path, i]
      if (cmd.type === 'turn') {
        const after = { ...state, dir: turn(state.dir, cmd.direction) }
        push({ kind: 'turn', before: state, after, commandPath: here })
        state = after
      } else if (cmd.type === 'move') {
        for (let s = 0; s < cmd.steps; s++) {
          const next = ahead(state)
          const outside = next.x < 0 || next.y < 0 || next.x >= mission.cols || next.y >= mission.rows
          if (outside || walls.has(cellKey(next))) {
            push({
              kind: 'bump',
              before: state,
              after: state,
              commandPath: here,
              blockedCell: next,
              blockedBy: outside ? 'edge' : 'wall',
            })
            throw new Halt('bump')
          }
          const after = { ...state, x: next.x, y: next.y }
          push({ kind: 'move', before: state, after, commandPath: here })
          state = after
          if (atGoal(state)) throw new Halt('goal')
        }
      } else {
        for (let t = 0; t < cmd.times; t++) exec(cmd.commands, here)
      }
    })
  }

  try {
    exec(program.commands, [])
  } catch (e) {
    if (!(e instanceof Halt)) throw e
    if (e.reason === 'goal') return { outcome: 'SUCCESS', steps, final: state, errors: [] }
    if (e.reason === 'bump')
      return { outcome: 'COLLISION', steps, final: state, failedStepIndex: steps.length - 1, errors: [] }
    return {
      outcome: 'STEP_LIMIT',
      steps,
      final: state,
      failedStepIndex: steps.length - 1,
      errors: [`The robot can take at most ${LIMITS.maxExpandedSteps} steps`],
    }
  }

  return { outcome: atGoal(state) ? 'SUCCESS' : 'INCOMPLETE', steps, final: state, errors: [] }
}

export function toProgram(commands: Command[]): ProgramAST {
  return { version: 1, commands }
}

/** Manhattan distance, used for kid-friendly feedback ("3 squares away"). */
export function distance(a: Cell, b: Cell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}
