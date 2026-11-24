import { AnimatePresence, motion, useAnimationControls } from 'motion/react'
import { memo, useEffect, useMemo, useRef } from 'react'
import { Robot, type RobotMood } from '../../components/Robot'
import { useT } from '../../i18n'
import { DUR, EASE_IN_OUT, EASE_OUT } from '../../styles/motion'
import { missionText } from './missionText'
import { boardLayout } from './layout'
import { themeFor, type WorldTheme } from './theme'
import type { Cell, Direction, Mission, RobotState } from './types'

const ANGLE: Record<Direction, number> = { N: 0, E: 90, S: 180, W: 270 }
const DIRV: Record<Direction, Cell> = { N: { x: 0, y: -1 }, E: { x: 1, y: 0 }, S: { x: 0, y: 1 }, W: { x: -1, y: 0 } }

/**
 * One visual frame derived from the deterministic trace. The board only
 * animates between frames; it never decides where Pip is.
 */
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
  /** Outer size of the board in CSS pixels (square). */
  size: number
  reduced: boolean
  speed: number
  showGoalPulse?: boolean
  /** True while a program is playing (shows the active-tile glow, "thinking" before step 1). */
  running?: boolean
}

/* --------------------------- static ground layer --------------------------- */

function hash(x: number, y: number) {
  return ((x * 73856093) ^ (y * 19349663)) >>> 0
}

