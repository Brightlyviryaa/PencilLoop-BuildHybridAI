import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Minus, Play, Plus, Pointer, RotateCcw, Volume2, VolumeX, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useDevicePrefs } from '../app/devicePrefs'
import { playSfx, useReducedMotionPref } from '../app/hooks'
import { Button, IconButton } from '../components/Button'
import { Robot } from '../components/Robot'
import { BlockIcon } from '../features/editor/blocks'
import { useElementSize } from '../features/game/useElementSize'
import { MazeBoard } from '../features/maze/MazeBoard'
import { boardLayout } from '../features/maze/layout'
import { LIMITS } from '../features/maze/limits'
import { themeFor } from '../features/maze/theme'
import type { Command, Mission } from '../features/maze/types'
import { TUTORIAL_LOOP, TUTORIAL_MOVE, TUTORIAL_TURN } from '../features/tutorial/tutorialMissions'
import { useTutorialPlayer } from '../features/tutorial/useTutorialPlayer'
import { speak, stopSpeaking, voiceSupported, type SpeakResult } from '../features/voice/narrator'
import { useLang, useT } from '../i18n'
import { EASE_OUT } from '../styles/motion'

type StepId = 'hello' | 'goal' | 'addMove' | 'run' | 'firstWin' | 'turn' | 'loopIntro' | 'loop' | 'done'
const ORDER: StepId[] = ['hello', 'goal', 'addMove', 'run', 'firstWin', 'turn', 'loopIntro', 'loop', 'done']

const MISSION_FOR: Record<StepId, Mission> = {
  hello: TUTORIAL_MOVE,
  goal: TUTORIAL_MOVE,
  addMove: TUTORIAL_MOVE,
  run: TUTORIAL_MOVE,
  firstWin: TUTORIAL_MOVE,
  turn: TUTORIAL_TURN,
  loopIntro: TUTORIAL_LOOP,
  loop: TUTORIAL_LOOP,
  done: TUTORIAL_LOOP,
}

/**
 * First-time interactive tutorial: one idea per step, learn by doing, with
 * optional voice (Web Speech API) and a text transcript that is always shown.
 */
