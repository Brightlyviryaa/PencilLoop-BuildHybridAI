import { motion } from 'motion/react'
import { Check, Lock, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { playSfx, useReducedMotionPref } from '../app/hooks'
import { Button } from '../components/Button'
import { Robot } from '../components/Robot'
import { Sheet } from '../components/Sheet'
import { Stars } from '../components/Stars'
import { BoardPreview } from '../features/maze/BoardPreview'
import { MISSIONS } from '../features/maze/missions'
import { missionText } from '../features/maze/missionText'
import { themeFor } from '../features/maze/theme'
import type { Mission } from '../features/maze/types'
import { isUnlocked, markUnlockSeen, seenStore, useProgress, useStore } from '../features/progress/store'
import { useT } from '../i18n'
import { EASE_OUT } from '../styles/motion'

type NodeState = 'done' | 'next' | 'open' | 'locked'

/** Zig-zag node positions (percent of the trail width) so the path feels like a journey. */
const XS = [26, 72, 34, 70, 28, 66]
const ROW = 132

export default function LevelsPage() {
  const t = useT()
  const progress = useProgress()
  const seen = useStore(seenStore)
  const reduced = useReducedMotionPref()
  const [picked, setPicked] = useState<Mission | null>(null)
  const ids = MISSIONS.map((m) => m.id)
  const firstOpen = MISSIONS.find((m) => !progress.levels[m.id]?.completed && isUnlocked(progress, ids, m.id))

  const stateOf = (m: Mission): NodeState => {
    if (!isUnlocked(progress, ids, m.id)) return 'locked'
    if (progress.levels[m.id]?.completed) return 'done'
    return m.id === firstOpen?.id ? 'next' : 'open'
  }

  // Newly unlocked levels (other than level 1) get a one-time unlock animation.
  const fresh = MISSIONS.filter((m) => m.number > 1 && isUnlocked(progress, ids, m.id) && !seen.unlocked.includes(m.id)).map((m) => m.id)
  useEffect(() => {
    if (!fresh.length) return
    const worldOpened = fresh.some((id) => MISSIONS.find((m) => m.id === id)?.number === 4)
    const tm = setTimeout(() => playSfx(worldOpened ? 'world-unlock' : 'unlock'), reduced ? 0 : 500)
    const done = setTimeout(() => fresh.forEach(markUnlockSeen), 1800)
    return () => {
      clearTimeout(tm)
      clearTimeout(done)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh.join(',')])

  const pick = (m: Mission) => {
    playSfx(stateOf(m) === 'locked' ? 'error' : 'select')
    setPicked(m)
  }

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-8 md:px-6 lg:px-8 lg:pt-8">
      <header className="pt-safe-16 lg:pt-0">
        <h1 className="text-[28px] font-black leading-tight lg:text-[42px]">{t.levels.title}</h1>
        <p className="mt-1 text-[15px] text-ink-muted lg:text-lg">{t.levels.subtitle}</p>
      </header>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 lg:gap-6">
        {([1, 2] as const).map((w) => {
          const list = MISSIONS.filter((m) => m.world === w)
          const theme = themeFor(w)
          const wt = t.levels.worlds[w === 1 ? 'w1' : 'w2']
          const worldDone = list.filter((m) => progress.levels[m.id]?.completed).length
          const worldLocked = list.every((m) => stateOf(m) === 'locked')
          const pts = list.map((_, k) => ({ x: XS[k % XS.length], y: k * ROW + ROW / 2 }))
          const height = list.length * ROW
          const path = pts.map((p, i) => (i === 0 ? `M${p.x} ${p.y}` : `C${pts[i - 1].x} ${pts[i - 1].y + ROW * 0.55} ${p.x} ${p.y - ROW * 0.55} ${p.x} ${p.y}`)).join(' ')
          return (
            <section key={w} className="relative overflow-hidden rounded-[30px] p-4 lg:p-5" style={{ background: theme.backdrop }} aria-labelledby={`world-${w}`} data-testid={`world-${w}`}>
              <div className="relative z-[1] flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h2 id={`world-${w}`} className="text-[20px] font-black leading-tight lg:text-[24px]">
                    {wt.title}
                  </h2>
                  <p className="text-[14px] font-semibold text-ink-soft">{wt.body}</p>
                </div>
                <span className="tabular shrink-0 rounded-full bg-white/85 px-3 py-1 text-sm font-extrabold text-ink-soft">
                  {worldDone}/{list.length}
                </span>
              </div>

              <ol className={`relative mb-3 mt-6 ${worldLocked ? 'opacity-55 saturate-50' : ''}`} style={{ height }}>
                <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden>
                  <path d={path} fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="14" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                  <path d={path} fill="none" stroke={w === 1 ? '#e7c98d' : '#7fcf9f'} strokeWidth="4" strokeDasharray="2 10" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                </svg>
                {list.map((m, k) => (
                  <TrailNode key={m.id} mission={m} state={stateOf(m)} x={pts[k].x} y={pts[k].y} fresh={fresh.includes(m.id)} reduced={reduced} onPick={() => pick(m)} />
                ))}
              </ol>

              {worldLocked && (
                <div className="absolute inset-x-0 bottom-0 top-20 z-[2] grid place-items-center">
                  <p className="mx-6 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-center text-[14px] font-extrabold text-ink-soft shadow-[var(--shadow-soft)]">
                    <Lock size={16} aria-hidden /> {t.levels.lockedHint}
                  </p>
                </div>
              )}
            </section>
          )
        })}
      </div>

      <LevelSheet mission={picked} state={picked ? stateOf(picked) : 'locked'} onClose={() => setPicked(null)} />
    </div>
  )
}

function stateLabel(t: ReturnType<typeof useT>, s: NodeState) {
  return s === 'done' ? t.levels.completed : s === 'next' ? t.levels.upNext : s === 'locked' ? t.common.locked : t.levels.play
}

function TrailNode({ mission, state, x, y, fresh, reduced, onPick }: { mission: Mission; state: NodeState; x: number; y: number; fresh: boolean; reduced: boolean; onPick: () => void }) {
  const t = useT()
  const progress = useProgress()
  const lp = progress.levels[mission.id]
  const title = missionText(t, mission).title
  const right = x > 50
  const size = state === 'next' ? 76 : 66
  const tone = state === 'done' ? 'bg-mint text-ink' : state === 'locked' ? 'bg-[#e7ecf5] text-ink-muted' : 'bg-primary text-white'

  return (
    <motion.li
      initial={reduced ? false : { opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: EASE_OUT, delay: (mission.number - 1) * 0.07 }}
      className="absolute list-none"
      style={{ left: `${x}%`, top: y, transform: 'translate(-50%, -50%)' }}
    >
      <button
        type="button"
        onClick={onPick}
        aria-label={t.levels.nodeAria(mission.number, title, stateLabel(t, state))}
        className="group relative block"
        style={{ width: size, height: size }}
        data-testid={`level-node-${mission.id}`}
        data-state={state}
      >
        <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
          {state === 'next' && !reduced && <span className="pl-pulse absolute inset-0 rounded-full" aria-hidden />}
          <motion.span
            className={`grid h-full w-full place-items-center rounded-full font-display text-[28px] font-black shadow-[inset_0_-6px_0_rgb(0_0_0/0.14),0_12px_20px_-12px_rgb(23_37_84/0.6)] ring-4 ring-white transition-transform group-active:scale-95 ${tone}`}
            initial={fresh && !reduced ? { scale: 0.6, rotate: -20 } : false}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.45 }}
          >
            {state === 'done' ? <Check size={30} strokeWidth={3.4} aria-hidden /> : state === 'locked' ? <Lock size={24} aria-hidden /> : mission.number}
          </motion.span>
          {fresh && !reduced && (
            <motion.span className="absolute inset-0 grid place-items-center rounded-full bg-slate-200 text-ink-muted" initial={{ opacity: 1, scale: 1 }} animate={{ opacity: 0, scale: 1.6, rotate: 25 }} transition={{ duration: 0.55, ease: EASE_OUT, delay: 0.35 }} aria-hidden>
              <Lock size={22} />
            </motion.span>
          )}
          {state === 'next' && (
            <span className="absolute -top-[46px] left-1/2 -translate-x-1/2" aria-hidden>
              <Robot size={50} mood="happy" still={reduced} />
            </span>
          )}
          {state === 'done' && (
            <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-1.5 py-0.5 shadow-sm">
              <Stars value={lp?.bestStars ?? 0} size={12} />
            </span>
          )}
        </span>
        <span className={`absolute top-1/2 w-max max-w-[min(150px,40vw)] -translate-y-1/2 rounded-[14px] px-2.5 py-1.5 shadow-[0_6px_14px_-10px_rgb(23_37_84/0.5)] ${right ? 'right-full mr-3 text-right' : 'left-full ml-3 text-left'} ${state === 'locked' ? 'bg-white/60' : 'bg-white/95'}`}>
          <span className={`block font-display text-[11px] font-extrabold uppercase tracking-wider ${state === 'next' ? 'text-primary' : 'text-ink-muted'}`}>
            {fresh ? t.levels.unlocked : `${t.common.level(mission.number)}`}
          </span>
          <span className={`block font-display text-[15px] font-extrabold leading-tight ${state === 'locked' ? 'text-ink-muted' : ''}`}>{title}</span>
          {state === 'next' && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-extrabold text-primary">
              <Play size={11} fill="currentColor" aria-hidden /> {t.levels.play}
            </span>
          )}
        </span>
      </button>
    </motion.li>
  )
}

