import { ArrowLeft, Info } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useLang, useT } from '../i18n'
import { PRIVACY, TERMS } from '../legal/content'
import { LEGAL_UPDATED, OPERATOR, OPERATOR_CONFIGURED } from '../legal/operator'

/** Privacy policy (/privacy) and terms of service (/terms), in the player's language. */
export default function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const sections = (kind === 'privacy' ? PRIVACY : TERMS)[lang]
  return (
    <div className="mx-auto w-full max-w-[760px] px-4 pb-10 md:px-6 lg:pt-8">
      <header className="pt-safe-16 lg:pt-0">
        <button type="button" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/'))} className="mb-3 inline-flex h-11 items-center gap-1.5 rounded-full bg-white px-3.5 font-display font-extrabold shadow-[var(--shadow-soft)]">
          <ArrowLeft size={18} aria-hidden /> {t.legal.back}
        </button>
        <h1 className="text-[28px] font-black leading-tight lg:text-[38px]">{kind === 'privacy' ? t.legal.privacyTitle : t.legal.termsTitle}</h1>
        <p className="mt-1 text-[13.5px] font-semibold text-ink-muted">
          {t.legal.updated}: {LEGAL_UPDATED}
        </p>
        <p className="mt-3 flex items-start gap-2 rounded-[16px] bg-orange-50 px-3.5 py-2.5 text-[14px] text-ink-soft">
          <Info size={18} className="mt-0.5 shrink-0 text-orange-600" aria-hidden /> {t.legal.draft}
        </p>
      </header>
      <article className="mt-5 flex flex-col gap-5">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-[19px] font-black">{s.title}</h2>
            {s.body.map((p) => (
              <p key={p} className="mt-1.5 text-[15.5px] leading-relaxed text-ink-soft">
                {p}
              </p>
            ))}
          </section>
        ))}
        <section>
          <h2 className="text-[19px] font-black">{t.legal.contact}</h2>
          {OPERATOR_CONFIGURED ? (
            <p className="mt-1.5 text-[15.5px] text-ink-soft">
              {OPERATOR.name}
              {OPERATOR.address ? `, ${OPERATOR.address}` : ''}. <a className="font-bold text-primary underline" href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
            </p>
          ) : (
            <p className="mt-1.5 rounded-[12px] bg-danger-50 px-3 py-2 text-[14px] font-bold text-danger" data-testid="operator-missing">
              {t.legal.operatorMissing}
            </p>
          )}
        </section>
        <p className="text-[14px]">
          <Link to={kind === 'privacy' ? '/terms' : '/privacy'} className="font-bold text-primary underline">
            {kind === 'privacy' ? t.legal.termsTitle : t.legal.privacyTitle}
          </Link>
        </p>
      </article>
    </div>
  )
}
