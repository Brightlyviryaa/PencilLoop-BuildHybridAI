import { AnimatePresence, motion } from 'motion/react'
import { Camera, ChevronDown, Play, Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { playSfx } from '../../app/hooks'
import { Button } from '../../components/Button'
import { useT } from '../../i18n'
import { springSheet } from '../../styles/motion'
import { PlanEditor } from '../editor/PlanEditor'
import { BoardPreview } from '../maze/BoardPreview'
import { LIMITS } from '../maze/limits'
import { missionText } from '../maze/missionText'
import type { Mission } from '../maze/types'
import { editorPropsFor } from './editorProps'
import { DragHint, Palette, TargetBanner, UndoRedo } from './PlanTools'
import type { GameRunner } from './useGameRunner'

/**
 * Phone plan editor: a full-screen workspace (not a short bottom sheet) so
 * blocks are big, loops have room, and dragging has space. The maze stays
 * one tap away and Run sends the player straight back to it.
 */
export function PlanScreen({
  open,
  onClose,
  g,
  mission,
  activeIds,
  failedId,
  reduced,
  onRun,
  onScan,
}: {
  open: boolean
  onClose: () => void
  g: GameRunner
  mission: Mission
  activeIds: Set<string>
  failedId: string | null
  reduced: boolean
  onRun: () => void
  onScan: () => void
}) {
  const t = useT()
  const mt = missionText(t, mission)
  const panel = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    returnFocus.current = document.activeElement as HTMLElement | null
    playSfx('sheet-open')
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const raf = requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus())
    const onKey = (e: KeyboardEvent) => {
      // Another dialog (scan, hint, settings) on top of the editor handles its own Escape.
      const onTop = document.querySelectorAll('[role="dialog"][aria-modal="true"]').length > 1
      if (e.key === 'Escape' && !onTop && !document.querySelector('[data-testid="plan-editor"][data-dragging]')) onClose()
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) g.redo()
        else g.undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      returnFocus.current?.focus?.({ preventScroll: true })
    }
  }, [open, onClose, g])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-label={t.game.plan}
          className="fixed inset-0 z-[45] flex flex-col bg-cloud"
          initial={reduced ? { opacity: 0 } : { y: '100%' }}
          animate={reduced ? { opacity: 1 } : { y: 0 }}
          exit={reduced ? { opacity: 0 } : { y: '100%' }}
          transition={reduced ? { duration: 0.12 } : springSheet}
          data-testid="plan-screen"
        >
          {/* header */}
          <header className="pt-safe-12 flex items-center gap-1 border-b border-line/60 bg-white px-2 pb-1.5">
            <Button variant="ghost" size="md" onClick={onClose} icon={<ChevronDown size={24} aria-hidden />} className="!px-2" data-autofocus data-testid="plan-close" aria-label={t.editor.backToMap}>
              <span className="text-[15px]">{t.editor.mapShort}</span>
            </Button>
            <div className="min-w-0 flex-1 text-center">
              <h2 className="truncate text-[18px] font-black leading-tight">{t.game.plan}</h2>
              <p className="tabular text-[12px] font-bold text-ink-muted" data-testid="plan-count">
                {t.game.blocksCount(g.nodeCount, LIMITS.maxNodes)}
              </p>
            </div>
            <UndoRedo g={g} />
          </header>

          {/* goal reminder with a small map, so the maze is never out of mind */}
          <div className="flex items-center gap-3 bg-white px-3 pb-2.5 pt-2">
            <div className="w-[76px] shrink-0">
              <BoardPreview mission={mission} max={76} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[11px] font-extrabold uppercase tracking-wider text-primary">{t.editor.goal}</p>
              <p className="font-display text-[14px] font-extrabold leading-snug">{mt.goal}</p>
              <p className="text-[12px] font-semibold text-ink-muted">{t.game.par(mission.par)}</p>
            </div>
          </div>

          {/* program */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-6 pt-3" data-testid="plan-scroll">
            <DragHint touch show={g.nodes.length > 1} />
            <PlanEditor
              {...editorPropsFor(g, activeIds, failedId, reduced)}
              density="touch"
              empty={
                <div className="grid place-items-center rounded-[20px] border-2 border-dashed border-line px-6 py-8 text-center">
                  <p className="font-display text-lg font-extrabold">{t.game.emptyTitle}</p>
                  <p className="mt-1 max-w-xs text-sm text-ink-muted">{t.game.emptyTrayOpen}</p>
                </div>
              }
            />
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button variant="secondary" size="sm" onClick={onScan} icon={<Camera size={16} aria-hidden />} data-testid="scan-button-mobile">
                {t.editor.scanPlan}
              </Button>
              {g.nodes.length > 0 && (
                <Button variant="ghost" size="sm" onClick={g.clearAll} icon={<Trash2 size={16} aria-hidden />} data-testid="clear-plan">
                  {t.editor.clearAll}
                </Button>
              )}
            </div>
          </div>

          {/* dock: add blocks + run */}
          <div className="pb-safe border-t border-line/60 bg-white px-3 pt-2.5 shadow-[0_-10px_24px_-18px_rgb(23_37_84/0.4)]">
            <TargetBanner g={g} />
            <div className="mt-1">
              <Palette g={g} mission={mission} />
            </div>
            <Button
              size="lg"
              block
              className="mb-2 mt-2.5"
              onClick={onRun}
              disabled={g.nodes.length === 0}
              icon={<Play size={22} fill="currentColor" aria-hidden />}
              sound={false}
              data-testid="plan-run"
            >
              {t.game.run}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function PlanCountBadge({ n }: { n: number }) {
  return (
    <span className="tabular grid h-6 min-w-6 place-items-center rounded-full bg-orange px-1.5 font-display text-[13px] font-black text-ink" aria-hidden>
      {n}
    </span>
  )
}

