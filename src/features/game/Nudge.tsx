import { AnimatePresence, motion } from 'motion/react'
import { Robot } from '../../components/Robot'
import { useT } from '../../i18n'
import type { NudgeKind } from './nudgeLogic'

export function NudgeChip({ kind, onDismiss, reduced }: { kind: NudgeKind | null; onDismiss: () => void; reduced: boolean }) {
  const t = useT()
  return (
    <AnimatePresence>
      {kind && (
        <motion.div
          key={kind}
          initial={reduced ? false : { opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6 }}
          className="flex items-center gap-2 rounded-[18px] bg-ink py-1.5 pl-1.5 pr-1.5 text-white shadow-[var(--shadow-lift)]"
          role="status"
          data-testid="nudge"
          data-kind={kind}
        >
          <span className="shrink-0 rounded-full bg-white/10 p-0.5">
            <Robot size={34} mood="happy" still={reduced} />
          </span>
          <p className="min-w-0 flex-1 text-[14px] font-bold leading-snug">{t.nudge[kind]}</p>
          <button type="button" onClick={onDismiss} className="h-10 shrink-0 rounded-[12px] bg-white/15 px-3 font-display text-[14px] font-extrabold hover:bg-white/25">
            {t.nudge.dismiss}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
