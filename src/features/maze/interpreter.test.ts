import { describe, expect, it } from 'vitest'
import { runProgram, toProgram, turn } from './interpreter'
import { MISSIONS, getMission, nextMission } from './missions'
import { starsFor } from './scoring'
import type { Command, Mission, ProgramAST } from './types'
import { countExpandedSteps, countNodes, validateProgram } from './validate'

const open5: Mission = {
  ...MISSIONS[0],
  id: 'test-open',
  cols: 5,
  rows: 5,
  start: { x: 0, y: 0, dir: 'E' },
  goal: { x: 4, y: 4 },
  walls: [{ x: 2, y: 0 }],
}

describe('turn()', () => {
  it('rotates clockwise for right and counter-clockwise for left', () => {
    expect(turn('N', 'right')).toBe('E')
    expect(turn('E', 'right')).toBe('S')
    expect(turn('W', 'right')).toBe('N')
    expect(turn('N', 'left')).toBe('W')
    expect(turn('S', 'left')).toBe('E')
  })
})

describe('runProgram()', () => {
  it('moves the robot and records atomic steps', () => {
    const t = runProgram(open5, toProgram([{ type: 'turn', direction: 'right' }, { type: 'move', steps: 2 }]))
    expect(t.outcome).toBe('INCOMPLETE')
    expect(t.steps.map((s) => s.kind)).toEqual(['turn', 'move', 'move'])
    expect(t.final).toEqual({ x: 0, y: 2, dir: 'S' })
    expect(t.steps[2].commandPath).toEqual([1])
  })

  it('stops on a wall collision and points at the failing step', () => {
    const t = runProgram(open5, toProgram([{ type: 'move', steps: 3 }]))
    expect(t.outcome).toBe('COLLISION')
    expect(t.failedStepIndex).toBe(1)
    const bump = t.steps[1]
    expect(bump.kind).toBe('bump')
    expect(bump.blockedBy).toBe('wall')
    expect(bump.blockedCell).toEqual({ x: 2, y: 0 })
    expect(t.final).toEqual({ x: 1, y: 0, dir: 'E' })
  })

  it('treats the grid edge as a collision', () => {
    const t = runProgram(open5, toProgram([{ type: 'turn', direction: 'left' }, { type: 'move', steps: 1 }]))
    expect(t.outcome).toBe('COLLISION')
    expect(t.steps.at(-1)?.blockedBy).toBe('edge')
  })

  it('finishes with SUCCESS only when the robot reaches the goal', () => {
    const goalMission = { ...open5, walls: [], goal: { x: 3, y: 0 } }
    const t = runProgram(goalMission, toProgram([{ type: 'move', steps: 3 }, { type: 'turn', direction: 'right' }]))
    expect(t.outcome).toBe('SUCCESS')
    // Execution halts on arrival — the trailing turn never runs.
    expect(t.steps).toHaveLength(3)
  })

  it('expands repeat blocks including nested repeats with correct command paths', () => {
    const m = { ...open5, walls: [], cols: 6, rows: 6, goal: { x: 5, y: 5 } }
    const program: Command[] = [
      { type: 'repeat', times: 2, commands: [{ type: 'repeat', times: 2, commands: [{ type: 'turn', direction: 'right' }] }] },
    ]
    const t = runProgram(m, toProgram(program))
    expect(t.steps).toHaveLength(4)
    expect(t.steps.every((s) => s.commandPath.join() === '0,0,0')).toBe(true)
    expect(t.final.dir).toBe('E')
  })

  it('caps execution at the step limit so repeat can never hang', () => {
    const m = { ...open5, walls: [], cols: 6, rows: 6, goal: { x: 5, y: 5 } }
    // 5 × 5 × (2 turns + ...) — spin in place forever-ish: 5*5*4 = 100 turns > 60
    const program: Command[] = [
      {
        type: 'repeat',
        times: 5,
        commands: [{ type: 'repeat', times: 5, commands: [{ type: 'turn', direction: 'left' }, { type: 'turn', direction: 'left' }, { type: 'turn', direction: 'left' }, { type: 'turn', direction: 'left' }] }],
      },
    ]
    const t = runProgram(m, toProgram(program))
    expect(t.outcome).toBe('STEP_LIMIT')
    expect(t.steps).toHaveLength(60)
  })

  it('rejects invalid programs before running anything', () => {
    const bad = (commands: unknown[]): ProgramAST => ({ version: 1, commands: commands as Command[] })
    const cases = [
      bad([]),
      bad([{ type: 'move', steps: 0 }]),
      bad([{ type: 'move', steps: 99 }]),
      bad([{ type: 'move', steps: 1.5 }]),
      bad([{ type: 'turn', direction: 'up' }]),
      bad([{ type: 'jump' }]),
      bad([{ type: 'repeat', times: 1, commands: [{ type: 'move', steps: 1 }] }]),
      bad([{ type: 'repeat', times: 3, commands: [] }]),
      bad([
        {
          type: 'repeat',
          times: 2,
          commands: [{ type: 'repeat', times: 2, commands: [{ type: 'repeat', times: 2, commands: [{ type: 'move', steps: 1 }] }] }],
        },
      ]),
      bad(Array.from({ length: 31 }, () => ({ type: 'turn', direction: 'left' }))),
      bad([null, 'move']),
    ]
    for (const p of cases) {
      const t = runProgram(open5, p)
      expect(t.outcome, JSON.stringify(p)).toBe('INVALID_PROGRAM')
      expect(t.steps).toHaveLength(0)
      expect(t.errors.length).toBeGreaterThan(0)
    }
  })

  it('is deterministic', () => {
    const p = toProgram(MISSIONS[1].solution)
    expect(runProgram(MISSIONS[1], p)).toEqual(runProgram(MISSIONS[1], p))
  })
})

