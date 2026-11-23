import { Combine, Loader2, UserRound, Users } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { playSfx } from '../../app/hooks'
import { Sheet } from '../../components/Sheet'
import { showToast } from '../../components/toast'
import { useT } from '../../i18n'
import { onLinkConflict, resolveLinkConflict, type ConflictChoice } from './account'

/**
 * Shown when "Save progress with Google" finds that the Google account
 * already owns another PencilLoop save. Nothing is overwritten until the
 * player picks an option.
 */
export function LinkConflictSheet() {
  const t = useT()
  const [email, setEmail] = useState<string | null | undefined>(undefined)
  const [busy, setBusy] = useState<ConflictChoice | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => onLinkConflict((e) => setEmail(e)), [])

  const open = email !== undefined
  const choose = async (c: ConflictChoice) => {
    setBusy(c)
    setError(null)
    const r = await resolveLinkConflict(c)
    setBusy(null)
    if (!r.ok) {
      setError(t.account.errors[r.code ?? 'unknown'])
      return
    }
    setEmail(undefined)
    if (c !== 'stay') {
      playSfx('unlock')
      showToast({ kind: 'success', title: t.account.conflict.done })
    }
  }

  return (
    <Sheet open={open} onClose={() => busy === null && void choose('stay')} title={t.account.conflict.title} description={t.account.conflict.body(email ?? null)} testId="link-conflict">
      <div className="flex flex-col gap-2.5 pb-2">
        <Option busy={busy} choose={choose} working={t.account.conflict.working} c="combine" primary icon={<Combine size={20} aria-hidden />} title={t.account.conflict.combine} desc={t.account.conflict.combineDesc} />
        <Option busy={busy} choose={choose} working={t.account.conflict.working} c="switch" icon={<Users size={20} aria-hidden />} title={t.account.conflict.switch} desc={t.account.conflict.switchDesc} />
        <Option busy={busy} choose={choose} working={t.account.conflict.working} c="stay" icon={<UserRound size={20} aria-hidden />} title={t.account.conflict.stay} desc={t.account.conflict.stayDesc} />
        {error && (
          <p className="rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  )
}

function Option({
  c,
  icon,
  title,
  desc,
  primary,
  busy,
  choose,
  working,
}: {
  c: ConflictChoice
  icon: ReactNode
  title: string
  desc: string
  primary?: boolean
  busy: ConflictChoice | null
  choose: (c: ConflictChoice) => Promise<void>
  working: string
}) {
  return (
    <button
      type="button"
      disabled={busy !== null}
      onClick={() => void choose(c)}
      className={`flex w-full items-start gap-3 rounded-[20px] border-2 p-4 text-left transition-colors disabled:opacity-60 ${
        primary ? 'border-primary bg-primary-50 hover:bg-primary-100' : 'border-line bg-white hover:border-primary/40'
      }`}
      data-testid={`conflict-${c}`}
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[14px] ${primary ? 'bg-primary text-white' : 'bg-cloud text-ink-soft'}`}>
        {busy === c ? <Loader2 size={20} className="animate-spin" aria-hidden /> : icon}
      </span>
      <span>
        <span className="block font-display text-[17px] font-extrabold">{busy === c ? working : title}</span>
        <span className="block text-sm text-ink-muted">{desc}</span>
      </span>
    </button>
  )
}
