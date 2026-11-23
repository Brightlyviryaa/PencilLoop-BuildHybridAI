import { motion } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import { playSfx } from '../app/hooks'

export function Toggle({ checked, onChange, label, testId }: { checked: boolean; onChange: (v: boolean) => void; label: string; testId?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-testid={testId}
      onClick={() => {
        playSfx('toggle')
        onChange(!checked)
      }}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-primary' : 'bg-[#c9d4e6]'}`}
    >
      <motion.span
        className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow"
        animate={{ x: checked ? 24 : 0 }}
        transition={{ type: 'spring', stiffness: 600, damping: 34 }}
      />
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  testId,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
  testId?: string
}) {
  const group = useId()
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-[14px] bg-cloud p-1 ring-1 ring-line" data-testid={testId}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              if (!on) playSfx('toggle')
              onChange(o.value)
            }}
            className={`relative h-10 flex-1 whitespace-nowrap rounded-[10px] px-3 text-sm font-extrabold transition-colors ${on ? 'text-primary' : 'text-ink-muted hover:text-ink'}`}
          >
            {on && (
              <motion.span
                layoutId={`seg-${group}`}
                className="absolute inset-0 rounded-[10px] bg-white shadow-sm"
                transition={{ type: 'spring', stiffness: 520, damping: 38 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Slider({ value, onChange, onCommit, label, disabled }: { value: number; onChange: (v: number) => void; onCommit?: () => void; label: string; disabled?: boolean }) {
  const pct = Math.round(value * 100)
  return (
    <input
      type="range"
      min={0}
      max={100}
      step={5}
      value={pct}
      disabled={disabled}
      aria-label={label}
      aria-valuetext={`${pct}%`}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
      onPointerUp={onCommit}
      onKeyUp={onCommit}
      className="pl-range h-11 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
      style={{ ['--pct' as string]: `${pct}%` }}
    />
  )
}

export function SettingRow({
  icon,
  title,
  desc,
  control,
  stack = false,
}: {
  icon: ReactNode
  title: string
  desc?: ReactNode
  control?: ReactNode
  /** Put the control below the text (segmented controls, sliders on phones). */
  stack?: boolean
}) {
  const id = useId()
  return (
    <div className={`flex gap-3 py-3.5 ${stack ? 'flex-col sm:flex-row sm:items-center' : 'items-start'}`} aria-labelledby={id}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-primary-50 text-primary">{icon}</span>
        <div className="min-w-0 flex-1">
          <p id={id} className="font-display text-[16px] font-extrabold">
            {title}
          </p>
          {desc && <p className="text-sm text-ink-muted">{desc}</p>}
        </div>
      </div>
      {control && <div className={`shrink-0 ${stack ? 'w-full sm:w-auto sm:min-w-[240px]' : 'self-center'}`}>{control}</div>}
    </div>
  )
}

export function LinkRow({ icon, title, desc, to, onClick, testId }: { icon: ReactNode; title: string; desc?: string; to?: string; onClick?: () => void; testId?: string }) {
  const inner = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-primary-50 text-primary">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[16px] font-extrabold text-ink">{title}</span>
        {desc && <span className="block text-sm text-ink-muted">{desc}</span>}
      </span>
      <ChevronRight size={20} className="shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
    </>
  )
  const cls = 'group -mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-[16px] px-2 py-3 text-left transition-colors hover:bg-cloud'
  return to ? (
    <Link to={to} className={cls} onClick={() => playSfx('nav')} data-testid={testId}>
      {inner}
    </Link>
  ) : (
    <button type="button" className={cls} onClick={onClick} data-testid={testId}>
      {inner}
    </button>
  )
}

export function Card({ children, className = '', as: As = 'section', ...rest }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article'; 'aria-labelledby'?: string }) {
  return (
    <As className={`min-w-0 rounded-[26px] border border-line/60 bg-white p-4 shadow-[var(--shadow-soft)] sm:p-5 lg:p-6 ${className}`} {...rest}>
      {children}
    </As>
  )
}
