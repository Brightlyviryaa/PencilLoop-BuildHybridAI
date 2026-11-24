import { cloudAllowed } from '../features/consent/consent'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Cpu,
  History,
  Loader2,
  MinusCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { playSfx } from '../app/hooks'
import { BuiltInTipBadge, SourceBadge } from '../components/AIBadges'
import { Button } from '../components/Button'
import { Card, SettingRow, Toggle } from '../components/Controls'
import { aiStore, isLocalPreparable, useAI } from '../features/ai/aiStore'
import { chromeMajorVersion } from '../features/ai/capabilities'
import { CLOUD_MODEL, appCheckConfig } from '../features/ai/config'
import { getAppCheckStatus } from '../features/ai/firebase'
import { AIUnavailableError, requestHint, type ActualSource } from '../features/ai/hybrid'
import { decideRouting } from '../features/ai/routing'
import { buildHintContext } from '../features/hints/context'
import { runProgram, toProgram } from '../features/maze/interpreter'
import { MISSIONS } from '../features/maze/missions'
import { useSettings } from '../features/progress/store'
import { useLang, useT } from '../i18n'
import { EASE_OUT } from '../styles/motion'

type Check = 'yes' | 'no' | 'maybe'

export default function AIInfoPage() {
  const t = useT()
  const lang = useLang()
  const ai = useAI()
  const [settings, update] = useSettings()
  const [techOpen, setTechOpen] = useState(false)
  const chrome = chromeMajorVersion()
  const appCheck = getAppCheckStatus()
  const [test, setTest] = useState<
    | { state: 'idle' }
    | { state: 'running' }
    | { state: 'done'; source: ActualSource; latencyMs: number; text: string }
    | { state: 'error'; message: string }
    | { state: 'blocked'; message: string }
  >({ state: 'idle' })

  const onDeviceKey = ai.localText === 'available' || ai.localImage === 'available' ? 'available' : ai.localText
  const pct = ai.downloadProgress !== null ? Math.round(ai.downloadProgress * 100) : null
  const cloudKey = !ai.configured ? 'off' : !ai.online ? 'offline' : settings.cloudHints || settings.cloudPhotos ? 'allowed' : 'ask'
  const lastKey = ai.lastSource ?? 'none'

  const Mark = ({ v }: { v: Check }) =>
    v === 'yes' ? (
      <CheckCircle2 size={18} className="shrink-0 text-mint-700" aria-label={t.ai.yes} />
    ) : v === 'no' ? (
      <XCircle size={18} className="shrink-0 text-danger" aria-label={t.ai.no} />
    ) : (
      <MinusCircle size={18} className="shrink-0 text-orange-600" aria-label={t.ai.partly} />
    )

  const r = t.ai.rows
  const rows: { label: string; value: ReactNode; ok: Check }[] = [
    { label: r.device, value: ai.mobile ? r.deviceMobile : r.deviceDesktop, ok: ai.mobile ? 'maybe' : 'yes' },
    { label: r.chrome, value: chrome ? `Chrome ${chrome}` : r.notChrome, ok: chrome && chrome >= 139 && !ai.mobile ? 'yes' : 'no' },
    { label: r.text, value: t.ai.onDeviceValues[ai.localText], ok: ai.localText === 'available' ? 'yes' : isLocalPreparable(ai, 'hint') ? 'maybe' : 'no' },
    { label: r.image, value: t.ai.onDeviceValues[ai.localImage], ok: ai.localImage === 'available' ? 'yes' : isLocalPreparable(ai, 'scan') ? 'maybe' : 'no' },
    { label: r.firebase, value: ai.configured ? r.connected : r.notConfigured, ok: ai.configured ? 'yes' : 'no' },
    {
      label: r.appCheck,
      value: !ai.appCheckConfigured
        ? r.appCheckNone
        : appCheck.state === 'active'
          ? r.appCheckActive(appCheckConfig.debugToken ? 'debug token' : appCheckConfig.provider)
          : appCheck.state === 'error'
            ? r.appCheckError(appCheck.error ?? '')
            : r.appCheckLater(appCheckConfig.provider),
      ok: ai.appCheckConfigured ? (appCheck.state === 'error' ? 'no' : 'yes') : 'no',
    },
    { label: r.network, value: ai.online ? r.online : r.offline, ok: ai.online ? 'yes' : 'maybe' },
    { label: r.photoPerm, value: settings.cloudPhotos ? r.allowed : r.askEveryTime, ok: settings.cloudPhotos ? 'yes' : 'maybe' },
    { label: r.cluePerm, value: settings.cloudHints ? r.allowed : r.askEveryTime, ok: settings.cloudHints ? 'yes' : 'maybe' },
    { label: r.model, value: <code className="rounded bg-cloud px-1.5 py-0.5 text-[13px]">{CLOUD_MODEL}</code>, ok: 'yes' },
  ]

  const runTest = async () => {
    const d = decideRouting({
      configured: ai.configured,
      online: ai.online,
      localReady: ai.localText === 'available',
      localPreparable: false,
      cloudConsent: settings.cloudHints && cloudAllowed(),
      cloudPermitted: cloudAllowed(),
    })
    if (d.action !== 'run') {
      setTest({
        state: 'blocked',
        message: d.action === 'unavailable' ? t.ai.testBlocked[d.reason] : t.ai.testBlocked.consent,
      })
      return
    }
    setTest({ state: 'running' })
    aiStore.markBusy()
    try {
      const m = MISSIONS[0]
      const cmds = m.failureFixtures[0].commands
      const trace = runProgram(m, toProgram(cmds))
      const res = await requestHint(buildHintContext(m, cmds, trace, 1), d.routing, lang)
      aiStore.markResult(res.meta.source, res.meta.latencyMs)
      setTest({ state: 'done', source: res.meta.source, latencyMs: res.meta.latencyMs, text: `${res.hint} ${res.question}` })
    } catch (e) {
      const msg = e instanceof AIUnavailableError ? e.message : String(e)
      aiStore.markError(msg)
      setTest({ state: 'error', message: msg })
    }
  }

  const statusCards = [
    { Icon: Sparkles, k: t.ai.mode, v: t.ai.modeValue, tone: 'bg-primary-50 text-primary' },
    { Icon: Cpu, k: t.ai.onDevice, v: t.ai.onDeviceValues[onDeviceKey] ?? t.ai.onDeviceValues.unknown, tone: 'bg-mint-50 text-mint-700', test: 'ai-ondevice' },
    {
      Icon: Loader2,
      k: t.ai.prep,
      v: `${t.ai.prepValues[ai.prep]}${ai.prep === 'preparing' && pct !== null ? `, ${t.ai.downloaded(pct)}` : ''}`,
      tone: 'bg-orange-50 text-orange-600',
      spin: ai.prep === 'preparing',
      progress: ai.prep === 'preparing' ? pct : null,
      test: 'ai-prep',
    },
    { Icon: Cloud, k: t.ai.cloud, v: t.ai.cloudValues[cloudKey], tone: 'bg-primary-50 text-primary' },
    { Icon: History, k: t.ai.last, v: t.ai.lastValues[lastKey], tone: 'bg-cloud text-ink-soft', test: 'ai-last' },
  ]

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-4 pb-6 md:px-6 lg:gap-6 lg:px-8 lg:pt-8">
      <header className="pt-safe-16 lg:pt-0">
        <Link to="/profile" className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-extrabold text-ink-soft hover:bg-primary-50" onClick={() => playSfx('nav')}>
          <ArrowLeft size={18} aria-hidden /> {t.profile.title}
        </Link>
        <p className="mt-2 font-display text-sm font-extrabold uppercase tracking-[0.14em] text-orange-600">{t.ai.eyebrow}</p>
        <h1 className="mt-1 text-[30px] font-black leading-tight lg:text-[44px]">{t.ai.title}</h1>
        <p className="mt-2 max-w-3xl text-[16px] text-ink-soft">{t.ai.intro}</p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="ai-status">
        {statusCards.map((c) => (
          <li key={c.k} className="rounded-[22px] border border-line/60 bg-white p-4 shadow-[var(--shadow-soft)]" data-testid={c.test}>
            <div className="flex items-start gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[12px] ${c.tone}`}>
                <c.Icon size={20} className={c.spin ? 'animate-spin motion-reduce:animate-none' : ''} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">{c.k}</p>
                <p className="font-display text-[16px] font-extrabold leading-snug">{c.v}</p>
              </div>
            </div>
            {c.progress !== null && c.progress !== undefined && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-orange-50">
                <motion.div className="h-full rounded-full bg-orange" animate={{ width: `${c.progress}%` }} transition={{ duration: 0.4 }} />
              </div>
            )}
          </li>
        ))}
      </ul>

      <Card>
        <SettingRow
          icon={<Cpu size={20} aria-hidden />}
          title={t.ai.autoPrep}
          desc={t.ai.autoPrepDesc}
          control={<Toggle label={t.ai.autoPrep} checked={settings.autoPrepareAI} onChange={(v) => update({ autoPrepareAI: v })} testId="toggle-auto-prep" />}
        />
      </Card>

      {/* Technical details for judges */}
      <section>
        <button
          type="button"
          onClick={() => {
            setTechOpen((o) => !o)
            playSfx('toggle')
          }}
          aria-expanded={techOpen}
          className="flex w-full items-center gap-3 rounded-[22px] border border-line/60 bg-white p-4 text-left shadow-[var(--shadow-soft)]"
          data-testid="tech-toggle"
        >
          <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-ink text-white">
            <ShieldCheck size={20} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[17px] font-extrabold">{t.ai.tech}</span>
            <span className="block text-sm text-ink-muted">{t.ai.techDesc}</span>
          </span>
          <motion.span animate={{ rotate: techOpen ? 180 : 0 }}>
            <ChevronDown size={22} aria-hidden />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {techOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-5 pt-4 lg:gap-6">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-6">
                  <Card>
                    <h2 className="text-xl font-black">{t.ai.deviceNow}</h2>
                    <p className="mt-1 text-sm text-ink-muted">{t.ai.deviceNowDesc}</p>
                    <dl className="mt-4 divide-y divide-line/70" data-testid="capability-matrix">
                      {rows.map((row) => (
                        <div key={row.label} className="flex items-center gap-3 py-2.5">
                          <Mark v={row.ok} />
                          <dt className="w-36 shrink-0 text-sm font-bold text-ink-soft sm:w-52">{row.label}</dt>
                          <dd className="min-w-0 flex-1 break-words text-sm text-ink">{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="secondary" size="sm" onClick={() => void aiStore.refresh()} icon={<RefreshCw size={16} aria-hidden />}>
                        {t.ai.recheck}
                      </Button>
                      {isLocalPreparable(ai, 'scan') && (
                        <Button variant="mint" size="sm" onClick={() => void aiStore.prepareLocal('scan')} icon={<Cpu size={16} aria-hidden />} disabled={ai.prep === 'preparing'}>
                          {ai.prep === 'preparing' ? t.ai.preparingNow : t.ai.prepareNow}
                        </Button>
                      )}
                      <Button variant="soft" size="sm" onClick={() => update({ cloudHints: !settings.cloudHints })} icon={<Cloud size={16} aria-hidden />}>
                        {settings.cloudHints ? t.ai.disallowClues : t.ai.allowClues}
                      </Button>
                    </div>
                    {ai.lastError && <p className="mt-3 rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger">{t.ai.lastError(ai.lastError)}</p>}
                  </Card>

                  <Card className="flex flex-col">
                    <h2 className="text-xl font-black">{t.ai.testTitle}</h2>
                    <p className="mt-1 text-[15px] text-ink-soft">{t.ai.testBody}</p>
                    <div className="mt-4">
                      <Button
                        onClick={runTest}
                        disabled={test.state === 'running'}
                        icon={test.state === 'running' ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <ArrowRight size={18} aria-hidden />}
                        data-testid="ai-test"
                      >
                        {test.state === 'running' ? t.ai.testWaiting : t.ai.testSend}
                      </Button>
                    </div>
                    <div className="mt-4 min-h-[96px] rounded-[18px] bg-cloud p-4 text-[15px]" aria-live="polite">
                      {test.state === 'idle' && <p className="text-ink-muted">{t.ai.testIdle}</p>}
                      {test.state === 'running' && <p className="text-ink-muted">{t.ai.testRunning}</p>}
                      {test.state === 'done' && (
                        <>
                          <SourceBadge source={test.source} latencyMs={test.latencyMs} technical />
                          <p className="mt-2 font-semibold">{test.text}</p>
                        </>
                      )}
                      {test.state === 'blocked' && (
                        <>
                          <BuiltInTipBadge />
                          <p className="mt-2 text-ink-soft">
                            {test.message} {t.ai.testNothingSent}
                          </p>
                        </>
                      )}
                      {test.state === 'error' && <p className="text-danger">{t.ai.testFailed(test.message)}</p>}
                    </div>
                    <p className="mt-auto pt-4 text-xs text-ink-muted">
                      {t.ai.lastSession(ai.lastSource === 'on_device' ? 'ON_DEVICE' : ai.lastSource === 'in_cloud' ? 'IN_CLOUD' : ai.lastSource ?? t.ai.none)}
                    </p>
                  </Card>
                </div>

                <Card>
                  <h2 className="text-xl font-black">{t.ai.flowTitle}</h2>
                  <ol className="mt-5 grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
                    {t.ai.flow.flatMap((s, i, all) => {
                      const Icon = [ShieldCheck, Cpu, Cloud, CheckCircle2][i]
                      const bg = ['bg-cloud', 'bg-mint-50', 'bg-primary-50', 'bg-orange-50'][i]
                      return [
                        <li key={s.t} className={`rounded-[20px] p-4 ${bg}`}>
                          <Icon size={22} className="text-ink" aria-hidden />
                          <p className="mt-2 font-display text-[17px] font-extrabold">{s.t}</p>
                          <p className="mt-1 text-sm text-ink-soft">{s.d}</p>
                        </li>,
                        i < all.length - 1 ? (
                          <li key={`a${i}`} className="grid place-items-center text-ink-muted" aria-hidden>
                            <ArrowRight className="hidden lg:block" />
                            <ArrowDown className="lg:hidden" />
                          </li>
                        ) : null,
                      ]
                    })}
                  </ol>
                </Card>

                <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
                  <Card>
                    <h2 className="text-xl font-black">{t.ai.matrixTitle}</h2>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[460px] text-left text-sm">
                        <thead>
                          <tr className="text-ink-muted">
                            {t.ai.matrixHead.map((h) => (
                              <th key={h} className="py-2 pr-3 font-bold">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line/70">
                          {t.ai.matrix.map((row, i) => (
                            <tr key={i}>
                              {row.map((c, j) => (
                                <td key={j} className={`py-2.5 pr-3 ${j === 2 ? 'font-semibold' : 'text-ink-soft'}`}>
                                  {c}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                  <Card>
                    <h2 className="text-xl font-black">{t.ai.limitsTitle}</h2>
                    <ul className="mt-3 space-y-2.5 text-[15px] text-ink-soft">
                      {t.ai.limits.map((l) => (
                        <li key={l} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                          {l}
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  )
}
