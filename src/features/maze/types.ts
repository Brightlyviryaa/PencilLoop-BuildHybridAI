export type Direction = 'N' | 'E' | 'S' | 'W'
export type TurnDirection = 'left' | 'right'

export interface Cell {
  x: number
  y: number
}

/* ----------------------------- Program AST ----------------------------- */

export interface MoveCommand {
  type: 'move'
  steps: number
}

export interface TurnCommand {
  type: 'turn'
  direction: TurnDirection
}

export interface RepeatCommand {
  type: 'repeat'
  times: number
  commands: Command[]
}

export type Command = MoveCommand | TurnCommand | RepeatCommand

export interface ProgramAST {
  version: 1
  commands: Command[]
}

/* ------------------------------ Missions ------------------------------- */

export interface Mission {
  id: string
  number: number
  /** World on the level map (1 = move & turn, 2 = loops). */
  world: 1 | 2
  title: string
  goalText: string
  tip: string
  cols: number
  rows: number
  start: Cell & { dir: Direction }
  goal: Cell
  walls: Cell[]
  /** Whether the Repeat block is available in the palette. */
  allowRepeat: boolean
  /** AST node count that earns three stars. */
  par: number
  starterCommands: Command[]
  /** Internal reference solution — used only by automated tests. */
  solution: Command[]
  /** Known failing programs with their expected outcome — used by tests. */
  failureFixtures: { commands: Command[]; outcome: Outcome; failedAtStep?: number }[]
}

/* ------------------------------ Execution ------------------------------ */

export type Outcome = 'SUCCESS' | 'COLLISION' | 'INCOMPLETE' | 'STEP_LIMIT' | 'INVALID_PROGRAM'

export interface RobotState extends Cell {
  dir: Direction
}

export type TraceStepKind = 'move' | 'turn' | 'bump'

export interface TraceStep {
  /** 0-based index of this atomic step. */
  index: number
  kind: TraceStepKind
  before: RobotState
  after: RobotState
  /** Path of indices into the command tree that produced this step, e.g. [2, 0]. */
  commandPath: number[]
  /** For bumps: the cell the robot tried to enter. */
  blockedCell?: Cell
  blockedBy?: 'wall' | 'edge'
}

export interface Trace {
  outcome: Outcome
  steps: TraceStep[]
  final: RobotState
  /** Index into steps of the failing atomic step (bump / limit), if any. */
  failedStepIndex?: number
  /** Validation errors for INVALID_PROGRAM. */
  errors: string[]
}
