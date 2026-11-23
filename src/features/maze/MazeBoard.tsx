import { useT } from '../../i18n'
import { missionText } from './missionText'
import { AnimatePresence, motion, useAnimationControls } from 'motion/react'
import { Flag } from 'lucide-react'
import { memo, useEffect, useMemo, useRef } from 'react'
import { Robot } from '../../components/Robot'
import { DUR, EASE_IN_OUT, EASE_OUT } from '../../styles/motion'
import type { Cell, Direction, Mission, RobotState } from './types'

const ANGLE: Record<Direction, number> = { N: 0, E: 90, S: 180, W: 270 }
const DIRV: Record<Direction, Cell> = { N: { x: 0, y: -1 }, E: { x: 1, y: 0 }, S: { x: 0, y: 1 }, W: { x: -1, y: 0 } }

export interface BoardFrame {
  robot: RobotState
  /** Increments on every animation step so repeated identical states still animate. */
  tick: number
  kind: 'idle' | 'move' | 'turn' | 'bump'
  trail: Cell[]
  blockedCell?: Cell
  mood: 'idle' | 'happy' | 'oops'
}

interface MazeBoardProps {
  mission: Mission
  frame: BoardFrame
  size: number
  reduced: boolean
  speed: number
  showGoalPulse?: boolean
}

const GridLayer = memo(function GridLayer({ mission, cell }: { mission: Mission; cell: number }) {
  const walls = useMemo(() => new Set(mission.walls.map((w) => `${w.x},${w.y}`)), [mission])
  const items = []
  for (let y = 0; y < mission.rows; y++) {
    for (let x = 0; x < mission.cols; x++) {
      const isWall = walls.has(`${x},${y}`)
      const isGoal = x === mission.goal.x && y === mission.goal.y
      const isStart = x === mission.start.x && y === mission.start.y
      items.push(
        <div
          key={`${x},${y}`}
          className="absolute p-[3px]"
          style={{ left: x * cell, top: y * cell, width: cell, height: cell }}
          data-cell={`${x},${y}`}
          data-wall={isWall || undefined}
        >
          {isWall ? (
            <div className="relative h-full w-full rounded-[22%] bg-[#4a5a86] shadow-[inset_0_-5px_0_rgba(0,0,0,0.18)]">
              <div className="absolute inset-x-[18%] top-[16%] h-[14%] rounded-full bg-white/18" />
            </div>
          ) : (
            <div
              className={`h-full w-full rounded-[22%] ${
                isGoal ? 'bg-mint-50 ring-2 ring-mint ring-inset' : isStart ? 'bg-primary-50 ring-2 ring-primary/25 ring-inset' : (x + y) % 2 === 0 ? 'bg-white' : 'bg-[#f3f7ff]'
              }`}
            />
          )}
        </div>,
      )
    }
  }
  return <>{items}</>
})

