import { motion } from 'motion/react'
import { BookOpen, Gamepad2, House, Lock, Star, Trophy, UserRound, type LucideIcon } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'
import { Avatar } from '../components/Avatar'
import { LogoMark, Wordmark } from '../components/Brand'
import { SoundToggle } from '../components/SoundToggle'
import { Stars } from '../components/Stars'
import { MISSIONS } from '../features/maze/missions'
import { useProfile } from '../features/profile/profile'
import { isUnlocked, useProgress } from '../features/progress/store'
import { useT, type Dict } from '../i18n'
import { playSfx } from './hooks'

interface Tab {
  to: string
  label: (t: Dict) => string
  Icon: LucideIcon
  match: (path: string) => boolean
  testId: string
}

const TABS: Tab[] = [
  { to: '/', label: (t) => t.nav.home, Icon: House, match: (p) => p === '/', testId: 'nav-home' },
  { to: '/levels', label: (t) => t.nav.play, Icon: Gamepad2, match: (p) => p.startsWith('/levels') || p.startsWith('/play'), testId: 'nav-play' },
  { to: '/progress', label: (t) => t.nav.progress, Icon: Trophy, match: (p) => p.startsWith('/progress'), testId: 'nav-progress' },
  { to: '/profile', label: (t) => t.nav.profile, Icon: UserRound, match: (p) => p.startsWith('/profile') || p.startsWith('/learn'), testId: 'nav-profile' },
]

