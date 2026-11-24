import type { Command, TurnDirection } from '../maze/types'
import { LIMITS } from '../maze/limits'

/**
 * Editor-side program representation: identical to the AST but every node
 * carries a stable id so React can animate insertions and reorders.
 */
export type EditorNode =
  | { id: string; type: 'move'; steps: number }
  | { id: string; type: 'turn'; direction: TurnDirection }
  | { id: string; type: 'repeat'; times: number; commands: EditorNode[] }

let counter = 0
export const newId = () => `n${Date.now().toString(36)}${(counter++).toString(36)}`

export function fromCommands(cmds: readonly Command[]): EditorNode[] {
  return cmds.map((c) =>
    c.type === 'repeat'
      ? { id: newId(), type: 'repeat', times: c.times, commands: fromCommands(c.commands) }
      : { ...c, id: newId() },
  )
}

export function toCommands(nodes: readonly EditorNode[]): Command[] {
  return nodes.map((n) => {
    if (n.type === 'repeat') return { type: 'repeat', times: n.times, commands: toCommands(n.commands) }
    if (n.type === 'move') return { type: 'move', steps: n.steps }
    return { type: 'turn', direction: n.direction }
  })
}

export type NewBlock = { type: 'move' } | { type: 'turn'; direction: TurnDirection } | { type: 'repeat' }

export function createNode(block: NewBlock): EditorNode {
  if (block.type === 'move') return { id: newId(), type: 'move', steps: 1 }
  if (block.type === 'turn') return { id: newId(), type: 'turn', direction: block.direction }
  return { id: newId(), type: 'repeat', times: 2, commands: [] }
}

/** Location of a list in the tree: null = top level, otherwise the id of the Repeat that owns it. */
export type ListTarget = string | null

function mapList(nodes: EditorNode[], target: ListTarget, fn: (list: EditorNode[]) => EditorNode[]): EditorNode[] {
  if (target === null) return fn(nodes)
  return nodes.map((n) =>
    n.type === 'repeat'
      ? n.id === target
        ? { ...n, commands: fn(n.commands) }
        : { ...n, commands: mapList(n.commands, target, fn) }
      : n,
  )
}

export function findParent(nodes: EditorNode[], id: string, parent: ListTarget = null): ListTarget | undefined {
  for (const n of nodes) {
    if (n.id === id) return parent
    if (n.type === 'repeat') {
      const p = findParent(n.commands, id, n.id)
      if (p !== undefined) return p
    }
  }
  return undefined
}

export function findNode(nodes: EditorNode[], id: string): EditorNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.type === 'repeat') {
      const f = findNode(n.commands, id)
      if (f) return f
    }
  }
  return undefined
}

export function depthOf(nodes: EditorNode[], target: ListTarget): number {
  if (target === null) return 0
  let d = 0
  let cur: ListTarget | undefined = target
  while (cur) {
    d += 1
    cur = findParent(nodes, cur)
  }
  return d
}

export function insertNode(nodes: EditorNode[], node: EditorNode, target: ListTarget = null, index?: number): EditorNode[] {
  return mapList(nodes, target, (list) => {
    const copy = [...list]
    copy.splice(index ?? copy.length, 0, node)
    return copy
  })
}

export function removeNode(nodes: EditorNode[], id: string): EditorNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => (n.type === 'repeat' ? { ...n, commands: removeNode(n.commands, id) } : n))
}

export function updateNode(nodes: EditorNode[], id: string, patch: Partial<{ steps: number; times: number; direction: TurnDirection }>): EditorNode[] {
  return nodes.map((n) => {
    if (n.id === id) {
      if (n.type === 'move' && patch.steps !== undefined)
        return { ...n, steps: clamp(patch.steps, LIMITS.move.min, LIMITS.move.max) }
      if (n.type === 'repeat' && patch.times !== undefined)
        return { ...n, times: clamp(patch.times, LIMITS.repeat.min, LIMITS.repeat.max) }
      if (n.type === 'turn' && patch.direction) return { ...n, direction: patch.direction }
      return n
    }
    return n.type === 'repeat' ? { ...n, commands: updateNode(n.commands, id, patch) } : n
  })
}

