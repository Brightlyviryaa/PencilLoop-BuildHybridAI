import { motion } from 'motion/react'
import { ArrowRight, Gamepad2, Home, RotateCcw, Sparkles, Trophy, Unlock } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router'
import { playSfx } from '../../app/hooks'
import { Button } from '../../components/Button'
import { CountUp } from '../../components/CountUp'
import { Stars } from '../../components/Stars'
import { useT } from '../../i18n'
import type { Mission } from '../maze/types'
import { DUR, EASE_OUT } from '../../styles/motion'
import type { LastWin } from './useGameRunner'

const COLORS = ['#2563EB', '#FF9B42', '#6DD6B5', '#FFD166', '#8B7CF6', '#FF7A8A']

/** Light-weight confetti: transform + opacity only, two bursts, then gone. */
function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => {
        const a = (i / 34) * Math.PI * 2 + (i % 3) * 0.2
        const d = 110 + ((i * 37) % 90)
        return { a, d, c: COLORS[i % COLORS.length], r: (i * 47) % 360, w: i % 3 === 0 ? 6 : 10, h: i % 3 === 0 ? 14 : 8, delay: i < 17 ? 0.05 : 0.32 }
      }),
    [],
  )
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-[45%] rounded-[3px]"
          style={{ background: b.c, width: b.w, height: b.h }}
          initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.6 }}
          animate={{
            x: Math.cos(b.a) * b.d,
            y: [0, Math.sin(b.a) * b.d - 40, Math.sin(b.a) * b.d + 120],
            opacity: [0, 1, 1, 0],
            rotate: b.r + 360,
            scale: 1,
          }}
          transition={{ duration: 1.4, ease: EASE_OUT, delay: b.delay, times: [0, 0.35, 1] }}
        />
      ))}
    </div>
  )
}

export function VictoryOverlay({
  win,
  next,
  onReplay,
  reduced,
}: {
  mission: Mission
  win: LastWin
  next?: Mission
  onReplay: () => void
  reduced: boolean
}) {
  const t = useT()
  const navigate = useNavigate()
  const primaryRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const timers = [setTimeout(() => primaryRef.current?.focus({ preventScroll: true }), reduced ? 0 : 900)]
    if (!reduced) {
      for (let i = 0; i < win.stars; i++) timers.push(setTimeout(() => playSfx('star', { pitch: 1 + i * 0.14 }), 620 + i * 220))
      timers.push(setTimeout(() => playSfx('robot-cheer'), 380))
      if (win.outcome.firstClear && next) timers.push(setTimeout(() => playSfx('unlock'), 1400))
    }
    return () => timers.forEach(clearTimeout)
  }, [reduced, win, next])

  const unlockedNext = win.outcome.firstClear && next

  return (
    <motion.div
      className="absolute inset-0 z-10 flex items-center justify-center p-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: DUR.reveal }}
      data-testid="victory"
    >
      <div className="absolute inset-0 rounded-[22px] bg-white/60 backdrop-blur-[2px]" aria-hidden />
      {!reduced && <Confetti />}
      <motion.div
        role="dialog"
        aria-label={t.victory.label}
        className="relative w-full max-w-[350px] overflow-hidden rounded-[28px] border border-line bg-white p-5 text-center shadow-[var(--shadow-lift)]"
        initial={reduced ? false : { scale: 0.85, y: 24 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 24, delay: 0.1 }}
      >
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-mint-50 to-transparent" aria-hidden />
        <p className="relative font-display text-xs font-extrabold uppercase tracking-wider text-mint-700">{t.victory.label}</p>
        <h2 className="relative mt-1 text-[26px] font-black leading-tight">{t.victory.title}</h2>
        <div className="relative mt-3 flex justify-center">
          <Stars value={win.stars} size={40} animate={!reduced} />
        </div>
        <p className="relative mt-2 text-[15px] text-ink-muted">{t.victory.message(win.stars)}</p>

        <motion.div
          className="relative mx-auto mt-3 flex w-fit items-baseline gap-1.5 rounded-full bg-primary-50 px-4 py-1.5"
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.3, ease: EASE_OUT }}
        >
          <Trophy size={16} className="self-center text-primary" aria-hidden />
          <span className="font-display text-2xl font-black text-primary" data-testid="victory-score">
            <CountUp value={win.score} duration={1} />
          </span>
          <span className="text-sm font-bold text-primary/80">{t.victory.points}</span>
        </motion.div>

        <div className="relative mt-2 flex flex-wrap justify-center gap-1.5">
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

        {unlockedNext && (
          <motion.p
            className="relative mt-3 flex items-center justify-center gap-2 rounded-[16px] bg-ink px-3 py-2 font-display text-[15px] font-extrabold text-white"
            initial={reduced ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.3, type: 'spring', stiffness: 420, damping: 18 }}
            data-testid="victory-unlocked"
          >
            <Unlock size={17} aria-hidden /> {t.victory.unlocked(next.number)}
          </motion.p>
        )}

        <div className="relative mt-4 flex flex-col gap-2">
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
            <Button ref={primaryRef} size="lg" block onClick={() => navigate('/progress')} icon={<Home size={20} aria-hidden />}>
              {t.victory.allDone}
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button size="md" variant="ghost" onClick={onReplay} icon={<RotateCcw size={18} aria-hidden />} className="!px-2 text-[14px]">
              {t.victory.moreStars}
            </Button>
            <Button size="md" variant="ghost" onClick={() => navigate('/levels')} icon={<Gamepad2 size={18} aria-hidden />} className="!px-2 text-[14px]">
              {t.nav.play}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