function LevelSheet({ mission, state, onClose }: { mission: Mission | null; state: NodeState; onClose: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  const progress = useProgress()
  const [last, setLast] = useState<Mission | null>(mission)
  if (mission && mission !== last) setLast(mission)
  const m = mission ?? last
  if (!m) return null
  const mt = missionText(t, m)
  const lp = progress.levels[m.id]
  const locked = state === 'locked'
  return (
    <Sheet
      open={mission !== null}
      onClose={onClose}
      title={`${t.common.level(m.number)}: ${mt.title}`}
      description={locked ? t.levels.lockedHint : mt.goal}
      testId="level-sheet"
      footer={
        <Button
          size="xl"
          block
          disabled={locked}
          icon={locked ? <Lock size={20} aria-hidden /> : <Play size={22} fill="currentColor" aria-hidden />}
          onClick={() => {
            playSfx('whoosh')
            navigate(`/play/${m.id}`)
          }}
          sound={false}
          data-autofocus
          data-testid="level-sheet-play"
        >
          {locked ? t.common.locked : state === 'done' ? t.levels.replay : t.levels.play}
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <div className={`mx-auto w-[min(230px,100%)] sm:w-[230px] ${locked ? 'opacity-40 grayscale' : ''}`}>
          <BoardPreview mission={m} max={230} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Stars value={lp?.bestStars ?? 0} size={24} />
          </div>
          <p className="mt-2 text-[14px] font-semibold text-ink-soft">{t.game.par(m.par)}</p>
          {lp?.completed && (
            <p className="mt-1 text-[14px] font-semibold text-ink-muted">
              {t.levels.bestScore}: <b className="text-ink">{lp.bestScore}</b>
            </p>
          )}
        </div>
      </div>
      <p className="mt-3 rounded-[16px] bg-orange-50 px-3 py-2 text-sm text-ink-soft">
        <b className="text-ink">{t.game.tip}:</b> {mt.tip}
      </p>
    </Sheet>
  )
}
