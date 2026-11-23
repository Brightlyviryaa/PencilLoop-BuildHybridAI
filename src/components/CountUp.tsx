import { animate, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

/** Animates a number up to `value` once it scrolls into view (instant with reduced motion). */
export function CountUp({ value, duration = 0.9, className = '' }: { value: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(reduced ? value : 0)
  const from = useRef(0)

  useEffect(() => {
    if (!inView) return
    if (reduced) return
    const controls = animate(from.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(Math.round(v)),
    })
    from.current = value
    return () => controls.stop()
  }, [inView, value, duration, reduced])

  return (
    <span ref={ref} className={`tabular ${className}`}>
      {reduced ? value : shown}
    </span>
  )
}
