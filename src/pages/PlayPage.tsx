import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Camera, Lightbulb, Lock, Pause, Play, RotateCcw, SlidersHorizontal, StepForward, Target, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { playSfx, useReducedMotionPref } from '../app/hooks'
import { Button, IconButton } from '../components/Button'
import { Sheet } from '../components/Sheet'
import { SoundToggle } from '../components/SoundToggle'
import { Stars } from '../components/Stars'
import { CommandPalette } from '../features/editor/CommandPalette'
import { ProgramList } from '../features/editor/ProgramList'
import { depthOf, idAtPath, idsAlongPath } from '../features/editor/ast'
import { MobileTray } from '../features/game/MobileTray'
import { PlaybackControls } from '../features/game/PlaybackControls'
import { StatusMessage } from '../features/game/StatusMessage'
import { getStatus, runLabel } from '../features/game/status'
import { VictoryOverlay } from '../features/game/VictoryOverlay'
import { useElementSize } from '../features/game/useElementSize'
import { useGameRunner } from '../features/game/useGameRunner'
import { HintPanel } from '../features/hints/HintPanel'
import { MazeBoard } from '../features/maze/MazeBoard'
import { LIMITS } from '../features/maze/limits'
import { MISSIONS, getMission, nextMission } from '../features/maze/missions'
import type { Mission } from '../features/maze/types'
import { isUnlocked, useProgress } from '../features/progress/store'
import { evaluateWin, unlockAchievements } from '../features/progress/achievements'
import { SettingsPanel } from '../features/profile/SettingsPanel'
import { missionText } from '../features/maze/missionText'
import { useT } from '../i18n'
import { ScanSheet } from '../features/scan/ScanSheet'

export default function PlayPage() {
  const { levelId } = useParams()
  const mission = getMission(levelId)
  const progress = useProgress()
  if (!mission) return <Navigate to="/" replace />
  if (!isUnlocked(progress, MISSIONS.map((m) => m.id), mission.id)) return <LockedLevel mission={mission} />
  return <Game key={mission.id} mission={mission} />
}

function LockedLevel({ mission }: { mission: Mission }) {
  const t = useT()
  return (
    <div className="grid min-h-[70dvh] place-items-center p-6 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary-50 text-primary">
          <Lock size={28} aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-black">{t.game.lockedTitle(mission.number)}</h1>
        <p className="mt-2 text-ink-muted">{t.game.lockedBody(missionText(t, mission).title)}</p>
        <Link to="/levels" className="mt-5 inline-flex h-12 items-center rounded-[14px] bg-primary px-5 font-display font-extrabold text-white">
          {t.game.backToLevels}
        </Link>
      </div>
    </div>
  )
}