describe('validate helpers', () => {
  it('counts nodes and expanded steps', () => {
    const cmds: Command[] = [{ type: 'move', steps: 2 }, { type: 'repeat', times: 3, commands: [{ type: 'move', steps: 1 }, { type: 'turn', direction: 'left' }] }]
    expect(countNodes(cmds)).toBe(4)
    expect(countExpandedSteps(cmds)).toBe(8)
    expect(validateProgram(toProgram(cmds)).ok).toBe(true)
  })
})

describe('missions', () => {
  it('has six missions in two worlds with escalating size and unique ids', () => {
    expect(MISSIONS).toHaveLength(6)
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(6)
    expect(MISSIONS.map((m) => m.number)).toEqual([1, 2, 3, 4, 5, 6])
    expect(MISSIONS.filter((m) => m.world === 2).every((m) => m.allowRepeat)).toBe(true)
    expect(MISSIONS[0].cols * MISSIONS[0].rows).toBeLessThan(MISSIONS[2].cols * MISSIONS[2].rows)
    expect(getMission('smart-loop')?.number).toBe(3)
    expect(nextMission('first-steps')?.id).toBe('around-the-blocks')
    expect(nextMission('smart-loop')?.id).toBe('pond-patrol')
    expect(nextMission('winding-road')).toBeUndefined()
  })

  for (const m of MISSIONS) {
    describe(m.title, () => {
      it('start, goal and walls are inside the grid and do not overlap', () => {
        const inside = (c: { x: number; y: number }) => c.x >= 0 && c.y >= 0 && c.x < m.cols && c.y < m.rows
        expect(inside(m.start)).toBe(true)
        expect(inside(m.goal)).toBe(true)
        const wallKeys = new Set(m.walls.map((w) => `${w.x},${w.y}`))
        expect(wallKeys.size).toBe(m.walls.length)
        m.walls.forEach((w) => expect(inside(w)).toBe(true))
        expect(wallKeys.has(`${m.start.x},${m.start.y}`)).toBe(false)
        expect(wallKeys.has(`${m.goal.x},${m.goal.y}`)).toBe(false)
      })

      it('reference solution reaches the goal with three stars', () => {
        const t = runProgram(m, toProgram(m.solution))
        expect(t.outcome).toBe('SUCCESS')
        expect(t.final.x).toBe(m.goal.x)
        expect(t.final.y).toBe(m.goal.y)
        expect(starsFor(m, m.solution)).toBe(3)
      })

      it('starter commands are valid but do not already solve the level', () => {
        const t = runProgram(m, toProgram(m.starterCommands))
        expect(t.outcome).not.toBe('SUCCESS')
        expect(t.outcome).not.toBe('INVALID_PROGRAM')
      })

      it('only uses Repeat when the level unlocks it', () => {
        const usesRepeat = (cs: Command[]): boolean => cs.some((c) => c.type === 'repeat')
        if (!m.allowRepeat) {
          expect(usesRepeat(m.solution)).toBe(false)
          expect(usesRepeat(m.starterCommands)).toBe(false)
        }
      })

      m.failureFixtures.forEach((f, i) => {
        it(`failure fixture ${i + 1} → ${f.outcome}`, () => {
          const t = runProgram(m, toProgram(f.commands))
          expect(t.outcome).toBe(f.outcome)
          if (f.failedAtStep) expect((t.failedStepIndex ?? -1) + 1).toBe(f.failedAtStep)
        })
      })
    })
  }

  it('level 3 can also be solved without Repeat but earns fewer stars', () => {
    const m = MISSIONS[2]
    const flat: Command[] = Array.from({ length: 5 }, () => [
      { type: 'move', steps: 1 } as Command,
      { type: 'turn', direction: 'left' } as Command,
      { type: 'move', steps: 1 } as Command,
      { type: 'turn', direction: 'right' } as Command,
    ]).flat()
    expect(runProgram(m, toProgram(flat)).outcome).toBe('SUCCESS')
    expect(starsFor(m, flat)).toBe(1)
  })
})
