import { ArrowLeft, ArrowUp, Camera, CornerUpLeft, CornerUpRight, Printer, Repeat2, Sun, UserX } from 'lucide-react'
import { Link } from 'react-router'
import { playSfx } from '../app/hooks'
import { Button } from '../components/Button'
import { useT } from '../i18n'

const ICONS = [
  { Icon: ArrowUp, tone: 'bg-primary text-white' },
  { Icon: CornerUpLeft, tone: 'bg-orange text-ink' },
  { Icon: CornerUpRight, tone: 'bg-orange text-ink' },
  { Icon: Repeat2, tone: 'bg-mint text-ink' },
]

export default function LearnPage() {
  const t = useT()
  const L = t.learn
  return (
    <div className="mx-auto flex w-full max-w-[1300px] flex-col gap-5 px-4 pb-6 md:px-6 lg:gap-6 lg:px-8 lg:pt-8 print:max-w-none print:p-0">
      <header className="pt-safe-16 max-w-3xl lg:pt-0 print:hidden">
        <Link to="/profile" className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-extrabold text-ink-soft hover:bg-primary-50 lg:hidden" onClick={() => playSfx('nav')}>
          <ArrowLeft size={18} aria-hidden /> {t.profile.title}
        </Link>
        <p className="mt-2 font-display text-sm font-extrabold uppercase tracking-[0.14em] text-orange-600">{L.eyebrow}</p>
        <h1 className="mt-1 text-[30px] font-black leading-tight lg:text-[44px]">{L.title}</h1>
        <p className="mt-2 text-[16px] text-ink-soft lg:text-lg">{L.intro}</p>
      </header>

      <section aria-labelledby="blocks-title" className="print:hidden">
        <h2 id="blocks-title" className="mb-3 text-2xl font-black">
          {L.blocksTitle}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {L.symbols.map((s, i) => {
            const { Icon, tone } = ICONS[i]
            return (
              <li key={s.name} className="rounded-[24px] border border-line/60 bg-white p-4 shadow-[var(--shadow-soft)] lg:p-5">
                <span className={`grid h-12 w-12 place-items-center rounded-[14px] ${tone}`}>
                  <Icon size={24} strokeWidth={2.8} aria-hidden />
                </span>
                <h3 className="mt-3 text-xl font-black">{s.name}</h3>
                <p className="mt-1 text-[15px] text-ink-soft">{s.desc}</p>
                <p className="mt-3 rounded-xl bg-cream px-3 py-2 text-sm text-ink">
                  <b>{L.onPaper}:</b> {s.paper}
                </p>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-6">
        <div className="rounded-[26px] border border-line/60 bg-white p-5 shadow-[var(--shadow-soft)] lg:p-7 print:hidden">
          <h2 className="text-2xl font-black">{L.photoTitle}</h2>
          <ul className="mt-4 space-y-3 text-[15px] text-ink-soft">
            {L.photoTips.map((tip, i) => {
              const Icon = [Camera, Sun, UserX][i]
              const c = ['text-primary', 'text-orange-600', 'text-danger'][i]
              return (
                <li key={tip} className="flex gap-3">
                  <Icon className={`shrink-0 ${c}`} aria-hidden /> {tip}
                </li>
              )
            })}
          </ul>
          <p className="mt-4 text-sm text-ink-muted">{L.photoNote}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => window.print()} icon={<Printer size={18} aria-hidden />}>
              {L.print}
            </Button>
            <Link to="/play/first-steps" className="inline-flex h-12 items-center rounded-[14px] px-4 font-display font-extrabold text-primary hover:bg-primary-50" onClick={() => playSfx('select')}>
              {L.start}
            </Link>
          </div>
        </div>

        <article className="rounded-[26px] border-2 border-dashed border-line bg-white p-6 lg:p-8 print:rounded-none print:border-0 print:p-8" aria-label={L.sheetAria}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black">{L.sheetTitle}</h2>
            <img src="/assets/pencilloop-icon-192.png" alt="" width={44} height={44} className="rounded-xl" />
          </div>
          <p className="mt-1 text-sm text-ink-muted">{L.sheetHelp}</p>
          <ol className="mt-5 space-y-3">
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i} className="flex items-end gap-3">
                <span className="w-6 font-display text-lg font-black text-ink-muted">{i + 1}</span>
                <span className="h-9 flex-1 border-b-2 border-line" />
              </li>
            ))}
          </ol>
          <div className="mt-6 rounded-[16px] bg-cream p-4 text-sm text-ink-soft">
            <p className="font-bold text-ink">{L.example}</p>
            <p className="mt-1 flex flex-wrap items-center gap-3 font-mono">
              <span className="inline-flex items-center gap-1">
                1 <ArrowUp size={15} aria-hidden /> 3
              </span>
              <span className="inline-flex items-center gap-1">
                2 <CornerUpLeft size={15} aria-hidden />
              </span>
              <span className="inline-flex items-center gap-1">
                3 <ArrowUp size={15} aria-hidden /> 3
              </span>
            </p>
          </div>
        </article>
      </section>
    </div>
  )
}
