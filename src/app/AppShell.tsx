import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Navigate, useLocation, useOutlet } from 'react-router'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { Toaster } from '../components/Toaster'
import { initAccount } from '../features/account/account'
import { LinkConflictSheet } from '../features/account/LinkConflictSheet'
import { prepareOnDeviceInBackground, warmupAI } from '../features/ai/aiStore'
import { profileStore, refreshAgeGroup, useProfile } from '../features/profile/profile'
import { useLang, useT } from '../i18n'
import { pageVariants, tweenRoute } from '../styles/motion'
import { useAudioLifecycle, useReducedMotionPref } from './hooks'
import { BottomNav, SideRail } from './nav'

function FrozenOutlet() {
  const outlet = useOutlet()
  const [o] = useState(outlet)
  return o
}

/** Keeps <html lang>, the tab title and the motion preference in sync, instantly. */
function useDocumentSync(reduced: boolean) {
  const lang = useLang()
  const t = useT()
  useEffect(() => {
    document.documentElement.lang = lang
    document.title = t.meta.title
  }, [lang, t])
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full'
  }, [reduced])
}

/**
 * Returning players: start on-device AI preparation from the first real
 * interaction (Chrome needs user activation for the model download). It never
 * blocks anything and runs at most once per page load.
 */
function useFirstInteractionAIPrep() {
  useEffect(() => {
    const onGesture = (e: Event) => {
      if (e instanceof KeyboardEvent && (e.key === 'Escape' || e.key === 'Tab')) return
      if (!profileStore.get()) return
      prepareOnDeviceInBackground()
      off()
    }
    const off = () => {
      window.removeEventListener('click', onGesture, true)
      window.removeEventListener('keydown', onGesture, true)
    }
    window.addEventListener('click', onGesture, true)
    window.addEventListener('keydown', onGesture, true)
    return off
  }, [])
}

export function AppShell() {
  useAudioLifecycle()
  const reduced = useReducedMotionPref()
  useDocumentSync(reduced)
  useFirstInteractionAIPrep()
  const t = useT()
  const location = useLocation()
  const profile = useProfile()
  const path = location.pathname

  useEffect(() => {
    refreshAgeGroup()
    void initAccount()
    warmupAI()
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [path])

  const onWelcome = path === '/welcome'
  if (!profile && !onWelcome) return <Navigate to="/welcome" replace />

  const inGame = path.startsWith('/play/')
  const showNav = !onWelcome
  // Top-level tab changes fade; deeper pages slide a little more.
  const routeKey = path

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <a
        href="#main"
        className="sr-only z-[80] rounded-xl bg-primary px-4 py-2 font-bold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        {t.meta.skip}
      </a>
      <div className={`min-h-[100dvh] ${showNav ? 'lg:grid lg:grid-cols-[84px_minmax(0,1fr)] xl:grid-cols-[256px_minmax(0,1fr)] 2xl:grid-cols-[288px_minmax(0,1fr)]' : ''}`}>
        {showNav && <SideRail />}
        <main
          id="main"
          className={`relative min-w-0 ${showNav && !inGame ? 'pb-[calc(84px+env(safe-area-inset-bottom))] lg:pb-0' : ''}`}
        >
          <ErrorBoundary key={routeKey}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={routeKey}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={reduced ? { duration: 0 } : tweenRoute}
              >
                <FrozenOutlet />
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>
      {showNav && !inGame && <BottomNav />}
      <Toaster />
      <LinkConflictSheet />
    </MotionConfig>
  )
}
