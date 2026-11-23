import { AnimatePresence, motion } from 'motion/react'
import {
  AlertTriangle,
  Camera,
  Check,
  Cloud,
  Cpu,
  ImagePlus,
  Loader2,
  PencilLine,
  RotateCw,
  ShieldCheck,
  UserX,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { playSfx, useReducedMotionPref } from '../../app/hooks'
import { SourceBadge } from '../../components/AIBadges'
import { Button } from '../../components/Button'
import { Sheet } from '../../components/Sheet'
import { aiStore, isLocalPreparable, isLocalReady, useAI } from '../ai/aiStore'
import { AIUnavailableError, scanPlanImage, type ActualSource, type Routing } from '../ai/hybrid'
import { decideRouting } from '../ai/routing'
import { CommandPalette } from '../editor/CommandPalette'
import { ProgramList } from '../editor/ProgramList'
import {
  createNode,
  depthOf,
  fromCommands,
  insertNode,
  removeNode,
  setList,
  shiftNode,
  toCommands,
  updateNode,
  type EditorNode,
  type ListTarget,
} from '../editor/ast'
import { LIMITS } from '../maze/limits'
import type { Command, Mission } from '../maze/types'
import { countNodes } from '../maze/validate'
import { useSettings } from '../progress/store'
import { DUR, EASE_OUT } from '../../styles/motion'
import { ImageError, prepareImage, releaseImage, type PreparedImage } from './image'
import { useLang, useT, type Dict } from '../../i18n'

type Step =
  | { kind: 'pick' }
  | { kind: 'review' }
  | { kind: 'consent'; canPrepareLocal: boolean; canUseCloud: boolean }
  | { kind: 'unavailable'; reason: 'unconfigured' | 'offline' }
  | { kind: 'scanning'; routing: Routing }
  | { kind: 'result'; source: ActualSource; latencyMs: number; warnings: string[]; needsReview: boolean }
  | { kind: 'error'; message: string; canRetryCloud: boolean }

interface Props {
  open: boolean
  onClose: () => void
  mission: Mission
  onApply: (cmds: Command[]) => void
}

export function ScanSheet({ open, onClose, mission, onApply }: Props) {
  const ai = useAI()
  const t = useT()
  const lang = useLang()
  const [settings] = useSettings()
  const reduced = useReducedMotionPref()
  const [step, setStep] = useState<Step>({ kind: 'pick' })
  const [image, setImage] = useState<PreparedImage | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0)
  const [busyImage, setBusyImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [nodes, setNodes] = useState<EditorNode[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [target, setTarget] = useState<ListTarget>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const alive = useRef(true)
  const imageRef = useRef<PreparedImage | null>(null)
  useEffect(() => {
    imageRef.current = image
  }, [image])

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      releaseImage(imageRef.current)
    }
  }, [])

  // Drop the photo from memory as soon as the sheet closes. (The parent
  // remounts this component for every new scan session, resetting all state.)
  useEffect(() => {
    if (!open) releaseImage(imageRef.current)
  }, [open])

  const load = useCallback(async (f: File, rot: 0 | 90 | 180 | 270) => {
    setBusyImage(true)
    setImageError(null)
    try {
      const prepared = await prepareImage(f, rot)
      if (!alive.current) return releaseImage(prepared)
      setImage((old) => {
        releaseImage(old)
        return prepared
      })
      setStep({ kind: 'review' })
    } catch (e) {
      setImageError(e instanceof ImageError ? t.scan.imageErrors[e.code] : t.scan.imageErrors.generic)
    } finally {
      setBusyImage(false)
    }
  }, [t])

  const onFile = (f: File | undefined) => {
    if (!f) return
    setFile(f)
    setRotation(0)
    void load(f, 0)
  }

  const runScan = useCallback(
    async (routing: Routing) => {
      if (!image) return
      setStep({ kind: 'scanning', routing })
      aiStore.markBusy()
      try {
        const res = await scanPlanImage({ base64: image.base64, mimeType: image.mimeType }, routing, lang)
        aiStore.markResult(res.meta.source, res.meta.latencyMs)
        if (!alive.current) return
        setNodes(fromCommands(res.commands))
        // The photo is no longer needed once commands exist — drop it.
        releaseImage(image)
        setImage(null)
        setStep({ kind: 'result', source: res.meta.source, latencyMs: res.meta.latencyMs, warnings: res.warnings, needsReview: res.needsReview })
        playSfx('scan-success')
      } catch (e) {
        const err = e instanceof AIUnavailableError ? e : new AIUnavailableError('unknown', 'Something went wrong.')
        aiStore.markError(err.message)
        if (!alive.current) return
        playSfx('error')
        setStep({
          kind: 'error',
          message: t.scan.errors[err.kind],
          canRetryCloud: routing === 'local-only' && ai.online && ai.configured,
        })
      }
    },
    [image, ai.online, ai.configured, lang, t],
  )

  const start = useCallback(
    (cloudConsent: boolean) => {
      const d = decideRouting({
        configured: ai.configured,
        online: ai.online,
        localReady: isLocalReady(ai, 'scan'),
        localPreparable: isLocalPreparable(ai, 'scan'),
        cloudConsent,
      })
      if (d.action === 'run') void runScan(d.routing)
      else if (d.action === 'needs-choice') setStep({ kind: 'consent', canPrepareLocal: d.canPrepareLocal, canUseCloud: d.canUseCloud })
      else setStep({ kind: 'unavailable', reason: d.reason })
    },
    [ai, runScan],
  )

  const willUse = (() => {
    if (isLocalReady(ai, 'scan')) return settings.cloudPhotos ? 'local-then-cloud' : 'local'
    return settings.cloudPhotos ? 'cloud' : 'ask'
  })()

  const nodeCount = countNodes(toCommands(nodes))
  const title =
    step.kind === 'result' ? (step.needsReview ? t.scan.titleReview : t.scan.titleResult) : step.kind === 'consent' ? t.scan.titleConsent : t.scan.title

  const footer = (() => {
    if (step.kind === 'review')
      return (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setStep({ kind: 'pick' })}>
            {t.scan.chooseAnother}
          </Button>
          <Button variant="primary" size="lg" onClick={() => start(settings.cloudPhotos)} data-autofocus data-testid="read-plan" icon={<Check size={20} aria-hidden />}>
            {t.scan.read}
          </Button>
        </div>
      )
    if (step.kind === 'result')
      return (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setStep({ kind: 'pick' })}>
            {t.scan.scanAgain}
          </Button>
          <Button
            variant="primary"
            size="lg"
            disabled={nodes.length === 0}
            onClick={() => {
              onApply(toCommands(nodes))
              onClose()
            }}
            data-testid="use-steps"
            icon={<Check size={20} aria-hidden />}
          >
            {t.scan.use}
          </Button>
        </div>
      )
    return undefined
  })()

  return (
    <Sheet open={open} onClose={onClose} title={title} size="lg" mobileHeight="full" footer={footer} testId="scan-sheet">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step.kind}
          initial={reduced ? false : { opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, x: -12 }}
          transition={{ duration: DUR.reveal, ease: EASE_OUT }}
          className="flex flex-col gap-4 pb-2"
        >
          {step.kind === 'pick' && (
            <>
              <p className="text-[16px] text-ink-soft">
                {t.scan.intro}
              </p>
              <div className="flex items-start gap-3 rounded-[18px] bg-orange-50 p-3.5 text-[14px] text-ink-soft">
                <UserX size={20} className="mt-0.5 shrink-0 text-orange-600" aria-hidden />
                <span>
                  <b className="text-ink">{t.scan.noFaces}</b> {t.scan.noFacesBody}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {ai.mobile && (
                  <Button size="xl" variant="primary" onClick={() => cameraRef.current?.click()} icon={<Camera size={24} aria-hidden />} disabled={busyImage}>
                    {t.scan.takePhoto}
                  </Button>
                )}
                <Button
                  size="xl"
                  variant={ai.mobile ? 'secondary' : 'primary'}
                  onClick={() => galleryRef.current?.click()}
                  icon={busyImage ? <Loader2 size={24} className="animate-spin" aria-hidden /> : <ImagePlus size={24} aria-hidden />}
                  disabled={busyImage}
                  data-testid="choose-picture"
                >
                  {busyImage ? t.scan.opening : t.scan.choose}
                </Button>
              </div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => onFile(e.target.files?.[0])} />
              <input
                ref={galleryRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                data-testid="scan-file-input"
                onChange={(e) => {
                  onFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              {imageError && (
                <p className="flex items-center gap-2 rounded-xl bg-danger-50 px-3 py-2 text-sm font-semibold text-danger" role="alert">
                  <AlertTriangle size={16} aria-hidden /> {imageError}
                </p>
              )}
              <PrivacyRow mode={willUse} t={t} />
            </>
          )}

          {step.kind === 'review' && image && (
            <>
              <div className="relative overflow-hidden rounded-[20px] border border-line bg-cloud">
                <img src={image.previewUrl} alt={t.scan.previewAlt} className="mx-auto max-h-[46dvh] w-auto object-contain" />
                <div className="absolute right-2 top-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (!file) return
                      const r = ((rotation + 90) % 360) as 0 | 90 | 180 | 270
                      setRotation(r)
                      void load(file, r)
                    }}
                    icon={<RotateCw size={16} aria-hidden />}
                    disabled={busyImage}
                  >
                    {t.scan.rotate}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-ink-muted">
                {t.scan.notSentYet(Math.round(image.bytes / 1024), image.width, image.height)}
              </p>
              <PrivacyRow mode={willUse} t={t} />
            </>
          )}

          {step.kind === 'consent' && (
            <>
              {step.canUseCloud && (
                <div className="rounded-[20px] border-2 border-primary/30 bg-primary-50 p-4">
                  <p className="flex items-center gap-2 font-display text-lg font-extrabold">
                    <Cloud size={20} className="text-primary" aria-hidden /> {t.scan.consentTitle}
                  </p>
                  <p className="mt-1.5 text-[15px] text-ink-soft">{t.scan.consentBody}</p>
                </div>
              )}
              {!step.canUseCloud && (
                <p className="rounded-[18px] bg-orange-50 p-3.5 text-[15px] text-ink-soft">{t.scan.offlineNote}</p>
              )}
              {(ai.prep === 'preparing' || ai.localImage === 'downloading') && (
                <p className="flex items-start gap-2 rounded-[18px] bg-mint-50 p-3.5 text-[15px] text-mint-700">
                  <Cpu size={18} className="mt-0.5 shrink-0" aria-hidden /> {t.scan.preparingNote}
                </p>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="secondary" onClick={onClose} icon={<PencilLine size={18} aria-hidden />}>
                  {t.scan.byHand}
                </Button>
                {step.canUseCloud && (
                  <Button variant="primary" onClick={() => void runScan('prefer-local')} icon={<Cloud size={18} aria-hidden />} data-testid="allow-cloud-once">
                    {t.scan.allowOnce}
                  </Button>
                )}
              </div>
              <p className="text-xs text-ink-muted">{t.scan.changeLater}</p>
            </>
          )}

          {step.kind === 'unavailable' && (
            <div className="rounded-[20px] bg-cloud p-4">
              <p className="font-display text-lg font-extrabold">
                {step.reason === 'unconfigured' ? t.scan.unconfiguredTitle : t.scan.offlineTitle}
              </p>
              <p className="mt-1.5 text-[15px] text-ink-soft">
                {step.reason === 'unconfigured' ? t.scan.unconfiguredBody : t.scan.offlineBody}
              </p>
              <Button className="mt-3" variant="primary" onClick={onClose} icon={<PencilLine size={18} aria-hidden />}>
                {t.scan.buildByHand}
              </Button>
            </div>
          )}

          {step.kind === 'scanning' && (
            <div className="flex flex-col gap-4" role="status" aria-live="polite">
              {image && (
                <div className="relative overflow-hidden rounded-[20px] border border-line">
                  <img src={image.previewUrl} alt="" className="mx-auto max-h-[36dvh] w-auto object-contain opacity-60" />
                  {!reduced && (
                    <motion.div
                      className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-primary/25 to-transparent"
                      initial={{ top: '-15%' }}
                      animate={{ top: ['-15%', '100%'] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                      aria-hidden
                    />
                  )}
                </div>
              )}
              <p className="flex items-center gap-2 font-display text-lg font-extrabold">
                <Loader2 size={20} className="animate-spin text-primary motion-reduce:animate-none" aria-hidden />
                {t.scan.reading}
              </p>
              <div className="space-y-2" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-[16px] bg-primary-50 motion-reduce:animate-none" style={{ animationDelay: `${i * 120}ms` }} />
                ))}
              </div>
            </div>
          )}

          {step.kind === 'result' && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <SourceBadge source={step.source} latencyMs={step.latencyMs} />
                <span className="text-sm text-ink-muted">{t.scan.removed}</span>
              </div>
              {step.warnings.length > 0 && (
                <ul className="space-y-1 rounded-[16px] bg-orange-50 p-3 text-sm text-ink-soft">
                  {step.warnings.map((w) => (
                    <li key={w} className="flex gap-2">
                      <AlertTriangle size={15} className="mt-0.5 shrink-0 text-orange-600" aria-hidden /> {w}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[15px] text-ink-soft">{t.scan.review}</p>
              <CommandPalette
                allowRepeat={mission.allowRepeat}
                compact
                disabled={nodeCount >= LIMITS.maxNodes}
                repeatBlocked={depthOf(nodes, target) >= LIMITS.maxRepeatDepth}
                onAdd={(b) => {
                  const n = createNode(b)
                  setNodes((prev) => insertNode(prev, n, target))
                  playSfx('add-block')
                }}
              />
              <ProgramList
                nodes={nodes}
                selectedId={selected}
                onSelect={setSelected}
                target={target}
                onTarget={setTarget}
                activeIds={new Set()}
                failedId={null}
                onPatch={(id, p) => setNodes((n) => updateNode(n, id, p))}
                onRemove={(id) => {
                  setNodes((n) => removeNode(n, id))
                  playSfx('remove-block')
                }}
                onShift={(id, d) => setNodes((n) => shiftNode(n, id, d))}
                onReorder={(list, items) => setNodes((n) => setList(n, list, items))}
                reduced={reduced}
              />
              {!mission.allowRepeat && nodes.some((n) => n.type === 'repeat') && (
                <p className="text-sm text-orange-600">{t.scan.repeatLocked}</p>
              )}
            </>
          )}

          {step.kind === 'error' && (
            <div className="rounded-[20px] border border-danger/30 bg-danger-50 p-4" role="alert">
              <p className="flex items-center gap-2 font-display text-lg font-extrabold">
                <AlertTriangle size={20} className="text-danger" aria-hidden /> {t.scan.errorTitle}
              </p>
              <p className="mt-1.5 text-[15px] text-ink-soft">{step.message}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {image && (
                  <Button variant="secondary" onClick={() => start(settings.cloudPhotos)}>
                    {t.scan.tryAgain}
                  </Button>
                )}
                {image && step.canRetryCloud && (
                  <Button variant="soft" onClick={() => setStep({ kind: 'consent', canPrepareLocal: false, canUseCloud: true })} icon={<Cloud size={18} aria-hidden />}>
                    {t.scan.useCloud}
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setStep({ kind: 'pick' })}>
                  {t.scan.newPhoto}
                </Button>
                <Button variant="primary" onClick={onClose} icon={<PencilLine size={18} aria-hidden />}>
                  {t.scan.buildByHand}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Sheet>
  )
}

function PrivacyRow({ mode, t }: { mode: 'local' | 'local-then-cloud' | 'cloud' | 'ask'; t: Dict }) {
  return (
    <p className="flex items-start gap-2 text-sm text-ink-muted" data-testid="privacy-row" data-mode={mode}>
      <ShieldCheck size={17} className="mt-0.5 shrink-0 text-mint-700" aria-hidden />
      {t.scan.privacy[mode]}
    </p>
  )
}
