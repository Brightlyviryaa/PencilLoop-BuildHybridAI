import { motion } from 'motion/react'
import { ArrowUp, CornerUpLeft, CornerUpRight, Lock, Repeat2 } from 'lucide-react'
import type { NewBlock } from './ast'
import { DUR } from '../../styles/motion'
import { useT } from '../../i18n'

interface Props {
  allowRepeat: boolean
  onAdd: (b: NewBlock) => void
  disabled?: boolean
  compact?: boolean
  /** Inside a repeat, nested repeats are only allowed up to the depth limit. */
  repeatBlocked?: boolean
}

const ITEMS = [
  { key: 'move', block: { type: 'move' } as NewBlock, Icon: ArrowUp, cls: 'bg-primary text-white hover:bg-primary-600' },
  { key: 'left', block: { type: 'turn', direction: 'left' } as NewBlock, Icon: CornerUpLeft, cls: 'bg-orange text-ink hover:bg-[#ff8f2a]' },
  { key: 'right', block: { type: 'turn', direction: 'right' } as NewBlock, Icon: CornerUpRight, cls: 'bg-orange text-ink hover:bg-[#ff8f2a]' },
  { key: 'repeat', block: { type: 'repeat' } as NewBlock, Icon: Repeat2, cls: 'bg-mint text-ink hover:bg-[#5ccfab]' },
] as const

export function CommandPalette({ allowRepeat, onAdd, disabled, compact, repeatBlocked }: Props) {
  const t = useT()
  return (
    <div role="group" aria-label={t.palette.group} className={`grid grid-cols-4 ${compact ? 'gap-1.5' : 'gap-2'}`}>
      {ITEMS.map(({ key, block, Icon, cls }) => {
        const label = t.palette[key]
        const locked = key === 'repeat' && !allowRepeat
        const nestedBlocked = key === 'repeat' && repeatBlocked
        const off = disabled || locked || nestedBlocked
        return (
          <motion.button
            key={key}
            type="button"
            whileTap={off ? undefined : { scale: 0.95 }}
            transition={{ duration: DUR.press }}
            disabled={off}
            onClick={() => onAdd(block)}
            aria-label={locked ? t.palette.lockedAria(label) : t.palette.add(label)}
            title={locked ? t.palette.lockedRepeat : nestedBlocked ? t.palette.nestedBlocked : t.palette.add(label)}
            data-testid={`add-${key}`}
            className={`relative flex flex-col items-center justify-center rounded-[14px] font-display font-extrabold shadow-[var(--shadow-press)] transition-colors disabled:opacity-40 disabled:shadow-none ${cls} ${
              compact ? 'h-[52px] gap-0.5 text-[12px]' : 'h-[64px] gap-1 text-[13px]'
            }`}
          >
            <Icon size={compact ? 20 : 22} strokeWidth={2.8} aria-hidden />
            <span className="leading-none">{label}</span>
            {locked && (
              <span className="absolute right-1.5 top-1.5 rounded-full bg-white/80 p-0.5 text-ink">
                <Lock size={11} aria-hidden />
              </span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
