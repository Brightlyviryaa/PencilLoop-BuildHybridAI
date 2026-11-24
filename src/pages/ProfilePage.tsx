import { BookOpen, Cpu, Image, Loader2, MessageCircleQuestion, Pencil, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { playSfx } from '../app/hooks'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { Card, LinkRow, SettingRow, Toggle } from '../components/Controls'
import { Sheet } from '../components/Sheet'
import { showToast } from '../components/toast'
import { deleteEverything } from '../features/account/account'
import { AccountCard } from '../features/account/AccountCard'
import { ConsentCard } from '../features/consent/ConsentCard'
import { SettingsPanel } from '../features/profile/SettingsPanel'
import {
  NAME_MAX,
  ageGroupFor,
  checkBirthDate,
  checkName,
  cleanName,
  profileStore,
  todayISO,
  useProfile,
  type Gender,
} from '../features/profile/profile'
import { useSettings } from '../features/progress/store'
import { useT } from '../i18n'

export default function ProfilePage() {
  const t = useT()
  const profile = useProfile()
  const [s, update] = useSettings()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pb-6 md:px-6 lg:px-8 lg:pt-8">
      <header className="pt-safe-16 lg:pt-0">
        <h1 className="text-[30px] font-black leading-tight lg:text-[44px]">{t.profile.title}</h1>
      </header>

      <div className="mt-5 grid gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="flex flex-col gap-4 lg:gap-6">
          {/* Player */}
          <Card className="flex items-center gap-4">
            <Avatar name={profile?.name} size={68} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-2xl font-black" data-testid="profile-name">
                {profile?.name}
              </p>
              <p className="text-sm font-bold text-ink-muted">{profile ? t.profile.ageGroups[profile.ageGroup] : ''}</p>
            </div>
            <Button variant="soft" size="sm" onClick={() => setEditing(true)} icon={<Pencil size={16} aria-hidden />} data-testid="edit-profile">
              {t.common.edit}
            </Button>
          </Card>

          <ConsentCard />

          <Card aria-labelledby="acct">
            <h2 id="acct" className="mb-3 font-display text-sm font-extrabold uppercase tracking-wider text-ink-muted">
              {t.profile.sections.account}
            </h2>
            <AccountCard />
          </Card>

          <Card aria-labelledby="help">
            <h2 id="help" className="mb-1 font-display text-sm font-extrabold uppercase tracking-wider text-ink-muted">
              {t.profile.sections.help}
            </h2>
            <LinkRow icon={<BookOpen size={20} aria-hidden />} title={t.settings.howToPlay} desc={t.settings.howToPlayDesc} to="/learn" />
            <LinkRow
              icon={<ShieldCheck size={20} aria-hidden />}
              title={t.settings.privacy}
              desc={t.settings.privacyDesc}
              onClick={() => setPrivacyOpen(true)}
              testId="open-privacy"
            />
          </Card>
        </div>

        <div className="flex flex-col gap-4 lg:gap-6">
          <Card aria-labelledby="set">
            <h2 id="set" className="font-display text-sm font-extrabold uppercase tracking-wider text-ink-muted">
              {t.profile.sections.settings}
            </h2>
            <SettingsPanel />
          </Card>

          <Card aria-labelledby="priv">
            <h2 id="priv" className="font-display text-sm font-extrabold uppercase tracking-wider text-ink-muted">
              {t.profile.sections.privacy}
            </h2>
            <div className="divide-y divide-line/70">
              <SettingRow
                icon={<Image size={20} aria-hidden />}
                title={t.settings.cloudPhotos}
                desc={t.settings.cloudPhotosDesc}
                control={<Toggle label={t.settings.cloudPhotos} checked={s.cloudPhotos} onChange={(v) => update({ cloudPhotos: v })} testId="toggle-cloud-photos" />}
              />
              <SettingRow
                icon={<MessageCircleQuestion size={20} aria-hidden />}
                title={t.settings.cloudHints}
                desc={t.settings.cloudHintsDesc}
                control={<Toggle label={t.settings.cloudHints} checked={s.cloudHints} onChange={(v) => update({ cloudHints: v })} testId="toggle-cloud-hints" />}
              />
              <div className="pt-2">
                <LinkRow icon={<Cpu size={20} aria-hidden />} title={t.settings.aiInfo} desc={t.settings.aiInfoDesc} to="/profile/ai" testId="open-ai-info" />
              </div>
            </div>
          </Card>

          <Card aria-labelledby="data">
            <h2 id="data" className="mb-1 font-display text-sm font-extrabold uppercase tracking-wider text-ink-muted">
              {t.profile.sections.data}
            </h2>
            <button
              type="button"
              onClick={() => {
                setDeleteError(null)
                setConfirmDelete(true)
              }}
              className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-[16px] px-2 py-3 text-left hover:bg-danger-50"
              data-testid="delete-all"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-danger-50 text-danger">
                <Trash2 size={20} aria-hidden />
              </span>
              <span>
                <span className="block font-display text-[16px] font-extrabold text-danger">{t.settings.deleteAll}</span>
                <span className="block text-sm text-ink-muted">{t.settings.deleteAllDesc}</span>
              </span>
            </button>
          </Card>
        </div>
      </div>

      <EditProfileSheet open={editing} onClose={() => setEditing(false)} />

      <Sheet open={privacyOpen} onClose={() => setPrivacyOpen(false)} title={t.privacy.title} testId="privacy-sheet">
        <ul className="flex flex-col gap-3 pb-2">
          {t.privacy.items.map((it) => (
            <li key={it.t} className="rounded-[18px] bg-cloud p-3.5">
              <p className="font-display text-[16px] font-extrabold">{it.t}</p>
              <p className="mt-0.5 text-sm text-ink-soft">{it.d}</p>
            </li>
          ))}
        </ul>
        <p className="flex gap-4 pb-2 text-[14px] font-bold">
          <Link to="/privacy" className="text-primary underline" data-testid="link-privacy">
            {t.legal.privacyTitle}
          </Link>
          <Link to="/terms" className="text-primary underline" data-testid="link-terms">
            {t.legal.termsTitle}
          </Link>
        </p>
      </Sheet>

      <Sheet
        open={confirmDelete}
        onClose={() => !deleting && setConfirmDelete(false)}
        title={t.settings.deleteTitle}
        description={t.settings.deleteBody}
        testId="delete-sheet"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={deleting} data-autofocus>
              {t.settings.deleteNo}
            </Button>
            <Button
              variant="danger"
              disabled={deleting}
              icon={deleting ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Trash2 size={18} aria-hidden />}
              onClick={async () => {
                setDeleting(true)
                const r = await deleteEverything()
                setDeleting(false)
                if (!r.ok) {
                  setDeleteError(t.account.errors[r.code ?? 'unknown'])
                  return
                }
                playSfx('remove-block')
                setConfirmDelete(false)
                navigate('/welcome', { replace: true })
              }}
              data-testid="confirm-delete"
            >
              {deleting ? t.settings.deleting : t.settings.deleteYes}
            </Button>
          </div>
        }
      >
        {deleteError ? (
          <p className="rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger" role="alert">
            {deleteError}
          </p>
        ) : (
          <span />
        )}
      </Sheet>
    </div>
  )
}

function EditProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const profile = useProfile()
  const [name, setName] = useState(profile?.name ?? '')
  const [birth, setBirth] = useState(profile?.birthDate ?? '')
  const [gender, setGender] = useState<Gender | null>(profile?.gender ?? null)
  const [tried, setTried] = useState(false)
  const [lastOpen, setLastOpen] = useState(open)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setName(profile?.name ?? '')
      setBirth(profile?.birthDate ?? '')
      setGender(profile?.gender ?? null)
      setTried(false)
    }
  }
  const nameCheck = checkName(name)
  const birthCheck = birth ? checkBirthDate(birth) : 'ok'

  const save = () => {
    if (!profile) return
    if (nameCheck !== 'ok' || birthCheck !== 'ok') {
      setTried(true)
      playSfx('error')
      return
    }
    profileStore.set({
      ...profile,
      name: cleanName(name),
      birthDate: birth || profile.birthDate,
      gender,
      ageGroup: birth ? ageGroupFor(birth) : profile.ageGroup,
    })
    playSfx('select')
    showToast({ kind: 'success', title: t.profile.saved })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t.profile.editTitle}
      testId="edit-profile-sheet"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button onClick={save} data-testid="save-profile">
            {t.common.save}
          </Button>
        </div>
      }
    >
      <form
        className="flex flex-col gap-4 pb-2"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
        noValidate
      >
        <label className="flex flex-col gap-1.5">
          <span className="font-display text-sm font-extrabold text-ink-muted">{t.welcome.name.label}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, NAME_MAX + 4))}
            autoComplete="off"
            aria-invalid={tried && nameCheck !== 'ok'}
            className={`h-14 rounded-[16px] border-2 bg-white px-4 font-display text-xl font-extrabold outline-none focus:border-primary ${tried && nameCheck !== 'ok' ? 'border-danger' : 'border-line'}`}
            data-testid="edit-name"
          />
          {tried && nameCheck !== 'ok' && <span className="text-sm font-bold text-danger">{t.welcome.name.errors[nameCheck]}</span>}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-display text-sm font-extrabold text-ink-muted">{t.welcome.birthday.label}</span>
          <input
            type="date"
            value={birth}
            max={todayISO()}
            min="1915-01-01"
            onChange={(e) => setBirth(e.target.value)}
            aria-invalid={tried && birthCheck !== 'ok'}
            className={`h-14 rounded-[16px] border-2 bg-white px-4 font-display text-lg font-extrabold outline-none focus:border-primary ${tried && birthCheck !== 'ok' ? 'border-danger' : 'border-line'}`}
          />
          <span className={`text-sm ${tried && birthCheck !== 'ok' ? 'font-bold text-danger' : 'text-ink-muted'}`}>
            {tried && birthCheck !== 'ok' ? t.welcome.birthday.errors[birthCheck] : t.welcome.birthday.helper}
          </span>
        </label>
        <fieldset>
          <legend className="mb-1.5 font-display text-sm font-extrabold text-ink-muted">{t.welcome.gender.title}</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {([
              ['male', t.welcome.gender.male],
              ['female', t.welcome.gender.female],
              [null, t.welcome.gender.skip],
            ] as const).map(([g, label]) => (
              <button
                key={String(g)}
                type="button"
                role="radio"
                aria-checked={gender === g}
                onClick={() => {
                  setGender(g)
                  playSfx('toggle')
                }}
                className={`flex h-12 items-center justify-center gap-1.5 rounded-[14px] border-2 text-sm font-extrabold ${gender === g ? 'border-primary bg-primary-50 text-primary' : 'border-line text-ink-soft'}`}
              >
                {g && <UserRound size={16} aria-hidden />}
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      </form>
    </Sheet>
  )
}
