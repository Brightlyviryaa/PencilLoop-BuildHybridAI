import { motion } from 'motion/react'
import { Star } from 'lucide-react'
import { useT } from '../i18n'

export function Stars({
  value,
  size = 18,
  animate = false,
  className = '',
}: {
  value: number
  size?: number
  animate?: boolean
  className?: string
}) {
  const t = useT()
  return (
    <span className={`items-center gap-0.5 ${/\b(hidden|flex|block)\b/.test(className) ? '' : 'inline-flex'} ${className}`} role="img" aria-label={t.common.starsOf(value)}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          initial={animate ? { scale: 0, rotate: -30, opacity: 0 } : false}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={animate ? { delay: 0.35 + i * 0.22, type: 'spring', stiffness: 500, damping: 16 } : undefined}
          className="inline-flex"
        >
          <Star
            size={size}
            aria-hidden
            strokeWidth={2.2}
            className={i < value ? 'fill-orange text-orange-600' : 'fill-transparent text-line'}
          />
        </motion.span>
      ))}
    </span>
  )
}
