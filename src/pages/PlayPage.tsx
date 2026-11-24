import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Camera, Lightbulb, Lock, Pause, Play, RotateCcw, SlidersHorizontal, StepForward, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { playSfx, useMediaQuery, useReducedMotionPref } from '../app/hooks'
import { Button, IconButton } from '../components/Button'
import { Robot } from '../components/Robot'
import { Sheet } from '../components/Sheet'
import { SoundToggle } from '../components/SoundToggle'
import { Stars } from '../components/Stars'
import { PlanEditor } from '../features/editor/PlanEditor'
import { idAtPath, idsAlongPath } from '../features/editor/ast'
import { PlanCountBadge, PlanScreen } from '../features/game/PlanScreen'
import { editorPropsFor } from '../features/game/editorProps'
import { DragHint, Palette, TargetBanner, UndoRedo } from '../features/game/PlanTools'
import { PlaybackControls } from '../features/game/PlaybackControls'
import { ProgramRibbon } from '../features/game/ProgramRibbon'
import { NudgeChip } from '../features/game/Nudge'
import { useNudge } from '../features/game/nudgeLogic'
import { StatusMessage } from '../features/game/StatusMessage'
import { getStatus, runLabel } from '../features/game/status'
import { VictoryOverlay } from '../features/game/VictoryOverlay'
import { useElementSize } from '../features/game/useElementSize'
import { useGameRunner } from '../features/game/useGameRunner'
import { HintPanel } from '../features/hints/HintPanel'
import { MazeBoard } from '../features/maze/MazeBoard'
import { LIMITS } from '../features/maze/limits'
import { MISSIONS, getMission, nextMission } from '../features/maze/missions'
import { missionText } from '../features/maze/missionText'
import { themeFor } from '../features/maze/theme'
import { WorldBackdrop } from '../features/maze/WorldBackdrop'
import type { Mission } from '../features/maze/types'
import { evaluateWin, unlockAchievements } from '../features/progress/achievements'
import { isUnlocked, useProgress } from '../features/progress/store'
import { SettingsPanel } from '../features/profile/SettingsPanel'
import { ScanSheet } from '../features/scan/ScanSheet'
import { useT } from '../i18n'

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

