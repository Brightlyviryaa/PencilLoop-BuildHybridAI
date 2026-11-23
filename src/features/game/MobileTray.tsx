import { motion } from 'motion/react'
import { ChevronUp, Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { CommandPalette } from '../editor/CommandPalette'
import { ProgramList, type ProgramListProps } from '../editor/ProgramList'
import { BlockIcon } from '../editor/blocks'
import { BLOCK_STYLE, blockText } from '../editor/blockMeta'
import { depthOf, type EditorNode } from '../editor/ast'
import { LIMITS } from '../maze/limits'
import type { Mission } from '../maze/types'
import { springSheet } from '../../styles/motion'
import { useT } from '../../i18n'
import type { GameRunner } from './useGameRunner'

interface Props {
  g: GameRunner
  mission: Mission
  expanded: boolean
  onExpanded: (v: boolean) => void
  listProps: Omit<ProgramListProps, 'nodes'>
  reduced: boolean
}

/** Flatten top-level + nested blocks into a compact horizontal timeline. */
function flatten(nodes: EditorNode[], depth = 0): { node: EditorNode; depth: number }[] {
  return nodes.flatMap((n) => [{ node: n, depth }, ...(n.type === 'repeat' ? flatten(n.commands, depth + 1) : [])])
}

export function MobileTray({ g, mission, expanded, onExpanded, listProps, reduced }: Props) {
  const t = useT()
  const timelineRef = useRef<HTMLOListElement>(null)
  const flat = flatten(g.nodes)

  // Keep the running block visible in the collapsed timeline.
  useEffect(() => {
    const id = [...listProps.activeIds].at(-1) ?? listProps.failedId
    if (!id || expanded) return
    const el = timelineRef.current?.querySelector<HTMLElement>(`[data-chip="${id}"]`)
    el?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', inline: 'center', block: 'nearest' })
  }, [listProps.activeIds, listProps.failedId, expanded, reduced])

  return (
    <motion.section
      layout={reduced ? false : 'size'}
      transition={springSheet}
      className="relative z-[1] mx-3 flex min-h-0 flex-col overflow-hidden rounded-[24px] border border-line bg-white shadow-[var(--shadow-soft)]"
      aria-label={t.game.editor}
      data-testid="mobile-tray"
      data-expanded={expanded}
      style={{ maxHeight: expanded ? '46dvh' : undefined }}
    >
      <div className="flex items-center gap-2 px-3 pt-2">
        <button
          type="button"
          onClick={() => onExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls="tray-body"
          className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[12px] px-1 text-left"
          data-testid="tray-toggle"
        >
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.22 }} className="grid h-8 w-8 place-items-center rounded-full bg-primary-50 text-primary">
            <ChevronUp size={18} strokeWidth={3} aria-hidden />
          </motion.span>
          <span className="font-display text-[16px] font-extrabold">{t.game.plan}</span>
          <span className="tabular text-sm font-semibold text-ink-muted">
            {t.game.blocksCount(g.nodeCount, LIMITS.maxNodes)}
          </span>
        </button>
        {expanded && g.nodes.length > 0 && (
          <button
            type="button"
            onClick={g.clearAll}
            className="flex h-11 items-center gap-1.5 rounded-[12px] px-2.5 text-sm font-bold text-ink-muted hover:bg-danger-50 hover:text-danger"
          >
            <Trash2 size={16} aria-hidden /> {t.game.clear}
          </button>
        )}
      </div>

      <div id="tray-body" className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3 pt-1.5">
        {!expanded && (
          <ol ref={timelineRef} className="no-scrollbar -mx-1 flex min-h-[46px] gap-1.5 overflow-x-auto px-1" aria-label={t.game.timeline}>
            {flat.length === 0 && <li className="flex items-center px-1 text-sm text-ink-muted">{t.game.emptyTray}</li>}
            {flat.map(({ node, depth }) => {
              const active = listProps.activeIds.has(node.id)
              const failed = listProps.failedId === node.id
              return (
                <li key={node.id} data-chip={node.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      listProps.onSelect(node.id)
                      onExpanded(true)
                    }}
                    className={`flex h-[44px] items-center gap-1 rounded-[12px] border-2 px-2 font-display text-[13px] font-extrabold transition-colors ${
                      failed ? 'border-danger bg-danger-50' : active ? 'border-orange bg-orange-50' : 'border-transparent ' + BLOCK_STYLE[node.type].soft
                    } ${depth ? 'ml-0.5' : ''}`}
                    aria-label={t.game.tapToEdit(blockText(node, t), depth > 0)}
                  >
                    {depth > 0 && <span className="h-5 w-0.5 rounded bg-mint" aria-hidden />}
                    <BlockIcon node={node} size={16} />
                    <span className="tabular">{node.type === 'move' ? node.steps : node.type === 'repeat' ? `${node.times}x` : t.blocks.short[node.direction]}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        )}

        <CommandPalette
          allowRepeat={mission.allowRepeat}
          onAdd={g.add}
          compact
          disabled={!g.canAdd}
          repeatBlocked={depthOf(g.nodes, g.target) >= LIMITS.maxRepeatDepth}
        />

        {expanded && (
          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-1 pt-1">
            {g.target && (
              <p className="mb-2 rounded-[10px] bg-mint-50 px-3 py-2 text-[13px] font-bold text-mint-700">
                {t.game.insideRepeat}{' '}
                <button type="button" className="underline" onClick={() => g.setTarget(null)}>
                  {t.game.addToMain}
                </button>
              </p>
            )}
            {g.nodes.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">{t.game.emptyTrayOpen}</p>
            ) : (
              <ProgramList nodes={g.nodes} {...listProps} />
            )}
          </div>
        )}
      </div>
    </motion.section>
  )
}
