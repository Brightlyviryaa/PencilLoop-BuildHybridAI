import { useCallback, useEffect, useRef, useState } from 'react'
import { playSfx } from '../../app/hooks'
import { DUR } from '../../styles/motion'
import { runProgram, toProgram } from '../maze/interpreter'
import type { BoardFrame } from '../maze/MazeBoard'
import type { Cell, Command, Mission, Outcome, Trace } from '../maze/types'

function idle(m: Mission, tick: number): BoardFrame {
  return { robot: { ...m.start }, tick, kind: 'idle', trail: [{ x: m.start.x, y: m.start.y }], mood: 'idle' }
}

/**
 * A tiny playback loop for the tutorial boards. Same deterministic
 * interpreter as the real game, but it never records attempts, drafts or
 * progress.
 */
export function useTutorialPlayer(mission: Mission, reduced: boolean) {
  const [frame, setFrame] = useState<BoardFrame>(() => idle(mission, 0))
  const [running, setRunning] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const tick = useRef(0)

  const clear = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  useEffect(() => clear, [])
  useEffect(() => {
    clear()
    tick.current += 1000
    setFrame(idle(mission, tick.current))
    setRunning(false)
  }, [mission])

  const reset = useCallback(() => {
    clear()
    tick.current += 1000
    setFrame(idle(mission, tick.current))
    setRunning(false)
  }, [mission])

  const play = useCallback(
    (cmds: Command[]): Promise<Outcome> => {
      clear()
      const trace: Trace = runProgram(mission, toProgram(cmds))
      tick.current += 1000
      const base = tick.current
      setFrame(idle(mission, base))
      if (trace.outcome === 'INVALID_PROGRAM' || trace.steps.length === 0) {
        playSfx('error')
        return Promise.resolve(trace.outcome)
      }
      setRunning(true)
      return new Promise((resolve) => {
        let at = 150
        const trail: Cell[] = [{ x: mission.start.x, y: mission.start.y }]
        trace.steps.forEach((s, i) => {
          timers.current.push(
            setTimeout(() => {
              if (s.kind === 'move') trail.push({ x: s.after.x, y: s.after.y })
              const last = i === trace.steps.length - 1
              setFrame({
                robot: s.after,
                tick: base + i + 1,
                kind: s.kind,
                trail: [...trail],
                blockedCell: s.kind === 'bump' ? s.blockedCell : undefined,
                mood: s.kind === 'bump' ? 'oops' : last && trace.outcome === 'SUCCESS' ? 'happy' : 'idle',
              })
              playSfx(s.kind === 'move' ? 'robot-move' : s.kind === 'turn' ? 'robot-turn' : 'collision')
            }, at),
          )
          at += (reduced ? 0.16 : s.kind === 'turn' ? DUR.robotTurn : DUR.robotMove) * 1000 + 80
        })
        timers.current.push(
          setTimeout(() => {
            setRunning(false)
            if (trace.outcome === 'SUCCESS') playSfx('victory')
            else if (trace.outcome !== 'COLLISION') playSfx('error')
            resolve(trace.outcome)
          }, at + 200),
        )
      })
    },
    [mission, reduced],
  )

  return { frame, running, play, reset }
}
