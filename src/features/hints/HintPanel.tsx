import { motion } from 'motion/react'
import { Cloud, Cpu, Lightbulb, Loader2, MapPin, ShieldCheck, Sparkles } from 'lucide-react'
import { useLang, useT } from '../../i18n'
import { useCallback, useEffect, useRef, useState } from 'react'
import { playSfx } from '../../app/hooks'
import { BuiltInTipBadge, SourceBadge } from '../../components/AIBadges'
import { Button } from '../../components/Button'
import { aiStore, isLocalPreparable, isLocalReady, useAI } from '../ai/aiStore'
import { AIUnavailableError, requestHint, type ActualSource } from '../ai/hybrid'
import { decideRouting } from '../ai/routing'
import type { Command, Mission, Trace } from '../maze/types'
import { useSettings } from '../progress/store'
import { DUR, EASE_OUT } from '../../styles/motion'
import { buildHintContext } from './context'
import { localHint } from './localHints'

type Phase =
  | { kind: 'deciding' }
  | { kind: 'choice'; canPrepareLocal: boolean; canUseCloud: boolean }
  | { kind: 'loading'; routing: 'local-only' | 'prefer-local' }
  | { kind: 'ai'; hint: string; question: string; source: ActualSource; latencyMs: number }
  | { kind: 'local'; hint: string; question: string; note?: string }

interface Props {
  mission: Mission
  trace: Trace
  commands: Command[]
  attempt: number
  onShowMe?: () => void
  onDone: () => void
}

export function HintPanel({ mission, trace, commands, attempt, onShowMe, onDone }: Props) {
  const ai = useAI()
  const t = useT()
  const lang = useLang()
  const [settings, update] = useSettings()
  const [phase, setPhase] = useState<Phase>({ kind: 'deciding' })
  const started = useRef(false)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const showLocal = useCallback(
    (note?: string) => {
      const h = localHint(mission, trace, attempt, t)
      setPhase({ kind: 'local', ...h, note })
      playSfx('hint')
    },
    [mission, trace, attempt, t],
  )

  const ask = useCallback(
    async (routing: 'local-only' | 'prefer-local') => {
      setPhase({ kind: 'loading', routing })
      aiStore.markBusy()
      try {
        const ctx = buildHintContext(mission, commands, trace, attempt)
        const res = await requestHint(ctx, routing, lang)
        aiStore.markResult(res.meta.source, res.meta.latencyMs)
        if (!alive.current) return
        setPhase({ kind: 'ai', hint: res.hint, question: res.question, source: res.meta.source, latencyMs: res.meta.latencyMs })
        playSfx('hint')
      } catch (e) {
        const msg = e instanceof AIUnavailableError ? e.message : 'The AI could not answer.'
        aiStore.markError(msg)
        if (!alive.current) return
        showLocal(t.hint.notes.failed)
      }
    },
    [mission, commands, trace, attempt, showLocal, lang, t],
  )

  const decide = useCallback(
    (cloudConsent: boolean) => {
      const d = decideRouting({
        configured: ai.configured,
        online: ai.online,
        localReady: isLocalReady(ai, 'hint'),
        localPreparable: isLocalPreparable(ai, 'hint'),
        cloudConsent,
      })
      if (d.action === 'run') void ask(d.routing)
      else if (d.action === 'needs-choice') setPhase({ kind: 'choice', canPrepareLocal: d.canPrepareLocal, canUseCloud: d.canUseCloud })
      else
        showLocal(d.reason === 'unconfigured' ? t.hint.notes.unconfigured : t.hint.notes.offline)
    },
    [ai, ask, showLocal, t],
  )

  useEffect(() => {
    if (started.current) return
    started.current = true
    decide(settings.cloudHints)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-3" data-testid="hint-panel">
      {phase.kind === 'deciding' && <HintSkeleton label={t.hint.thinking} />}

      {phase.kind === 'choice' && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR.reveal, ease: EASE_OUT }} className="flex flex-col gap-3">
          <p className="text-[15px] text-ink-soft">{t.hint.intro}</p>
          {(ai.prep === 'preparing' || ai.localText === 'downloading') && (
            <p className="flex items-start gap-2 rounded-[16px] bg-mint-50 px-3 py-2 text-sm text-mint-700">
              <Cpu size={16} className="mt-0.5 shrink-0" aria-hidden /> {t.hint.preparing}
            </p>
          )}
          {phase.canUseCloud && (
            <div className="rounded-[18px] border border-line bg-cloud p-3.5 text-sm text-ink-soft">
              <p className="flex items-center gap-2 font-bold text-ink">
                <ShieldCheck size={17} className="text-mint-700" aria-hidden /> {t.hint.whatSent}
              </p>
              <p className="mt-1">{t.hint.whatSentBody}</p>
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => showLocal()} icon={<Sparkles size={18} aria-hidden />} data-testid="hint-builtin">
              {t.hint.builtIn}
            </Button>
            {phase.canUseCloud && (
              <>
                <Button variant="soft" onClick={() => void ask('prefer-local')} icon={<Cloud size={18} aria-hidden />} data-testid="hint-allow-once">
                  {t.hint.allowOnce}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    update({ cloudHints: true })
                    void ask('prefer-local')
                  }}
                  icon={<Cloud size={18} aria-hidden />}
                >
                  {t.hint.allowAlways}
                </Button>
              </>
            )}
          </div>
        </motion.div>
      )}

      {phase.kind === 'loading' && (
        <HintSkeleton label={t.hint.asking} />
      )}

      {(phase.kind === 'ai' || phase.kind === 'local') && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: DUR.reveal, ease: EASE_OUT }}
          className="rounded-[20px] border-2 border-orange/50 bg-orange-50 p-4"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {phase.kind === 'ai' ? <SourceBadge source={phase.source} latencyMs={phase.latencyMs} /> : <BuiltInTipBadge />}
          </div>
          <p className="flex gap-2 font-display text-[18px] font-extrabold leading-snug text-ink" data-testid="hint-text">
            <Lightbulb size={22} className="mt-0.5 shrink-0 text-orange-600" aria-hidden />
            <span>{phase.hint}</span>
          </p>
          {phase.question && <p className="mt-2 pl-8 text-[16px] font-semibold text-ink-soft">{phase.question}</p>}
          {phase.kind === 'local' && phase.note && <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-[13px] text-ink-muted">{phase.note}</p>}
          <div className="mt-3 flex flex-wrap gap-2 pl-8">
            {onShowMe && trace.failedStepIndex !== undefined && (
              <Button size="sm" variant="secondary" onClick={onShowMe} icon={<MapPin size={16} aria-hidden />}>
                {t.hint.replay}
              </Button>
            )}
            <Button size="sm" variant="primary" onClick={onDone} data-testid="hint-done">
              {t.hint.fix}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function HintSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-[20px] border border-line bg-white p-4" role="status" aria-live="polite">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-muted">
        <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden /> {label}
      </p>
      <div className="space-y-2" aria-hidden>
        <div className="h-4 w-11/12 animate-pulse rounded-full bg-primary-50 motion-reduce:animate-none" />
        <div className="h-4 w-8/12 animate-pulse rounded-full bg-primary-50 motion-reduce:animate-none" />
      </div>
    </div>
  )
}