/** Everything the two workspaces (phone map + editor, desktop panels) share. */
function useGameSession(mission: Mission) {
  const reduced = useReducedMotionPref()
  const g = useGameRunner(mission, reduced)
  const t = useT()
  const session = useRef({ hadFailure: false, usedClue: false, usedScan: false })
  const [hintFor, setHintFor] = useState<object | null>(null)
  const [hintKey, setHintKey] = useState(0)

  const activeIds = useMemo(() => new Set(g.currentStep ? idsAlongPath(g.nodes, g.currentStep.commandPath) : []), [g.currentStep, g.nodes])
  const failedId = useMemo(() => {
    const tr = g.trace
    if (!tr || !g.finished || tr.failedStepIndex === undefined) return null
    return idAtPath(g.nodes, tr.steps[tr.failedStepIndex].commandPath) ?? null
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
  // Count failed runs (each failed trace once), adjusting state during render as React recommends.
  const [failedRuns, setFailedRuns] = useState(0)
  const [countedTrace, setCountedTrace] = useState<object | null>(null)
  if (failedRun && g.trace && g.trace !== countedTrace) {
    setCountedTrace(g.trace)
    setFailedRuns((n) => n + 1)
  }
  const [usedClue, setUsedClue] = useState(false)
  const handledWin = useRef<number | null>(null)
  useEffect(() => {
    const w = g.lastWin
    if (!w || handledWin.current === w.runId) return
    handledWin.current = w.runId
    const tm = setTimeout(() => evaluateWin({ stars: w.stars, usedRepeat: w.usedRepeat, ...session.current }), reduced ? 200 : 2400)
    return () => clearTimeout(tm)
  }, [g.lastWin, reduced])

  // A clue belongs to one failed run; it disappears when a new run starts or the plan changes.
  const hintOpen = hintFor !== null && hintFor === g.trace && failedRun
  const setHintOpen = (v: boolean) => setHintFor(v ? g.trace : null)
  const openHint = () => {
    session.current.usedClue = true
    setUsedClue(true)
    setHintKey((k) => k + 1)
    setHintOpen(true)
  }
  const showMe = useCallback(() => {
    const tr = g.trace
    if (tr?.failedStepIndex !== undefined) g.jumpTo(tr.failedStepIndex)
  }, [g])

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

  const [nudge, dismissNudge] = useNudge(g, mission, failedRuns, usedClue)
  const markScan = () => {
    session.current.usedScan = true
  }

  return { g, reduced, markScan, nudge, dismissNudge, activeIds, failedId, status, failedRun, won, hintOpen, setHintOpen, openHint, showMe, hintBody }
}

type Session = ReturnType<typeof useGameSession>

function Game({ mission }: { mission: Mission }) {
  const s = useGameSession(mission)
  const { g } = s
  const t = useT()
  const isDesk = useMediaQuery('(min-width: 768px)')
  const [quickOpen, setQuickOpen] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [scanSession, setScanSession] = useState(0)
  const [planOpen, setPlanOpen] = useState(() => !isDesk && g.nodes.length === 0)

  const openScan = () => {
    setScanSession((n) => n + 1)
    setScanOpen(true)
  }

  // Keyboard: Space runs/pauses when focus isn't on a control; Ctrl/Cmd+Z undo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return
      const el = document.activeElement as HTMLElement | null
      const typing = el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA'
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !typing) {
        e.preventDefault()
        if (e.shiftKey) g.redo()
        else g.undo()
        return
      }
      if (e.code !== 'Space' || e.repeat) return
      const safe = !el || el === document.body || el.dataset.board === 'true'
      if (!safe) return
      e.preventDefault()
      if (g.status === 'running') g.pause()
      else if (g.nodes.length) g.run()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [g])

  const theme = themeFor(mission.world)

  return (
    <div className="relative isolate flex h-[100dvh] flex-col overflow-hidden" style={{ background: theme.backdrop }} data-testid="game" data-outcome={g.finished ? g.trace?.outcome : undefined} data-world={theme.key}>
      <WorldBackdrop theme={theme} reduced={s.reduced} />
      {isDesk ? (
        <DeskWorkspace s={s} mission={mission} onScan={openScan} onSettings={() => setQuickOpen(true)} />
      ) : (
        <PhoneWorkspace s={s} mission={mission} planOpen={planOpen} setPlanOpen={setPlanOpen} onScan={openScan} onSettings={() => setQuickOpen(true)} />
      )}

      {!isDesk && (
        <Sheet open={s.hintOpen && !!s.hintBody} onClose={() => s.setHintOpen(false)} title={t.game.clueTitle} testId="hint-sheet">
          {s.hintBody}
        </Sheet>
      )}

      <Sheet open={quickOpen} onClose={() => setQuickOpen(false)} title={t.game.quickSettings} testId="quick-settings">
        <SettingsPanel />
      </Sheet>

      <ScanSheet
        key={scanSession}
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        mission={mission}
        onManual={() => {
          setScanOpen(false)
          if (!isDesk) setPlanOpen(true)
        }}
        onApply={(cmds) => {
          s.markScan()
          g.replaceAll(cmds)
          if (!isDesk) setPlanOpen(true)
        }}
      />
    </div>
  )
}

/* ---------------------------------------------------------------------- */
/* Shared stage                                                            */
/* ---------------------------------------------------------------------- */

