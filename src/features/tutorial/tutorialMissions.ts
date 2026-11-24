import type { Cell, Mission } from '../maze/types'

const row = (y: number, n: number): Cell[] => Array.from({ length: n }, (_, x) => ({ x, y }))

/**
 * Tiny practice boards used only by the first-time tutorial. They are NOT
 * levels: no stars, no progress records, nothing synced to the cloud.
 */
const base = {
  world: 1 as const,
  number: 0,
  title: '',
  goalText: '',
  tip: '',
  allowRepeat: false,
  par: 1,
  starterCommands: [],
  failureFixtures: [],
}

export const TUTORIAL_MOVE: Mission = {
  ...base,
  id: 'tutorial-move',
  cols: 3,
  rows: 3,
  start: { x: 0, y: 1, dir: 'E' },
  goal: { x: 1, y: 1 },
  walls: [],
  solution: [{ type: 'move', steps: 1 }],
}

export const TUTORIAL_TURN: Mission = {
  ...base,
  id: 'tutorial-turn',
  cols: 3,
  rows: 3,
  start: { x: 1, y: 0, dir: 'E' },
  goal: { x: 1, y: 1 },
  walls: [{ x: 2, y: 0 }],
  solution: [
    { type: 'turn', direction: 'right' },
    { type: 'move', steps: 1 },
  ],
}

export const TUTORIAL_LOOP: Mission = {
  ...base,
  id: 'tutorial-loop',
  world: 2,
  allowRepeat: true,
  cols: 5,
  rows: 5,
  start: { x: 0, y: 2, dir: 'E' },
  goal: { x: 4, y: 2 },
  walls: [...row(1, 5), ...row(3, 5)],
  solution: [{ type: 'repeat', times: 4, commands: [{ type: 'move', steps: 1 }] }],
}