export function MazeBoard({ mission, frame, size, reduced, speed, showGoalPulse = true }: MazeBoardProps) {
  const t = useT()
  const cell = size / mission.cols
  const robotSize = cell * 0.78
  const offset = (cell - robotSize) / 2
  const controls = useAnimationControls()
  const angleRef = useRef(ANGLE[frame.robot.dir])
  const mounted = useRef(false)
  const lastCell = useRef(cell)

  // Shortest-direction rotation: accumulate deltas instead of jumping 270→0.
  const targetAngle = useMemo(() => {
    const desired = ANGLE[frame.robot.dir]
    const current = angleRef.current
    let delta = (((desired - current) % 360) + 540) % 360 - 180
    if (delta === -180) delta = 180
    const next = current + delta
    angleRef.current = next
    return next
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame.robot.dir, frame.tick])

  useEffect(() => {
    const px = frame.robot.x * cell + offset
    const py = frame.robot.y * cell + offset
    const k = 1 / speed
    // Board resized (rotation, window resize): snap without animating across the grid.
    const resized = Math.abs(lastCell.current - cell) > 0.5
    lastCell.current = cell
    if (resized) {
      controls.set({ x: px, y: py, rotate: targetAngle })
      return
    }
    if (!mounted.current || reduced || frame.kind === 'idle') {
      mounted.current = true
      if (frame.kind === 'idle' || reduced) {
        void controls.start({ x: px, y: py, rotate: targetAngle, transition: { duration: reduced ? 0 : DUR.select, ease: EASE_OUT } })
        return
      }
    }
    if (frame.kind === 'bump') {
      const d = DIRV[frame.robot.dir]
      const nudge = Math.min(8, cell * 0.12)
      void controls.start({
        x: [px, px + d.x * nudge, px],
        y: [py, py + d.y * nudge, py],
        rotate: targetAngle,
        transition: { duration: DUR.bump * Math.max(0.7, k), ease: EASE_OUT, times: [0, 0.4, 1] },
      })
      return
    }
    void controls.start({
      x: px,
      y: py,
      rotate: targetAngle,
      transition:
        frame.kind === 'turn'
          ? { duration: DUR.robotTurn * k, ease: EASE_IN_OUT }
          : { duration: DUR.robotMove * k, ease: EASE_IN_OUT },
    })
  }, [frame.tick, frame.robot.x, frame.robot.y, frame.kind, targetAngle, cell, offset, reduced, speed, controls, frame.robot.dir])

  const trailPoints = frame.trail.map((c) => `${c.x * cell + cell / 2},${c.y * cell + cell / 2}`).join(' ')

  return (
    <div
      className="relative select-none rounded-[22px] bg-[#e8eefb] p-[6px] shadow-[inset_0_2px_0_rgba(255,255,255,0.8),0_10px_30px_-18px_rgba(23,37,84,0.5)]"
      style={{ width: size + 12, height: size + 12 }}
      role="img"
      aria-label={t.game.boardAria(missionText(t, mission).title, mission.cols, mission.rows, frame.robot.x + 1, frame.robot.y + 1, t.hint.local.facing[frame.robot.dir], mission.goal.x + 1, mission.goal.y + 1)}
      data-testid="maze-board"
      data-robot={`${frame.robot.x},${frame.robot.y},${frame.robot.dir}`}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <GridLayer mission={mission} cell={cell} />

        {/* path trail */}
        <svg className="pointer-events-none absolute inset-0" width={size} height={size} aria-hidden>
          {frame.trail.length > 1 && (
            <polyline
              points={trailPoints}
              fill="none"
              stroke="#FF9B42"
              strokeOpacity={0.55}
              strokeWidth={Math.max(4, cell * 0.11)}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${cell * 0.02} ${cell * 0.2}`}
            />
          )}
          {frame.trail.map((c, i) => (
            <circle key={i} cx={c.x * cell + cell / 2} cy={c.y * cell + cell / 2} r={Math.max(3, cell * 0.06)} fill="#FF9B42" fillOpacity={0.8} />
          ))}
        </svg>

        {/* goal flag */}
        <div
          className="pointer-events-none absolute flex items-center justify-center"
          style={{ left: mission.goal.x * cell, top: mission.goal.y * cell, width: cell, height: cell }}
          aria-hidden
        >
          {showGoalPulse && !reduced && (
            <motion.span
              className="absolute rounded-full bg-mint/40"
              style={{ width: cell * 0.6, height: cell * 0.6 }}
              animate={{ scale: [0.8, 1.25, 0.8], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <Flag className="relative text-mint-700" style={{ width: cell * 0.46, height: cell * 0.46 }} strokeWidth={2.4} fill="#6DD6B5" />
        </div>

        {/* blocked-cell flash */}
        <AnimatePresence>
          {frame.blockedCell && (
            <motion.div
              key={`${frame.blockedCell.x},${frame.blockedCell.y},${frame.tick}`}
              className="pointer-events-none absolute rounded-[22%] border-[3px] border-danger bg-danger/15"
              style={{ left: frame.blockedCell.x * cell + 3, top: frame.blockedCell.y * cell + 3, width: cell - 6, height: cell - 6 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DUR.bump }}
              data-testid="blocked-cell"
            />
          )}
        </AnimatePresence>

        {/* robot */}
        <motion.div
          className="pointer-events-none absolute left-0 top-0 will-change-transform"
          style={{ width: robotSize, height: robotSize }}
          initial={{ x: frame.robot.x * cell + offset, y: frame.robot.y * cell + offset, rotate: ANGLE[frame.robot.dir] }}
          animate={controls}
        >
          <motion.div
            className="h-full w-full"
            animate={frame.mood === 'happy' && !reduced ? { y: [0, -cell * 0.16, 0, -cell * 0.08, 0] } : { y: 0 }}
            transition={{ duration: DUR.win, ease: EASE_OUT }}
          >
            <Robot size={robotSize} mood={frame.mood} blink={!reduced} />
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
