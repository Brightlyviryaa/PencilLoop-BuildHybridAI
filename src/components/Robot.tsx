import { motion } from 'motion/react'
import { useId } from 'react'
import type { Direction } from '../features/maze/types'

export type RobotMood = 'idle' | 'happy' | 'oops' | 'thinking' | 'waiting' | 'cheer'

interface RobotProps {
  size?: number
  mood?: RobotMood
  /** Where Pip looks (its eyes follow the heading on the board). */
  look?: Direction
  /** "move" leans into the motion, "talk" bounces gently, "idle" hovers. */
  pose?: 'idle' | 'move' | 'talk'
  /** Turn off all looping animation (reduced motion, previews). */
  still?: boolean
  /** Kept for older call sites: false = no blinking. */
  blink?: boolean
  className?: string
  title?: string
}

/** Original PencilLoop palette for Pip. */
const C = {
  ink: '#172554',
  shell: '#FFFFFF',
  shellShade: '#E3EBFA',
  body: '#2563EB',
  bodyShade: '#1D4ED8',
  visor: '#13235A',
  eye: '#7CF5D2',
  accent: '#FF9B42',
  core: '#6DD6B5',
}

const ANTENNA: Record<RobotMood, string> = {
  idle: '#6DD6B5',
  happy: '#FFD166',
  cheer: '#FFD166',
  oops: '#FF6B72',
  thinking: '#FF9B42',
  waiting: '#9DB3E8',
}

const LOOK: Record<Direction, { x: number; y: number }> = { N: { x: 0, y: -2.2 }, S: { x: 0, y: 2 }, E: { x: 3, y: 0 }, W: { x: -3, y: 0 } }

/**
 * Pip, PencilLoop's hover robot (original artwork). Drawn upright so its
 * face is always readable on the board; the board shows heading with a
 * rotating pointer and Pip's eyes look the same way.
 */
