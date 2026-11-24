import type { Transition } from 'motion/react'

/** Shared motion tokens — every animation in the app pulls from here. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const

export const DUR = {
  press: 0.12,
  select: 0.2,
  route: 0.24,
  sheet: 0.3,
  list: 0.22,
  robotMove: 0.34,
  robotTurn: 0.22,
  bump: 0.22,
  reveal: 0.22,
  win: 0.7,
} as const

export const springSheet: Transition = { type: 'spring', stiffness: 420, damping: 40, mass: 0.9 }
export const springSoft: Transition = { type: 'spring', stiffness: 380, damping: 32 }
export const tweenRoute: Transition = { duration: DUR.route, ease: EASE_OUT }
export const tweenList: Transition = { duration: DUR.list, ease: EASE_OUT }

export const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

/**
 * Stacking order (z-index), lowest to highest:
 * 40 bottom tab bar · 45 phone plan editor · 50 sheets/dialogs (scan, hint, settings) ·
 * 60 victory · 70 toasts · 90 drag feedback. A sheet opened from the plan editor
 * therefore always appears on top of it.
 */
export const Z = { nav: 40, planScreen: 45, sheet: 50, victory: 60, toast: 70, drag: 90 } as const
