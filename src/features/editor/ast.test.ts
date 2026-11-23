import { describe, expect, it } from 'vitest'
import {
  createNode,
  depthOf,
  fromCommands,
  idAtPath,
  idsAlongPath,
  insertNode,
  labelFor,
  removeNode,
  shiftNode,
  toCommands,
  updateNode,
} from './ast'
import type { Command } from '../maze/types'

const sample: Command[] = [
  { type: 'move', steps: 2 },
  { type: 'repeat', times: 3, commands: [{ type: 'turn', direction: 'left' }, { type: 'move', steps: 1 }] },
]

describe('editor AST operations', () => {
  it('round-trips commands through editor nodes', () => {
    expect(toCommands(fromCommands(sample))).toEqual(sample)
  })

  it('inserts at top level and inside a repeat', () => {
    let nodes = fromCommands(sample)
    nodes = insertNode(nodes, createNode({ type: 'turn', direction: 'right' }))
    const repeatId = nodes[1].id
    nodes = insertNode(nodes, createNode({ type: 'move' }), repeatId)
    expect(toCommands(nodes)).toEqual([
      { type: 'move', steps: 2 },
      {
        type: 'repeat',
        times: 3,
        commands: [{ type: 'turn', direction: 'left' }, { type: 'move', steps: 1 }, { type: 'move', steps: 1 }],
      },
      { type: 'turn', direction: 'right' },
    ])
    expect(depthOf(nodes, repeatId)).toBe(1)
  })

  it('removes nested nodes', () => {
    const nodes = fromCommands(sample)
    const inner = (nodes[1] as Extract<(typeof nodes)[number], { type: 'repeat' }>).commands[0].id
    expect(toCommands(removeNode(nodes, inner))).toEqual([
      { type: 'move', steps: 2 },
      { type: 'repeat', times: 3, commands: [{ type: 'move', steps: 1 }] },
    ])
  })

  it('clamps edits to the allowed ranges', () => {
    const nodes = fromCommands(sample)
    const moved = updateNode(nodes, nodes[0].id, { steps: 42 })
    expect(toCommands(moved)[0]).toEqual({ type: 'move', steps: 5 })
    const looped = updateNode(nodes, nodes[1].id, { times: 0 })
    expect((toCommands(looped)[1] as { times: number }).times).toBe(2)
  })

  it('reorders within the same list and ignores out-of-range moves', () => {
    const nodes = fromCommands(sample)
    expect(toCommands(shiftNode(nodes, nodes[0].id, 1))[0].type).toBe('repeat')
    expect(shiftNode(nodes, nodes[0].id, -1)).toBe(nodes)
  })

  it('maps trace paths to ids and human labels', () => {
    const nodes = fromCommands(sample)
    const inner = idAtPath(nodes, [1, 1])
    expect(inner).toBeDefined()
    expect(idsAlongPath(nodes, [1, 1])).toEqual([nodes[1].id, inner])
    expect(labelFor(nodes, inner!)).toBe('2.2')
    expect(idAtPath(nodes, [9])).toBeUndefined()
  })
})
