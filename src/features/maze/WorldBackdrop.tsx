import { motion } from 'motion/react'
import type { WorldTheme } from './theme'

/**
 * Soft, slow world decoration behind the game (clouds and waves for the
 * island, leaves and petals for the garden). Purely decorative: no pointer
 * events, hidden from assistive tech, frozen when motion is reduced.
 */
export function WorldBackdrop({ theme, reduced }: { theme: WorldTheme; reduced: boolean }) {
  const drift = (d: number) => (reduced ? undefined : { x: [0, d, 0] })
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
      {theme.key === 'island' ? (
        <>
          <motion.svg className="absolute left-[6%] top-[14%] w-28 opacity-70" viewBox="0 0 120 50" animate={drift(18)} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}>
            <path d="M18 40 a14 14 0 0 1 8-26 a20 20 0 0 1 36-4 a16 16 0 0 1 30 10 a12 12 0 0 1 8 20 z" fill="#fff" />
          </motion.svg>
          <motion.svg className="absolute right-[4%] top-[30%] w-20 opacity-60" viewBox="0 0 120 50" animate={drift(-14)} transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }}>
            <path d="M18 40 a14 14 0 0 1 8-26 a20 20 0 0 1 36-4 a16 16 0 0 1 30 10 a12 12 0 0 1 8 20 z" fill="#fff" />
          </motion.svg>
          <svg className="absolute inset-x-0 bottom-0 h-40 w-full" viewBox="0 0 400 160" preserveAspectRatio="none">
            {[30, 70, 110].map((y, i) => (
              <path key={y} d={`M0 ${y} q25 -10 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0`} stroke="#fff" strokeOpacity={0.35 - i * 0.08} strokeWidth="3" fill="none" />
            ))}
          </svg>
        </>
      ) : (
        <>
          {[
            [8, 16, 0],
            [84, 22, 40],
            [12, 70, 120],
            [88, 64, 200],
            [50, 8, 300],
          ].map(([x, y, r], i) => (
            <motion.svg
              key={i}
              className="absolute w-10 opacity-60"
              style={{ left: `${x}%`, top: `${y}%` }}
              viewBox="0 0 40 40"
              animate={reduced ? undefined : { rotate: [r, r + 12, r] }}
              transition={{ duration: 6 + i, repeat: Infinity, ease: 'easeInOut' }}
            >
              <path d="M20 4 C34 10 34 30 20 36 C6 30 6 10 20 4 Z" fill="#8fd3a8" />
              <path d="M20 8 V32" stroke="#5fb383" strokeWidth="2" />
            </motion.svg>
          ))}
        </>
      )}
    </div>
  )
}
