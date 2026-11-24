import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, Loader2, Rocket, ShieldCheck, UserRound } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { playSfx, useReducedMotionPref } from '../app/hooks'
import { Wordmark } from '../components/Brand'
import { Button, IconButton } from '../components/Button'
import { Robot } from '../components/Robot'
import { GoogleG } from '../components/GoogleG'
import { SoundToggle } from '../components/SoundToggle'
import { ensurePlayerAccount, signInWithGoogle } from '../features/account/account'
import { devicePrefsStore } from '../app/devicePrefs'
import { isFirebaseConfigured } from '../features/ai/config'
import { prepareOnDeviceInBackground } from '../features/ai/aiStore'
import { MazeBoard } from '../features/maze/MazeBoard'
import { MISSIONS } from '../features/maze/missions'
import {
  NAME_MAX,
  ageGroupFor,
  checkBirthDate,
  checkName,
  cleanName,
  mayStorePersonalDataInCloud,
  profileStore,
  todayISO,
  type AgeGroup,
  type Gender,
} from '../features/profile/profile'
import { progressStore } from '../features/progress/store'
import { LANG_LABEL, setLang, useLang, useT } from '../i18n'
import { LANGS } from '../features/progress/store'
import { EASE_OUT } from '../styles/motion'

type StepId = 'hello' | 'name' | 'birthday' | 'gender' | 'ready'

interface Restore {
  ageGroup: AgeGroup
  gender: Gender | null
}

export default function WelcomePage() {
  const [initialProfile] = useState(() => profileStore.get())
  if (initialProfile) return <Navigate to="/" replace />
  return <Onboarding />
}

