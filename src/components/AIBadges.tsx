import { Cloud, CloudOff, Cpu, Sparkles } from 'lucide-react'
import type { ActualSource } from '../features/ai/hybrid'
import { useT } from '../i18n'

/**
 * Shows ONLY what the Firebase AI Logic SDK reported (`inferenceSource`) for a
 * specific response. Kids see a short, friendly label; the AI information
 * page passes `technical` for the exact wording.
 */
export function SourceBadge({ source, latencyMs, technical = false }: { source: ActualSource; latencyMs?: number | null; technical?: boolean }) {
  const t = useT()
  if (source === 'unreported')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-ink-muted" data-testid="inference-source" data-source={source}>
        <CloudOff size={13} aria-hidden /> {technical ? t.source.unreportedTech : t.source.unreported}
      </span>
    )
  const local = source === 'on_device'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${local ? 'bg-mint-50 text-mint-700' : 'bg-primary-50 text-primary'}`}
      data-testid="inference-source"
      data-source={source}
    >
      {local ? <Cpu size={13} aria-hidden /> : <Cloud size={13} aria-hidden />}
      {technical ? (local ? t.source.deviceTech : t.source.cloudTech) : local ? t.source.device : t.source.cloud}
      {technical && latencyMs ? <span className="font-semibold opacity-70">{`(${(latencyMs / 1000).toFixed(1)}s)`}</span> : null}
    </span>
  )
}

export function BuiltInTipBadge() {
  const t = useT()
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600" data-testid="builtin-tip">
      <Sparkles size={13} aria-hidden /> {t.source.builtIn}
    </span>
  )
}
