import { ArrowUp, CornerUpLeft, CornerUpRight, Lock, Repeat2 } from 'lucide-react'
import type { ReactNode } from 'react'
import type { EditorNode } from './ast'

export function BlockIcon({ node, size = 18 }: { node: Pick<EditorNode, 'type'> & { direction?: string }; size?: number }) {
  if (node.type === 'move') return <ArrowUp size={size} strokeWidth={2.8} aria-hidden />
  if (node.type === 'turn')
    return node.direction === 'left' ? (
      <CornerUpLeft size={size} strokeWidth={2.8} aria-hidden />
    ) : (
      <CornerUpRight size={size} strokeWidth={2.8} aria-hidden />
    )
  return <Repeat2 size={size} strokeWidth={2.6} aria-hidden />
}

export function LockedBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-ink-muted">
      <Lock size={12} aria-hidden />
      {children}
    </span>
  )
}