function Onboarding() {
  const t = useT()
  const lang = useLang()
  const navigate = useNavigate()
  const reduced = useReducedMotionPref()
  const [restore, setRestore] = useState<Restore | null>(null)
  const steps: StepId[] = restore ? ['name', 'ready'] : ['hello', 'name', 'birthday', 'gender', 'ready']
  const [i, setI] = useState(0)
  const [dir, setDir] = useState(1)
  const [name, setName] = useState('')
  const [birth, setBirth] = useState('')
  const [gender, setGender] = useState<Gender | null>(null)
  const [tried, setTried] = useState(false)
  const [signing, setSigning] = useState(false)
  const [signError, setSignError] = useState<string | null>(null)
  const [launching, setLaunching] = useState(false)
  const step = steps[Math.min(i, steps.length - 1)]

  const go = (to: number) => {
    setDir(to > i ? 1 : -1)
    setTried(false)
    setI(Math.max(0, Math.min(steps.length - 1, to)))
    playSfx(to > i ? 'nav' : 'tap')
  }

  const nameCheck = checkName(name)
  const birthCheck = checkBirthDate(birth)
  const ageGroup: AgeGroup = restore?.ageGroup ?? (birthCheck === 'ok' ? ageGroupFor(birth) : 'under13')
  const firstName = cleanName(name) || 'Pip'

  const next = (e?: FormEvent) => {
    e?.preventDefault()
    if (step === 'name' && nameCheck !== 'ok') {
      setTried(true)
      playSfx('error')
      return
    }
    if (step === 'birthday' && birthCheck !== 'ok') {
      setTried(true)
      playSfx('error')
      return
    }
    go(i + 1)
  }

  const start = () => {
    // Inside the click handler on purpose: Chrome needs this user activation
    // to start the on-device model download. It runs in the background.
    prepareOnDeviceInBackground()
    playSfx('unlock')
    profileStore.set({
      name: cleanName(name),
      birthDate: restore ? null : birth,
      gender: restore ? restore.gender : gender,
      ageGroup,
      completedAt: Date.now(),
    })
    void ensurePlayerAccount()
    // New players meet Pip in the short tutorial first; returning players go home.
    const target = Object.keys(progressStore.get().levels).length ? '/' : devicePrefsStore.get().tutorialDone ? `/play/${MISSIONS[0].id}` : '/tutorial'
    if (reduced) navigate(target, { replace: true })
    else {
      setLaunching(true)
      setTimeout(() => navigate(target, { replace: true }), 650)
    }
  }

  const signIn = async () => {
    setSigning(true)
    setSignError(null)
    const r = await signInWithGoogle()
    setSigning(false)
    if (!r.ok) {
      if (r.code !== 'cancelled') setSignError(t.account.errors[r.code])
      return
    }
    const u = r.snap?.user
    if (u?.onboardingCompleted) {
      setRestore({ ageGroup: u.ageGroup, gender: u.gender ?? null })
      if (u.displayName) setName(u.displayName)
      setDir(1)
      setI(u.displayName ? 1 : 0)
    } else go(1)
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-cloud lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Illustration panel (desktop) */}
      <aside className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14" aria-hidden>
        <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:26px_26px]" />
        <div className="relative w-fit rounded-2xl bg-white px-3 py-2">
          <Wordmark />
        </div>
        <div className="relative mx-auto flex flex-col items-center">
          <motion.div
            animate={reduced ? undefined : { y: [0, -10, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
            className="relative z-[1] -mb-10"
          >
            <Robot size={150} mood={step === 'ready' ? 'happy' : 'idle'} />
          </motion.div>
          <div className="rounded-[28px] bg-white/95 p-4 shadow-2xl">
            <MazeBoard
              mission={MISSIONS[0]}
              frame={{ robot: { ...MISSIONS[0].start }, tick: 0, kind: 'idle', trail: [{ x: MISSIONS[0].start.x, y: MISSIONS[0].start.y }], mood: 'idle' }}
              size={340}
              reduced
              speed={1}
            />
          </div>
        </div>
        <p className="relative font-display text-3xl font-black text-white xl:text-4xl">{t.brand.tagline}</p>
      </aside>

      {/* Form column */}
      <div className="pt-safe-12 relative mx-auto flex min-h-[100dvh] w-full max-w-[560px] flex-col px-5 pb-[max(20px,env(safe-area-inset-bottom))] lg:max-w-[600px] lg:justify-center lg:px-10">
        <header className="flex h-14 items-center gap-2">
          {i > 0 ? (
            <IconButton label={t.common.back} onClick={() => go(i - 1)} className="-ml-2" data-testid="welcome-back">
              <ArrowLeft size={22} aria-hidden />
            </IconButton>
          ) : (
            <span className="lg:hidden">
              <Wordmark compact />
            </span>
          )}
          <div className="mx-auto flex items-center gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={i + 1} aria-label={t.welcome.stepOf(i + 1, steps.length)}>
            {steps.map((s, j) => (
              <motion.span
                key={s}
                className={`h-2.5 rounded-full ${j <= i ? 'bg-primary' : 'bg-line'}`}
                animate={{ width: j === i ? 28 : 10 }}
                transition={{ type: 'spring', stiffness: 500, damping: 34 }}
              />
            ))}
          </div>
          <SoundToggle />
        </header>

        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.form
            key={step}
            custom={dir}
            onSubmit={next}
            noValidate
            initial={reduced ? false : { opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="flex flex-1 flex-col pt-4 lg:flex-none"
            data-testid={`welcome-step-${step}`}
          >
            {step === 'hello' && (
              <>
                <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                  <motion.div
                    className="lg:hidden"
                    initial={reduced ? false : { scale: 0.6, rotate: -8 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                  >
                    <Robot size={118} />
                  </motion.div>
                  <span className="mt-3 rounded-full bg-orange-50 px-3 py-1 font-display text-sm font-extrabold text-orange-600">{t.welcome.hello.badge}</span>
                  <h1 className="mt-3 text-[40px] font-black leading-[1.05] lg:text-6xl">{t.welcome.hello.title}</h1>
                  <p className="mt-3 max-w-md text-[17px] text-ink-soft">{t.welcome.hello.body}</p>
                </div>
                <fieldset className="mt-7">
                  <legend className="mb-2 font-display text-sm font-extrabold uppercase tracking-wider text-ink-muted">{t.welcome.hello.language}</legend>
                  <div className="grid grid-cols-2 gap-2.5" role="radiogroup">
                    {LANGS.map((l) => (
                      <button
                        key={l}
                        type="button"
                        role="radio"
                        aria-checked={lang === l}
                        onClick={() => {
                          setLang(l)
                          playSfx('select')
                        }}
                        className={`relative flex h-16 items-center justify-center gap-2 rounded-[18px] border-2 font-display text-[17px] font-extrabold transition-colors ${
                          lang === l ? 'border-primary bg-primary-50 text-primary' : 'border-line bg-white text-ink-soft hover:border-primary/40'
                        }`}
                        data-testid={`lang-${l}`}
                      >
                        <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black ${lang === l ? 'bg-primary text-white' : 'bg-cloud text-ink-muted'}`}>
                          {l.toUpperCase()}
                        </span>
                        {LANG_LABEL[l]}
                        {lang === l && (
                          <motion.span layoutId="lang-check" className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-primary text-white shadow">
                            <Check size={13} strokeWidth={3} aria-hidden />
                          </motion.span>
                        )}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <Footer>
                  <Button type="submit" size="xl" block iconRight={<ArrowRight size={22} aria-hidden />} data-testid="welcome-start" data-autofocus>
                    {t.welcome.hello.start}
                  </Button>
                  {isFirebaseConfigured() && (
                    <div className="text-center">
                      <p className="text-sm text-ink-muted">{t.welcome.hello.haveSave}</p>
                      <Button variant="ghost" size="sm" onClick={() => void signIn()} disabled={signing} icon={signing ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <GoogleG />} data-testid="welcome-google">
                        {signing ? t.welcome.hello.signingIn : t.welcome.hello.signIn}
                      </Button>
                      {signError && (
                        <p className="mt-1 text-sm font-semibold text-danger" role="alert">
                          {signError}
                        </p>
                      )}
                    </div>
                  )}
                </Footer>
              </>
            )}

            {step === 'name' && (
              <>
                <Bubble>{restore ? t.welcome.restoredName : t.welcome.name.title}</Bubble>
                <label htmlFor="nick" className="sr-only">
                  {t.welcome.name.label}
                </label>
                <AutoFocusInput
                  id="nick"
                  value={name}
                  onChange={(v) => setName(v.slice(0, NAME_MAX + 4))}
                  placeholder={t.welcome.name.placeholder}
                  invalid={tried && nameCheck !== 'ok'}
                  describedBy="nick-help"
                />
                <FieldHelp id="nick-help" error={tried && nameCheck !== 'ok' ? t.welcome.name.errors[nameCheck as Exclude<typeof nameCheck, 'ok'>] : null}>
                  {t.welcome.name.helper}
                </FieldHelp>
                <Footer>
                  <Button type="submit" size="xl" block iconRight={<ArrowRight size={22} aria-hidden />} data-testid="welcome-next">
                    {t.common.next}
                  </Button>
                </Footer>
              </>
            )}

            {step === 'birthday' && (
              <>
                <Bubble>{t.welcome.birthday.title(firstName)}</Bubble>
                <label htmlFor="bday" className="mb-1.5 font-display text-sm font-extrabold text-ink-muted">
                  {t.welcome.birthday.label}
                </label>
                <input
                  id="bday"
                  type="date"
                  value={birth}
                  max={todayISO()}
                  min="1915-01-01"
                  onChange={(e) => setBirth(e.target.value)}
                  aria-invalid={tried && birthCheck !== 'ok'}
                  aria-describedby="bday-help"
                  className={`h-16 w-full rounded-[18px] border-2 bg-white px-4 font-display text-xl font-extrabold text-ink outline-none transition-colors focus:border-primary ${
                    tried && birthCheck !== 'ok' ? 'border-danger' : 'border-line'
                  }`}
                  data-testid="welcome-birthday"
                />
                <FieldHelp id="bday-help" error={tried && birthCheck !== 'ok' ? t.welcome.birthday.errors[birthCheck as Exclude<typeof birthCheck, 'ok'>] : null}>
                  {t.welcome.birthday.helper}
                </FieldHelp>
                <Footer>
                  <Button type="submit" size="xl" block iconRight={<ArrowRight size={22} aria-hidden />} data-testid="welcome-next">
                    {t.common.next}
                  </Button>
                </Footer>
              </>
            )}

            {step === 'gender' && (
              <>
                <Bubble>{t.welcome.gender.title}</Bubble>
                <div role="radiogroup" aria-label={t.welcome.gender.title} className="grid grid-cols-2 gap-3">
                  {(['male', 'female'] as const).map((g, j) => {
                    const on = gender === g
                    return (
                      <motion.button
                        key={g}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => {
                          setGender(on ? null : g)
                          playSfx('select')
                        }}
                        className={`relative flex flex-col items-center gap-3 rounded-[24px] border-2 px-3 py-6 transition-colors ${
                          on ? 'border-primary bg-primary-50' : 'border-line bg-white hover:border-primary/40'
                        }`}
                        data-testid={`gender-${g}`}
                      >
                        <span className={`grid h-16 w-16 place-items-center rounded-full ${j === 0 ? 'bg-mint-50 text-mint-700' : 'bg-orange-50 text-orange-600'}`}>
                          <UserRound size={34} strokeWidth={2.2} aria-hidden />
                        </span>
                        <span className="font-display text-lg font-extrabold">{g === 'male' ? t.welcome.gender.male : t.welcome.gender.female}</span>
                        {on && (
                          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-primary text-white">
                            <Check size={14} strokeWidth={3} aria-hidden />
                          </motion.span>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
                <p className="mt-3 text-sm text-ink-muted">{t.welcome.gender.helper}</p>
                <Footer>
                  <Button type="submit" size="xl" block iconRight={<ArrowRight size={22} aria-hidden />} data-testid="welcome-next">
                    {t.common.next}
                  </Button>
                  {gender === null && (
                    <Button variant="ghost" onClick={() => go(i + 1)} data-testid="gender-skip">
                      {t.welcome.gender.skip}
                    </Button>
                  )}
                </Footer>
              </>
            )}

            {step === 'ready' && (
              <>
                <div className="flex flex-col items-center text-center">
                  <motion.div
                    initial={reduced ? false : { scale: 0.5, y: 20 }}
                    animate={launching ? { scale: 1.5, y: -260, rotate: -6 } : { scale: 1, y: 0 }}
                    transition={launching ? { duration: 0.6, ease: [0.5, 0, 0.75, 0] } : { type: 'spring', stiffness: 260, damping: 13 }}
                  >
                    <Robot size={120} mood="happy" />
                  </motion.div>
                  <h1 className="mt-3 text-[34px] font-black leading-tight lg:text-5xl">{t.welcome.ready.title(firstName)}</h1>
                  <p className="mt-2 text-[17px] text-ink-soft">{t.welcome.ready.body}</p>
                </div>
                <section className="mt-6 rounded-[22px] border border-line bg-white p-4" aria-labelledby="grownup">
                  <h2 id="grownup" className="flex items-center gap-2 font-display text-[16px] font-extrabold">
                    <ShieldCheck size={19} className="text-mint-700" aria-hidden /> {t.welcome.ready.grownUpTitle}
                  </h2>
                  <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                    {(mayStorePersonalDataInCloud(ageGroup) ? t.welcome.ready.adult : t.welcome.ready.child).map((line) => (
                      <li key={line} className="flex gap-2">
                        <Check size={16} className="mt-0.5 shrink-0 text-mint-700" aria-hidden />
                        {line}
                      </li>
                    ))}
                  </ul>
                </section>
                <Footer>
                  <Button
                    size="xl"
                    variant="orange"
                    block
                    onClick={start}
                    disabled={launching}
                    icon={<Rocket size={22} aria-hidden />}
                    sound={false}
                    data-testid="welcome-finish"
                  >
                    {t.welcome.ready.cta}
                  </Button>
                </Footer>
              </>
            )}
          </motion.form>
        </AnimatePresence>
      </div>

      {/* Launch transition: a soft circle wipe into the game. */}
      <AnimatePresence>
        {launching && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[90] bg-primary"
            initial={{ clipPath: 'circle(0% at 50% 85%)' }}
            animate={{ clipPath: 'circle(150% at 50% 85%)' }}
            transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1], delay: 0.1 }}
            aria-hidden
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function Bubble({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 flex items-end gap-3">
      <Robot size={64} className="shrink-0" />
      <h1 className="relative rounded-[22px] rounded-bl-[6px] bg-white px-4 py-3 text-[24px] font-black leading-tight shadow-[var(--shadow-soft)] lg:text-[28px]">{children}</h1>
    </div>
  )
}

function Footer({ children }: { children: ReactNode }) {
  return <div className="mt-auto flex flex-col gap-2 pt-6 lg:mt-8">{children}</div>
}

function FieldHelp({ id, error, children }: { id: string; error: string | null; children: ReactNode }) {
  return (
    <div id={id} className="mt-2 min-h-[44px]" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        {error ? (
          <motion.p key="e" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: [6, -4, 2, 0] }} exit={{ opacity: 0 }} className="text-sm font-bold text-danger" role="alert">
            {error}
          </motion.p>
        ) : (
          <motion.p key="h" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm text-ink-muted">
            {children}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function AutoFocusInput({
  id,
  value,
  onChange,
  placeholder,
  invalid,
  describedBy,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  invalid: boolean
  describedBy: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const tm = setTimeout(() => ref.current?.focus({ preventScroll: true }), 320)
    return () => clearTimeout(tm)
  }, [])
  return (
    <input
      ref={ref}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      autoCapitalize="words"
      enterKeyHint="next"
      spellCheck={false}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      className={`h-16 w-full rounded-[18px] border-2 bg-white px-5 font-display text-2xl font-extrabold text-ink outline-none transition-colors placeholder:font-bold placeholder:text-ink-muted/50 focus:border-primary ${
        invalid ? 'border-danger' : 'border-line'
      }`}
      data-testid="welcome-name"
    />
  )
}
