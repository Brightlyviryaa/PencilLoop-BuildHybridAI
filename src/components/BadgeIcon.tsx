import { Crown, Flag, Lock, Map, PencilLine, Play, Repeat2, RotateCcw, Search, Star, type LucideIcon } from 'lucide-react'

const META: Record<string, { Icon: LucideIcon; bg: string; fg: string }> = {
  'first-run': { Icon: Play, bg: 'bg-primary', fg: 'text-white' },
  'first-win': { Icon: Flag, bg: 'bg-mint', fg: 'text-ink' },
  'three-stars': { Icon: Star, bg: 'bg-orange', fg: 'text-ink' },
  'bounce-back': { Icon: RotateCcw, bg: 'bg-[#ff7a8a]', fg: 'text-white' },
  'loop-master': { Icon: Repeat2, bg: 'bg-mint', fg: 'text-ink' },
  'paper-planner': { Icon: PencilLine, bg: 'bg-primary', fg: 'text-white' },
  'clue-detective': { Icon: Search, bg: 'bg-orange', fg: 'text-ink' },
  explorer: { Icon: Map, bg: 'bg-[#8b7cf6]', fg: 'text-white' },
  'star-collector': { Icon: Crown, bg: 'bg-[#ffd166]', fg: 'text-ink' },
}

/** A round, layered badge. Locked badges are muted with a small lock. */
export function BadgeIcon({ id, size = 56, earned }: { id: string; size?: number; earned: boolean }) {
  const m = META[id] ?? META['first-run']
  const icon = Math.round(size * 0.44)
  return (
    <span
      className={`relative grid shrink-0 place-items-center rounded-full ${earned ? `${m.bg} ${m.fg} shadow-[inset_0_-4px_0_rgb(0_0_0/0.14),0_6px_14px_-8px_rgb(23_37_84/0.5)]` : 'bg-slate-100 text-ink-muted/60'}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className={`absolute inset-[4px] rounded-full border-2 ${earned ? 'border-white/45' : 'border-dashed border-line'}`} />
      <m.Icon size={icon} strokeWidth={2.6} fill={id === 'three-stars' && earned ? 'currentColor' : 'none'} />
      {!earned && (
        <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-white text-ink-muted shadow">
          <Lock size={11} />
        </span>
      )}
    </span>
  )
}
