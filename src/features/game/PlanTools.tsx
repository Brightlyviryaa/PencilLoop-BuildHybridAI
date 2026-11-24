import { AnimatePresence, motion } from 'motion/react'
import { Hand, Redo2, Undo2, X } from 'lucide-react'
import { IconButton } from '../../components/Button'
import { useDevicePrefs } from '../../app/devicePrefs'
import { useT } from '../../i18n'
import { CommandPalette } from '../editor/CommandPalette'
import { depthOf, findNode } from '../editor/ast'
import { LIMITS } from '../maze/limits'
import type { Mission } from '../maze/types'
import type { GameRunner } from './useGameRunner'

/** Undo / redo pair used by both the phone editor and the desktop panel. */
export function UndoRedo({ g, size = 'md' }: { g: GameRunner; size?: 'md' | 'lg' }) {
  const t = useT()
  return (
    <div className="flex items-center gap-1">
      <IconButton label={t.editor.undo} variant="ghost" size={size} onClick={g.undo} disabled={!g.canUndo} data-testid="undo" sound={false}>
        <Undo2 size={22} aria-hidden />
      </IconButton>
      <IconButton label={t.editor.redo} variant="ghost" size={size} onClick={g.redo} disabled={!g.canRedo} data-testid="redo" sound={false}>
        <Redo2 size={22} aria-hidden />
      </IconButton>
    </div>
  )
}

/** "New blocks go inside Repeat 3x" banner. */
export function TargetBanner({ g }: { g: GameRunner }) {
  const t = useT()
  const r = g.target ? findNode(g.nodes, g.target) : undefined
  return (
    <AnimatePresence initial={false}>
      {r?.type === 'repeat' && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <p className="mt-2 flex items-center gap-2 rounded-[12px] bg-mint-50 py-1.5 pl-3 pr-1.5 text-[13px] font-bold text-mint-700" data-testid="target-banner">
            <span className="min-w-0 flex-1">{t.editor.addingInside(r.times)}</span>
            <button type="button" className="inline-flex h-9 items-center gap-1 rounded-[10px] bg-white px-2.5 text-ink-soft" onClick={() => g.setTarget(null)}>
              <X size={14} aria-hidden /> {t.editor.stopAddingInside}
            </button>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Palette({ g, mission, compact }: { g: GameRunner; mission: Mission; compact?: boolean }) {
  return (
    <CommandPalette
      allowRepeat={mission.allowRepeat}
      onAdd={g.add}
      disabled={!g.canAdd}
      compact={compact}
      repeatBlocked={depthOf(g.nodes, g.target) >= LIMITS.maxRepeatDepth}
    />
  )
}

/** One-time helper explaining drag and tap, dismissed forever once closed. */
export function DragHint({ touch, show }: { touch: boolean; show: boolean }) {
  const t = useT()
  const [prefs, setPrefs] = useDevicePrefs()
  if (prefs.dragHintSeen || !show) return null
  return (
    <div className="mb-3 flex items-start gap-2.5 rounded-[16px] bg-primary-50 px-3 py-2.5 text-[13.5px] font-semibold text-ink-soft" data-testid="drag-hint">
      <Hand size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
      <p className="min-w-0 flex-1">{touch ? t.editor.dragHint : t.editor.dragHintDesktop}</p>
      <button type="button" onClick={() => setPrefs({ dragHintSeen: true })} className="-m-1 grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-white" aria-label={t.common.close}>
        <X size={16} aria-hidden />
      </button>
    </div>
  )
}
