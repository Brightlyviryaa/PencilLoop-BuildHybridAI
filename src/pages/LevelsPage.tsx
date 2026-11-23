import { motion } from 'motion/react'
import { Check, Lock, Play, Repeat2, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { playSfx, useReducedMotionPref } from '../app/hooks'
import { Button } from '../components/Button'
import { Sheet } from '../components/Sheet'
import { Stars } from '../components/Stars'
import { BoardPreview } from '../features/maze/BoardPreview'
import { MISSIONS } from '../features/maze/missions'
import { missionText } from '../features/maze/missionText'
import type { Mission } from '../features/maze/types'
import { isUnlocked, markUnlockSeen, seenStore, useProgress, useStore } from '../features/progress/store'
import { useT } from '../i18n'
import { EASE_OUT } from '../styles/motion'

type NodeState = 'done' | 'next' | 'open' | 'locked'

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
    const tm = setTimeout(() => playSfx('unlock'), reduced ? 0 : 500)
    const done = setTimeout(() => fresh.forEach(markUnlockSeen), 1800)
    return () => {
      clearTimeout(tm)
      clearTimeout(done)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh.join(',')])

  const worlds = [1, 2] as const

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-6 md:px-6 lg:px-8 lg:pt-8">
      <header className="pt-safe pt-4 lg:pt-0">
        <h1 className="text-[30px] font-black leading-tight lg:text-[44px]">{t.levels.title}</h1>
        <p className="mt-1 text-[15px] text-ink-muted lg:text-lg">{t.levels.subtitle}</p>
      </header>

      {worlds.map((w) => {
        const list = MISSIONS.filter((m) => m.world === w)
        const wt = t.levels.worlds[w === 1 ? 'w1' : 'w2']
        const worldDone = list.filter((m) => progress.levels[m.id]?.completed).length
        return (
          <section key={w} className="mt-6 lg:mt-8" aria-labelledby={`world-${w}`}>
            <div className={`flex items-center gap-3 rounded-[22px] px-4 py-3 ${w === 1 ? 'bg-primary-50' : 'bg-mint-50'}`}>
              <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] font-display text-lg font-black ${w === 1 ? 'bg-primary text-white' : 'bg-mint text-ink'}`}>
                {w === 1 ? w : <Repeat2 size={22} aria-hidden />}
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={`world-${w}`} className="text-[19px] font-black leading-tight lg:text-2xl">
                  {wt.title}
                </h2>
                <p className="text-sm text-ink-muted">{wt.body}</p>
              </div>
              <span className="tabular shrink-0 rounded-full bg-white px-3 py-1 text-sm font-extrabold text-ink-soft">
                {worldDone}/{list.length}
              </span>
            </div>

            {/* Phone & tablet: a winding trail. Desktop: cards with board previews. */}
            <ol className="relative mt-4 flex flex-col gap-3 lg:hidden">
              <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden preserveAspectRatio="none" viewBox="0 0 100 100">
                <path d="M30 6 C 70 20, 70 30, 70 40 S 30 60, 30 70 S 70 90, 70 96" fill="none" stroke="#dce5f2" strokeWidth="1.2" strokeDasharray="2.5 2.5" vectorEffect="non-scaling-stroke" />
              </svg>
              {list.map((m, k) => (
                <TrailNode
                  key={m.id}
                  mission={m}
                  state={stateOf(m)}
                  side={k % 2 === 0 ? 'left' : 'right'}
                  fresh={fresh.includes(m.id)}
                  reduced={reduced}
                  onPick={() => {
                    playSfx(stateOf(m) === 'locked' ? 'error' : 'select')
                    setPicked(m)
                  }}
                />
              ))}
            </ol>
            <ol className="mt-4 hidden gap-5 lg:grid lg:grid-cols-3">
              {list.map((m, k) => (
                <LevelCard
                  key={m.id}
                  mission={m}
                  index={k}
                  state={stateOf(m)}
                  fresh={fresh.includes(m.id)}
                  reduced={reduced}
                  onPick={() => {
                    playSfx(stateOf(m) === 'locked' ? 'error' : 'select')
                    setPicked(m)
                  }}
                />
              ))}
            </ol>
          </section>
        )
      })}

      <LevelSheet mission={picked} state={picked ? stateOf(picked) : 'locked'} onClose={() => setPicked(null)} />
    </div>
  )
}

function NodeBadge({ mission, state, fresh, reduced, size = 72 }: { mission: Mission; state: NodeState; fresh: boolean; reduced: boolean; size?: number }) {
  const tone =
    state === 'done' ? 'bg-mint text-ink' : state === 'locked' ? 'bg-slate-100 text-ink-muted' : 'bg-primary text-white'
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <motion.span
        className={`grid h-full w-full place-items-center rounded-full font-display text-[28px] font-black shadow-[inset_0_-5px_0_rgb(0_0_0/0.14),0_10px_20px_-12px_rgb(23_37_84/0.55)] ${tone} ${state === 'next' && !reduced ? 'pl-pulse' : ''}`}
        initial={fresh && !reduced ? { scale: 0.6, rotate: -20 } : false}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.45 }}
      >
        {state === 'done' ? <Check size={size * 0.42} strokeWidth={3.4} aria-hidden /> : state === 'locked' ? <Lock size={size * 0.34} aria-hidden /> : mission.number}
      </motion.span>
      {fresh && !reduced && (
        <motion.span
          className="absolute inset-0 grid place-items-center rounded-full bg-slate-200 text-ink-muted"
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0, scale: 1.6, rotate: 25 }}
          transition={{ duration: 0.55, ease: EASE_OUT, delay: 0.35 }}
          aria-hidden
        >
          <Lock size={size * 0.34} />
        </motion.span>
      )}
      {fresh && !reduced && <Burst />}
    </span>
  )
}

function Burst() {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      {Array.from({ length: 10 }, (_, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full"
          style={{ background: ['#FF9B42', '#6DD6B5', '#2563EB', '#FFD166'][i % 4] }}
          initial={{ x: 0, y: 0, opacity: 0 }}
          animate={{ x: Math.cos((i / 10) * Math.PI * 2) * 54, y: Math.sin((i / 10) * Math.PI * 2) * 54, opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, delay: 0.55, ease: EASE_OUT }}
        />
      ))}
    </span>
  )
}

function stateLabel(t: ReturnType<typeof useT>, s: NodeState) {
  return s === 'done' ? t.levels.completed : s === 'next' ? t.levels.upNext : s === 'locked' ? t.common.locked : t.levels.play
}

function TrailNode({ mission, state, side, fresh, reduced, onPick }: { mission: Mission; state: NodeState; side: 'left' | 'right'; fresh: boolean; reduced: boolean; onPick: () => void }) {
  const t = useT()
  const progress = useProgress()
  const lp = progress.levels[mission.id]
  const title = missionText(t, mission).title
  return (
    <motion.li
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT, delay: (mission.number % 3) * 0.06 }}
      className={`relative flex ${side === 'right' ? 'justify-end' : 'justify-start'}`}
    >
      <button
        type="button"
        onClick={onPick}
        aria-label={t.levels.nodeAria(mission.number, title, stateLabel(t, state))}
        className={`flex w-[min(320px,88%)] items-center gap-3 rounded-[26px] border-2 bg-white p-2.5 pr-4 text-left shadow-[var(--shadow-soft)] transition-transform active:scale-[0.98] ${
          state === 'next' ? 'border-primary' : 'border-transparent'
        } ${side === 'right' ? 'flex-row-reverse text-right' : ''} ${state === 'locked' ? 'opacity-70' : ''}`}
        data-testid={`level-node-${mission.id}`}
        data-state={state}
      >
        <NodeBadge mission={mission} state={state} fresh={fresh} reduced={reduced} size={64} />
        <span className="min-w-0 flex-1">
          <span className={`block font-display text-xs font-extrabold uppercase tracking-wider ${state === 'next' ? 'text-primary' : 'text-ink-muted'}`}>
            {fresh ? t.levels.unlocked : `${t.common.level(mission.number)}, ${stateLabel(t, state)}`}
          </span>
          <span className="block truncate font-display text-[17px] font-extrabold">{title}</span>
          {state !== 'locked' && <Stars value={lp?.bestStars ?? 0} size={15} className={`mt-0.5 flex ${side === 'right' ? 'justify-end' : ''}`} />}
        </span>
      </button>
    </motion.li>
  )
}

function LevelCard({ mission, index, state, fresh, reduced, onPick }: { mission: Mission; index: number; state: NodeState; fresh: boolean; reduced: boolean; onPick: () => void }) {
  const t = useT()
  const progress = useProgress()
  const lp = progress.levels[mission.id]
  const mt = missionText(t, mission)
  return (
    <motion.li
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT, delay: index * 0.07 }}
    >
      <button
        type="button"
        onClick={onPick}
        aria-label={t.levels.nodeAria(mission.number, mt.title, stateLabel(t, state))}
        className={`group flex h-full w-full flex-col rounded-[28px] border-2 bg-white p-4 text-left shadow-[var(--shadow-soft)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] ${
          state === 'next' ? 'border-primary' : 'border-transparent hover:border-primary/25'
        }`}
        data-testid={`level-card-${mission.id}`}
        data-state={state}
      >
        <div className="relative overflow-hidden rounded-[20px] bg-cloud p-3">
          <div className={state === 'locked' ? 'opacity-35 blur-[1px] grayscale' : ''}>
            <BoardPreview mission={mission} max={300} />
          </div>
          <span className="absolute left-3 top-3">
            <NodeBadge mission={mission} state={state} fresh={fresh} reduced={reduced} size={54} />
          </span>
          {mission.allowRepeat && state !== 'locked' && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-mint px-2.5 py-1 text-xs font-extrabold text-ink">
              <Repeat2 size={13} aria-hidden /> {t.levels.usesRepeat}
            </span>
          )}
        </div>
        <p className="mt-3 font-display text-xs font-extrabold uppercase tracking-wider text-ink-muted">
          {t.common.level(mission.number)}, {t.levels.grid(mission.cols, mission.rows)}
        </p>
        <h3 className="mt-0.5 text-xl font-black">{mt.title}</h3>
        <p className="mt-1 text-[15px] text-ink-muted">{state === 'locked' ? t.levels.lockedHint : mt.goal}</p>
        <div className="mt-auto flex items-center justify-between pt-4">
          <Stars value={lp?.bestStars ?? 0} size={18} />
          {state !== 'locked' && (
            <span className="inline-flex items-center gap-1.5 font-display font-extrabold text-primary">
              {fresh ? (
                <>
                  <Sparkles size={16} aria-hidden /> {t.levels.unlocked}
                </>
              ) : (
                <>
                  {state === 'done' ? t.levels.replay : t.levels.play} <Play size={16} fill="currentColor" aria-hidden />
                </>
              )}
            </span>
          )}
        </div>
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
        <div className={`mx-auto w-[min(240px,100%)] rounded-[20px] bg-cloud p-3 sm:w-[240px] ${locked ? 'opacity-40 grayscale' : ''}`}>
          <BoardPreview mission={m} max={216} />
        </div>
        <dl className="grid grid-cols-3 gap-2 sm:grid-cols-1">
          {[
            { k: t.levels.bestScore, v: lp?.bestScore ? String(lp.bestScore) : '0' },
            { k: t.levels.fewestBlocks, v: lp?.bestBlocks ? String(lp.bestBlocks) : '-' },
            { k: t.levels.runs, v: String(lp?.attempts ?? 0) },
          ].map((r) => (
            <div key={r.k} className="rounded-[16px] bg-cloud px-3 py-2">
              <dt className="text-xs font-bold text-ink-muted">{r.k}</dt>
              <dd className="tabular font-display text-xl font-black">{r.v}</dd>
            </div>
          ))}
          <div className="col-span-3 flex items-center gap-2 sm:col-span-1">
            <Stars value={lp?.bestStars ?? 0} size={22} />
          </div>
        </dl>
      </div>
      <p className="mt-3 rounded-[16px] bg-orange-50 px-3 py-2 text-sm text-ink-soft">
        <b className="text-ink">{t.game.tip}:</b> {mt.tip}
      </p>
    </Sheet>
  )
}
