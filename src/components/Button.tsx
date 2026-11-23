import { motion, type HTMLMotionProps } from 'motion/react'
import { forwardRef, type ReactNode } from 'react'
import { playSfx } from '../app/hooks'
import type { SfxName } from '../features/audio/sfx'
import { DUR } from '../styles/motion'

type Variant = 'primary' | 'secondary' | 'ghost' | 'orange' | 'mint' | 'danger' | 'soft'
type Size = 'sm' | 'md' | 'lg' | 'xl'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-white shadow-[var(--shadow-press)] hover:bg-primary-600 disabled:bg-primary/45',
  orange: 'bg-orange text-ink shadow-[var(--shadow-press)] hover:bg-[#ff8f2a] disabled:opacity-50',
  mint: 'bg-mint text-ink shadow-[var(--shadow-press)] hover:bg-[#5ccfab] disabled:opacity-50',
  secondary: 'bg-white text-ink border border-line hover:border-primary/40 hover:bg-primary-50 disabled:opacity-50',
  soft: 'bg-primary-50 text-primary hover:bg-primary-100 disabled:opacity-50',
  ghost: 'bg-transparent text-ink-soft hover:bg-primary-50 hover:text-ink disabled:opacity-40',
  danger: 'bg-danger text-white shadow-[var(--shadow-press)] hover:brightness-95 disabled:opacity-50',
}

const SIZES: Record<Size, string> = {
  sm: 'h-11 min-w-11 px-3.5 text-sm gap-1.5 rounded-[12px]',
  md: 'h-12 min-w-12 px-4.5 text-[15px] gap-2 rounded-[var(--radius-btn)]',
  lg: 'h-14 min-w-14 px-6 text-base gap-2.5 rounded-[16px]',
  xl: 'h-16 min-w-16 px-7 text-lg gap-3 rounded-[18px]',
}

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  iconRight?: ReactNode
  sound?: SfxName | false
  children?: ReactNode
  block?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, iconRight, sound = 'tap', className = '', children, onClick, block, type = 'button', ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      whileTap={rest.disabled ? undefined : { scale: 0.96, y: 1 }}
      whileHover={rest.disabled ? undefined : { y: -1 }}
      transition={{ duration: DUR.press }}
      onClick={(e) => {
        if (sound) playSfx(sound)
        onClick?.(e)
      }}
      className={`inline-flex select-none items-center justify-center font-display font-extrabold tracking-[0.005em] transition-colors duration-150 ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </motion.button>
  )
})

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'icon'> {
  label: string
  children: ReactNode
  /** Small animated tooltip on hover / keyboard focus (pointer devices only). */
  tip?: 'top' | 'bottom' | false
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, children, variant = 'ghost', size = 'md', className = '', tip = 'bottom', ...rest },
  ref,
) {
  return (
    <Button ref={ref} aria-label={label} variant={variant} size={size} className={`group relative !px-0 ${className}`} {...rest}>
      {children}
      {tip && (
        <span
          aria-hidden
          className={`pl-tip pointer-events-none absolute left-1/2 z-40 hidden -translate-x-1/2 whitespace-nowrap rounded-[10px] bg-ink px-2.5 py-1.5 font-sans text-xs font-bold text-white shadow-lg group-focus-visible:block ${
            tip === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {label}
        </span>
      )}
    </Button>
  )
})
