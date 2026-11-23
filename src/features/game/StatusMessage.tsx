import { AnimatePresence, motion } from 'motion/react'
import { AlertCircle, CheckCircle2, Info, Lightbulb, MapPin, Footprints } from 'lucide-react'
import { Button } from '../../components/Button'
import { DUR, EASE_OUT } from '../../styles/motion'
import type { StatusInfo } from './status'
import { useT } from '../../i18n'

const TONES = {
  neutral: { cls: 'bg-white border-line text-ink', Icon: Info, icon: 'text-primary' },
  running: { cls: 'bg-orange-50 border-orange/40 text-ink', Icon: Footprints, icon: 'text-orange-600' },
  success: { cls: 'bg-mint-50 border-mint text-ink', Icon: CheckCircle2, icon: 'text-mint-700' },
  warn: { cls: 'bg-orange-50 border-orange/50 text-ink', Icon: AlertCircle, icon: 'text-orange-600' },
  error: { cls: 'bg-danger-50 border-danger/40 text-ink', Icon: AlertCircle, icon: 'text-danger' },
}

export function StatusMessage({
  info,
  onShowMe,
  onClue,
  compact = false,
}: {
  info: StatusInfo
  onShowMe?: () => void
  onClue?: () => void
  compact?: boolean
}) {
  const t = useT()
  const tone = TONES[info.tone]
  const canHelp = info.tone === 'error' || info.tone === 'warn'
  return (
    <div aria-live="polite" aria-atomic="true" data-testid="status-message" data-tone={info.tone}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={info.title}
          initial={{ opacity: 0, y: 6 }}
          animate={info.tone === 'error' ? { opacity: 1, y: 0, x: [0, -6, 5, -3, 0] } : { opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: DUR.reveal, ease: EASE_OUT }}
          className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[18px] border-2 ${tone.cls} ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}
        >
          <tone.Icon size={compact ? 20 : 22} className={`shrink-0 ${tone.icon}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className={`font-display font-extrabold leading-snug ${compact ? 'text-[15px]' : 'text-[17px]'}`}>{info.title}</p>
            {info.detail && !compact && <p className="text-sm text-ink-muted">{info.detail}</p>}
          </div>
          {canHelp && (onShowMe || onClue) && (
            <div className="flex shrink-0 gap-2">
              {onShowMe && info.failedStepIndex !== undefined && (
                <Button size="sm" variant="secondary" onClick={onShowMe} icon={<MapPin size={16} aria-hidden />}>
                  {t.status.showMe}
                </Button>
              )}
              {onClue && (
                <Button size="sm" variant="orange" onClick={onClue} icon={<Lightbulb size={16} aria-hidden />} data-testid="clue-button">
                  {t.status.clue}
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
