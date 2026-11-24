import { useEffect, useRef, useState } from 'react'
import { playSfx } from '../../app/hooks'
import type { EditorNode } from '../editor/ast'
import type { Mission } from '../maze/types'
import type { GameRunner } from './useGameRunner'

export type NudgeKind = 'emptyPlan' | 'useRepeat' | 'manyBumps'

/** Three or more identical move/turn blocks in a row at the top level. */
export function hasRepeatablePattern(nodes: EditorNode[]): boolean {
  let run = 1
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1]
    const b = nodes[i]
    const same = a.type !== 'repeat' && a.type === b.type && (a.type === 'move' ? a.steps === (b as typeof a).steps : a.direction === (b as typeof a).direction)
    run = same ? run + 1 : 1
    if (run >= 3) return true
  }
  // A repeated pair (A B A B) also counts.
  for (let i = 3; i < nodes.length; i++) {
    const k = (n: EditorNode) => (n.type === 'move' ? `m${n.steps}` : n.type === 'turn' ? `t${n.direction}` : 'r')
    if (k(nodes[i]) === k(nodes[i - 2]) && k(nodes[i - 1]) === k(nodes[i - 3]) && k(nodes[i]) !== 'r' && k(nodes[i - 1]) !== 'r') return true
  }
  return false
}

/**
 * Contextual help that appears only when a player seems stuck, never more
 * than once per kind per visit, and never as a big overlay on the maze.
 */
export function useNudge(g: GameRunner, mission: Mission, failedRuns: number, usedClue: boolean): [NudgeKind | null, () => void] {
  const [kind, setKind] = useState<NudgeKind | null>(null)
  const shown = useRef(new Set<NudgeKind>())
  const show = (k: NudgeKind) => {
    if (shown.current.has(k)) return
    shown.current.add(k)
    playSfx('hint')
    setKind(k)
  }
  const empty = g.nodes.length === 0 && g.status === 'idle'
  useEffect(() => {
    if (!empty) return
    const tm = setTimeout(() => show('emptyPlan'), 9000)
    return () => clearTimeout(tm)
  }, [empty])
  useEffect(() => {
    if (mission.allowRepeat && !g.nodes.some((n) => n.type === 'repeat') && hasRepeatablePattern(g.nodes)) show('useRepeat')
  }, [g.nodes, mission.allowRepeat])
  useEffect(() => {
    if (failedRuns >= 3 && !usedClue) show('manyBumps')
  }, [failedRuns, usedClue])
  // The empty-plan tip disappears by itself as soon as there is a block.
  const visible = kind === 'emptyPlan' && !empty ? null : kind
  return [visible, () => setKind(null)]
}

