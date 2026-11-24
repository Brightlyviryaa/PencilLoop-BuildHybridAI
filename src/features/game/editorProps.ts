import type { PlanEditorProps } from '../editor/PlanEditor'
import type { GameRunner } from './useGameRunner'

/** Props for <PlanEditor> derived from the game runner. */
export function editorPropsFor(g: GameRunner, activeIds: Set<string>, failedId: string | null, reduced: boolean): Omit<PlanEditorProps, 'density' | 'empty'> {
  return {
    nodes: g.nodes,
    activeIds,
    failedId,
    target: g.target,
    onTarget: g.setTarget,
    onPatch: g.patch,
    onRemove: g.remove,
    onMove: g.move,
    onMoveInto: g.moveInto,
    onMoveOut: g.moveOut,
    onUnwrap: g.unwrap,
    reduced,
  }
}

