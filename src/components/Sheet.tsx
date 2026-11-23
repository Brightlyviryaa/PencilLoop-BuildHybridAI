import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { playSfx, useMediaQuery } from '../app/hooks'
import { useT } from '../i18n'
import { DUR, EASE_OUT, springSheet } from '../styles/motion'
import { IconButton } from './Button'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  /** Desktop presentation. */
  size?: 'md' | 'lg' | 'xl'
  /** Mobile height: auto (content) or full. */
  mobileHeight?: 'auto' | 'full'
  dismissible?: boolean
  testId?: string
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Accessible dialog: bottom sheet on phones, centered panel on larger screens.
 * Focus is trapped inside, Escape closes, and focus returns to the trigger.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  mobileHeight = 'auto',
  dismissible = true,
  testId,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descId = useId()
  const isPhone = !useMediaQuery('(min-width: 768px)')
  const t = useT()
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    returnFocus.current = document.activeElement as HTMLElement | null
    playSfx('sheet-open')
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = requestAnimationFrame(() => {
      const panel = panelRef.current
      const first = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel?.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? panel)?.focus()
    })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) {
        e.stopPropagation()
        onCloseRef.current()
      }
      if (e.key === 'Tab' && panelRef.current) {
        const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null)
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      cancelAnimationFrame(t)
      document.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prevOverflow
      const el = returnFocus.current
      if (el && document.contains(el)) requestAnimationFrame(() => el.focus())
    }
  }, [open, dismissible])

  const widths = { md: 'md:max-w-[520px]', lg: 'md:max-w-[680px]', xl: 'md:max-w-[920px]' }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" data-testid={testId}>
          <motion.div
            className="absolute inset-0 bg-ink/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.sheet, ease: EASE_OUT }}
            onClick={() => dismissible && onClose()}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            initial={isPhone ? { y: '100%' } : { opacity: 0, y: 16, scale: 0.98 }}
            animate={isPhone ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={isPhone ? { y: '100%' } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={isPhone ? springSheet : { duration: DUR.sheet, ease: EASE_OUT }}
            className={`relative flex w-full flex-col bg-white shadow-[var(--shadow-lift)] outline-none ${widths[size]} rounded-t-[26px] md:rounded-[26px] ${
              mobileHeight === 'full' ? 'h-[calc(100dvh-24px)] md:h-auto md:max-h-[min(860px,calc(100dvh-48px))]' : 'max-h-[calc(100dvh-24px)] md:max-h-[min(860px,calc(100dvh-48px))]'
            }`}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-11 rounded-full bg-line md:hidden" aria-hidden="true" />
            <header className="flex items-start gap-3 px-5 pb-2 pt-3 md:px-7 md:pt-6">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-[22px] font-black leading-tight md:text-2xl">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-1 text-[15px] text-ink-muted">
                    {description}
                  </p>
                )}
              </div>
              {dismissible && (
                <IconButton label={t.common.close} onClick={onClose} variant="ghost" className="-mr-2 -mt-1 shrink-0" tip={false}>
                  <X size={22} aria-hidden />
                </IconButton>
              )}
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4 md:px-7">{children}</div>
            {footer && <footer className="border-t border-line/70 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 md:px-7 md:pb-6">{footer}</footer>}
            {!footer && <div className="pb-[max(12px,env(safe-area-inset-bottom))]" />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
