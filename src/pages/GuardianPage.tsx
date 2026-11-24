import { CheckCircle2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '../components/Button'
import { Robot } from '../components/Robot'
import { respondToConsent } from '../features/consent/api'
import { CONSENT_BACKEND_ENABLED } from '../features/consent/consent'
import { useT } from '../i18n'

/**
 * Opened by a parent from the permission email (/guardian#<token>). The token
 * is in the URL fragment, so it is never sent to the hosting server or logs.
 * Works without a PencilLoop profile on this device.
 */
export default function GuardianPage() {
  const t = useT()
  const token = typeof location !== 'undefined' ? location.hash.slice(1) : ''
  const [attested, setAttested] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<'approved' | 'rejected' | 'invalid' | 'error' | null>(null)

  const answer = async (decision: 'approve' | 'reject') => {
    setBusy(true)
    const r = await respondToConsent(token, decision, attested)
    setBusy(false)
    setResult(r.ok ? (decision === 'approve' ? 'approved' : 'rejected') : r.error === 'invalid' ? 'invalid' : 'error')
  }

  return (
    <div className="min-h-[100dvh] bg-cloud">
      <div className="pt-safe-16 mx-auto w-full max-w-[640px] px-4 pb-10">
        <div className="flex items-center gap-3">
          <Robot size={64} mood="happy" still />
          <h1 className="text-[26px] font-black leading-tight">{t.guardian.title}</h1>
        </div>
        <p className="mt-3 text-[16px] text-ink-soft">{t.guardian.intro}</p>

        <section className="mt-5 rounded-[20px] bg-white p-4 shadow-[var(--shadow-soft)]">
          <h2 className="text-[18px] font-black">{t.guardian.whatTitle}</h2>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[15px] text-ink-soft">
            {t.guardian.what.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <h2 className="mt-4 text-[18px] font-black">{t.guardian.noTitle}</h2>
          <p className="mt-1 text-[15px] text-ink-soft">{t.guardian.no}</p>
          <p className="mt-3 text-[14px] text-ink-muted">{t.guardian.withdraw}</p>
          <p className="mt-2 flex gap-4 text-[14px] font-bold">
            <Link to="/privacy" className="text-primary underline">
              {t.guardian.privacy}
            </Link>
            <Link to="/terms" className="text-primary underline">
              {t.guardian.terms}
            </Link>
          </p>
        </section>

        {!CONSENT_BACKEND_ENABLED ? (
          <p className="mt-5 rounded-[16px] bg-orange-50 px-4 py-3 font-bold text-ink-soft" data-testid="guardian-unavailable">
            {t.guardian.unavailable}
          </p>
        ) : result === 'approved' || result === 'rejected' ? (
          <p className="mt-5 flex items-center gap-2 rounded-[16px] bg-mint-50 px-4 py-3 font-bold text-mint-700" role="status">
            <CheckCircle2 size={20} aria-hidden /> {t.guardian.done[result]}
          </p>
        ) : !token || result === 'invalid' ? (
          <p className="mt-5 rounded-[16px] bg-danger-50 px-4 py-3 font-bold text-danger" role="alert">
            {t.guardian.invalid}
          </p>
        ) : (
          <div className="mt-5 flex flex-col gap-3">
            <label className="flex items-start gap-3 rounded-[16px] bg-white p-4 shadow-[var(--shadow-soft)]">
              <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--color-primary)]" />
              <span className="flex items-center gap-2 text-[15px] font-bold">
                <ShieldCheck size={18} className="shrink-0 text-primary" aria-hidden /> {t.guardian.attest}
              </span>
            </label>
            <Button size="lg" block disabled={!attested || busy} onClick={() => void answer('approve')}>
              {t.guardian.approve}
            </Button>
            <Button size="lg" variant="secondary" block disabled={busy} onClick={() => void answer('reject')}>
              {t.guardian.reject}
            </Button>
            {result === 'error' && <p className="font-bold text-danger">{t.consent.error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
