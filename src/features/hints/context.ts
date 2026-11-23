import { labelForPath } from '../editor/ast'
import { distance } from '../maze/interpreter'
import type { Command, Mission, Trace } from '../maze/types'

/** Compact, anonymous description of the game state — the only thing a hint request may contain. */
export interface HintContext {
  missionTitle: string
  grid: string
  start: string
  goal: string
  programText: string
  outcome: Trace['outcome']
  failedStep?: string
  failedReason?: string
  facingAtFailure?: string
  movedBeforeBump?: number
  finalPosition: string
  squaresFromGoal: number
  attempt: number
}

const dirWord = { N: 'up', E: 'right', S: 'down', W: 'left' } as const

export function describeCommands(cmds: readonly Command[], prefix = ''): string[] {
  return cmds.flatMap((c, i) => {
    const label = prefix ? `${prefix}.${i + 1}` : `${i + 1}`
    if (c.type === 'move') return [`${label}. move ${c.steps}`]
    if (c.type === 'turn') return [`${label}. turn ${c.direction}`]
    return [`${label}. repeat ${c.times} times:`, ...describeCommands(c.commands, label).map((l) => `  ${l}`)]
  })
}

export function renderGrid(m: Mission): string {
  const walls = new Set(m.walls.map((w) => `${w.x},${w.y}`))
  const rows: string[] = []
  for (let y = 0; y < m.rows; y++) {
    let r = ''
    for (let x = 0; x < m.cols; x++) {
      if (x === m.start.x && y === m.start.y) r += 'R'
      else if (x === m.goal.x && y === m.goal.y) r += 'G'
      else r += walls.has(`${x},${y}`) ? '#' : '.'
    }
    rows.push(r)
  }
  return rows.join('\n')
}

function movedBefore(trace: Trace, idx: number): number {
  const key = trace.steps[idx]?.commandPath.join('.')
  let n = 0
  for (let i = idx - 1; i >= 0 && trace.steps[i].kind === 'move' && trace.steps[i].commandPath.join('.') === key; i--) n++
  return n
}

export function buildHintContext(m: Mission, commands: readonly Command[], trace: Trace, attempt: number): HintContext {
  const failed = trace.failedStepIndex !== undefined ? trace.steps[trace.failedStepIndex] : undefined
  return {
    missionTitle: m.title,
    grid: renderGrid(m),
    start: `column ${m.start.x + 1}, row ${m.start.y + 1}, facing ${dirWord[m.start.dir]}`,
    goal: `column ${m.goal.x + 1}, row ${m.goal.y + 1}`,
    programText: describeCommands(commands).join('\n'),
    outcome: trace.outcome,
    failedStep: failed ? labelForPath(failed.commandPath) : undefined,
    failedReason: failed?.kind === 'bump' ? (failed.blockedBy === 'edge' ? 'tried to leave the board' : 'hit a wall') : undefined,
    facingAtFailure: failed ? dirWord[failed.before.dir] : undefined,
    movedBeforeBump: failed ? movedBefore(trace, trace.failedStepIndex!) : undefined,
    finalPosition: `column ${trace.final.x + 1}, row ${trace.final.y + 1}, facing ${dirWord[trace.final.dir]}`,
    squaresFromGoal: distance(trace.final, m.goal),
    attempt,
  }
}
