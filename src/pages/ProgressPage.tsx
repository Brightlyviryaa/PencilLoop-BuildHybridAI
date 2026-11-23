import { motion } from 'motion/react'
import { Lock, Medal, Star, Trophy, Zap } from 'lucide-react'
import { Link } from 'react-router'
import { playSfx, useReducedMotionPref } from '../app/hooks'
import { BadgeIcon } from '../components/BadgeIcon'
import { Card } from '../components/Controls'
import { CountUp } from '../components/CountUp'
import { Stars } from '../components/Stars'
import { MISSIONS } from '../features/maze/missions'
import { missionText } from '../features/maze/missionText'
import { ACHIEVEMENT_IDS, useAchievements } from '../features/progress/achievements'
import { isUnlocked, useProgress } from '../features/progress/store'
import { useLang, useT } from '../i18n'
import { EASE_OUT } from '../styles/motion'

export default function ProgressPage() {
  const t = useT()
  const lang = useLang()
  const progress = useProgress()
  const achievements = useAchievements()
  const reduced = useReducedMotionPref()
  const ids = MISSIONS.map((m) => m.id)
  const stars = MISSIONS.reduce((n, m) => n + (progress.levels[m.id]?.bestStars ?? 0), 0)
  const maxStars = MISSIONS.length * 3
  const done = MISSIONS.filter((m) => progress.levels[m.id]?.completed).length
  const points = MISSIONS.reduce((n, m) => n + (progress.levels[m.id]?.bestScore ?? 0), 0)
  const badges = ACHIEVEMENT_IDS.filter((id) => achievements[id]).length
  const fmtDate = (ms: number) => new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short' }).format(ms)

  // Star ring
  const R = 54
  const C = 2 * Math.PI * R
  const frac = stars / maxStars

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-6 md:px-6 lg:px-8 lg:pt-8">
      <header className="pt-safe pt-4 lg:pt-0">
        <h1 className="text-[30px] font-black leading-tight lg:text-[44px]">{t.progress.title}</h1>
        <p className="mt-1 text-[15px] text-ink-muted lg:text-lg">{t.progress.subtitle}</p>
      </header>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-6">
        {/* Summary */}
        <Card className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col lg:items-stretch">
          <div className="relative mx-auto grid h-[150px] w-[150px] shrink-0 place-items-center">
            <svg width="150" height="150" viewBox="0 0 132 132" className="-rotate-90" aria-hidden>
              <circle cx="66" cy="66" r={R} fill="none" stroke="#fff3e6" strokeWidth="14" />
              <motion.circle
                cx="66"
                cy="66"
                r={R}
                fill="none"
                stroke="#FF9B42"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={C}
                initial={reduced ? false : { strokeDashoffset: C }}
                animate={{ strokeDashoffset: C * (1 - frac) }}
                transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.15 }}
              />
            </svg>
            <div className="absolute text-center">
              <Star size={22} className="mx-auto fill-orange text-orange-600" aria-hidden />
              <p className="font-display text-[34px] font-black leading-none">
                <CountUp value={stars} />
              </p>
              <p className="text-xs font-bold text-ink-muted">
                {t.progress.of(stars, maxStars)} {t.progress.stars.toLowerCase()}
              </p>
            </div>
          </div>
          <div className="grid w-full grid-cols-3 gap-2.5">
            {[
              { Icon: Trophy, k: t.home.levels, v: done, of: MISSIONS.length, tone: 'bg-mint-50 text-mint-700' },
              { Icon: Zap, k: t.progress.points, v: points, tone: 'bg-primary-50 text-primary' },
              { Icon: Medal, k: t.progress.badges, v: badges, of: ACHIEVEMENT_IDS.length, tone: 'bg-orange-50 text-orange-600' },
            ].map(({ Icon, k, v, of, tone }) => (
              <div key={k} className="rounded-[18px] bg-cloud p-3">
                <span className={`grid h-8 w-8 place-items-center rounded-[10px] ${tone}`}>
                  <Icon size={17} aria-hidden />
                </span>
                <p className="mt-2 font-display text-2xl font-black leading-none">
                  <CountUp value={v} />
                  {of !== undefined && <span className="text-sm text-ink-muted">/{of}</span>}
                </p>
                <p className="mt-1 truncate text-xs font-bold text-ink-muted">{k}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Levels */}
        <Card aria-labelledby="lvl-list">
          <h2 id="lvl-list" className="text-xl font-black">
            {t.progress.levelList}
          </h2>
          <ol className="mt-3 divide-y divide-line/70">
            {MISSIONS.map((m) => {
              const lp = progress.levels[m.id]
              const unlocked = isUnlocked(progress, ids, m.id)
              const title = missionText(t, m).title
              const row = (
                <>
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] font-display text-lg font-black ${
                      lp?.completed ? 'bg-mint text-ink' : unlocked ? 'bg-primary-50 text-primary' : 'bg-slate-100 text-ink-muted'
                    }`}
                  >
                    {unlocked ? m.number : <Lock size={17} aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[16px] font-extrabold">{title}</span>
                    <span className="block text-[13px] text-ink-muted">
                      {lp?.completed
                        ? `${t.progress.bestScore} ${lp.bestScore}, ${t.progress.fewestBlocks.toLowerCase()} ${lp.bestBlocks ?? '-'}, ${t.progress.runs.toLowerCase()} ${lp.attempts}`
                        : lp?.attempts
                          ? `${t.progress.runs} ${lp.attempts}`
                          : unlocked
                            ? t.progress.notPlayed
                            : t.common.locked}
                    </span>
                  </span>
                  <Stars value={lp?.bestStars ?? 0} size={17} />
                </>
              )
              return (
                <li key={m.id}>
                  {unlocked ? (
                    <Link to={`/play/${m.id}`} onClick={() => playSfx('select')} className="-mx-2 flex items-center gap-3 rounded-[16px] px-2 py-2.5 hover:bg-cloud">
                      {row}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 py-2.5 opacity-60">{row}</div>
                  )}
                </li>
              )
            })}
          </ol>
        </Card>
      </div>

      {/* Badges */}
      <section className="mt-6" aria-labelledby="badge-list">
        <h2 id="badge-list" className="text-xl font-black lg:text-2xl">
          {t.progress.badgeList} <span className="tabular text-ink-muted">({badges}/{ACHIEVEMENT_IDS.length})</span>
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ACHIEVEMENT_IDS.map((id, k) => {
            const at = achievements[id]
            const a = t.achievements[id]
            return (
              <motion.li
                key={id}
                initial={reduced ? false : { opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.28, ease: EASE_OUT, delay: k * 0.04 }}
                className={`flex flex-col items-center gap-2 rounded-[24px] border bg-white p-4 text-center shadow-[var(--shadow-soft)] ${at ? 'border-line/60' : 'border-dashed border-line'}`}
                data-testid={`badge-${id}`}
                data-earned={Boolean(at)}
              >
                <BadgeIcon id={id} size={64} earned={Boolean(at)} />
                <span className={`font-display text-[15px] font-extrabold leading-tight ${at ? '' : 'text-ink-muted'}`}>{a.title}</span>
                <span className="text-[12.5px] leading-snug text-ink-muted">{a.desc}</span>
                {at && <span className="mt-auto rounded-full bg-mint-50 px-2 py-0.5 text-[11px] font-extrabold text-mint-700">{`${t.progress.earned} ${fmtDate(at)}`}</span>}
              </motion.li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
