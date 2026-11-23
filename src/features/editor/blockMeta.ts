import type { Dict } from '../../i18n'
import type { EditorNode } from './ast'

export const BLOCK_STYLE = {
  move: { chip: 'bg-primary text-white', soft: 'bg-primary-50 text-primary', ring: 'ring-primary/30', bar: 'bg-primary' },
  turn: { chip: 'bg-orange text-ink', soft: 'bg-orange-50 text-orange-600', ring: 'ring-orange/40', bar: 'bg-orange' },
  repeat: { chip: 'bg-mint text-ink', soft: 'bg-mint-50 text-mint-700', ring: 'ring-mint/50', bar: 'bg-mint' },
} as const

export function blockText(n: EditorNode, t: Dict): string {
  if (n.type === 'move') return t.blocks.text.move(n.steps)
  if (n.type === 'turn') return t.blocks.turn(n.direction)
  return t.blocks.text.repeat(n.times)
}

export function blockAria(n: EditorNode, t: Dict): string {
  if (n.type === 'move') return t.blocks.aria.move(n.steps)
  if (n.type === 'turn') return t.blocks.turn(n.direction)
  return t.blocks.aria.repeat(n.times, n.commands.length)
}
