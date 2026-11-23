import { motion } from 'motion/react'

interface RobotProps {
  size?: number
  mood?: 'idle' | 'happy' | 'oops'
  blink?: boolean
  className?: string
  title?: string
}

/**
 * "Pip" — a simple geometric robot. Faces UP in its own coordinate space;
 * the board rotates it to the current heading. The orange nose shows the
 * direction it will move.
 */
export function Robot({ size = 64, mood = 'idle', blink = true, className = '', title }: RobotProps) {
  const eyeH = mood === 'happy' ? 3 : 7
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {/* direction nose */}
      <path d="M32 2 L41 13 H23 Z" fill="#FF9B42" stroke="#172554" strokeWidth="2.2" strokeLinejoin="round" />
      {/* wheels */}
      <rect x="6" y="20" width="7" height="26" rx="3.5" fill="#172554" />
      <rect x="51" y="20" width="7" height="26" rx="3.5" fill="#172554" />
      {/* body */}
      <rect x="10" y="12" width="44" height="44" rx="14" fill="#FFFFFF" stroke="#172554" strokeWidth="2.6" />
      <rect x="16" y="19" width="32" height="22" rx="9" fill="#2563EB" />
      {/* eyes */}
      <motion.g
        animate={blink && mood === 'idle' ? { scaleY: [1, 1, 0.1, 1, 1] } : { scaleY: 1 }}
        transition={blink && mood === 'idle' ? { duration: 4.2, repeat: Infinity, times: [0, 0.9, 0.93, 0.96, 1] } : { duration: 0.15 }}
        style={{ originY: '30px', transformBox: 'fill-box' }}
      >
        {mood === 'oops' ? (
          <>
            <path d="M22 27 l6 5 M28 27 l-6 5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M36 27 l6 5 M42 27 l-6 5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          </>
        ) : (
          <>
            <rect x="22.5" y={30 - eyeH / 2} width="6" height={eyeH} rx="3" fill="#fff" />
            <rect x="35.5" y={30 - eyeH / 2} width="6" height={eyeH} rx="3" fill="#fff" />
          </>
        )}
      </motion.g>
      {/* mouth / panel */}
      {mood === 'happy' ? (
        <path d="M25 46 Q32 52 39 46" stroke="#172554" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      ) : (
        <rect x="26" y="45" width="12" height="4" rx="2" fill={mood === 'oops' ? '#DC4C54' : '#6DD6B5'} />
      )}
    </svg>
  )
}
