import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, Lock, Play, Star } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { playSfx, useReducedMotionPref } from '../app/hooks'
import { BadgeIcon } from '../components/BadgeIcon'
import { CountUp } from '../components/CountUp'
import { Robot } from '../components/Robot'
import { Stars } from '../components/Stars'
import { MISSIONS } from '../features/maze/missions'
import { missionText } from '../features/maze/missionText'
import { themeFor } from '../features/maze/theme'
import type { Mission } from '../features/maze/types'
import { useProfile } from '../features/profile/profile'
import { ACHIEVEMENT_IDS, useAchievements } from '../features/progress/achievements'
import { isUnlocked, useProgress, type Progress } from '../features/progress/store'
import { useLang, useT } from '../i18n'
import { EASE_OUT } from '../styles/motion'

/** A game achievement page: adventure first, numbers second. */
export default function ProgressPage() {
  const t = useT()
  const progress = useProgress()
  const achievements = useAchievements()
  const profile = useProfile()
  const reduced = useReducedMotionPref()
  const stars = MISSIONS.reduce((n, m) => n + (progress.levels[m.id]?.bestStars ?? 0), 0)
  const maxStars = MISSIONS.length * 3
  const done = MISSIONS.filter((m) => progress.levels[m.id]?.completed).length
  const points = MISSIONS.reduce((n, m) => n + (progress.levels[m.id]?.bestScore ?? 0), 0)
  const badges = ACHIEVEMENT_IDS.filter((id) => achievements[id]).length

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-8 md:px-6 lg:px-8 lg:pt-8">
      <header className="pt-safe-16 flex items-center gap-3 lg:pt-0">
        <div className="min-w-0 flex-1">
          {profile && <p className="font-display text-[14px] font-extrabold text-primary">{t.progress.hello(profile.name)}</p>}
          <h1 className="text-[27px] font-black leading-[1.1] lg:text-[40px]">{t.progress.headline}</h1>
          <p className="mt-1 text-[15px] text-ink-muted lg:text-lg">{t.progress.subheadline}</p>
        </div>
      </header>

      {/* Hero summary: one card, one big number */}
      <section className="relative mt-5 overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_55%,#3b82f6_100%)] p-5 text-white shadow-[0_24px_40px_-28px_rgb(29_78_216/0.9)] lg:p-7" aria-label={t.progress.starsLabel(stars, maxStars)} data-testid="progress-hero">
        <div className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 rounded-full bg-white/10" aria-hidden />
        <div className="pointer-events-none absolute -bottom-10 right-24 h-28 w-28 rounded-full bg-white/10" aria-hidden />
        <div className="relative flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-display text-[44px] font-black leading-none lg:text-[56px]">
              <Star className="h-9 w-9 fill-[#FFD166] text-[#FFD166] lg:h-11 lg:w-11" aria-hidden />
              <CountUp value={stars} />
              <span className="text-[20px] font-extrabold text-white/70 lg:text-[24px]">/ {maxStars}</span>
            </p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/20" aria-hidden>
              <motion.div className="h-full rounded-full bg-[#FFD166]" initial={reduced ? false : { width: 0 }} animate={{ width: `${(stars / maxStars) * 100}%` }} transition={{ duration: 1, ease: EASE_OUT, delay: 0.2 }} />
            </div>
            <p className="mt-2.5 text-[14px] font-bold text-white/85">
              {t.progress.summaryLine(done, MISSIONS.length, points)} · {t.progress.badgesEarned(badges, ACHIEVEMENT_IDS.length)}
            </p>
          </div>
          <div className="-my-2 shrink-0">
            <Robot size={76} mood={done === MISSIONS.length ? 'cheer' : 'happy'} still={reduced} />
          </div>
        </div>
      </section>

      <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-8">
        {/* World progression */}
        <section aria-labelledby="worlds">
          <h2 id="worlds" className="text-[20px] font-black lg:text-2xl">
            {t.progress.worldsTitle}
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {([1, 2] as const).map((w) => (
              <WorldProgress key={w} world={w} progress={progress} reduced={reduced} />
            ))}
          </div>
        </section>

        {/* Level results */}
        <section aria-labelledby="lvl-list">
          <h2 id="lvl-list" className="text-[20px] font-black lg:text-2xl">
            {t.progress.levelResults}
          </h2>
          <ol className="mt-3 flex flex-col gap-2">
            {MISSIONS.map((m) => (
              <LevelResult key={m.id} mission={m} progress={progress} reduced={reduced} />
            ))}
          </ol>
        </section>
      </div>

      {/* Badges */}
      <section className="mt-8" aria-labelledby="badge-list">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="badge-list" className="text-[20px] font-black lg:text-2xl">
            {t.progress.badgeList}
          </h2>
          <span className="tabular text-sm font-bold text-ink-muted">{t.progress.badgesEarned(badges, ACHIEVEMENT_IDS.length)}</span>
        </div>
        <ul className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-9">
          {ACHIEVEMENT_IDS.map((id, k) => {
            const at = achievements[id]
            const a = t.achievements[id]
            return (
              <motion.li
                key={id}
                initial={reduced ? false : { opacity: 0, y: 10, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.28, ease: EASE_OUT, delay: 0.1 + k * 0.04 }}
                className="group relative flex flex-col items-center gap-1.5 rounded-[20px] px-1.5 py-3 text-center"
                data-testid={`badge-${id}`}
                data-earned={Boolean(at)}
                title={`${a.title}: ${a.desc}`}
              >
                <span className="relative">
                  {at && !reduced && (
                    <motion.span className="absolute inset-0 rounded-full bg-[#FFD166]/50" initial={{ scale: 0.8, opacity: 0.8 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 1.2, delay: 0.4 + k * 0.05 }} aria-hidden />
                  )}
                  <BadgeIcon id={id} size={56} earned={Boolean(at)} />
                </span>
                <span className={`font-display text-[12.5px] font-extrabold leading-tight ${at ? '' : 'text-ink-muted'}`}>{a.title}</span>
                <span className="sr-only">{at ? a.desc : `${t.progress.lockedBadge}. ${a.desc}`}</span>
              </motion.li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function WorldProgress({ world, progress, reduced }: { world: 1 | 2; progress: Progress; reduced: boolean }) {
  const t = useT()
  const list = MISSIONS.filter((m) => m.world === world)
  const done = list.filter((m) => progress.levels[m.id]?.completed).length
  const complete = done === list.length
  const theme = themeFor(world)
  const wt = t.levels.worlds[world === 1 ? 'w1' : 'w2']
  return (
    <div className="relative overflow-hidden rounded-[24px] p-4" style={{ background: theme.backdrop }} data-testid={`world-progress-${world}`} data-complete={complete}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[17px] font-black leading-tight">{wt.title}</p>
          <p className="text-[13px] font-semibold text-ink-soft">{complete ? t.progress.worldDone : t.progress.worldLevels(done, list.length)}</p>
        </div>
        {complete && (
          <motion.span initial={reduced ? false : { scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.3 }} className="grid h-10 w-10 place-items-center rounded-full bg-mint text-ink shadow">
            <Check size={22} strokeWidth={3.2} aria-hidden />
          </motion.span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        {list.map((m, i) => {
          const lp = progress.levels[m.id]
          return (
            <div key={m.id} className="flex flex-1 items-center gap-2">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-[15px] font-black shadow-[inset_0_-3px_0_rgb(0_0_0/0.12)] ${lp?.completed ? 'bg-mint text-ink' : 'bg-white/80 text-ink-muted'}`}>{m.number}</span>
              {i < list.length - 1 && (
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/60">
                  <motion.span className="block h-full bg-mint" initial={reduced ? false : { width: 0 }} animate={{ width: lp?.completed ? '100%' : '0%' }} transition={{ duration: 0.5, delay: 0.3 + i * 0.2, ease: EASE_OUT }} />
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LevelResult({ mission, progress, reduced }: { mission: Mission; progress: Progress; reduced: boolean }) {
  const t = useT()
  const lang = useLang()
  const [open, setOpen] = useState(false)
  const lp = progress.levels[mission.id]
  const unlocked = isUnlocked(progress, MISSIONS.map((m) => m.id), mission.id)
  const title = missionText(t, mission).title
  const fmt = (n: number) => new Intl.NumberFormat(lang === 'id' ? 'id-ID' : 'en-GB').format(n)

  if (!unlocked)
    return (
      <li className="flex items-center gap-3 rounded-[18px] bg-white/60 px-3 py-2.5 opacity-70" data-testid={`result-${mission.id}`}>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-slate-100 text-ink-muted">
          <Lock size={16} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate font-display text-[15.5px] font-extrabold text-ink-muted">{title}</span>
        <span className="text-[13px] font-bold text-ink-muted">{t.common.locked}</span>
      </li>
    )

  return (
    <li className="rounded-[18px] bg-white shadow-[0_1px_0_rgb(23_37_84/0.05),0_8px_20px_-16px_rgb(23_37_84/0.4)]" data-testid={`result-${mission.id}`}>
      <button
        type="button"
        onClick={() => {
          playSfx('tap')
          setOpen((v) => !v)
        }}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[14px] font-display text-lg font-black ${lp?.completed ? 'bg-mint text-ink' : 'bg-primary-50 text-primary'}`}>{mission.number}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-[15.5px] font-extrabold">{title}</span>
          <span className="block text-[13px] font-semibold text-ink-muted">{lp?.completed ? t.progress.bestShort(lp.bestScore) : t.progress.notPlayed}</span>
        </span>
        <Stars value={lp?.bestStars ?? 0} size={18} />
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-ink-muted" aria-hidden>
          <ChevronDown size={18} />
        </motion.span>
        <span className="sr-only">{open ? t.progress.hideDetails : t.progress.showDetails}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={reduced ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: EASE_OUT }} className="overflow-hidden">
            <div className="flex items-center gap-2 px-3 pb-3">
              <dl className="grid flex-1 grid-cols-3 gap-1.5">
                {[
                  { k: t.progress.bestScore, v: fmt(lp?.bestScore ?? 0) },
                  { k: t.progress.fewestBlocks, v: lp?.bestBlocks ? String(lp.bestBlocks) : '-' },
                  { k: t.progress.runs, v: String(lp?.attempts ?? 0) },
                ].map((r) => (
                  <div key={r.k} className="rounded-[12px] bg-cloud px-2.5 py-1.5">
                    <dt className="truncate text-[11.5px] font-bold text-ink-muted">{r.k}</dt>
                    <dd className="tabular font-display text-[17px] font-black">{r.v}</dd>
                  </div>
                ))}
              </dl>
              <Link to={`/play/${mission.id}`} onClick={() => playSfx('select')} className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-[14px] bg-primary px-3.5 font-display text-[14px] font-extrabold text-white shadow-[var(--shadow-press)]">
                <Play size={16} fill="currentColor" aria-hidden />
                {lp?.completed ? t.progress.playAgain : t.progress.playNow}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}