const Ground = memo(function Ground({ mission, size, theme }: { mission: Mission; size: number; theme: WorldTheme }) {
  const { pad, depth, grid, left, top } = boardLayout(size)
  const cell = grid / mission.cols
  const gap = Math.max(1.2, cell * 0.035)
  const r = cell * 0.16
  const walls = new Set(mission.walls.map((w) => `${w.x},${w.y}`))
  const tiles: React.ReactNode[] = []
  const props: React.ReactNode[] = []
  const deco: React.ReactNode[] = []

  for (let y = 0; y < mission.rows; y++) {
    for (let x = 0; x < mission.cols; x++) {
      const px = left + x * cell
      const py = top + y * cell
      const isWall = walls.has(`${x},${y}`)
      const isGoal = x === mission.goal.x && y === mission.goal.y
      const isStart = x === mission.start.x && y === mission.start.y
      const fill = isGoal ? '#dff8ee' : (x + y) % 2 === 0 ? theme.tileA : theme.tileB
      tiles.push(
        <g key={`t${x},${y}`} data-cell={`${x},${y}`} data-wall={isWall || undefined}>
          <rect x={px + gap} y={py + gap + cell * 0.05} width={cell - gap * 2} height={cell - gap * 2} rx={r} fill={theme.tileLine} />
          <rect x={px + gap} y={py + gap} width={cell - gap * 2} height={cell - gap * 2} rx={r} fill={fill} />
        </g>,
      )
      if (isStart) {
        tiles.push(
          <g key="start" opacity="0.9">
            <circle cx={px + cell / 2} cy={py + cell / 2} r={cell * 0.34} fill="none" stroke="#2563EB" strokeOpacity="0.28" strokeWidth={cell * 0.06} strokeDasharray={`${cell * 0.12} ${cell * 0.08}`} />
          </g>,
        )
      }
      if (isGoal) {
        tiles.push(<rect key="goal-ring" x={px + gap * 2} y={py + gap * 2} width={cell - gap * 4} height={cell - gap * 4} rx={r} fill="none" stroke="#6DD6B5" strokeWidth={Math.max(2, cell * 0.05)} />)
      }
      if (isWall) {
        const s = cell - gap * 4
        const ox = px + gap * 2
        const oy = py + gap * 2
        const lift = cell * 0.1
        if (theme.obstacle === 'crate') {
          props.push(
            <g key={`w${x},${y}`}>
              <ellipse cx={px + cell / 2} cy={py + cell * 0.86} rx={s * 0.5} ry={cell * 0.08} fill="#000" opacity="0.12" />
              <rect x={ox} y={oy} width={s} height={s} rx={r * 0.8} fill={theme.obstacleSide} />
              <rect x={ox} y={oy - lift} width={s} height={s - lift * 0.2} rx={r * 0.8} fill={theme.obstacleTop} stroke="#7a4a22" strokeWidth={Math.max(1, cell * 0.025)} />
              <path d={`M${ox + s * 0.18} ${oy - lift + s * 0.18} L${ox + s * 0.82} ${oy - lift + s * 0.78} M${ox + s * 0.82} ${oy - lift + s * 0.18} L${ox + s * 0.18} ${oy - lift + s * 0.78}`} stroke={theme.obstacleMark} strokeWidth={Math.max(1.5, cell * 0.06)} strokeLinecap="round" />
              <rect x={ox + s * 0.1} y={oy - lift + s * 0.08} width={s * 0.8} height={s * 0.1} rx={s * 0.05} fill="#fff" opacity="0.22" />
            </g>,
          )
        } else {
          const cx = px + cell / 2
          const cy = py + cell / 2 - lift * 0.4
          props.push(
            <g key={`w${x},${y}`}>
              <ellipse cx={cx} cy={py + cell * 0.86} rx={s * 0.48} ry={cell * 0.08} fill="#000" opacity="0.12" />
              <circle cx={cx - s * 0.22} cy={cy + s * 0.1} r={s * 0.28} fill={theme.obstacleSide} />
              <circle cx={cx + s * 0.22} cy={cy + s * 0.1} r={s * 0.28} fill={theme.obstacleSide} />
              <circle cx={cx} cy={cy - s * 0.08} r={s * 0.34} fill={theme.obstacleTop} />
              <circle cx={cx - s * 0.24} cy={cy + s * 0.02} r={s * 0.24} fill={theme.obstacleTop} />
              <circle cx={cx + s * 0.24} cy={cy + s * 0.02} r={s * 0.24} fill={theme.obstacleTop} />
              <circle cx={cx - s * 0.1} cy={cy - s * 0.2} r={s * 0.09} fill={theme.obstacleMark} opacity="0.8" />
              <circle cx={cx + s * 0.2} cy={cy - s * 0.02} r={s * 0.05} fill={theme.deco} />
            </g>,
          )
        }
      } else if (!isGoal && !isStart && hash(x, y) % 5 === 0) {
        // Small world details on a few free tiles. Corners only, never the centre, so paths stay readable.
        const cx = px + cell * (hash(x, y) % 2 ? 0.2 : 0.8)
        const cy = py + cell * 0.8
        deco.push(
          theme.key === 'island' ? (
            <g key={`d${x},${y}`} opacity="0.75">
              <path d={`M${cx - cell * 0.05} ${cy} q${cell * 0.02} ${-cell * 0.1} ${cell * 0.04} 0 q${cell * 0.02} ${-cell * 0.12} ${cell * 0.05} 0`} stroke={theme.deco} strokeWidth={Math.max(1.2, cell * 0.03)} fill="none" strokeLinecap="round" />
            </g>
          ) : (
            <g key={`d${x},${y}`} opacity="0.8">
              {[0, 72, 144, 216, 288].map((a) => (
                <circle key={a} cx={cx + Math.cos((a * Math.PI) / 180) * cell * 0.035} cy={cy + Math.sin((a * Math.PI) / 180) * cell * 0.035} r={cell * 0.028} fill={theme.deco} />
              ))}
              <circle cx={cx} cy={cy} r={cell * 0.022} fill="#FFD166" />
            </g>
          ),
        )
      }
    }
  }

  return (
    <svg className="absolute inset-0" width={size} height={size} aria-hidden>
      {/* island / garden bed with a little thickness */}
      <rect x={pad * 0.2} y={pad * 0.2 + depth} width={size - pad * 0.4} height={size - pad * 0.4 - depth} rx={size * 0.07} fill={theme.frameEdge} />
      <rect x={pad * 0.2} y={pad * 0.2} width={size - pad * 0.4} height={size - pad * 0.4 - depth} rx={size * 0.07} fill={theme.frame} />
      <rect x={pad * 0.2 + 4} y={pad * 0.2 + 3} width={size - pad * 0.4 - 8} height={Math.max(4, pad * 0.5)} rx={pad * 0.25} fill="#fff" opacity="0.25" />
      {tiles}
      {deco}
      {props}
    </svg>
  )
})

/* ---------------------------------- flag ---------------------------------- */

