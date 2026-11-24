import { describe, expect, it } from 'vitest'
import {
  canMoveTo,
  fromCommands,
  isHealthyTree,
  moveIntoRepeat,
  moveNode,
  moveOutOfRepeat,
  repeatTargetsFor,
  toCommands,
  unwrapRepeat,
  type EditorNode,
} from './ast'
import type { Command } from '../maze/types'
import { runProgram, toProgram } from '../maze/interpreter'
import { MISSIONS } from '../maze/missions'

const F = (n = 1): Command => ({ type: 'move', steps: n })
const L: Command = { type: 'turn', direction: 'left' }
const R: Command = { type: 'turn', direction: 'right' }
const loop = (times: number, ...c: Command[]): Command => ({ type: 'repeat', times, commands: c })

function build(cmds: Command[]) {
  const nodes = fromCommands(cmds)
  return { nodes, id: (path: number[]) => path.reduce<{ list: EditorNode[]; node?: EditorNode }>((acc, i) => {
    const node = acc.list[i]
    return { list: node?.type === 'repeat' ? node.commands : [], node }
  }, { list: nodes }).node!.id }
}

describe('restructuring existing blocks', () => {
  it('drags existing top-level blocks into an empty loop (the core v0.5 case)', () => {
    // Maju, Belok kanan, Maju, Belok kiri, then the player adds an empty Repeat.
    const { nodes, id } = build([F(), R, F(), L, { type: 'repeat', times: 2, commands: [] }])
    const loopId = id([4])
    let n = moveNode(nodes, id([0]), { list: loopId, index: 0 })
    n = moveNode(n, id([1]), { list: loopId, index: 1 })
    expect(toCommands(n)).toEqual([F(), L, loop(2, F(), R)])
    expect(isHealthyTree(n)).toBe(true)
  })

  it('moves a block out of a loop to right after it', () => {
    const { nodes, id } = build([loop(3, F(), R), L])
    const n = moveOutOfRepeat(nodes, id([0, 1]))
    expect(toCommands(n)).toEqual([loop(3, F()), R, L])
  })

  it('moves a block between loops and keeps its id', () => {
    const { nodes, id } = build([loop(2, F(), R), loop(3, L)])
    const moving = id([0, 1])
    const n = moveIntoRepeat(nodes, moving, id([1]))
    expect(toCommands(n)).toEqual([loop(2, F()), loop(3, L, R)])
    const ids = JSON.stringify(n)
    expect(ids.split(moving).length - 1).toBe(1)
  })

  it('reorders within the same list (down and up)', () => {
    const { nodes, id } = build([F(1), F(2), F(3)])
    expect(toCommands(moveNode(nodes, id([0]), { list: null, index: 3 }))).toEqual([F(2), F(3), F(1)])
    expect(toCommands(moveNode(nodes, id([2]), { list: null, index: 0 }))).toEqual([F(3), F(1), F(2)])
    expect(moveNode(nodes, id([1]), { list: null, index: 1 })).toBe(nodes)
    expect(moveNode(nodes, id([1]), { list: null, index: 2 })).toBe(nodes)
  })

  it('reorders children inside a loop', () => {
    const { nodes, id } = build([loop(2, F(1), L, F(2))])
    const n = moveNode(nodes, id([0, 2]), { list: id([0]), index: 0 })
    expect(toCommands(n)).toEqual([loop(2, F(2), F(1), L)])
  })

  it('refuses cycles: a loop cannot go inside itself or its child', () => {
    const { nodes, id } = build([loop(2, F(), loop(2, L))])
    expect(canMoveTo(nodes, id([0]), id([0]))).toBe(false)
    expect(canMoveTo(nodes, id([0]), id([0, 1]))).toBe(false)
    expect(moveNode(nodes, id([0]), { list: id([0, 1]), index: 0 })).toBe(nodes)
  })

  it('refuses nesting deeper than the limit', () => {
    const { nodes, id } = build([loop(2, loop(2, F())), loop(2, L)])
    // A repeat inside a repeat-in-repeat would be depth 3.
    expect(canMoveTo(nodes, id([1]), id([0, 0]))).toBe(false)
    expect(canMoveTo(nodes, id([1]), id([0]))).toBe(true)
  })

  it('unwraps a loop without losing the blocks inside', () => {
    const { nodes, id } = build([F(), loop(3, L, F(2)), R])
    expect(toCommands(unwrapRepeat(nodes, id([1])))).toEqual([F(), L, F(2), R])
  })

  it('lists valid destination loops', () => {
    const { nodes, id } = build([F(), loop(2, L), loop(2, loop(2, R))])
    const targets = repeatTargetsFor(nodes, id([0])).map((n) => n.id)
    expect(targets).toEqual([id([1]), id([2]), id([2, 0])])
    // A loop cannot go into the doubly nested one.
    expect(repeatTargetsFor(nodes, id([1])).map((n) => n.id)).toEqual([id([2])])
  })

  it('the simulator runs a restructured program correctly', () => {
    const m = MISSIONS.find((x) => x.allowRepeat)!
    const sol = fromCommands(m.solution)
    // Wrap every top-level block in a new loop and unwrap it again: same result.
    const wrapped: EditorNode[] = [{ id: 'wrap', type: 'repeat', times: 2, commands: [] }, ...sol]
    let n = wrapped
    for (const b of sol) if (canMoveTo(n, b.id, 'wrap')) n = moveIntoRepeat(n, b.id, 'wrap')
    n = unwrapRepeat(n, 'wrap')
    expect(toCommands(n)).toEqual(m.solution)
    expect(runProgram(m, toProgram(toCommands(n))).outcome).toBe('SUCCESS')
  })

  it('random restructuring never loses or duplicates blocks', () => {
    let seed = 7
    const rnd = (k: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed % k
    }
    for (let round = 0; round < 200; round++) {
      let n = fromCommands([F(1), loop(2, L, F(2)), R, loop(3, F(3), loop(2, R)), F(4)])
      const before = toCommands(n)
      const count = JSON.stringify(before).match(/"type"/g)!.length
      for (let k = 0; k < 8; k++) {
        const ids = JSON.stringify(n).match(/"id":"[^"]+"/g)!.map((s) => s.slice(6, -1))
        const lists = [null, ...ids]
        const src = ids[rnd(ids.length)]
        const target = lists[rnd(lists.length)]
        n = moveNode(n, src, { list: target, index: rnd(4) })
        expect(isHealthyTree(n)).toBe(true)
      }
      expect(JSON.stringify(toCommands(n)).match(/"type"/g)!.length).toBe(count)
    }
  })
})