export function Robot({ size = 64, mood = 'idle', look, pose = 'idle', still, blink = true, className = '', title }: RobotProps) {
  const id = useId().replace(/:/g, '')
  const animate = !still
  const eye = look ? LOOK[look] : { x: 0, y: 0 }
  const arms = mood === 'cheer' || mood === 'happy' ? 'up' : mood === 'oops' ? 'out' : 'down'
  const lean = pose === 'move' && look === 'E' ? 6 : pose === 'move' && look === 'W' ? -6 : 0

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`overflow-visible ${className}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-mood={mood}
    >
      <defs>
        <radialGradient id={`glow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7CF5D2" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#7CF5D2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`shell-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.shell} />
          <stop offset="100%" stopColor={C.shellShade} />
        </linearGradient>
      </defs>

      {/* hover glow */}
      <motion.ellipse
        cx="50"
        cy="92"
        rx="20"
        ry="5"
        fill={`url(#glow-${id})`}
        animate={animate ? { rx: [18, 22, 18], opacity: [0.7, 1, 0.7] } : undefined}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.g
        animate={
          !animate
            ? undefined
            : mood === 'cheer'
              ? { y: [0, -9, 0, -5, 0], rotate: [0, -4, 4, 0, 0] }
              : mood === 'oops'
                ? { x: [0, -2.5, 2.5, -1.5, 0] }
                : pose === 'talk'
                  ? { y: [0, -2, 0] }
                  : { y: [0, -2.5, 0] }
        }
        transition={
          mood === 'cheer'
            ? { duration: 0.9, repeat: Infinity, repeatDelay: 0.3, ease: 'easeOut' }
            : mood === 'oops'
              ? { duration: 0.4 }
              : { duration: pose === 'talk' ? 0.9 : 2.2, repeat: Infinity, ease: 'easeInOut' }
        }
        style={{ originX: '50px', originY: '90px', transformBox: 'view-box' }}
      >
        <g transform={`rotate(${lean} 50 80)`}>
          {/* thruster */}
          <path d="M38 82 Q50 90 62 82 L58 76 H42 Z" fill={C.ink} />
          <rect x="44" y="83" width="12" height="3.2" rx="1.6" fill={C.eye} opacity="0.9" />

          {/* arms */}
          <motion.g animate={{ rotate: arms === 'up' ? -130 : arms === 'out' ? -60 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} style={{ originX: '27px', originY: '66px', transformBox: 'view-box' }}>
            <rect x="20" y="63" width="9" height="16" rx="4.5" fill={C.body} stroke={C.ink} strokeWidth="2.4" />
            <circle cx="24.5" cy="79" r="3.6" fill={C.accent} stroke={C.ink} strokeWidth="2" />
          </motion.g>
          <motion.g animate={{ rotate: arms === 'up' ? 130 : arms === 'out' ? 60 : 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} style={{ originX: '73px', originY: '66px', transformBox: 'view-box' }}>
            <rect x="71" y="63" width="9" height="16" rx="4.5" fill={C.body} stroke={C.ink} strokeWidth="2.4" />
            <circle cx="75.5" cy="79" r="3.6" fill={C.accent} stroke={C.ink} strokeWidth="2" />
          </motion.g>

          {/* body */}
          <rect x="29" y="58" width="42" height="24" rx="11" fill={C.body} stroke={C.ink} strokeWidth="2.6" />
          <path d="M33 74 Q50 80 67 74 L67 76 Q50 84 33 76 Z" fill={C.bodyShade} opacity="0.6" />
          <motion.circle
            cx="50"
            cy="69"
            r="4.4"
            fill={mood === 'oops' ? '#FF6B72' : C.core}
            stroke={C.ink}
            strokeWidth="2"
            animate={animate ? { opacity: [1, 0.55, 1] } : undefined}
            transition={{ duration: 1.6, repeat: Infinity }}
          />

          {/* antenna */}
          <motion.g
            animate={animate ? { rotate: mood === 'thinking' ? [-10, 10, -10] : [-4, 4, -4] } : undefined}
            transition={{ duration: mood === 'thinking' ? 0.8 : 2.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ originX: '50px', originY: '20px', transformBox: 'view-box' }}
          >
            <line x1="50" y1="20" x2="50" y2="9" stroke={C.ink} strokeWidth="2.6" strokeLinecap="round" />
            <circle cx="50" cy="7.5" r="5" fill={ANTENNA[mood]} stroke={C.ink} strokeWidth="2.4" />
            <circle cx="48.4" cy="6" r="1.4" fill="#fff" opacity="0.8" />
          </motion.g>

          {/* head */}
          <rect x="18" y="18" width="64" height="44" rx="20" fill={`url(#shell-${id})`} stroke={C.ink} strokeWidth="2.8" />
          {/* ear bolts */}
          <rect x="12" y="34" width="8" height="13" rx="3.5" fill={C.accent} stroke={C.ink} strokeWidth="2.4" />
          <rect x="80" y="34" width="8" height="13" rx="3.5" fill={C.accent} stroke={C.ink} strokeWidth="2.4" />
          {/* visor */}
          <rect x="25" y="25" width="50" height="30" rx="14" fill={C.visor} />
          <path d="M30 29 Q40 26 52 27" stroke="#fff" strokeOpacity="0.22" strokeWidth="3" strokeLinecap="round" fill="none" />

          {/* face */}
          <g transform={`translate(${eye.x} ${eye.y})`}>
            <Face mood={mood} blink={blink && animate} />
          </g>
          {/* cheeks */}
          {(mood === 'happy' || mood === 'cheer') && (
            <>
              <ellipse cx="31" cy="50" rx="4" ry="2.4" fill="#FF8FA3" opacity="0.75" />
              <ellipse cx="69" cy="50" rx="4" ry="2.4" fill="#FF8FA3" opacity="0.75" />
            </>
          )}
        </g>
      </motion.g>

      {/* thinking dots */}
      {mood === 'thinking' && (
        <g>
          {[0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              cx={84 + i * 6}
              cy={14 - i * 4}
              r={2 + i * 0.6}
              fill={C.ink}
              animate={animate ? { opacity: [0.2, 1, 0.2] } : undefined}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </g>
      )}
      {/* dizzy stars on a bump */}
      {mood === 'oops' && animate && (
        <motion.g initial={{ rotate: 0 }} animate={{ rotate: 360 }} transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }} style={{ originX: '50px', originY: '12px', transformBox: 'view-box' }}>
          <path d="M34 10 l1.6 3.4 3.6.4-2.7 2.4.8 3.6-3.3-1.9-3.3 1.9.8-3.6-2.7-2.4 3.6-.4z" fill="#FFD166" stroke={C.ink} strokeWidth="1.2" />
          <path d="M66 10 l1.6 3.4 3.6.4-2.7 2.4.8 3.6-3.3-1.9-3.3 1.9.8-3.6-2.7-2.4 3.6-.4z" fill="#FFD166" stroke={C.ink} strokeWidth="1.2" />
        </motion.g>
      )}
    </svg>
  )
}

function Face({ mood, blink }: { mood: RobotMood; blink: boolean }) {
  const glow = { filter: 'drop-shadow(0 0 2px rgba(124,245,210,0.9))' }
  if (mood === 'happy' || mood === 'cheer')
    return (
      <g style={glow}>
        <path d="M33 42 Q38.5 34 44 42" stroke={C.eye} strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M56 42 Q61.5 34 67 42" stroke={C.eye} strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M44 47 Q50 52 56 47" stroke={C.eye} strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>
    )
  if (mood === 'oops')
    return (
      <g style={{ filter: 'drop-shadow(0 0 2px rgba(255,140,150,0.8))' }}>
        <path d="M34 35 l8 8 M42 35 l-8 8" stroke="#FF8C96" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M58 35 l8 8 M66 35 l-8 8" stroke="#FF8C96" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M45 49 q2.5 -2.5 5 0 q2.5 2.5 5 0" stroke="#FF8C96" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      </g>
    )
  if (mood === 'waiting')
    return (
      <g style={glow}>
        <rect x="33" y="38" width="11" height="4" rx="2" fill={C.eye} />
        <rect x="56" y="38" width="11" height="4" rx="2" fill={C.eye} />
        <rect x="46" y="47" width="8" height="2.6" rx="1.3" fill={C.eye} opacity="0.7" />
      </g>
    )
  if (mood === 'thinking')
    return (
      <g style={glow} transform="translate(2 -3)">
        <rect x="34" y="34" width="9" height="11" rx="4.5" fill={C.eye} />
        <rect x="57" y="34" width="9" height="11" rx="4.5" fill={C.eye} />
        <path d="M46 49 h8" stroke={C.eye} strokeWidth="2.6" strokeLinecap="round" />
      </g>
    )
  return (
    <motion.g
      style={{ ...glow, originY: '40px', transformBox: 'view-box' }}
      animate={blink ? { scaleY: [1, 1, 0.1, 1, 1] } : { scaleY: 1 }}
      transition={blink ? { duration: 4.2, repeat: Infinity, times: [0, 0.9, 0.93, 0.96, 1] } : { duration: 0.15 }}
    >
      <rect x="33" y="33" width="10" height="13" rx="5" fill={C.eye} />
      <rect x="57" y="33" width="10" height="13" rx="5" fill={C.eye} />
      <circle cx="40" cy="36.5" r="1.8" fill="#fff" />
      <circle cx="64" cy="36.5" r="1.8" fill="#fff" />
      <path d="M45 48.5 Q50 51.5 55 48.5" stroke={C.eye} strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </motion.g>
  )
}
