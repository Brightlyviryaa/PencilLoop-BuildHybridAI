import { AnimatePresence, motion } from 'motion/react'
import { CheckCircle2, CloudOff, Info } from 'lucide-react'
import { useEffect, useSyncExternalStore } from 'react'
import { dismissToast, showToast, toastStore as store } from './toast'
import { playSfx } from '../app/hooks'
import { useT } from '../i18n'
import { onAchievementsUnlocked } from '../features/progress/achievements'
import { BadgeIcon } from './BadgeIcon'

/** Global toast layer: achievements, saves and gentle notices. Never blocks the game. */
export function Toaster() {
  const list = useSyncExternalStore(store.subscribe, store.get, store.get)
  const t = useT()

  useEffect(
    () =>
      onAchievementsUnlocked((ids) => {
        // Several badges at once become one toast, so they never cover the game.
        playSfx('achievement')
        showToast(
          ids.length === 1
            ? { kind: 'achievement', title: t.achievements[ids[0]].title, body: t.achievements.toast, achievementId: ids[0] }
            : {
                kind: 'achievement',
                title: ids.map((id) => t.achievements[id].title).join(', '),
                body: t.achievements.toastMany(ids.length),
                achievementId: ids[0],
              },
          4200,
        )
      }),
    [t],
  )

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))]"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence initial={false}>
        {list.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: -18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
            className="pointer-events-auto flex w-full max-w-[380px] items-center gap-3 rounded-[20px] border border-line bg-white/95 p-2.5 pr-4 shadow-[var(--shadow-lift)] backdrop-blur"
            role="status"
            data-testid={`toast-${toast.kind}`}
            onClick={() => dismissToast(toast.id)}
          >
            {toast.kind === 'achievement' && toast.achievementId ? (
              <motion.span initial={{ rotate: -25, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.08 }}>
                <BadgeIcon id={toast.achievementId} size={44} earned />
              </motion.span>
            ) : (
              <span
                className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${
                  toast.kind === 'success' ? 'bg-mint-50 text-mint-700' : toast.kind === 'warn' ? 'bg-orange-50 text-orange-600' : 'bg-primary-50 text-primary'
                }`}
              >
                {toast.icon ?? (toast.kind === 'success' ? <CheckCircle2 size={22} aria-hidden /> : toast.kind === 'warn' ? <CloudOff size={22} aria-hidden /> : <Info size={22} aria-hidden />)}
              </span>
            )}
            <span className="min-w-0">
              {toast.kind === 'achievement' && <span className="block font-display text-xs font-extrabold uppercase tracking-wider text-orange-600">{toast.body}</span>}
              <span className="line-clamp-2 block font-display text-[16px] font-extrabold leading-snug text-ink">{toast.title}</span>
              {toast.kind !== 'achievement' && toast.body && <span className="block text-sm text-ink-muted">{toast.body}</span>}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
