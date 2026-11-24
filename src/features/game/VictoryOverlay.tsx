import { motion } from 'motion/react'
import { ArrowRight, LockOpen, RotateCcw, Sparkles, Trophy } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { playSfx } from '../../app/hooks'
import { Button } from '../../components/Button'
import { CountUp } from '../../components/CountUp'
import { Robot } from '../../components/Robot'
import { Stars } from '../../components/Stars'
import { useT } from '../../i18n'
import { EASE_OUT } from '../../styles/motion'
import type { Mission } from '../maze/types'
import type { LastWin } from './useGameRunner'

const COLORS = ['#2563EB', '#FF9B42', '#6DD6B5', '#FFD166', '#8B7CF6', '#FF7A8A']

/** Light-weight confetti: transform + opacity only, two bursts, then gone. */
function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2 + (i % 3) * 0.2
        const d = 130 + ((i * 37) % 110)
        return { a, d, c: COLORS[i % COLORS.length], r: (i * 47) % 360, w: i % 3 === 0 ? 6 : 10, h: i % 3 === 0 ? 14 : 8, delay: i < 18 ? 0.15 : 0.45 }
      }),
    [],
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-[38%] rounded-[3px]"
          style={{ background: b.c, width: b.w, height: b.h }}
          initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.6 }}
          animate={{ x: Math.cos(b.a) * b.d, y: [0, Math.sin(b.a) * b.d - 40, Math.sin(b.a) * b.d + 160], opacity: [0, 1, 1, 0], rotate: b.r + 360, scale: 1 }}
          transition={{ duration: 1.5, ease: EASE_OUT, delay: b.delay, times: [0, 0.35, 1] }}
        />
      ))}
    </div>
  )
}

/**
 * Level complete. One short sequence (Pip cheers, stars pop one by one,
 * points count up, the next level unlocks) and one clear primary action.
 */
export function VictoryOverlay({ mission, win, next, onReplay, reduced }: { mission: Mission; win: LastWin; next?: Mission; onReplay: () => void; reduced: boolean }) {
  const t = useT()
  const navigate = useNavigate()
  const primaryRef = useRef<HTMLButtonElement>(null)
  const unlockedNext = win.outcome.firstClear && next

  useEffect(() => {
    const timers = [setTimeout(() => primaryRef.current?.focus({ preventScroll: true }), reduced ? 0 : 1000)]
    if (!reduced) {
      timers.push(setTimeout(() => playSfx('robot-cheer'), 300))
      for (let i = 0; i < win.stars; i++) timers.push(setTimeout(() => playSfx('star', { pitch: 1 + i * 0.14 }), 650 + i * 230))
      if (unlockedNext) timers.push(setTimeout(() => playSfx('unlock'), 1500))
    }
    return () => timers.forEach(clearTimeout)
  }, [reduced, win, unlockedNext])

  return createPortal(
    <motion.div className="fixed inset-0 z-[60] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} data-testid="victory">
      <div className="absolute inset-0 bg-ink/35 backdrop-blur-[3px]" aria-hidden />
      {!reduced && <Confetti />}
      <motion.div
        role="dialog"
        aria-modal="false"
        aria-label={t.victory.label}
        className="relative w-full max-w-[360px] rounded-[30px] bg-white px-5 pb-5 pt-14 text-center shadow-[0_30px_60px_-24px_rgb(23_37_84/0.6)]"
        initial={reduced ? false : { scale: 0.86, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 24, delay: 0.05 }}
      >
        {/* Pip pops out of the card */}
        <motion.div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[58%]" initial={reduced ? false : { y: 30, scale: 0.6 }} animate={{ y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.15 }}>
          <div className="grid h-[104px] w-[104px] place-items-center rounded-full bg-mint-50 ring-[6px] ring-white">
            <Robot size={88} mood="cheer" still={reduced} />
          </div>
        </motion.div>

        <p className="font-display text-[12px] font-extrabold uppercase tracking-wider text-mint-700">{t.victory.label}</p>
        <h2 className="mt-0.5 text-[26px] font-black leading-tight">{win.stars === 3 ? t.victory.title3 : t.victory.title}</h2>
        <div className="mt-3 flex justify-center">
          <Stars value={win.stars} size={44} animate={!reduced} />
        </div>
        <p className="mt-2 text-[14.5px] font-semibold text-ink-soft" data-testid="star-rule">
          {t.victory.starRule(win.blocks, mission.par)}
        </p>

        <motion.div
          className="mx-auto mt-3 flex w-fit items-baseline gap-1.5 rounded-full bg-primary-50 px-4 py-1.5"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.3, ease: EASE_OUT }}
        >
          <Trophy size={16} className="self-center text-primary" aria-hidden />
          <span className="font-display text-2xl font-black text-primary" data-testid="victory-score">
            <CountUp value={win.score} duration={1} />
          </span>
          <span className="text-sm font-bold text-primary/80">{t.victory.points}</span>
        </motion.div>

        {(win.firstTry || (win.outcome.newBestScore && !win.outcome.firstClear)) && (
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {win.outcome.newBestScore && !win.outcome.firstClear && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-extrabold text-orange-600">
                <Sparkles size={13} aria-hidden /> {t.victory.newBest}
              </span>
            )}
            {win.firstTry && (
              <span className="inline-flex items-center gap-1 rounded-full bg-mint-50 px-2.5 py-1 text-xs font-extrabold text-mint-700">
                <Sparkles size={13} aria-hidden /> {t.victory.firstTry}
              </span>
            )}
          </div>
        )}

        {unlockedNext && (
          <motion.p
            className="mt-3 flex items-center justify-center gap-1.5 font-display text-[15px] font-extrabold text-mint-700"
            initial={reduced ? false : { opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.45, type: 'spring', stiffness: 420, damping: 16 }}
            data-testid="victory-unlocked"
          >
            <motion.span initial={reduced ? false : { rotate: -25 }} animate={{ rotate: 0 }} transition={{ delay: 1.6, type: 'spring', stiffness: 300, damping: 8 }} className="inline-flex">
              <LockOpen size={18} aria-hidden />
            </motion.span>
            {t.victory.unlocked(next.number)}
          </motion.p>
        )}

        <div className="mt-4 flex flex-col gap-1.5">
          {next ? (
            <Button
              ref={primaryRef}
              size="lg"
              block
              onClick={() => {
                playSfx('whoosh')
                navigate(`/play/${next.id}`)
              }}
              sound={false}
              iconRight={<ArrowRight size={20} aria-hidden />}
              data-testid="next-level"
            >
              {t.victory.next}
            </Button>
          ) : (
            <Button ref={primaryRef} size="lg" block onClick={() => navigate('/progress')} data-testid="see-progress">
              {t.victory.seeProgress}
            </Button>
          )}
          <Button size="md" variant="ghost" block onClick={onReplay} icon={<RotateCcw size={18} aria-hidden />} data-testid="victory-retry">
            {win.stars < 3 ? t.victory.moreStars : t.victory.retry}
          </Button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