/** Move a node up (-1) or down (+1) within its own list. */
export function shiftNode(nodes: EditorNode[], id: string, delta: -1 | 1): EditorNode[] {
  const parent = findParent(nodes, id)
  if (parent === undefined) return nodes
  return mapList(nodes, parent, (list) => {
    const i = list.findIndex((n) => n.id === id)
    const j = i + delta
    if (i < 0 || j < 0 || j >= list.length) return list
    const copy = [...list]
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
    return copy
  })
}

/** Replace a list wholesale (used by drag-to-reorder). */
export function setList(nodes: EditorNode[], target: ListTarget, list: EditorNode[]): EditorNode[] {
  return mapList(nodes, target, () => list)
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(v)))
}

/** Map a trace command path (indices) to an editor node id. */
export function idAtPath(nodes: EditorNode[], path: readonly number[]): string | undefined {
  let list = nodes
  let node: EditorNode | undefined
  for (const i of path) {
    node = list[i]
    if (!node) return undefined
    list = node.type === 'repeat' ? node.commands : []
  }
  return node?.id
}

/** All ids along a command path, outermost first (so parent repeats can glow too). */
export function idsAlongPath(nodes: EditorNode[], path: readonly number[]): string[] {
  const ids: string[] = []
  let list = nodes
  for (const i of path) {
    const node = list[i]
    if (!node) break
    ids.push(node.id)
    list = node.type === 'repeat' ? node.commands : []
  }
  return ids
}

/** 1-based human step label for a node, e.g. "3" or "2.1". */
export function labelFor(nodes: EditorNode[], id: string, prefix = ''): string | undefined {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    const label = prefix ? `${prefix}.${i + 1}` : `${i + 1}`
    if (n.id === id) return label
    if (n.type === 'repeat') {
      const l = labelFor(n.commands, id, label)
      if (l) return l
    }
  }
  return undefined
}

export function labelForPath(path: readonly number[]): string {
  return path.map((i) => i + 1).join('.')
}

/* ------------------------- Restructuring (v0.5) ------------------------- */

/** Where a block can land: a list (top level or a Repeat body) and an index in it. */
export interface DropPosition {
  list: ListTarget
  /** Index in the target list as it looks BEFORE the dragged block is removed. */
  index: number
}

/** How many Repeat levels a node contains, counting itself (0 for move/turn). */
export function repeatDepthOf(node: EditorNode): number {
  if (node.type !== 'repeat') return 0
  return 1 + Math.max(0, ...node.commands.map(repeatDepthOf))
}

/** True when `id` is `ancestorId` or sits somewhere inside it. */
export function isInside(nodes: EditorNode[], id: string, ancestorId: string): boolean {
  const anc = findNode(nodes, ancestorId)
  if (!anc) return false
  if (anc.id === id) return true
  return anc.type === 'repeat' && findNode(anc.commands, id) !== undefined
}

export function indexOfNode(nodes: EditorNode[], id: string): number {
  const parent = findParent(nodes, id)
  if (parent === undefined) return -1
  const list = parent === null ? nodes : (findNode(nodes, parent) as Extract<EditorNode, { type: 'repeat' }>).commands
  return list.findIndex((n) => n.id === id)
}

/**
 * Whether `id` may move into list `target`: never into itself or its own
 * children (no cycles), and never deeper than the Repeat nesting limit.
 */
export function canMoveTo(nodes: EditorNode[], id: string, target: ListTarget): boolean {
  const node = findNode(nodes, id)
  if (!node) return false
  if (target !== null) {
    const t = findNode(nodes, target)
    if (!t || t.type !== 'repeat') return false
    if (isInside(nodes, target, id)) return false
  }
  return depthOf(nodes, target) + repeatDepthOf(node) <= LIMITS.maxRepeatDepth
}