function Game({ mission }: { mission: Mission }) {
  const reduced = useReducedMotionPref()
  const t = useT()
  const mt = missionText(t, mission)
  const g = useGameRunner(mission, reduced)
  const [quickOpen, setQuickOpen] = useState(false)
  // What happened during this visit (for learning badges).
  const session = useRef({ hadFailure: false, usedClue: false, usedScan: false })
  const progress = useProgress()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string | null>(null)
  const [trayOpen, setTrayOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [hintFor, setHintFor] = useState<object | null>(null)
  const [hintKey, setHintKey] = useState(0)
  const [scanSession, setScanSession] = useState(0)
  const [boardRef, boardBox] = useElementSize<HTMLDivElement>()
  const next = nextMission(mission.id)
  const best = progress.levels[mission.id]?.bestStars ?? 0

  const boardSize = Math.max(160, Math.floor(Math.min(boardBox.width, boardBox.height) - 12))

  const activeIds = useMemo(() => new Set(g.currentStep ? idsAlongPath(g.nodes, g.currentStep.commandPath) : []), [g.currentStep, g.nodes])
  const failedId = useMemo(() => {
    const t = g.trace
    if (!t || !g.finished || t.failedStepIndex === undefined) return null
    return idAtPath(g.nodes, t.steps[t.failedStepIndex].commandPath) ?? null
  }, [g.trace, g.finished, g.nodes])

  const status = getStatus(g, mission, t)
  const failedRun = g.finished && !!g.trace && g.trace.outcome !== 'SUCCESS' && g.trace.outcome !== 'INVALID_PROGRAM'
  const won = g.finished && g.trace?.outcome === 'SUCCESS' && g.lastWin !== null

  useEffect(() => {
    if (g.attempts > 0) unlockAchievements(['first-run'])
  }, [g.attempts])
  useEffect(() => {
    if (failedRun) session.current.hadFailure = true
  }, [failedRun])
  const handledWin = useRef<number | null>(null)
  useEffect(() => {
    const w = g.lastWin
    if (!w || handledWin.current === w.runId) return
    handledWin.current = w.runId
    const tm = setTimeout(() => evaluateWin({ stars: w.stars, usedRepeat: w.usedRepeat, ...session.current }), reduced ? 200 : 2200)
    return () => clearTimeout(tm)
  }, [g.lastWin, reduced])

  // A clue belongs to one specific failed run; it disappears when a new run starts or the plan changes.
  const hintOpen = hintFor !== null && hintFor === g.trace && failedRun
  const setHintOpen = (v: boolean) => setHintFor(v ? g.trace : null)

  const showMe = useCallback(() => {
    const t = g.trace
    if (t?.failedStepIndex !== undefined) g.jumpTo(t.failedStepIndex)
  }, [g])

  const openHint = () => {
    session.current.usedClue = true
    setHintKey((k) => k + 1)
    setHintOpen(true)
  }

  // Keyboard: Space runs/pauses when focus isn't on a control.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      const el = document.activeElement as HTMLElement | null
      const safe = !el || el === document.body || el.dataset.board === 'true'
      if (!safe || document.querySelector('[role="dialog"][aria-modal="true"]')) return
      e.preventDefault()
      if (g.status === 'running') g.pause()
      else if (g.nodes.length) g.run()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [g])

  const listProps = {
    selectedId: selected,
    onSelect: setSelected,
    target: g.target,
    onTarget: g.setTarget,
    activeIds,
    failedId,
    onPatch: g.patch,
    onRemove: g.remove,
    onShift: g.shift,
    onReorder: g.reorder,
    reduced,
  }

  const hintBody = g.trace && failedRun && (
    <HintPanel
      key={hintKey}
      mission={mission}
      trace={g.trace}
      commands={g.ranCommands}
      attempt={g.attempts}
      onShowMe={() => {
        showMe()
        setHintOpen(false)
      }}
      onDone={() => setHintOpen(false)}
    />
  )

  return (
    <div className="flex h-[100dvh] flex-col" data-testid="game" data-outcome={g.finished ? g.trace?.outcome : undefined}>
      {/* ------------------------------ Mobile/tablet HUD ------------------------------ */}
      <header className="pt-safe flex items-center gap-1 px-2 pb-1 lg:hidden">
        <IconButton label={t.game.backToLevels} onClick={() => navigate('/levels')} tip={false}>
          <ArrowLeft size={24} aria-hidden />
        </IconButton>
        <div className="min-w-0 flex-1 px-1">
          <p className="font-display text-[12px] font-extrabold uppercase tracking-wider text-primary">{t.common.level(mission.number)}</p>
          <h1 className="truncate text-[18px] font-black leading-tight">{mt.title}</h1>
        </div>
        <SoundToggle />
        <IconButton label={t.game.quickSettings} onClick={() => setQuickOpen(true)} tip={false}>
          <SlidersHorizontal size={22} aria-hidden />
        </IconButton>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(300px,1fr)] md:gap-4 md:px-4 md:pb-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(380px,1fr)] lg:gap-6 lg:px-6 lg:pb-6 lg:pt-5 2xl:grid-cols-[minmax(0,1.6fr)_minmax(440px,1fr)]">
        {/* --------------------------------- Stage --------------------------------- */}
        <section className="flex min-h-0 flex-1 flex-col gap-3 md:gap-4" aria-label={t.game.maze}>
          {/* goal line */}
          <div className="mx-3 flex items-start gap-3 rounded-[18px] bg-white px-3.5 py-2.5 shadow-[var(--shadow-soft)] md:mx-0 md:px-5 md:py-4">
            <Target size={22} className="mt-0.5 shrink-0 text-mint-700" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="hidden font-display text-sm font-extrabold uppercase tracking-wider text-primary lg:block">
                {t.common.level(mission.number)}: {mt.title}
              </p>
              <p className="font-display text-[15px] font-extrabold leading-snug md:text-lg">{mt.goal}</p>
              <p className="hidden text-sm text-ink-muted md:block">
                {t.game.tip}: {mt.tip}
              </p>
            </div>
            <Stars value={best} size={18} className="flex shrink-0" />
            <span className="hidden lg:flex">
              <SoundToggle />
              <IconButton label={t.game.quickSettings} onClick={() => setQuickOpen(true)}>
                <SlidersHorizontal size={22} aria-hidden />
              </IconButton>
            </span>
          </div>

          <div ref={boardRef} className="relative mx-3 grid min-h-[150px] flex-1 place-items-center md:mx-0" data-board="true" tabIndex={-1}>
            {boardBox.width > 0 && (
              <div className="relative">
                <MazeBoard mission={mission} frame={g.frame} size={boardSize} reduced={reduced} speed={g.speed} />
                <AnimatePresence>
                  {won && g.lastWin && <VictoryOverlay mission={mission} win={g.lastWin} next={next} onReplay={g.reset} reduced={reduced} />}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* status — mobile compact */}
          <div className={`mx-3 md:hidden ${trayOpen && status.tone === 'neutral' ? 'hidden' : ''}`}>
            <StatusMessage info={status} compact onShowMe={showMe} onClue={failedRun ? openHint : undefined} />
          </div>

          {/* desktop/tablet controls */}
          <div className="hidden flex-col gap-3 md:flex">
            <PlaybackControls g={g} />
            <StatusMessage info={status} onShowMe={showMe} onClue={failedRun ? openHint : undefined} />
          </div>
        </section>

        {/* ------------------------- Editor panel (tablet/desktop) ------------------------ */}
        <section className="hidden min-h-0 flex-col rounded-[26px] border border-line bg-white shadow-[var(--shadow-soft)] md:flex" aria-label={t.game.editor}>
          <div className="flex items-center justify-between gap-2 px-5 pb-2 pt-4">
            <div>
              <h2 className="text-xl font-black">{t.game.plan}</h2>
              <p className="tabular text-sm text-ink-muted">
                {t.game.blocksCount(g.nodeCount, LIMITS.maxNodes)}, {t.game.par(mission.par).toLowerCase()}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={g.clearAll} disabled={!g.nodes.length} icon={<Trash2 size={16} aria-hidden />}>
              {t.game.clear}
            </Button>
          </div>
          <div className="px-5 pb-3">
            <CommandPalette allowRepeat={mission.allowRepeat} onAdd={g.add} disabled={!g.canAdd} repeatBlocked={depthOf(g.nodes, g.target) >= LIMITS.maxRepeatDepth} />
            <AnimatePresence initial={false}>
              {g.target && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <span className="mt-2 block rounded-[10px] bg-mint-50 px-3 py-2 text-[13px] font-bold text-mint-700">
                    {t.game.insideRepeat}{' '}
                    <button type="button" className="underline" onClick={() => g.setTarget(null)}>
                      {t.game.addToMain}
                    </button>
                  </span>
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-line/70 px-5 py-4">
            {g.nodes.length === 0 ? (
              <EmptyPlan />
            ) : (
              <ProgramList nodes={g.nodes} {...listProps} />
            )}
            <AnimatePresence>
              {hintOpen && hintBody && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="mt-4 hidden md:block">
                  <p className="mb-2 font-display text-sm font-extrabold uppercase tracking-wider text-orange-600">{t.game.clueLabel}</p>
                  {hintBody}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-line/70 p-4">
            <Button variant="secondary" size="lg" className="whitespace-nowrap !px-3" onClick={() => {
              setScanSession((n) => n + 1)
              setScanOpen(true)
            }} icon={<Camera size={20} aria-hidden />} data-testid="scan-button">
              <span className="xl:hidden">{t.game.scanPlan}</span>
              <span className="hidden xl:inline">{t.game.scanLong}</span>
            </Button>
            <Button variant="orange" size="lg" className="whitespace-nowrap !px-3" onClick={openHint} disabled={!failedRun} icon={<Lightbulb size={20} aria-hidden />}>
              <span className="xl:hidden">{t.game.clue}</span>
              <span className="hidden xl:inline">{t.game.clueLong}</span>
            </Button>
          </div>
        </section>

        {/* ----------------------------- Mobile tray ----------------------------- */}
        <div className="md:hidden">
          <MobileTray g={g} mission={mission} expanded={trayOpen} onExpanded={setTrayOpen} listProps={listProps} reduced={reduced} />
        </div>
      </div>

      {/* --------------------------- Mobile action bar --------------------------- */}
      <nav
        className="pb-safe grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2 border-t border-line/60 bg-cloud/95 px-3 pt-2 md:hidden"
        aria-label={t.game.controls}
      >
        <Button variant="secondary" size="lg" onClick={() => {
              setScanSession((n) => n + 1)
              setScanOpen(true)
            }} aria-label={t.game.scanAria} className="!px-3" data-testid="scan-button-mobile">
          <Camera size={22} aria-hidden />
          <span className="text-sm">{t.game.scan}</span>
        </Button>
        <Button
          size="lg"
          variant={g.status === 'running' ? 'secondary' : 'primary'}
          onClick={() => {
            if (g.status === 'running') g.pause()
            else {
              setTrayOpen(false)
              playSfx('select')
              g.run()
            }
          }}
          disabled={!g.nodes.length && g.status !== 'running'}
          icon={g.status === 'running' ? <Pause size={22} fill="currentColor" aria-hidden /> : <Play size={22} fill="currentColor" aria-hidden />}
          sound={false}
          className="whitespace-nowrap !px-3"
          data-testid="run-button-mobile"
        >
          {runLabel(g, t)}
        </Button>
        <IconButton label={t.game.step} variant="secondary" size="lg" className="!w-12 !min-w-12" onClick={g.stepOnce} disabled={!g.nodes.length} tip="top">
          <StepForward size={22} aria-hidden />
        </IconButton>
        <IconButton label={t.game.reset} variant="secondary" size="lg" className="!w-12 !min-w-12" onClick={g.reset} disabled={g.status === 'idle'} tip="top">
          <RotateCcw size={22} aria-hidden />
        </IconButton>
        <div className="col-span-4 h-2" aria-hidden />
      </nav>

      {/* Mobile hint sheet (desktop shows it inline in the editor panel) */}
      <MobileOnly>
        <Sheet open={hintOpen && !!hintBody} onClose={() => setHintOpen(false)} title={t.game.clueTitle} testId="hint-sheet">
          {hintBody}
        </Sheet>
      </MobileOnly>

      <Sheet open={quickOpen} onClose={() => setQuickOpen(false)} title={t.game.quickSettings} testId="quick-settings">
        <SettingsPanel />
      </Sheet>

      <ScanSheet
        key={scanSession}
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        mission={mission}
        onApply={(cmds) => {
          session.current.usedScan = true
          g.replaceAll(cmds)
          setTrayOpen(true)
        }}
      />
    </div>
  )
}

function EmptyPlan() {
  const t = useT()
  return (
    <div className="grid place-items-center rounded-[20px] border-2 border-dashed border-line px-6 py-10 text-center">
      <p className="font-display text-lg font-extrabold">{t.game.emptyTitle}</p>
      <p className="mt-1 max-w-xs text-sm text-ink-muted">{t.game.emptyBody}</p>
    </div>
  )
}

function MobileOnly({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches)
  useEffect(() => {
    const m = window.matchMedia('(max-width: 767px)')
    const on = () => setIsMobile(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return isMobile ? <>{children}</> : null
}
