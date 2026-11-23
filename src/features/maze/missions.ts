import type { Cell, Mission } from './types'

const cells = (...pairs: [number, number][]): Cell[] => pairs.map(([x, y]) => ({ x, y }))

/**
 * Static, versioned mission data. Coordinates: x grows to the right, y grows
 * downward; (0,0) is the top-left square. Every mission's `solution` is
 * verified by unit tests.
 */
export const MISSIONS: Mission[] = [
  {
    id: 'first-steps',
    world: 1,
    number: 1,
    title: 'First Steps',
    goalText: 'Guide Pip to the flag in the top corner.',
    tip: 'Pip moves the way its nose points. Turn first, then move!',
    cols: 5,
    rows: 5,
    start: { x: 0, y: 4, dir: 'E' },
    goal: { x: 3, y: 1 },
    walls: cells([1, 2], [4, 3]),
    allowRepeat: false,
    par: 3,
    starterCommands: [{ type: 'move', steps: 3 }],
    solution: [
      { type: 'move', steps: 3 },
      { type: 'turn', direction: 'left' },
      { type: 'move', steps: 3 },
    ],
    failureFixtures: [
      {
        commands: [
          { type: 'move', steps: 3 },
          { type: 'turn', direction: 'right' },
          { type: 'move', steps: 3 },
        ],
        outcome: 'COLLISION',
        failedAtStep: 5,
      },
      { commands: [{ type: 'move', steps: 2 }], outcome: 'INCOMPLETE' },
      { commands: [{ type: 'move', steps: 5 }], outcome: 'COLLISION', failedAtStep: 5 },
    ],
  },
  {
    id: 'around-the-blocks',
    world: 1,
    number: 2,
    title: 'Around the Blocks',
    goalText: 'Weave around the blocks to reach the flag.',
    tip: 'Count the squares before each turn. Watch which way Pip faces after turning.',
    cols: 6,
    rows: 6,
    start: { x: 0, y: 5, dir: 'N' },
    goal: { x: 5, y: 0 },
    walls: cells([0, 2], [1, 2], [2, 2], [4, 3], [3, 5], [5, 2], [1, 0], [4, 1], [5, 4]),
    allowRepeat: false,
    par: 7,
    starterCommands: [
      { type: 'move', steps: 2 },
      { type: 'turn', direction: 'right' },
    ],
    solution: [
      { type: 'move', steps: 2 },
      { type: 'turn', direction: 'right' },
      { type: 'move', steps: 3 },
      { type: 'turn', direction: 'left' },
      { type: 'move', steps: 3 },
      { type: 'turn', direction: 'right' },
      { type: 'move', steps: 2 },
    ],
    failureFixtures: [
      { commands: [{ type: 'move', steps: 3 }], outcome: 'COLLISION', failedAtStep: 3 },
      {
        commands: [
          { type: 'move', steps: 2 },
          { type: 'turn', direction: 'left' },
          { type: 'move', steps: 1 },
        ],
        outcome: 'COLLISION',
        failedAtStep: 4,
      },
      {
        commands: [
          { type: 'move', steps: 2 },
          { type: 'turn', direction: 'right' },
          { type: 'move', steps: 4 },
        ],
        outcome: 'COLLISION',
        failedAtStep: 7,
      },
    ],
  },
  {
    id: 'smart-loop',
    world: 1,
    number: 3,
    title: 'The Smart Loop',
    goalText: 'Climb the staircase to the flag — can a Repeat do the work?',
    tip: 'Spot the pattern that keeps happening, then put it inside a Repeat block.',
    cols: 6,
    rows: 6,
    start: { x: 0, y: 5, dir: 'E' },
    goal: { x: 5, y: 0 },
    walls: cells([2, 5], [3, 4], [4, 3], [5, 2], [0, 4], [1, 3], [2, 2], [3, 1], [4, 0]),
    allowRepeat: true,
    par: 5,
    starterCommands: [
      {
        type: 'repeat',
        times: 2,
        commands: [
          { type: 'move', steps: 1 },
          { type: 'turn', direction: 'left' },
        ],
      },
    ],
    solution: [
      {
        type: 'repeat',
        times: 5,
        commands: [
          { type: 'move', steps: 1 },
          { type: 'turn', direction: 'left' },
          { type: 'move', steps: 1 },
          { type: 'turn', direction: 'right' },
        ],
      },
    ],
    failureFixtures: [
      {
        commands: [
          {
            type: 'repeat',
            times: 5,
            commands: [
              { type: 'move', steps: 1 },
              { type: 'turn', direction: 'left' },
              { type: 'move', steps: 1 },
              { type: 'turn', direction: 'left' },
            ],
          },
        ],
        outcome: 'COLLISION',
        failedAtStep: 5,
      },
      {
        commands: [
          {
            type: 'repeat',
            times: 3,
            commands: [
              { type: 'move', steps: 1 },
              { type: 'turn', direction: 'left' },
              { type: 'move', steps: 1 },
              { type: 'turn', direction: 'right' },
            ],
          },
        ],
        outcome: 'INCOMPLETE',
      },
      { commands: [{ type: 'move', steps: 2 }], outcome: 'COLLISION', failedAtStep: 2 },
    ],
  },
  {
    id: 'pond-patrol',
    number: 4,
    world: 2,
    title: 'Pond Patrol',
    goalText: 'Walk all the way around the pond to the flag.',
    tip: 'Same move, same turn, again and again. That sounds like a Repeat!',
    cols: 6,
    rows: 6,
    start: { x: 0, y: 5, dir: 'N' },
    goal: { x: 5, y: 5 },
    walls: cells([1, 1], [1, 2], [1, 3], [1, 4], [2, 1], [2, 2], [2, 3], [2, 4], [3, 1], [3, 2], [3, 3], [3, 4], [4, 1], [4, 2], [4, 3], [4, 4], [1, 5], [2, 5], [3, 5], [4, 5]),
    allowRepeat: true,
    par: 3,
    starterCommands: [{ type: 'move', steps: 5 }],
    solution: [{ type: 'repeat', times: 3, commands: [{ type: 'move', steps: 5 }, { type: 'turn', direction: 'right' }] }],
    failureFixtures: [
      { commands: [{ type: 'move', steps: 5 }, { type: 'turn', direction: 'left' }, { type: 'move', steps: 1 }], outcome: 'COLLISION', failedAtStep: 7 },
      { commands: [{ type: 'repeat', times: 2, commands: [{ type: 'move', steps: 5 }, { type: 'turn', direction: 'right' }] }], outcome: 'INCOMPLETE' },
      { commands: [{ type: 'move', steps: 1 }, { type: 'turn', direction: 'right' }, { type: 'move', steps: 1 }], outcome: 'COLLISION', failedAtStep: 3 },
    ],
  },
  {
    id: 'mirror-stairs',
    number: 5,
    world: 2,
    title: 'Mirror Stairs',
    goalText: 'Climb the stairs the other way to reach the flag.',
    tip: 'Which way does Pip turn first this time? Look before you copy!',
    cols: 6,
    rows: 6,
    start: { x: 5, y: 5, dir: 'W' },
    goal: { x: 0, y: 0 },
    walls: cells([3, 5], [2, 4], [1, 3], [0, 2], [5, 4], [4, 3], [3, 2], [2, 1], [1, 0]),
    allowRepeat: true,
    par: 5,
    starterCommands: [
      { type: 'repeat', times: 2, commands: [{ type: 'move', steps: 1 }, { type: 'turn', direction: 'left' }, { type: 'move', steps: 1 }, { type: 'turn', direction: 'right' }] },
    ],
    solution: [
      { type: 'repeat', times: 5, commands: [{ type: 'move', steps: 1 }, { type: 'turn', direction: 'right' }, { type: 'move', steps: 1 }, { type: 'turn', direction: 'left' }] },
    ],
    failureFixtures: [
      {
        commands: [{ type: 'repeat', times: 5, commands: [{ type: 'move', steps: 1 }, { type: 'turn', direction: 'left' }, { type: 'move', steps: 1 }, { type: 'turn', direction: 'right' }] }],
        outcome: 'COLLISION',
        failedAtStep: 3,
      },
      {
        commands: [{ type: 'repeat', times: 4, commands: [{ type: 'move', steps: 1 }, { type: 'turn', direction: 'right' }, { type: 'move', steps: 1 }, { type: 'turn', direction: 'left' }] }],
        outcome: 'INCOMPLETE',
      },
      { commands: [{ type: 'move', steps: 2 }], outcome: 'COLLISION', failedAtStep: 2 },
    ],
  },
  {
    id: 'winding-road',
    number: 6,
    world: 2,
    title: 'Winding Road',
    goalText: 'Follow the winding road all the way to the flag.',
    tip: 'Find the four steps that happen twice. The moves are bigger here!',
    cols: 6,
    rows: 6,
    start: { x: 0, y: 5, dir: 'E' },
    goal: { x: 4, y: 1 },
    walls: cells([2, 0], [3, 0], [4, 0], [1, 1], [2, 1], [3, 1], [5, 1], [0, 2], [1, 2], [2, 2], [3, 2], [5, 2], [0, 3], [1, 3], [5, 3], [0, 4], [1, 4], [3, 4], [4, 4], [3, 5], [4, 5]),
    allowRepeat: true,
    par: 5,
    starterCommands: [{ type: 'move', steps: 2 }],
    solution: [
      { type: 'repeat', times: 2, commands: [{ type: 'move', steps: 2 }, { type: 'turn', direction: 'left' }, { type: 'move', steps: 2 }, { type: 'turn', direction: 'right' }] },
    ],
    failureFixtures: [
      { commands: [{ type: 'move', steps: 3 }], outcome: 'COLLISION', failedAtStep: 3 },
      {
        commands: [{ type: 'repeat', times: 2, commands: [{ type: 'move', steps: 2 }, { type: 'turn', direction: 'right' }, { type: 'move', steps: 2 }, { type: 'turn', direction: 'left' }] }],
        outcome: 'COLLISION',
        failedAtStep: 4,
      },
      {
        commands: [{ type: 'move', steps: 2 }, { type: 'turn', direction: 'left' }, { type: 'move', steps: 2 }],
        outcome: 'INCOMPLETE',
      },
    ],
  },
]

export function getMission(id: string | undefined): Mission | undefined {
  return MISSIONS.find((m) => m.id === id)
}

export function nextMission(id: string): Mission | undefined {
  const i = MISSIONS.findIndex((m) => m.id === id)
  return i >= 0 ? MISSIONS[i + 1] : undefined
}