/** Phones and tablets: 4 thumb-reachable tabs with a sliding active pill. */
export function BottomNav() {
  const t = useT()
  const { pathname } = useLocation()
  return (
    <nav
      aria-label={t.nav.main}
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-white/95 shadow-[0_-8px_24px_-16px_rgb(23_37_84/0.25)] backdrop-blur lg:hidden"
      data-testid="bottom-nav"
    >
      <ul className="mx-auto grid h-[68px] max-w-[560px] grid-cols-4 px-2">
        {TABS.map((tab) => {
          const active = tab.match(pathname)
          return (
            <li key={tab.to} className="relative">
              <NavLink
                to={tab.to}
                end={tab.to === '/'}
                aria-current={active ? 'page' : undefined}
                onClick={() => !active && playSfx('nav')}
                className="relative flex h-full flex-col items-center justify-center gap-0.5 rounded-[18px] outline-offset-[-4px]"
                data-testid={tab.testId}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-pill"
                    className="absolute top-2 h-9 w-14 rounded-full bg-primary-50"
                    transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                    aria-hidden
                  />
                )}
                <motion.span
                  animate={{ y: active ? -1 : 0, scale: active ? 1.08 : 1 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 26 }}
                  className={`relative grid h-9 w-14 place-items-center ${active ? 'text-primary' : 'text-ink-muted'}`}
                >
                  <tab.Icon size={23} strokeWidth={active ? 2.6 : 2.2} aria-hidden />
                </motion.span>
                <span className={`relative font-display text-[12px] font-extrabold ${active ? 'text-primary' : 'text-ink-muted'}`}>{tab.label(t)}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Desktop: a real sidebar with the player, the 4 tabs and the level path. */
export function SideRail() {
  const t = useT()
  const { pathname } = useLocation()
  const profile = useProfile()
  const progress = useProgress()
  const ids = MISSIONS.map((m) => m.id)
  const stars = MISSIONS.reduce((n, m) => n + (progress.levels[m.id]?.bestStars ?? 0), 0)

  return (
    <aside className="no-scrollbar sticky top-0 hidden h-[100dvh] flex-col gap-5 overflow-y-auto border-r border-line/70 bg-white px-3 py-5 lg:flex xl:px-4" aria-label={t.nav.main}>
      {/* 1024-1279px: compact icon rail. 1280px+: full sidebar. */}
      <div className="px-1">
        <span className="hidden xl:block">
          <Wordmark />
        </span>
        <span className="mx-auto block w-fit xl:hidden">
          <LogoMark size={44} />
        </span>
      </div>

      <NavLink to="/profile" className="flex items-center justify-center gap-3 rounded-[18px] bg-cloud p-2 transition-colors hover:bg-primary-50 xl:justify-start xl:p-3" onClick={() => playSfx('nav')} aria-label={profile?.name}>
        <Avatar name={profile?.name} size={42} />
        <span className="hidden min-w-0 xl:block">
          <span className="block truncate font-display text-[16px] font-extrabold">{profile?.name ?? 'Pip'}</span>
          <span className="flex items-center gap-1 text-sm font-bold text-ink-muted">
            <Star size={14} className="fill-orange text-orange-600" aria-hidden />
            <span className="tabular">
              {stars}/{MISSIONS.length * 3}
            </span>
          </span>
        </span>
      </NavLink>

      <nav className="flex flex-col gap-1">
        {[...TABS, { to: '/learn', label: (x: Dict) => x.nav.learn, Icon: BookOpen, match: (p: string) => p.startsWith('/learn'), testId: 'nav-learn' }].map((tab) => {
          const active = tab.to === '/learn' ? tab.match(pathname) : tab.to === '/profile' ? pathname.startsWith('/profile') : tab.match(pathname)
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              aria-current={active ? 'page' : undefined}
              onClick={() => !active && playSfx('nav')}
              aria-label={tab.label(t)}
              className={`relative flex h-12 items-center justify-center gap-3 rounded-[14px] px-3 font-display text-[15px] font-extrabold transition-colors xl:justify-start ${
                active ? 'text-white' : 'text-ink-soft hover:bg-primary-50 hover:text-ink'
              }`}
              data-testid={`rail-${tab.testId}`}
            >
              {active && <motion.span layoutId="rail-pill" className="absolute inset-0 rounded-[14px] bg-primary shadow-[var(--shadow-press)]" transition={{ type: 'spring', stiffness: 480, damping: 38 }} />}
              <tab.Icon size={20} aria-hidden className="relative" />
              <span className="relative hidden xl:inline">{tab.label(t)}</span>
            </NavLink>
          )
        })}
      </nav>

      <div>
        <p className="mb-2 hidden px-3 font-display text-xs font-extrabold uppercase tracking-wider text-ink-muted xl:block">{t.levels.title}</p>
        <ol className="flex flex-col gap-1">
          {MISSIONS.map((m) => {
            const unlocked = isUnlocked(progress, ids, m.id)
            const lp = progress.levels[m.id]
            const title = t.missions[m.id]?.title ?? m.title
            const active = pathname === `/play/${m.id}`
            return (
              <li key={m.id}>
                {unlocked ? (
                  <NavLink
                    to={`/play/${m.id}`}
                    onClick={() => playSfx('select')}
                    aria-label={`${t.common.level(m.number)}: ${title}`}
                    className={`flex items-center justify-center gap-3 rounded-[14px] border-2 px-2 py-1.5 transition-colors xl:justify-start ${active ? 'border-primary bg-primary-50' : 'border-transparent hover:bg-cloud'}`}
                  >
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[11px] font-display text-base font-black ${lp?.completed ? 'bg-mint text-ink' : 'bg-primary-50 text-primary'}`}>
                      {m.number}
                    </span>
                    <span className="hidden min-w-0 xl:block">
                      <span className="block truncate font-display text-[14px] font-extrabold text-ink">{title}</span>
                      <Stars value={lp?.bestStars ?? 0} size={12} />
                    </span>
                  </NavLink>
                ) : (
                  <div className="flex items-center justify-center gap-3 rounded-[14px] px-2 py-1.5 opacity-55 xl:justify-start" aria-label={`${title}, ${t.common.locked}`}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-slate-100 text-ink-muted">
                      <Lock size={15} aria-hidden />
                    </span>
                    <span className="hidden truncate font-display text-[14px] font-extrabold text-ink-muted xl:inline">{title}</span>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      <div className="mt-auto flex items-center justify-center rounded-[16px] bg-cloud px-2 py-1.5 xl:justify-between">
        <span className="hidden px-2 text-xs font-bold text-ink-muted xl:inline">{t.brand.tagline}</span>
        <SoundToggle />
      </div>
    </aside>
  )
}
