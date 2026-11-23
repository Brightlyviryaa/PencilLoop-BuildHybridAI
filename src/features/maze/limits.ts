/** Hard safety limits for any program, whether typed by a child or proposed by AI. */
export const LIMITS = {
  maxNodes: 30,
  maxExpandedSteps: 60,
  maxRepeatDepth: 2,
  move: { min: 1, max: 5 },
  repeat: { min: 2, max: 5 },
} as const
