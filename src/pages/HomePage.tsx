import { motion } from 'motion/react'
import { ArrowRight, BookOpen, Camera, Medal, Play, Star, Trophy, Wrench } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { playSfx, useReducedMotionPref } from '../app/hooks'
import { Avatar } from '../components/Avatar'
import { BadgeIcon } from '../components/BadgeIcon'
import { Button } from '../components/Button'
import { CountUp } from '../components/CountUp'
import { Robot } from '../components/Robot'
import { SoundToggle } from '../components/SoundToggle'
import { Stars } from '../components/Stars'
import { MazeBoard } from '../features/maze/MazeBoard'
import { MISSIONS } from '../features/maze/missions'
import { idleFrame, missionText } from '../features/maze/missionText'
import { useProfile } from '../features/profile/profile'
import { ACHIEVEMENT_IDS, useAchievements } from '../features/progress/achievements'
import { isUnlocked, useProgress } from '../features/progress/store'
import { useT } from '../i18n'
import { DUR, EASE_OUT } from '../styles/motion'
import { useElementSize } from '../features/game/useElementSize'

export default function HomePage() {
  const t = useT()
  const profile = useProfile()
  const progress = useProgress()
  const achievements = useAchievements()
  const navigate = useNavigate()
  const reduced = useReducedMotionPref()
  const ids = MISSIONS.map((m) => m.id)
  const done = MISSIONS.filter((m) => progress.levels[m.id]?.completed).length
  const allDone = done === MISSIONS.length
  const next = MISSIONS.find((m) => !progress.levels[m.id]?.completed && isUnlocked(progress, ids, m.id)) ?? MISSIONS[0]
  const started = Object.keys(progress.levels).length > 0
  const stars = MISSIONS.reduce((n, m) => n + (progress.levels[m.id]?.bestStars ?? 0), 0)
  const badges = ACHIEVEMENT_IDS.filter((id) => achievements[id]).length
  const nextBadge = ACHIEVEMENT_IDS.find((id) => !achievements[id])
  const mt = missionText(t, next)
  const [boardRef, box] = useElementSize<HTMLDivElement>()

  const appear = (d: number) =>
    reduced ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: DUR.route, ease: EASE_OUT, delay: d } }

  const play = () => {
    playSfx('select')
    navigate(`/play/${next.id}`)
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-4 pb-6 md:px-6 lg:gap-6 lg:px-8 lg:pt-8 2xl:max-w-[1600px]">
      {/* Greeting */}
      <header className="pt-safe flex items-center gap-3 pt-3 lg:pt-0">
        <Avatar name={profile?.name} size={48} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[26px] font-black leading-tight lg:text-4xl" data-testid="home-greeting">
            {t.home.greeting(profile?.name ?? 'Pip')}
          </h1>
          <p className="text-[15px] font-semibold text-ink-muted lg:text-base">{started ? t.home.sub : t.home.subNew}</p>
        </div>
        <span className="lg:hidden">
          <SoundToggle />
        </span>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)] lg:gap-6">
        {/* Next mission hero */}
        <motion.section
          {...appear(0)}
          className="relative overflow-hidden rounded-[30px] bg-primary text-white shadow-[var(--shadow-lift)]"
          aria-labelledby="next-title"
        >
          <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:24px_24px]" aria-hidden />
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" aria-hidden />
          <div className="relative grid items-center gap-5 p-5 sm:p-7 md:grid-cols-[minmax(0,1fr)_auto] lg:p-9">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={reduced ? undefined : { y: [0, -6, 0], rotate: [0, -3, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="rounded-[22px] bg-white/95 p-1.5 shadow-lg md:hidden"
                >
                  <Robot size={58} mood={allDone ? 'happy' : 'idle'} />
                </motion.div>
                <span className="rounded-full bg-white/15 px-3 py-1 font-display text-xs font-extrabold uppercase tracking-wider text-white">
                  {allDone ? t.progress.levelsDone : `${t.home.nextMission}: ${t.common.level(next.number)}`}
                </span>
              </div>
              <h2 id="next-title" className="mt-4 text-[34px] font-black leading-[1.05] text-white sm:text-5xl lg:text-[56px]">
                {allDone ? t.home.allDoneTitle : mt.title}
              </h2>
              <p className="mt-2 max-w-md text-[16px] text-white/85 lg:text-lg">{allDone ? t.home.allDoneBody : mt.goal}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button size="xl" variant="orange" onClick={play} sound={false} icon={<Play size={22} fill="currentColor" aria-hidden />} data-testid="hero-play">
                  {allDone ? t.home.replay : started ? t.home.continue : t.home.start}
                </Button>
                <Link
                  to="/levels"
                  onClick={() => playSfx('nav')}
                  className="inline-flex h-14 items-center gap-2 rounded-[16px] px-4 font-display text-[16px] font-extrabold text-white/90 hover:bg-white/10"
                >
                  {t.home.allLevels} <ArrowRight size={18} aria-hidden />
                </Link>
              </div>
              {/* World progress */}
              <div className="mt-6 max-w-md">
                <div className="flex justify-between text-sm font-bold text-white/80">
                  <span>{t.progress.levelsDone}</span>
                  <span className="tabular">{t.progress.of(done, MISSIONS.length)}</span>
                </div>
                <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuemin={0} aria-valuemax={MISSIONS.length} aria-valuenow={done} aria-label={t.progress.levelsDone}>
                  <motion.div
                    className="h-full rounded-full bg-orange"
                    initial={reduced ? false : { width: 0 }}
                    animate={{ width: `${(done / MISSIONS.length) * 100}%` }}
                    transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.2 }}
                  />
                </div>
              </div>
            </div>
            <div className="hidden md:block" aria-hidden>
              <div className="relative">
                <motion.div
                  className="absolute -left-10 -top-12 z-[1]"
                  animate={reduced ? undefined : { y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Robot size={84} mood={allDone ? 'happy' : 'idle'} />
                </motion.div>
                <div ref={boardRef} className="w-[240px] rounded-[24px] bg-white p-3 shadow-2xl lg:w-[280px] xl:w-[320px]">
                  {box.width > 0 && <MazeBoard mission={next} frame={idleFrame(next)} size={box.width - 24} reduced speed={1} />}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Side column: stats + next badge */}
        <div className="grid content-start gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <motion.section {...appear(0.06)} className="grid grid-cols-3 gap-2.5 sm:col-span-2 lg:col-span-1" aria-label={t.nav.progress}>
            {[
              { Icon: Star, label: t.home.stars, value: stars, max: MISSIONS.length * 3, tone: 'bg-orange-50 text-orange-600' },
              { Icon: Trophy, label: t.home.levels, value: done, max: MISSIONS.length, tone: 'bg-mint-50 text-mint-700' },
              { Icon: Medal, label: t.home.badges, value: badges, max: ACHIEVEMENT_IDS.length, tone: 'bg-primary-50 text-primary' },
            ].map(({ Icon, label, value, max, tone }) => (
              <Link
                key={label}
                to="/progress"
                onClick={() => playSfx('nav')}
                className="rounded-[22px] border border-line/60 bg-white p-3 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5"
              >
                <span className={`grid h-9 w-9 place-items-center rounded-[12px] ${tone}`}>
                  <Icon size={19} aria-hidden fill={Icon === Star ? 'currentColor' : 'none'} />
                </span>
                <span className="mt-2 block font-display text-[26px] font-black leading-none">
                  <CountUp value={value} />
                  <span className="text-[15px] font-extrabold text-ink-muted">/{max}</span>
                </span>
                <span className="mt-1 block truncate text-[13px] font-bold text-ink-muted">{label}</span>
              </Link>
            ))}
          </motion.section>

          <motion.section {...appear(0.12)}>
            <Link
              to="/progress"
              onClick={() => playSfx('nav')}
              className="flex items-center gap-4 rounded-[24px] border border-line/60 bg-white p-4 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-0.5"
            >
              <BadgeIcon id={nextBadge ?? 'star-collector'} size={56} earned={!nextBadge} />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-xs font-extrabold uppercase tracking-wider text-orange-600">{nextBadge ? t.home.nextBadge : t.home.allBadges}</span>
                <span className="block font-display text-[18px] font-extrabold">{t.achievements[nextBadge ?? 'star-collector'].title}</span>
                <span className="block text-sm text-ink-muted">{t.achievements[nextBadge ?? 'star-collector'].desc}</span>
              </span>
              <ArrowRight size={20} className="shrink-0 text-ink-muted" aria-hidden />
            </Link>
          </motion.section>

          <motion.section {...appear(0.18)} className="rounded-[24px] border border-line/60 bg-white p-4 shadow-[var(--shadow-soft)] sm:col-span-2 lg:col-span-1" aria-labelledby="how">
            <div className="flex items-center justify-between">
              <h2 id="how" className="text-lg font-black">
                {t.home.howTitle}
              </h2>
              <Link to="/learn" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-extrabold text-primary hover:bg-primary-50" onClick={() => playSfx('nav')}>
                <BookOpen size={16} aria-hidden /> {t.home.learnMore}
              </Link>
            </div>
            <ol className="mt-3 grid gap-2.5">
              {t.home.steps.map((s, k) => {
                const Icon = [Camera, Play, Wrench][k]
                const tone = ['bg-primary text-white', 'bg-orange text-ink', 'bg-mint text-ink'][k]
                return (
                  <li key={s.title} className="flex items-center gap-3 rounded-[16px] bg-cloud p-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${tone}`}>
                      <Icon size={20} aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-display text-[15px] font-extrabold">{s.title}</span>
                      <span className="block text-[13px] text-ink-muted">{s.body}</span>
                    </span>
                  </li>
                )
              })}
            </ol>
          </motion.section>
        </div>
      </div>

      {/* Level strip */}
      <section aria-labelledby="levels-strip">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="levels-strip" className="text-xl font-black lg:text-2xl">
            {t.levels.title}
          </h2>
          <Link to="/levels" className="text-sm font-extrabold text-primary" onClick={() => playSfx('nav')}>
            {t.home.allLevels}
          </Link>
        </div>
        <ol className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 xl:grid-cols-6">
          {MISSIONS.map((m, k) => {
            const unlocked = isUnlocked(progress, ids, m.id)
            const lp = progress.levels[m.id]
            const title = missionText(t, m).title
            return (
              <motion.li key={m.id} {...appear(0.05 * k)} className="w-[150px] shrink-0 snap-start md:w-auto">
                {unlocked ? (
                  <Link
                    to={`/play/${m.id}`}
                    onClick={() => playSfx('select')}
                    className={`flex h-full flex-col gap-2 rounded-[22px] border-2 bg-white p-3.5 shadow-[var(--shadow-soft)] transition-[transform,border-color] hover:-translate-y-1 ${
                      m.id === next.id && !allDone ? 'border-primary' : 'border-transparent'
                    }`}
                    data-testid={`mission-${m.id}`}
                  >
                    <span className={`grid h-10 w-10 place-items-center rounded-[12px] font-display text-lg font-black ${lp?.completed ? 'bg-mint text-ink' : 'bg-primary text-white'}`}>{m.number}</span>
                    <span className="font-display text-[15px] font-extrabold leading-tight">{title}</span>
                    <Stars value={lp?.bestStars ?? 0} size={15} className="mt-auto flex" />
                  </Link>
                ) : (
                  <div className="flex h-full flex-col gap-2 rounded-[22px] border-2 border-dashed border-line bg-white/60 p-3.5" aria-disabled="true" data-testid={`mission-${m.id}`}>
                    <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-slate-100 font-display text-lg font-black text-ink-muted">{m.number}</span>
                    <span className="font-display text-[15px] font-extrabold leading-tight text-ink-muted">{title}</span>
                    <span className="mt-auto text-xs font-bold text-ink-muted">{t.common.locked}</span>
                  </div>
                )}
              </motion.li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
