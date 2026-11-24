import { CheckCircle2, Clock, HardDrive, Info, Mail, Phone, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { playSfx } from '../../app/hooks'
import { Button } from '../../components/Button'
import { Robot } from '../../components/Robot'
import { useLang, useT } from '../../i18n'
import { useProfile } from '../profile/profile'
import { refreshGuardianConsent, requestGuardianConsent } from './api'
import { CONSENT_BACKEND_ENABLED, isValidGuardianEmail, normalizeGuardianPhone, useGuardianStatus } from './consent'

/**
 * Parent permission for players under 18. Friendly, never punishing: the
 * game keeps working locally while permission is pending or refused.
 */
export function ConsentCard() {
  const t = useT()
  const lang = useLang()
  const profile = useProfile()
  const status = useGuardianStatus()
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<{ phone?: string; email?: string }>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'pending') void refreshGuardianConsent()
  }, [status])

  if (status === 'not_required') return null

  const submit = async () => {
    const p = normalizeGuardianPhone(phone)
    const e: typeof errors = {}
    if (!p) e.phone = t.consent.invalidPhone
    if (!isValidGuardianEmail(email)) e.email = t.consent.invalidEmail
    setErrors(e)
    if (e.phone || e.email || !p || !profile) {
      playSfx('error')
      return
    }
    setBusy(true)
    const r = await requestGuardianConsent({ phone: p, email: email.trim(), lang, ageGroup: profile.ageGroup === 'under13' ? 'under13' : 'teen' })
    setBusy(false)
    if (r.ok) {
      playSfx('achievement')
      setMsg(t.consent.sent)
      setPhone('')
      setEmail('')
    } else setMsg(r.error === 'unavailable' ? t.consent.notAvailable : r.error === 'rate-limited' ? t.consent.tooMany : t.consent.error)
  }

  const tone = status === 'verified' ? 'bg-mint-50 text-mint-700' : status === 'pending' ? 'bg-orange-50 text-orange-600' : 'bg-primary-50 text-primary'
  const Icon = status === 'verified' ? CheckCircle2 : status === 'pending' ? Clock : ShieldCheck

  return (
    <section className="rounded-[24px] bg-white p-4 shadow-[var(--shadow-soft)]" aria-labelledby="consent-title" data-testid="consent-card" data-status={status}>
      <div className="flex items-start gap-3">
        <Robot size={56} mood={status === 'verified' ? 'happy' : 'waiting'} still />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="consent-title" className="text-[18px] font-black">
              {t.consent.title}
            </h2>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-extrabold ${tone}`} data-testid="consent-status">
              <Icon size={13} aria-hidden /> {t.consent.status[status]}
            </span>
          </div>
          <p className="mt-1 text-[14.5px] font-semibold text-ink-soft">
            {status === 'verified' ? t.consent.verifiedBody : status === 'rejected' ? t.consent.rejectedBody : status === 'revoked' ? t.consent.revokedBody : t.consent.hero}
          </p>
        </div>
      </div>

      {status !== 'verified' && (
        <>
          <p className="mt-3 flex items-start gap-2 rounded-[14px] bg-cloud px-3 py-2 text-[13.5px] text-ink-soft">
            <HardDrive size={16} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden /> {t.consent.localOnly}
          </p>
          <details className="mt-2 rounded-[14px] px-1 text-[13.5px] text-ink-soft">
            <summary className="flex cursor-pointer items-center gap-1.5 py-1 font-bold text-primary">
              <Info size={15} aria-hidden /> {t.consent.why}
            </summary>
            <p className="mt-1">{t.consent.whyBody}</p>
            <p className="mt-1">
              <Link to="/privacy" className="font-bold text-primary underline">
                {t.legal.privacyTitle}
              </Link>
            </p>
          </details>
        </>
      )}

      {(status === 'required' || status === 'rejected' || status === 'revoked') && (
        <form
          className="mt-3 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
          noValidate
        >
          <label className="grid gap-1">
            <span className="flex items-center gap-1.5 text-[14px] font-extrabold">
              <Phone size={15} aria-hidden /> {t.consent.phone}
            </span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="off"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`h-12 rounded-[14px] border-2 bg-white px-3 text-[16px] font-semibold outline-none focus:border-primary ${errors.phone ? 'border-danger' : 'border-line'}`}
              aria-invalid={!!errors.phone}
              aria-describedby="phone-help"
              placeholder="0812 3456 7890"
              data-testid="guardian-phone"
            />
            <span id="phone-help" className={`text-[12.5px] ${errors.phone ? 'font-bold text-danger' : 'text-ink-muted'}`}>
              {errors.phone ?? t.consent.phoneHelp}
            </span>
          </label>
          <label className="grid gap-1">
            <span className="flex items-center gap-1.5 text-[14px] font-extrabold">
              <Mail size={15} aria-hidden /> {t.consent.email}
            </span>
            <input
              type="email"
              inputMode="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`h-12 rounded-[14px] border-2 bg-white px-3 text-[16px] font-semibold outline-none focus:border-primary ${errors.email ? 'border-danger' : 'border-line'}`}
              aria-invalid={!!errors.email}
              aria-describedby="email-help"
              data-testid="guardian-email"
            />
            <span id="email-help" className={`text-[12.5px] ${errors.email ? 'font-bold text-danger' : 'text-ink-muted'}`}>
              {errors.email ?? t.consent.emailHelp}
            </span>
          </label>
          <p className="text-[12.5px] font-semibold text-ink-muted">{t.consent.purpose}</p>
          <Button type="submit" size="lg" block disabled={busy} data-testid="guardian-send">
            {busy ? t.consent.sending : t.consent.send}
          </Button>
          {!CONSENT_BACKEND_ENABLED && !msg && <p className="text-[12.5px] text-ink-muted">{t.consent.notAvailable}</p>}
        </form>
      )}

      {status === 'pending' && (
        <Button size="md" variant="secondary" className="mt-3" onClick={() => void refreshGuardianConsent()}>
          {t.consent.checkAgain}
        </Button>
      )}

      {msg && (
        <p className="mt-3 rounded-[14px] bg-primary-50 px-3 py-2 text-[14px] font-bold text-ink-soft" role="status" data-testid="consent-message">
          {msg}
        </p>
      )}
    </section>
  )
}
