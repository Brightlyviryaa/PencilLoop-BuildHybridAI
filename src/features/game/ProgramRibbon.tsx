import { ListChecks } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useT } from '../../i18n'
import { BLOCK_STYLE, blockText } from '../editor/blockMeta'
import { BlockIcon } from '../editor/blocks'
import type { EditorNode } from '../editor/ast'

function flatten(nodes: EditorNode[], depth = 0): { node: EditorNode; depth: number }[] {
  return nodes.flatMap((n) => [{ node: n, depth }, ...(n.type === 'repeat' ? flatten(n.commands, depth + 1) : [])])
}

/**
 * Compact one-line view of the program on the map. While Pip runs it shows
 * which block is executing; tapping it opens the full plan editor.
 */
export function ProgramRibbon({
  nodes,
  activeIds,
  failedId,
  onOpen,
  reduced,
}: {
  nodes: EditorNode[]
  activeIds: Set<string>
  failedId: string | null
  onOpen: () => void
  reduced: boolean
}) {
  const t = useT()
  const ref = useRef<HTMLOListElement>(null)
  const flat = flatten(nodes)

  useEffect(() => {
    const id = [...activeIds].at(-1) ?? failedId
    if (!id) return
    const el = ref.current?.querySelector<HTMLElement>(`[data-chip="${id}"]`)
    el?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', inline: 'center', block: 'nearest' })
  }, [activeIds, failedId, reduced])

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-2 rounded-[18px] bg-white/90 py-1.5 pl-1.5 pr-2 text-left shadow-[0_1px_0_rgb(23_37_84/0.06),0_6px_18px_-12px_rgb(23_37_84/0.35)]"
      aria-label={t.editor.openPlan}
      data-testid="program-ribbon"
    >
      <ol ref={ref} className="no-scrollbar flex min-h-[40px] min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label={t.game.timeline}>
        {flat.length === 0 && <li className="px-2 text-sm font-semibold text-ink-muted">{t.game.emptyTray}</li>}
        {flat.map(({ node, depth }) => {
          const active = activeIds.has(node.id)
          const failed = failedId === node.id
          return (
            <li key={node.id} data-chip={node.id} className="flex shrink-0 items-center">
              {depth > 0 && <span className="mr-0.5 h-6 w-1 rounded-full bg-mint" aria-hidden />}
              <span
                className={`flex h-10 items-center gap-1 rounded-[12px] px-2 font-display text-[14px] font-black transition-[transform,background-color] duration-150 ${
                  failed ? 'bg-danger text-white' : active ? 'scale-110 bg-orange text-ink shadow-md' : BLOCK_STYLE[node.type].soft
                }`}
                aria-label={blockText(node, t)}
              >
                <BlockIcon node={node} size={16} />
                <span className="tabular">{node.type === 'move' ? node.steps : node.type === 'repeat' ? `${node.times}x` : t.blocks.short[node.direction]}</span>
              </span>
            </li>
          )
        })}
      </ol>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-primary-50 text-primary" aria-hidden>
        <ListChecks size={20} />
      </span>
    </button>
  )
}
