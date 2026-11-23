import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { playSfx } from '../../app/hooks'
import {
  createNode,
  fromCommands,
  insertNode,
  removeNode,
  setList,
  shiftNode,
  toCommands,
  updateNode,
  type EditorNode,
  type ListTarget,
  type NewBlock,
} from '../editor/ast'
import { runProgram, toProgram } from '../maze/interpreter'
import type { BoardFrame } from '../maze/MazeBoard'
import { scoreFor, starsFor, usesRepeat } from '../maze/scoring'
import type { Cell, Command, Mission, Trace, TurnDirection } from '../maze/types'
import { countNodes } from '../maze/validate'
import { LIMITS } from '../maze/limits'
import { recordAttempt, recordWin, type WinOutcome } from '../progress/store'
import { DUR } from '../../styles/motion'

export type PlayStatus = 'idle' | 'running' | 'paused' | 'finished'

const draftKey = (id: string) => `pencilloop:draft:${id}`

function loadDraft(m: Mission): EditorNode[] {
  try {
    const raw = localStorage.getItem(draftKey(m.id))
    if (raw) {
      const cmds = JSON.parse(raw) as Command[]
      const t = runProgram(m, toProgram(cmds))
      if (t.outcome !== 'INVALID_PROGRAM' || cmds.length === 0) return fromCommands(cmds)
    }
  } catch {
    /* ignore */
  }
  return fromCommands(m.starterCommands)
}

export interface LastWin {
  runId: number
  stars: number
  score: number
  blocks: number
  firstTry: boolean
  usedRepeat: boolean
  outcome: WinOutcome
}

