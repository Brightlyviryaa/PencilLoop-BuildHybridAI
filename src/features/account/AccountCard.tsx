import { motion } from 'motion/react'
import { CheckCircle2, CloudOff, Loader2, LogOut, ShieldAlert, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { playSfx } from '../../app/hooks'
import { Button } from '../../components/Button'
import { Sheet } from '../../components/Sheet'
import { showToast } from '../../components/toast'
import { useT } from '../../i18n'
import { GoogleG } from '../../components/GoogleG'
import { mayLinkGoogle, useProfile } from '../profile/profile'
import { linkGoogle, signOutPlayer, useAccount } from './account'

/** Guest vs Google status, "Save progress with Google", and sign-out for linked players. */
export function AccountCard() {
  const t = useT()
  const acct = useAccount()
  const profile = useProfile()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmOut, setConfirmOut] = useState(false)

  if (acct.phase === 'unconfigured') {
    return (
      <p className="flex items-start gap-3 rounded-[18px] bg-cloud p-3.5 text-sm text-ink-soft" data-testid="account-local">
        <CloudOff size={20} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
        {t.account.unavailable}
      </p>
    )
  }

  if (acct.phase === 'guardian') {
    return (
      <p className="flex items-start gap-3 rounded-[18px] bg-cloud p-3.5 text-sm text-ink-soft" data-testid="account-guardian">
        <ShieldAlert size={20} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />
        {t.consent.localOnly}
      </p>
    )
  }

  const linked = acct.kind === 'google'
  const syncText =
    acct.phase === 'loading'
      ? t.account.sync.connecting
      : acct.sync === 'saving'
        ? t.account.sync.saving
        : acct.sync === 'offline'
          ? t.account.sync.offline
          : acct.sync === 'error'
            ? t.account.sync.error
            : acct.sync === 'saved'
              ? t.account.sync.saved
              : acct.phase === 'ready'
                ? t.account.sync.idle
                : t.account.sync.local

  const onLink = async () => {
    setBusy(true)
    setMsg(null)
    const r = await linkGoogle()
    setBusy(false)
    if (r.status === 'linked') {
      playSfx('achievement')
      showToast({ kind: 'success', title: t.account.linkedToast })
    } else if (r.status === 'redirecting') setMsg(t.account.redirecting)
    else if (r.status === 'error') setMsg(t.account.errors[r.code])
  }

  return (
    <div className="flex flex-col gap-3" data-testid="account-card" data-kind={acct.kind ?? 'none'}>
      <div className={`flex items-start gap-3 rounded-[20px] p-4 ${linked ? 'bg-mint-50' : 'bg-cloud'}`}>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${linked ? 'bg-white' : 'bg-white text-ink-soft'}`}>
          {linked ? <GoogleG size={22} /> : <UserRound size={22} aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[17px] font-extrabold">{linked ? t.account.linkedTitle : t.account.guestTitle}</p>
          <p className="text-sm text-ink-soft">{linked ? t.account.linkedBody(acct.email) : t.account.guestBody}</p>
          <motion.p key={syncText} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 flex items-center gap-1.5 text-[13px] font-bold text-ink-muted" data-testid="sync-status">
            {acct.sync === 'saving' || acct.phase === 'loading' ? (
              <Loader2 size={14} className="animate-spin" aria-hidden />
            ) : acct.sync === 'offline' || acct.sync === 'error' ? (
              <CloudOff size={14} aria-hidden />
            ) : (
              <CheckCircle2 size={14} className="text-mint-700" aria-hidden />
            )}
            {syncText}
          </motion.p>
        </div>
      </div>

      {!linked && profile && mayLinkGoogle(profile.ageGroup) && (
        <div className="rounded-[20px] border-2 border-primary/25 p-4">
          <p className="text-[15px] text-ink-soft">{t.account.linkBody}</p>
          {profile.ageGroup === 'teen' && <p className="mt-2 rounded-xl bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-600">{t.account.teenNote}</p>}
          <Button
            className="mt-3"
            size="lg"
            variant="secondary"
            block
            onClick={() => void onLink()}
            disabled={busy || acct.phase !== 'ready'}
            icon={busy ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <GoogleG size={20} />}
            data-testid="link-google"
          >
            {busy ? t.account.linking : t.account.linkCta}
          </Button>
        </div>
      )}

      {!linked && profile && !mayLinkGoogle(profile.ageGroup) && (
        <div className="flex items-start gap-3 rounded-[20px] bg-orange-50 p-4" data-testid="link-blocked">
          <ShieldAlert size={22} className="mt-0.5 shrink-0 text-orange-600" aria-hidden />
          <div>
            <p className="font-display text-[16px] font-extrabold">{t.account.under13Title}</p>
            <p className="text-sm text-ink-soft">{t.account.under13Body}</p>
          </div>
        </div>
      )}

      {linked && (
        <Button variant="ghost" onClick={() => setConfirmOut(true)} icon={<LogOut size={18} aria-hidden />} className="self-start" data-testid="sign-out">
          {t.account.signOut}
        </Button>
      )}

      {msg && (
        <p className="rounded-xl bg-cloud px-3 py-2 text-sm font-semibold text-ink-soft" role="status">
          {msg}
        </p>
      )}

      <Sheet
        open={confirmOut}
        onClose={() => setConfirmOut(false)}
        title={t.account.signOutTitle}
        description={t.account.signOutBody}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirmOut(false)}>
              {t.common.cancel}
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                setConfirmOut(false)
                await signOutPlayer()
                navigate('/welcome', { replace: true })
              }}
              icon={<LogOut size={18} aria-hidden />}
              data-testid="confirm-sign-out"
            >
              {t.account.signOut}
            </Button>
          </div>
        }
      >
        <span />
      </Sheet>
    </div>
  )
}