function GoalFlag({ cell, reduced, pulse, reached }: { cell: number; reduced: boolean; pulse: boolean; reached: boolean }) {
  const s = cell * 0.62
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
      {pulse && !reduced && (
        <motion.span
          className="absolute rounded-full bg-mint/45"
          style={{ width: cell * 0.62, height: cell * 0.62 }}
          animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <motion.svg
        width={s}
        height={s}
        viewBox="0 0 40 40"
        className="relative overflow-visible"
        animate={reached && !reduced ? { y: [0, -cell * 0.2, 0], scale: [1, 1.2, 1] } : { y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: EASE_OUT, repeat: reached && !reduced ? 2 : 0 }}
      >
        <ellipse cx="14" cy="37" rx="9" ry="2.6" fill="#000" opacity="0.15" />
        <rect x="11" y="4" width="3.2" height="33" rx="1.6" fill="#172554" />
        <circle cx="12.6" cy="4" r="3" fill="#FFD166" stroke="#172554" strokeWidth="1.6" />
        <motion.path
          d="M14 6 C20 3 26 9 34 6 L34 20 C26 23 20 17 14 20 Z"
          fill="#6DD6B5"
          stroke="#127A5A"
          strokeWidth="1.8"
          strokeLinejoin="round"
          animate={reduced ? undefined : { d: ['M14 6 C20 3 26 9 34 6 L34 20 C26 23 20 17 14 20 Z', 'M14 6 C20 9 26 3 34 7 L34 21 C26 17 20 23 14 20 Z', 'M14 6 C20 3 26 9 34 6 L34 20 C26 23 20 17 14 20 Z'] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <path d="M19 11 l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </motion.svg>
    </div>
  )
}

/* ---------------------------------- board --------------------------------- */

export function MazeBoard({ mission, frame, size, reduced, speed, showGoalPulse = true, running = false }: MazeBoardProps) {
  const t = useT()
  const theme = themeFor(mission.world)
  const { grid, left, top } = boardLayout(size)
  const cell = grid / mission.cols
  const controls = useAnimationControls()
  const pointer = useAnimationControls()
  const angleRef = useRef(ANGLE[frame.robot.dir])
  const mounted = useRef(false)
  const lastCell = useRef(cell)

  // Shortest-direction rotation: accumulate deltas instead of jumping 270 to 0.
  const targetAngle = useMemo(() => {
    const desired = ANGLE[frame.robot.dir]
    const current = angleRef.current
    let delta = ((((desired - current) % 360) + 540) % 360) - 180
    if (delta === -180) delta = 180
    const next = current + delta
    angleRef.current = next
    return next
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame.robot.dir, frame.tick])

  useEffect(() => {
    const px = left + frame.robot.x * cell
    const py = top + frame.robot.y * cell
    const k = 1 / speed
    const resized = Math.abs(lastCell.current - cell) > 0.5
    lastCell.current = cell
    if (resized || !mounted.current) {
      mounted.current = true
      controls.set({ x: px, y: py })
      pointer.set({ rotate: targetAngle })
      return
    }
    if (reduced || frame.kind === 'idle') {
      void controls.start({ x: px, y: py, transition: { duration: reduced ? 0 : DUR.select, ease: EASE_OUT } })
      void pointer.start({ rotate: targetAngle, transition: { duration: reduced ? 0 : DUR.select } })
      return
    }
    if (frame.kind === 'bump') {
      const d = DIRV[frame.robot.dir]
      const nudge = Math.min(10, cell * 0.16)
      void controls.start({
        x: [px, px + d.x * nudge, px - d.x * nudge * 0.3, px],
        y: [py, py + d.y * nudge, py - d.y * nudge * 0.3, py],
        transition: { duration: DUR.bump * 1.6 * Math.max(0.7, k), ease: EASE_OUT, times: [0, 0.35, 0.7, 1] },
      })
      return
    }
    if (frame.kind === 'turn') {
      void pointer.start({ rotate: targetAngle, transition: { duration: DUR.robotTurn * k, ease: EASE_IN_OUT } })
      return
    }
    // move: a little anticipation and settle so it feels like it has weight
    void controls.start({ x: px, y: py, transition: { duration: DUR.robotMove * k, ease: [0.45, 0, 0.2, 1] } })
    void pointer.start({ rotate: targetAngle, transition: { duration: 0.1 } })
  }, [frame.tick, frame.robot.x, frame.robot.y, frame.kind, targetAngle, cell, left, top, reduced, speed, controls, pointer, frame.robot.dir])

  const center = (c: Cell) => ({ x: left + c.x * cell + cell / 2, y: top + c.y * cell + cell / 2 })
  const trailPoints = frame.trail.map((c) => `${center(c).x},${center(c).y}`).join(' ')
  const reachedGoal = frame.mood === 'happy'
  const mood: RobotMood = frame.mood === 'happy' ? 'cheer' : frame.mood === 'oops' ? 'oops' : running && frame.kind === 'idle' ? 'thinking' : 'idle'
  const robotSize = cell * 0.92

  return (
    <div
      className="relative select-none"
      style={{ width: size, height: size }}
      role="img"
      aria-label={t.game.boardAria(missionText(t, mission).title, mission.cols, mission.rows, frame.robot.x + 1, frame.robot.y + 1, t.hint.local.facing[frame.robot.dir], mission.goal.x + 1, mission.goal.y + 1)}
      data-testid="maze-board"
      data-robot={`${frame.robot.x},${frame.robot.y},${frame.robot.dir}`}
      data-theme={theme.key}
    >
      <div className="absolute inset-0 rounded-[8%] shadow-[0_24px_40px_-26px_rgb(23_37_84/0.6)]" aria-hidden />
      <Ground mission={mission} size={size} theme={theme} />

      {/* visited tiles + path */}
      <svg className="pointer-events-none absolute inset-0" width={size} height={size} aria-hidden>
        {frame.trail.slice(1).map((c, i) => (
          <rect key={`v${i}`} x={left + c.x * cell + cell * 0.1} y={top + c.y * cell + cell * 0.1} width={cell * 0.8} height={cell * 0.8} rx={cell * 0.16} fill="#FF9B42" opacity="0.1" />
        ))}
        {frame.trail.length > 1 && (
          <polyline points={trailPoints} fill="none" stroke="#FF9B42" strokeOpacity={0.6} strokeWidth={Math.max(3, cell * 0.08)} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${cell * 0.02} ${cell * 0.18}`} />
        )}
        {frame.trail.map((c, i) => (
          <circle key={i} cx={center(c).x} cy={center(c).y} r={Math.max(2.5, cell * 0.05)} fill="#FF9B42" fillOpacity={0.85} />
        ))}
      </svg>

      {/* active tile glow follows Pip while the plan plays */}
      {running && (
        <motion.div
          className="pointer-events-none absolute rounded-[16%] border-[3px] border-orange/80 bg-orange/10"
          style={{ width: cell * 0.9, height: cell * 0.9, left: 0, top: 0 }}
          initial={false}
          animate={{ x: left + frame.robot.x * cell + cell * 0.05, y: top + frame.robot.y * cell + cell * 0.05 }}
          transition={{ duration: reduced ? 0 : DUR.robotMove / speed, ease: EASE_IN_OUT }}
          aria-hidden
          data-testid="active-tile"
        />
      )}

      {/* goal */}
      <div className="pointer-events-none absolute" style={{ left: left + mission.goal.x * cell, top: top + mission.goal.y * cell, width: cell, height: cell }}>
        <GoalFlag cell={cell} reduced={reduced} pulse={showGoalPulse} reached={reachedGoal} />
      </div>

      {/* blocked-cell flash */}
      <AnimatePresence>
        {frame.blockedCell && (
          <motion.div
            key={`${frame.blockedCell.x},${frame.blockedCell.y},${frame.tick}`}
            className="pointer-events-none absolute rounded-[18%] border-[3px] border-danger bg-danger/15"
            style={{ left: left + frame.blockedCell.x * cell + 2, top: top + frame.blockedCell.y * cell + 2, width: cell - 4, height: cell - 4 }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, scale: [0.9, 1.06, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.bump * 1.4 }}
            data-testid="blocked-cell"
          />
        )}
      </AnimatePresence>

      {/* robot */}
      <motion.div className="pointer-events-none absolute left-0 top-0 will-change-transform" style={{ width: cell, height: cell }} animate={controls} initial={false}>
        {/* heading pointer orbiting Pip */}
        <motion.div className="absolute inset-0" animate={pointer} initial={false} aria-hidden>
          <svg width={cell} height={cell} viewBox="0 0 100 100" className="absolute inset-0">
            <path d="M50 1 L62 15 H38 Z" fill="#FF9B42" stroke="#172554" strokeWidth="4" strokeLinejoin="round" />
          </svg>
        </motion.div>
        <div className="absolute" style={{ width: robotSize, height: robotSize, left: (cell - robotSize) / 2, top: (cell - robotSize) / 2 - cell * 0.04 }}>
          <Robot size={robotSize} mood={mood} look={frame.robot.dir} pose={frame.kind === 'move' ? 'move' : 'idle'} still={reduced} />
        </div>
      </motion.div>
    </div>
  )
}