export function useGameRunner(mission: Mission, reduced: boolean) {
  const [nodes, setNodes] = useState<EditorNode[]>(() => loadDraft(mission))
  const [trace, setTrace] = useState<Trace | null>(null)
  const [index, setIndex] = useState(-1)
  const [status, setStatus] = useState<PlayStatus>('idle')
  const [speed, setSpeed] = useState<1 | 2>(1)
  const [target, setTarget] = useState<ListTarget>(null)
  const [runId, setRunId] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [lastWinStars, setLastWinStars] = useState<number | null>(null)
  const [lastWin, setLastWin] = useState<LastWin | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ranCommands = useRef<Command[]>([])

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }
  useEffect(() => clearTimer, [])

  // Persist draft program per level.
  useEffect(() => {
    try {
      localStorage.setItem(draftKey(mission.id), JSON.stringify(toCommands(nodes)))
    } catch {
      /* ignore */
    }
  }, [nodes, mission.id])

  const resetRun = useCallback(() => {
    clearTimer()
    setStatus('idle')
    setTrace(null)
    setIndex(-1)
    setLastWinStars(null)
    setRunId((r) => r + 1)
  }, [])

  /* ------------------------------ editing ------------------------------ */
  const edit = useCallback(
    (fn: (n: EditorNode[]) => EditorNode[]) => {
      if (status !== 'idle') resetRun()
      setNodes(fn)
    },
    [status, resetRun],
  )

  const nodeCount = countNodes(toCommands(nodes))
  const canAdd = nodeCount < LIMITS.maxNodes

  const add = useCallback(
    (block: NewBlock) => {
      if (!canAdd) {
        playSfx('error')
        return null
      }
      const node = createNode(block)
      edit((n) => insertNode(n, node, target))
      playSfx('add-block')
      if (node.type === 'repeat') setTarget(node.id)
      return node.id
    },
    [edit, target, canAdd],
  )

  const remove = useCallback(
    (id: string) => {
      edit((n) => removeNode(n, id))
      if (target === id) setTarget(null)
      playSfx('remove-block')
    },
    [edit, target],
  )

  const patch = useCallback(
    (id: string, p: Partial<{ steps: number; times: number; direction: TurnDirection }>) => {
      edit((n) => updateNode(n, id, p))
      playSfx('tap')
    },
    [edit],
  )

  const shift = useCallback(
    (id: string, d: -1 | 1) => {
      edit((n) => shiftNode(n, id, d))
      playSfx('add-block', { pitch: d < 0 ? 1.1 : 0.9 })
    },
    [edit],
  )

  const reorder = useCallback((list: ListTarget, items: EditorNode[]) => edit((n) => setList(n, list, items)), [edit])

  const replaceAll = useCallback(
    (cmds: Command[]) => {
      resetRun()
      setTarget(null)
      setNodes(fromCommands(cmds))
    },
    [resetRun],
  )

  const clearAll = useCallback(() => {
    resetRun()
    setTarget(null)
    setNodes([])
    playSfx('remove-block')
  }, [resetRun])

  /* ------------------------------ playback ----------------------------- */
  const computeTrace = useCallback(() => {
    const cmds = toCommands(nodes)
    ranCommands.current = cmds
    return runProgram(mission, toProgram(cmds))
  }, [nodes, mission])

  const run = useCallback(() => {
    if (status === 'running') return
    if (status === 'paused' && trace && index < trace.steps.length - 1) {
      setStatus('running')
      return
    }
    clearTimer()
    const t = computeTrace()
    recordAttempt(mission.id)
    setAttempts((a) => a + 1)
    setLastWinStars(null)
    setRunId((r) => r + 1)
    setTrace(t)
    setIndex(-1)
    if (t.outcome === 'INVALID_PROGRAM' || t.steps.length === 0) {
      setStatus('finished')
      playSfx('error')
      return
    }
    setStatus('running')
  }, [status, trace, index, computeTrace, mission.id])

  const pause = useCallback(() => {
    if (status === 'running') {
      clearTimer()
      setStatus('paused')
    }
  }, [status])

  const stepOnce = useCallback(() => {
    clearTimer()
    if (!trace || status === 'finished' || status === 'idle') {
      const t = computeTrace()
      if (status !== 'paused') {
        recordAttempt(mission.id)
        setAttempts((a) => a + 1)
      }
      setRunId((r) => r + 1)
      setTrace(t)
      setLastWinStars(null)
      if (t.outcome === 'INVALID_PROGRAM' || t.steps.length === 0) {
        setIndex(-1)
        setStatus('finished')
        playSfx('error')
        return
      }
      setIndex(0)
      setStatus(t.steps.length === 1 ? 'finished' : 'paused')
      return
    }
    const next = Math.min(index + 1, trace.steps.length - 1)
    setIndex(next)
    setStatus(next >= trace.steps.length - 1 ? 'finished' : 'paused')
  }, [trace, status, index, computeTrace, mission.id])

  /** Jump to a specific trace step (used by "Show me where"). */
  const jumpTo = useCallback(
    (i: number) => {
      if (!trace) return
      clearTimer()
      setIndex(Math.max(-1, Math.min(i, trace.steps.length - 1)))
      setStatus(i >= trace.steps.length - 1 ? 'finished' : 'paused')
    },
    [trace],
  )

  // Single animation clock: advances one atomic step at a time.
  useEffect(() => {
    if (status !== 'running' || !trace) return
    const steps = trace.steps
    if (index >= steps.length - 1) {
      setStatus('finished')
      return
    }
    const cur = index >= 0 ? steps[index] : null
    const base = reduced ? 0.16 : cur?.kind === 'turn' ? DUR.robotTurn : cur?.kind === 'move' ? DUR.robotMove : 0.18
    const delay = index < 0 ? 140 : (base / speed + 0.05) * 1000
    timer.current = setTimeout(() => setIndex((i) => i + 1), delay)
    return clearTimer
  }, [status, index, trace, speed, reduced])

  // Step side-effects (sound) — fired once per index change.
  useEffect(() => {
    if (!trace || index < 0) return
    const s = trace.steps[index]
    if (!s) return
    if (s.kind === 'move') playSfx('robot-move', { pitch: 0.94 + ((index * 7) % 5) * 0.03 })
    else if (s.kind === 'turn') playSfx('robot-turn')
    else playSfx('collision')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, runId])

  // Outcome side-effects when playback reaches the end.
  const finishedHandled = useRef<number>(-1)
  useEffect(() => {
    if (status !== 'finished' || !trace) return
    if (trace.outcome === 'INVALID_PROGRAM') return
    if (index < trace.steps.length - 1) return
    if (finishedHandled.current === runId) return
    finishedHandled.current = runId
    if (trace.outcome === 'SUCCESS') {
      const cmds = ranCommands.current
      const stars = starsFor(mission, cmds)
      const score = scoreFor(mission, cmds, attempts === 1)
      const blocks = countNodes(cmds)
      const outcome = recordWin(mission.id, { stars, score, blocks })
      setLastWin({ runId, stars, score, blocks, firstTry: attempts === 1, usedRepeat: usesRepeat(cmds), outcome })
      setLastWinStars(stars)
      const t = setTimeout(() => playSfx('victory'), reduced ? 0 : 260)
      return () => clearTimeout(t)
    }
    if (trace.outcome === 'INCOMPLETE' || trace.outcome === 'STEP_LIMIT') playSfx('error')
  }, [status, trace, index, runId, mission, reduced, attempts])

  /* ------------------------------- frame ------------------------------- */
  const frame: BoardFrame = useMemo(() => {
    const start = { x: mission.start.x, y: mission.start.y, dir: mission.start.dir }
    const trail: Cell[] = [{ x: start.x, y: start.y }]
    if (!trace || index < 0) return { robot: start, tick: runId * 1000, kind: 'idle', trail, mood: 'idle' }
    for (let i = 0; i <= index; i++) {
      const s = trace.steps[i]
      if (s.kind === 'move') trail.push({ x: s.after.x, y: s.after.y })
    }
    const s = trace.steps[index]
    const done = status === 'finished' && index === trace.steps.length - 1
    return {
      robot: s.after,
      tick: runId * 1000 + index + 1,
      kind: s.kind,
      trail,
      blockedCell: s.kind === 'bump' ? s.blockedCell : undefined,
      mood: s.kind === 'bump' ? 'oops' : done && trace.outcome === 'SUCCESS' ? 'happy' : 'idle',
    }
  }, [trace, index, runId, mission, status])

  const currentStep = trace && index >= 0 ? trace.steps[index] : null
  const finished = status === 'finished' && !!trace && (trace.outcome === 'INVALID_PROGRAM' || index === trace.steps.length - 1)

  return {
    nodes,
    nodeCount,
    canAdd,
    trace,
    index,
    status,
    speed,
    setSpeed,
    target,
    setTarget,
    attempts,
    frame,
    currentStep,
    finished,
    lastWinStars,
    lastWin,
    ranCommands: ranCommands.current,
    add,
    remove,
    patch,
    shift,
    reorder,
    replaceAll,
    clearAll,
    run,
    pause,
    stepOnce,
    jumpTo,
    reset: resetRun,
  }
}

export type GameRunner = ReturnType<typeof useGameRunner>