export default function TutorialPage() {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const reduced = useReducedMotionPref()
  const [prefs, setPrefs] = useDevicePrefs()
  const [started, setStarted] = useState(false)
  const [step, setStep] = useState<StepId>('hello')
  const [plan, setPlan] = useState<Command[]>([])
  const [line, setLine] = useState<keyof typeof t.tutorial.lines>('hello')
  const [voiceNote, setVoiceNote] = useState<SpeakResult | null>(null)
  const mission = MISSION_FOR[step]
  const player = useTutorialPlayer(mission, reduced)
  const theme = themeFor(mission.world)
  const text = t.tutorial.lines[line]

  // Speak the current line whenever it (or the language) changes, after the player chose voice.
  const say = useCallback(() => {
    if (!started) return
    void speak(t.tutorial.lines[line], lang).then((r) => {
      if (r === 'unavailable' || r === 'blocked') setVoiceNote(r)
      else if (r === 'spoken') setVoiceNote(null)
    })
  }, [started, line, lang, t])
  useEffect(say, [say])
  useEffect(() => () => stopSpeaking(), [])

  const go = (s: StepId, l?: keyof typeof t.tutorial.lines) => {
    playSfx('tutorial-step')
    setStep(s)
    setLine(l ?? (s === 'turn' ? 'turnIntro' : s === 'loopIntro' ? 'loopIntro' : s === 'loop' ? 'loopTask' : (s as keyof typeof t.tutorial.lines)))
    if (s === 'turn') setPlan([])
    if (s === 'loop') setPlan([{ type: 'repeat', times: 2, commands: [{ type: 'move', steps: 1 }] }])
  }

  const finish = (to: string) => {
    stopSpeaking()
    setPrefs({ tutorialDone: true })
    navigate(to, { replace: true })
  }

  const begin = (withVoice: boolean) => {
    setPrefs({ voice: withVoice })
    setStarted(true)
    go('goal')
  }

  const run = async () => {
    const outcome = await player.play(plan)
    if (step === 'run') {
      if (outcome === 'SUCCESS') go('firstWin')
    } else if (step === 'turn') {
      if (outcome === 'SUCCESS') {
        setLine('turnWin')
        setTimeout(() => go('loopIntro'), reduced ? 600 : 1600)
      } else {
        setLine('turnOops')
        setTimeout(() => {
          player.reset()
          setPlan([])
        }, 1400)
      }
    } else if (step === 'loop') {
      if (outcome === 'SUCCESS') setTimeout(() => go('done'), reduced ? 300 : 900)
      else {
        setLine('loopOops')
        setTimeout(() => player.reset(), 1400)
      }
    }
  }

  const add = (c: Command) => {
    playSfx('add-block')
    setPlan((p) => [...p, c])
    if (step === 'addMove') go('run')
  }

  const index = ORDER.indexOf(step)
  const showPalette = step === 'addMove' || step === 'run' || step === 'turn'
  const expected = step === 'addMove' ? 'move' : step === 'turn' ? (plan.length === 0 ? 'right' : plan.length === 1 ? 'move' : 'run') : step === 'run' || step === 'loop' ? 'run' : null
  const loopTimes = plan[0]?.type === 'repeat' ? plan[0].times : 2

  return (
    <div className="relative isolate flex h-[100dvh] flex-col overflow-hidden" style={{ background: theme.backdrop }} data-testid="tutorial" data-step={step}>
      {/* top bar */}
      <header className="pt-safe-12 mx-auto flex w-full max-w-[560px] items-center gap-2 px-3 pb-1">
        <div className="flex flex-1 items-center gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={ORDER.length} aria-valuenow={index + 1} aria-label={t.tutorial.stepOf(index + 1, ORDER.length)}>
          {ORDER.map((s, i) => (
            <span key={s} className={`h-2 flex-1 rounded-full transition-colors duration-300 ${i <= index ? 'bg-primary' : 'bg-white/70'}`} />
          ))}
        </div>
        {started && voiceSupported() && (
          <>
            <IconButton
              label={prefs.voice ? t.tutorial.voiceOn : t.tutorial.voiceOff}
              onClick={() => {
                const on = !prefs.voice
                setPrefs({ voice: on })
                if (!on) stopSpeaking()
                else setTimeout(() => say(), 50)
              }}
              aria-pressed={prefs.voice}
              data-testid="tutorial-voice"
              tip={false}
            >
              {prefs.voice ? <Volume2 size={22} aria-hidden /> : <VolumeX size={22} aria-hidden />}
            </IconButton>
            <IconButton label={t.tutorial.repeat} onClick={() => say()} disabled={!prefs.voice} data-testid="tutorial-repeat" tip={false}>
              <RotateCcw size={20} aria-hidden />
            </IconButton>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={() => finish('/')} aria-label={t.tutorial.skipAria} icon={<X size={16} aria-hidden />} data-testid="tutorial-skip">
          {t.tutorial.skip}
        </Button>
      </header>

      <main className="pb-safe mx-auto flex min-h-0 w-full max-w-[560px] flex-1 flex-col gap-3 px-3 pb-3">
        {/* Pip speaks (transcript always visible) */}
        <div className="flex items-end gap-2">
          <div className={`shrink-0 ${step === 'hello' ? 'hidden' : ''}`}>
            <Robot size={64} mood={step === 'done' || line === 'firstWin' || line === 'turnWin' ? 'cheer' : line.endsWith('Oops') ? 'oops' : 'happy'} pose="talk" still={reduced} />
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${line}-${lang}`}
              initial={reduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
              className={`relative mb-2 flex-1 rounded-[22px] bg-white ${step === 'hello' ? 'text-center' : 'rounded-bl-[6px]'} px-4 py-3 shadow-[0_10px_24px_-18px_rgb(23_37_84/0.6)]`}
              aria-live="polite"
              data-testid="tutorial-line"
            >
              <p className="font-display text-[18px] font-extrabold leading-snug">{text}</p>
              {voiceNote && prefs.voice && <p className="mt-1 text-[12.5px] font-semibold text-ink-muted">{voiceNote === 'blocked' ? t.tutorial.voiceBlocked : t.tutorial.voiceUnavailable}</p>}
            </motion.div>
          </AnimatePresence>
        </div>

        {step === 'hello' ? (
          <>
          <div className="grid flex-1 place-items-center py-4" aria-hidden>
            <div className="relative grid h-[min(62vw,260px)] w-[min(62vw,260px)] place-items-center rounded-full bg-white/70 shadow-[0_30px_60px_-40px_rgb(23_37_84/0.7)]">
              <Robot size={Math.round(Math.min(window.innerWidth * 0.46, 200))} mood="happy" pose="talk" still={reduced} />
              <motion.svg viewBox="0 0 40 40" className="absolute -right-2 bottom-4 w-16" animate={reduced ? undefined : { rotate: [-4, 4, -4] }} transition={{ duration: 2, repeat: Infinity }}>
                <rect x="11" y="4" width="3.2" height="33" rx="1.6" fill="#172554" />
                <path d="M14 6 C20 3 26 9 34 6 L34 20 C26 23 20 17 14 20 Z" fill="#6DD6B5" stroke="#127A5A" strokeWidth="1.8" />
              </motion.svg>
            </div>
          </div>
          <div className="flex flex-col gap-2 pb-2">
            {voiceSupported() && (
              <Button size="xl" block onClick={() => begin(true)} icon={<Volume2 size={22} aria-hidden />} data-testid="tutorial-start-voice" data-autofocus>
                {t.tutorial.startVoice}
              </Button>
            )}
            <Button size="lg" variant={voiceSupported() ? 'secondary' : 'primary'} block onClick={() => begin(false)} data-testid="tutorial-start-quiet">
              {t.tutorial.startQuiet}
            </Button>
          </div>
          </>
        ) : step === 'done' ? (
          <Done onPlay={() => finish('/play/first-steps')} onHome={() => finish('/')} reduced={reduced} />
        ) : (
          <>
            <Board mission={mission} frame={player.frame} running={player.running} reduced={reduced} highlightGoal={step === 'goal'} />

            {step === 'loopIntro' ? (
              <LoopCompare reduced={reduced} />
            ) : (
              <PlanStrip
                plan={plan}
                loop={step === 'loop'}
                onTimes={(n) => setPlan([{ type: 'repeat', times: n, commands: [{ type: 'move', steps: 1 }] }])}
                highlightPlus={step === 'loop' && loopTimes < 4}
              />
            )}

            <div className="flex flex-col gap-2 pb-1">
              {showPalette && (
                <div className="grid grid-cols-3 gap-2">
                  <Spot on={expected === 'move'}>
                    <PaletteBtn tone="bg-primary text-white" label={t.palette.move} node={{ type: 'move' }} onClick={() => add({ type: 'move', steps: 1 })} disabled={player.running || step === 'run'} testId="tutorial-add-move" />
                  </Spot>
                  <Spot on={false}>
                    <PaletteBtn tone="bg-orange text-ink" label={t.palette.left} node={{ type: 'turn', direction: 'left' }} onClick={() => add({ type: 'turn', direction: 'left' })} disabled={step !== 'turn' || player.running} testId="tutorial-add-left" />
                  </Spot>
                  <Spot on={expected === 'right'}>
                    <PaletteBtn tone="bg-orange text-ink" label={t.palette.right} node={{ type: 'turn', direction: 'right' }} onClick={() => add({ type: 'turn', direction: 'right' })} disabled={step !== 'turn' || player.running} testId="tutorial-add-right" />
                  </Spot>
                </div>
              )}
              {step === 'goal' || step === 'firstWin' || step === 'loopIntro' ? (
                <Button size="xl" block onClick={() => go(step === 'goal' ? 'addMove' : step === 'firstWin' ? 'turn' : 'loop')} iconRight={<ArrowRight size={22} aria-hidden />} data-testid="tutorial-next">
                  {step === 'goal' ? t.tutorial.letsGo : t.tutorial.next}
                </Button>
              ) : (
                <Spot on={expected === 'run' && plan.length > 0 && !player.running && (step !== 'loop' || loopTimes >= 4)}>
                  <Button size="xl" block onClick={run} disabled={plan.length === 0 || player.running || step === 'addMove'} icon={<Play size={22} fill="currentColor" aria-hidden />} sound={false} data-testid="tutorial-run">
                    {t.game.run}
                  </Button>
                </Spot>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

function Board({ mission, frame, running, reduced, highlightGoal }: { mission: Mission; frame: ReturnType<typeof useTutorialPlayer>['frame']; running: boolean; reduced: boolean; highlightGoal: boolean }) {
  const [ref, box] = useElementSize<HTMLDivElement>()
  // Fit both the width and the height left over on short phones.
  const size = Math.max(150, Math.min(340, Math.floor(box.width), Math.floor(box.height)))
  const { grid, left, top } = boardLayout(size)
  const cell = grid / mission.cols
  return (
    <div ref={ref} className="grid min-h-[150px] w-full flex-1 place-items-center">
      {box.width > 0 && (
        <div className="relative">
          <MazeBoard mission={mission} frame={frame} size={size} reduced={reduced} speed={1} running={running} />
          {highlightGoal && (
            <motion.span
              className="pointer-events-none absolute rounded-[22%] border-[4px] border-orange"
              style={{ left: left + mission.goal.x * cell - 4, top: top + mission.goal.y * cell - 4, width: cell + 8, height: cell + 8 }}
              animate={reduced ? undefined : { scale: [1, 1.12, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              data-testid="tutorial-goal-highlight"
              aria-hidden
            />
          )}
        </div>
      )}
    </div>
  )
}

/** A pulsing ring and pointing hand around the control the child should use next. */
function Spot({ on, children }: { on: boolean; children: ReactNode }) {
  const reduced = useReducedMotionPref()
  return (
    <div className="relative">
      {children}
      {on && (
        <>
          <motion.span className="pointer-events-none absolute -inset-1.5 rounded-[20px] border-[3px] border-orange" animate={reduced ? undefined : { opacity: [1, 0.35, 1] }} transition={{ duration: 1.1, repeat: Infinity }} aria-hidden data-testid="spotlight" />
          <motion.span className="pointer-events-none absolute -bottom-5 right-3 text-ink drop-shadow" animate={reduced ? undefined : { y: [0, -6, 0] }} transition={{ duration: 0.9, repeat: Infinity }} aria-hidden>
            <Pointer size={30} fill="#FFD166" strokeWidth={2} />
          </motion.span>
        </>
      )}
    </div>
  )
}

function PaletteBtn({ tone, label, node, onClick, disabled, testId }: { tone: string; label: string; node: { type: 'move' } | { type: 'turn'; direction: 'left' | 'right' }; onClick: () => void; disabled?: boolean; testId: string }) {
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.94 }}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-[72px] w-full flex-col items-center justify-center gap-1 rounded-[18px] font-display text-[14px] font-extrabold shadow-[var(--shadow-press)] disabled:opacity-40 ${tone}`}
      data-testid={testId}
    >
      <BlockIcon node={node} size={24} />
      {label}
    </motion.button>
  )
}

function PlanStrip({ plan, loop, onTimes, highlightPlus }: { plan: Command[]; loop: boolean; onTimes: (n: number) => void; highlightPlus: boolean }) {
  const t = useT()
  const reduced = useReducedMotionPref()
  if (loop && plan[0]?.type === 'repeat') {
    const r = plan[0]
    return (
      <div className="rounded-[20px] bg-mint p-1.5 pb-2" data-testid="tutorial-loop">
        <div className="flex items-center gap-2 px-2 py-1">
          <BlockIcon node={{ type: 'repeat' }} size={22} />
          <span className="flex-1 font-display text-[18px] font-black">{t.blocks.repeat}</span>
          <div className="flex items-center rounded-[14px] bg-white/60">
            <button type="button" className="grid h-12 w-12 place-items-center disabled:opacity-30" onClick={() => onTimes(r.times - 1)} disabled={r.times <= LIMITS.repeat.min} aria-label={t.blocks.decrease(t.blocks.times)}>
              <Minus size={20} strokeWidth={3} aria-hidden />
            </button>
            <span className="tabular w-10 text-center font-display text-[22px] font-black" aria-live="polite">
              {r.times}x
            </span>
            <span className="relative">
              <button type="button" className="grid h-12 w-12 place-items-center disabled:opacity-30" onClick={() => onTimes(r.times + 1)} disabled={r.times >= LIMITS.repeat.max} aria-label={t.blocks.increase(t.blocks.times)} data-testid="tutorial-plus">
                <Plus size={20} strokeWidth={3} aria-hidden />
              </button>
              {highlightPlus && <motion.span className="pointer-events-none absolute inset-0 rounded-[12px] border-[3px] border-orange" animate={reduced ? undefined : { opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} aria-hidden />}
            </span>
          </div>
        </div>
        <div className="ml-4 mr-1 flex items-center gap-2 rounded-[14px] bg-[#f3fcf8] p-2">
          <span className="flex h-12 items-center gap-2 rounded-[12px] bg-primary px-3 font-display text-[16px] font-black text-white">
            <BlockIcon node={{ type: 'move' }} size={20} /> {t.blocks.move} 1
          </span>
        </div>
      </div>
    )
  }
  return (
    <ol className="flex min-h-[60px] flex-wrap items-center gap-2 rounded-[20px] bg-white/80 p-2" aria-label={t.game.plan} data-testid="tutorial-plan">
      {plan.length === 0 && <li className="px-2 text-[14px] font-semibold text-ink-muted">{t.game.emptyTray}</li>}
      <AnimatePresence initial={false}>
        {plan.map((c, i) => (
          <motion.li key={i} initial={reduced ? false : { scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`flex h-11 items-center gap-1.5 rounded-[12px] px-3 font-display text-[15px] font-black ${c.type === 'move' ? 'bg-primary text-white' : 'bg-orange text-ink'}`}>
            <BlockIcon node={c.type === 'turn' ? { type: 'turn', direction: c.direction } : { type: 'move' }} size={18} />
            {c.type === 'move' ? `${t.blocks.move} ${c.steps}` : t.blocks.turn(c.type === 'turn' ? c.direction : 'left')}
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  )
}

function LoopCompare({ reduced }: { reduced: boolean }) {
  const t = useT()
  const four = useMemo(() => [0, 1, 2, 3], [])
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[20px] bg-white/85 p-3" data-testid="tutorial-compare">
      <div>
        <p className="mb-1.5 text-center text-[12px] font-extrabold uppercase tracking-wide text-ink-muted">{t.tutorial.compareLong}</p>
        <div className="flex flex-col gap-1">
          {four.map((i) => (
            <motion.span key={i} initial={reduced ? false : { opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.15 }} className="flex h-8 items-center gap-1.5 rounded-[10px] bg-primary px-2 font-display text-[13px] font-black text-white">
              <BlockIcon node={{ type: 'move' }} size={14} /> {t.blocks.move} 1
            </motion.span>
          ))}
        </div>
      </div>
      <ArrowRight className="text-ink-muted" aria-hidden />
      <motion.div initial={reduced ? false : { opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1, type: 'spring', stiffness: 300, damping: 16 }}>
        <p className="mb-1.5 text-center text-[12px] font-extrabold uppercase tracking-wide text-mint-700">{t.tutorial.compareShort}</p>
        <div className="rounded-[14px] bg-mint p-1.5">
          <p className="flex items-center gap-1 px-1 font-display text-[13px] font-black">
            <BlockIcon node={{ type: 'repeat' }} size={14} /> {t.blocks.repeat} 4x
          </p>
          <span className="ml-2 mt-1 flex h-8 items-center gap-1.5 rounded-[10px] bg-primary px-2 font-display text-[13px] font-black text-white">
            <BlockIcon node={{ type: 'move' }} size={14} /> {t.blocks.move} 1
          </span>
        </div>
      </motion.div>
    </div>
  )
}

function Done({ onPlay, onHome, reduced }: { onPlay: () => void; onHome: () => void; reduced: boolean }) {
  const t = useT()
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    playSfx('achievement')
    const tm = setTimeout(() => ref.current?.focus(), 300)
    return () => clearTimeout(tm)
  }, [])
  return (
    <motion.div className="mt-4 flex flex-1 flex-col items-center text-center" initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} data-testid="tutorial-done">
      <motion.div initial={reduced ? false : { scale: 0.5, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 12 }} className="grid h-40 w-40 place-items-center rounded-full bg-white shadow-[0_20px_40px_-24px_rgb(23_37_84/0.6)]">
        <Robot size={130} mood="cheer" still={reduced} />
      </motion.div>
      <h1 className="mt-4 text-[28px] font-black">{t.tutorial.reward}</h1>
      <div className="mt-auto flex w-full flex-col gap-2 pb-2 pt-6">
        <Button ref={ref} size="xl" block onClick={onPlay} iconRight={<ArrowRight size={22} aria-hidden />} data-testid="tutorial-play-level1">
          {t.tutorial.startLevel1}
        </Button>
        <Button size="md" variant="ghost" block onClick={onHome}>
          {t.tutorial.later}
        </Button>
      </div>
    </motion.div>
  )
}