/**
 * Move an existing block (with everything inside it) to a new place. The
 * same node object keeps its id, so nothing is duplicated or lost; an
 * invalid move returns the tree unchanged.
 */
export function moveNode(nodes: EditorNode[], id: string, to: DropPosition): EditorNode[] {
  const node = findNode(nodes, id)
  const from = findParent(nodes, id)
  if (!node || from === undefined || !canMoveTo(nodes, id, to.list)) return nodes
  const fromIndex = indexOfNode(nodes, id)
  let index = to.index
  if (from === to.list && fromIndex < index) index -= 1
  if (from === to.list && fromIndex === index) return nodes
  const without = removeNode(nodes, id)
  const listLen = to.list === null ? without.length : ((findNode(without, to.list) as Extract<EditorNode, { type: 'repeat' }>)?.commands.length ?? 0)
  return insertNode(without, node, to.list, Math.max(0, Math.min(index, listLen)))
}

/** Put a block at the end of a Repeat. */
export function moveIntoRepeat(nodes: EditorNode[], id: string, repeatId: string): EditorNode[] {
  const r = findNode(nodes, repeatId)
  if (!r || r.type !== 'repeat') return nodes
  return moveNode(nodes, id, { list: repeatId, index: r.commands.length })
}

/** Take a block out of its Repeat and place it right after that Repeat. */
export function moveOutOfRepeat(nodes: EditorNode[], id: string): EditorNode[] {
  const parent = findParent(nodes, id)
  if (!parent) return nodes
  const grand = findParent(nodes, parent)
  if (grand === undefined) return nodes
  return moveNode(nodes, id, { list: grand, index: indexOfNode(nodes, parent) + 1 })
}

/** Remove a Repeat but keep the blocks that were inside it, in place. */
export function unwrapRepeat(nodes: EditorNode[], id: string): EditorNode[] {
  const r = findNode(nodes, id)
  const parent = findParent(nodes, id)
  if (!r || r.type !== 'repeat' || parent === undefined) return nodes
  const replace = (list: EditorNode[]) => list.flatMap((n) => (n.id === id ? r.commands : [n]))
  return mapListPublic(nodes, parent, replace)
}

function mapListPublic(nodes: EditorNode[], target: ListTarget, fn: (list: EditorNode[]) => EditorNode[]): EditorNode[] {
  if (target === null) return fn(nodes)
  return nodes.map((n) =>
    n.type === 'repeat'
      ? n.id === target
        ? { ...n, commands: fn(n.commands) }
        : { ...n, commands: mapListPublic(n.commands, target, fn) }
      : n,
  )
}

/** Repeats a block could be moved into (excluding the one it is already in). */
export function repeatTargetsFor(nodes: EditorNode[], id: string): EditorNode[] {
  const out: EditorNode[] = []
  const parent = findParent(nodes, id)
  const walk = (list: EditorNode[]) => {
    for (const n of list) {
      if (n.type !== 'repeat') continue
      if (n.id !== parent && canMoveTo(nodes, id, n.id)) out.push(n)
      walk(n.commands)
    }
  }
  walk(nodes)
  return out
}

/** Every id in the tree, depth first. */
export function allIds(nodes: EditorNode[]): string[] {
  return nodes.flatMap((n) => [n.id, ...(n.type === 'repeat' ? allIds(n.commands) : [])])
}

/** Structural sanity check used by tests and after every drag: unique ids, depth limit. */
export function isHealthyTree(nodes: EditorNode[]): boolean {
  const ids = allIds(nodes)
  if (new Set(ids).size !== ids.length) return false
  return Math.max(0, ...nodes.map(repeatDepthOf)) <= LIMITS.maxRepeatDepth
}