function Stage({ s, mission, pad }: { s: Session; mission: Mission; pad: number }) {
  const [boardRef, box] = useElementSize<HTMLDivElement>()
  const size = Math.max(160, Math.floor(Math.min(box.width, box.height) - pad))
  const next = nextMission(mission.id)
  return (
    <div ref={boardRef} className="relative grid min-h-[150px] flex-1 place-items-center" data-board="true" tabIndex={-1}>
      {box.width > 0 && (
        <div className="relative">
          <MazeBoard mission={mission} frame={s.g.frame} size={size} reduced={s.reduced} speed={s.g.speed} running={s.g.status === 'running'} />
          <AnimatePresence>
            {s.won && s.g.lastWin && <VictoryOverlay mission={mission} win={s.g.lastWin} next={next} onReplay={s.g.reset} reduced={s.reduced} />}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

function GoalLine({ mission, compact, best }: { mission: Mission; compact?: boolean; best?: number }) {
  const t = useT()
  const mt = missionText(t, mission)
  const [tip, setTip] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setTip((v) => !v)}
      aria-expanded={tip}
      className={`flex w-full items-start gap-2.5 rounded-[18px] bg-white/85 text-left shadow-[0_1px_0_rgb(23_37_84/0.06)] backdrop-blur ${compact ? 'px-2.5 py-2' : 'px-4 py-3'}`}
      data-testid="goal-line"
    >
      <span className="-my-1 shrink-0">
        <Robot size={compact ? 36 : 44} mood="idle" pose="talk" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block font-display font-extrabold leading-snug ${compact ? 'text-[14.5px]' : 'text-[17px]'}`}>{mt.goal}</span>
        <AnimatePresence initial={false}>
          {(tip || !compact) && (
            <motion.span initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="block overflow-hidden text-[13px] text-ink-muted">
              {t.game.tip}: {mt.tip}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {best !== undefined && <Stars value={best} size={15} className="mt-0.5 flex shrink-0" />}
    </button>
  )
}

/* ---------------------------------------------------------------------- */
/* Phone: map view + full-screen plan editor                               */
/* ---------------------------------------------------------------------- */

function PhoneWorkspace({
  s,
  mission,
  planOpen,
  setPlanOpen,
  onScan,
  onSettings,
}: {
  s: Session
  mission: Mission
  planOpen: boolean
  setPlanOpen: (v: boolean) => void
  onScan: () => void
  onSettings: () => void
}) {
  const { g } = s
  const t = useT()
  const navigate = useNavigate()
  const progress = useProgress()
  const best = progress.levels[mission.id]?.bestStars ?? 0
  const running = g.status === 'running'
  const showRibbon = g.nodes.length > 0

  const run = () => {
    setPlanOpen(false)
    playSfx('select')
    g.run()
  }

  return (
    <>
      <header className="pt-safe-12 flex items-center gap-1.5 px-3 pb-2">
        <IconButton label={t.game.backToLevels} onClick={() => navigate('/levels')} tip={false} className="!h-11 !w-11 !min-w-11 !rounded-full !bg-white/90 shadow-[0_2px_8px_-4px_rgb(23_37_84/0.35)]">
          <ArrowLeft size={24} aria-hidden />
        </IconButton>
        <div className="min-w-0 flex-1 px-1">
          <p className="font-display text-[11px] font-extrabold uppercase tracking-wider text-primary">{t.common.level(mission.number)}</p>
          <h1 className="truncate text-[18px] font-black leading-tight">{missionText(t, mission).title}</h1>
        </div>
        <SoundToggle />
        <IconButton label={t.game.quickSettings} onClick={onSettings} tip={false}>
          <SlidersHorizontal size={22} aria-hidden />
        </IconButton>
      </header>

      <div className="px-3">
        <GoalLine mission={mission} compact best={best} />
      </div>

      <section className="flex min-h-0 flex-1 flex-col px-2 pt-2" aria-label={t.game.maze}>
        <Stage s={s} mission={mission} pad={4} />
      </section>

      <div className="flex flex-col gap-2 px-3 pb-2">
        <NudgeChip kind={s.nudge} onDismiss={s.dismissNudge} reduced={s.reduced} />
        {(s.status.tone !== 'neutral' || !showRibbon) && <StatusMessage info={s.status} compact onShowMe={s.showMe} onClue={s.failedRun ? s.openHint : undefined} />}
        {showRibbon && (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <ProgramRibbon nodes={g.nodes} activeIds={s.activeIds} failedId={s.failedId} onOpen={() => setPlanOpen(true)} reduced={s.reduced} />
            </div>
            <IconButton label={t.game.step} variant="secondary" size="lg" className="!h-[52px] !w-[52px] !rounded-[18px] !border-0 !bg-white/90" onClick={g.stepOnce} tip="top" data-testid="step-button-mobile">
              <StepForward size={22} aria-hidden />
            </IconButton>
          </div>
        )}
      </div>

      <nav className="pb-safe grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 bg-white/90 px-3 pt-2 shadow-[0_-10px_24px_-18px_rgb(23_37_84/0.45)] backdrop-blur" aria-label={t.game.controls}>
        <Button variant="secondary" size="lg" onClick={() => setPlanOpen(true)} className="!gap-1.5 !px-2" data-testid="open-plan" aria-label={`${t.editor.openPlan}, ${t.editor.instructions(g.nodeCount)}`}>
          <span className="truncate text-[15px]">{t.editor.planButton}</span>
          <PlanCountBadge n={g.nodeCount} />
        </Button>
        <Button
          size="lg"
          variant={running ? 'secondary' : 'primary'}
          onClick={() => (running ? g.pause() : run())}
          disabled={!g.nodes.length && !running}
          icon={running ? <Pause size={22} fill="currentColor" aria-hidden /> : <Play size={22} fill="currentColor" aria-hidden />}
          sound={false}
          className="whitespace-nowrap !px-3"
          data-testid="run-button-mobile"
        >
          {runLabel(g, t)}
        </Button>
        <IconButton label={t.game.reset} variant="secondary" size="lg" className="!w-12 !min-w-12" onClick={g.reset} disabled={g.status === 'idle'} tip="top" data-testid="reset-button-mobile">
          <RotateCcw size={22} aria-hidden />
        </IconButton>
        <div className="col-span-3 h-2" aria-hidden />
      </nav>

      <PlanScreen
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        g={g}
        mission={mission}
        activeIds={s.activeIds}
        failedId={s.failedId}
        reduced={s.reduced}
        onRun={run}
        onScan={onScan}
      />
    </>
  )
}

/* ---------------------------------------------------------------------- */
/* Tablet & desktop: stage + workbench                                     */
/* ---------------------------------------------------------------------- */

function DeskWorkspace({ s, mission, onScan, onSettings }: { s: Session; mission: Mission; onScan: () => void; onSettings: () => void }) {
  const { g } = s
  const t = useT()
  const progress = useProgress()
  const best = progress.levels[mission.id]?.bestStars ?? 0
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.35fr)_minmax(320px,1fr)] gap-4 p-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(400px,1fr)] lg:gap-6 lg:p-6 2xl:grid-cols-[minmax(0,1.6fr)_minmax(460px,1fr)]">
      <section className="flex min-h-0 flex-col gap-3 lg:gap-4" aria-label={t.game.maze}>
        <div className="flex items-center gap-3">
          <Link to="/levels" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/80 text-ink hover:bg-white lg:hidden" aria-label={t.game.backToLevels}>
            <ArrowLeft size={22} aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[13px] font-extrabold uppercase tracking-wider text-primary">{t.common.level(mission.number)}</p>
            <h1 className="truncate text-[24px] font-black leading-tight lg:text-[28px]">{missionText(t, mission).title}</h1>
          </div>
          <Stars value={best} size={20} className="flex shrink-0" />
          <SoundToggle />
          <IconButton label={t.game.quickSettings} onClick={onSettings}>
            <SlidersHorizontal size={22} aria-hidden />
          </IconButton>
        </div>
        <GoalLine mission={mission} />
        <Stage s={s} mission={mission} pad={8} />
        <NudgeChip kind={s.nudge} onDismiss={s.dismissNudge} reduced={s.reduced} />
        <PlaybackControls g={g} />
        <StatusMessage info={s.status} onShowMe={s.showMe} onClue={s.failedRun ? s.openHint : undefined} />
      </section>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] bg-white/92 shadow-[0_2px_0_rgb(23_37_84/0.04),0_24px_48px_-28px_rgb(23_37_84/0.45)] backdrop-blur" aria-label={t.game.editor}>
        <div className="flex items-center gap-2 px-5 pb-1 pt-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-[22px] font-black leading-tight">{t.game.plan}</h2>
            <p className="tabular text-[13px] font-semibold text-ink-muted" data-testid="plan-count">
              {t.game.blocksCount(g.nodeCount, LIMITS.maxNodes)}, {t.game.par(mission.par).toLowerCase()}
            </p>
          </div>
          <UndoRedo g={g} />
          <IconButton label={t.game.clear} variant="ghost" onClick={g.clearAll} disabled={!g.nodes.length} data-testid="clear-plan">
            <Trash2 size={20} aria-hidden />
          </IconButton>
        </div>
        <div className="px-5 pb-3 pt-2">
          <Palette g={g} mission={mission} />
          <TargetBanner g={g} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-cloud/70 px-5 py-4" data-testid="plan-scroll">
          <DragHint touch={false} show={g.nodes.length > 1} />
          <PlanEditor
            {...editorPropsFor(g, s.activeIds, s.failedId, s.reduced)}
            density="desk"
            empty={
              <div className="grid place-items-center rounded-[20px] border-2 border-dashed border-line px-6 py-10 text-center">
                <p className="font-display text-lg font-extrabold">{t.game.emptyTitle}</p>
                <p className="mt-1 max-w-xs text-sm text-ink-muted">{t.game.emptyBody}</p>
              </div>
            }
          />
          <AnimatePresence>
            {s.hintOpen && s.hintBody && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="mt-4">
                <p className="mb-2 font-display text-sm font-extrabold uppercase tracking-wider text-orange-600">{t.game.clueLabel}</p>
                {s.hintBody}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4">
          <Button variant="secondary" size="lg" className="whitespace-nowrap !px-3" onClick={onScan} icon={<Camera size={20} aria-hidden />} data-testid="scan-button">
            <span className="xl:hidden">{t.game.scanPlan}</span>
            <span className="hidden xl:inline">{t.game.scanLong}</span>
          </Button>
          <Button variant="orange" size="lg" className="whitespace-nowrap !px-3" onClick={s.openHint} disabled={!s.failedRun} icon={<Lightbulb size={20} aria-hidden />}>
            <span className="xl:hidden">{t.game.clue}</span>
            <span className="hidden xl:inline">{t.game.clueLong}</span>
          </Button>
        </div>
      </section>
    </div>
  )
}

