import { motion } from 'motion/react'
import { Camera, ImagePlus, Loader2, PencilLine, RotateCcw, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { playSfx } from '../../app/hooks'
import { Button } from '../../components/Button'
import { useT } from '../../i18n'
import { cameraSupported } from './camera'

type CamState = { kind: 'starting' } | { kind: 'live' } | { kind: 'captured'; url: string; blob: Blob } | { kind: 'error'; reason: 'denied' | 'unavailable' | 'unsupported' }


/**
 * In-app camera: live preview with a framing guide, a big shutter, then a
 * preview with Retake / Use this photo. The stream is stopped whenever the
 * component unmounts, a photo is taken, or the tab is hidden, so the camera
 * never stays on in the background. The photo stays in memory only.
 */
export function CameraCapture({ onUse, onClose, onChoose, onManual, reduced }: { onUse: (file: File) => void; onClose: () => void; onChoose: () => void; onManual?: () => void; reduced: boolean }) {
  const t = useT()
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [state, setState] = useState<CamState>(() => (cameraSupported() ? { kind: 'starting' } : { kind: 'error', reason: 'unsupported' }))
  const [flash, setFlash] = useState(false)
  const capturedRef = useRef(false)
  useEffect(() => {
    capturedRef.current = state.kind === 'captured'
  }, [state.kind])

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((tr) => tr.stop())
    stream.current = null
  }, [])

  /** Opens the stream. Only sets state after the browser answers. */
  const open = useCallback(async () => {
    stop()
    if (!cameraSupported()) return
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } },
        audio: false,
      })
      stream.current = s
      if (video.current) {
        video.current.srcObject = s
        await video.current.play().catch(() => undefined)
      }
      setState({ kind: 'live' })
    } catch (e) {
      const name = (e as DOMException)?.name
      setState({ kind: 'error', reason: name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'NotReadableError' ? 'unavailable' : 'unsupported' })
    }
  }, [stop])

  const retake = () => {
    setState({ kind: 'starting' })
    void open()
  }

  // Syncing with an external system (the camera): state changes only after the browser answers.
  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    void open()
    const onHide = () => {
      if (document.hidden) stop()
      // Coming back to the tab: reopen the camera unless a photo is already taken.
      else if (!stream.current && !capturedRef.current) void open()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      stop()
    }
  }, [open, stop])

  // Revoke preview URLs we created.
  useEffect(() => () => {
    if (state.kind === 'captured') URL.revokeObjectURL(state.url)
  }, [state])

  const shoot = () => {
    const v = video.current
    if (!v || !v.videoWidth) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d')?.drawImage(v, 0, 0)
    playSfx('select')
    if (!reduced) {
      setFlash(true)
      setTimeout(() => setFlash(false), 180)
    }
    c.toBlob(
      (blob) => {
        if (!blob) return
        stop()
        setState({ kind: 'captured', blob, url: URL.createObjectURL(blob) })
      },
      'image/jpeg',
      0.9,
    )
  }

  if (state.kind === 'error')
    return (
      <div className="flex flex-col gap-3" data-testid="camera-error" data-reason={state.reason}>
        <p className="rounded-[16px] bg-orange-50 px-4 py-3 text-[15px] font-semibold text-ink-soft" role="alert">
          {t.scan.camera[state.reason]}
        </p>
        <Button size="lg" block onClick={onChoose} icon={<ImagePlus size={20} aria-hidden />}>
          {t.scan.camera.choose}
        </Button>
        {onManual && (
          <Button size="lg" variant="secondary" block onClick={onManual} icon={<PencilLine size={20} aria-hidden />}>
            {t.scan.camera.manual}
          </Button>
        )}
        <Button size="md" variant="ghost" block onClick={onClose}>
          {t.scan.camera.close}
        </Button>
      </div>
    )

  return (
    <div className="flex flex-col gap-3" data-testid="camera">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[24px] bg-ink sm:aspect-[4/3]">
        {state.kind === 'captured' ? (
          <img src={state.url} alt={t.scan.camera.preview} className="h-full w-full object-contain" />
        ) : (
          <video ref={video} playsInline muted autoPlay className="h-full w-full object-cover" aria-label={t.scan.camera.frame} />
        )}
        {state.kind !== 'captured' && (
          <>
            {/* framing guide */}
            <div className="pointer-events-none absolute inset-[9%] rounded-[18px] border-[3px] border-dashed border-white/85" aria-hidden />
            {(['left-[7%] top-[7%] border-l-4 border-t-4', 'right-[7%] top-[7%] border-r-4 border-t-4', 'left-[7%] bottom-[7%] border-b-4 border-l-4', 'right-[7%] bottom-[7%] border-b-4 border-r-4'] as const).map((c) => (
              <span key={c} className={`pointer-events-none absolute h-8 w-8 rounded-[6px] border-orange ${c}`} aria-hidden />
            ))}
            <p className="absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full bg-ink/70 px-3 py-1.5 text-[13px] font-bold text-white">{t.scan.camera.frame}</p>
          </>
        )}
        {state.kind === 'starting' && (
          <div className="absolute inset-0 grid place-items-center text-white">
            <p className="flex items-center gap-2 font-bold">
              <Loader2 size={18} className="animate-spin" aria-hidden /> {t.scan.camera.starting}
            </p>
          </div>
        )}
        {flash && <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.18 }} aria-hidden />}
        <button type="button" onClick={onClose} className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-ink/60 text-white" aria-label={t.scan.camera.close}>
          <X size={20} aria-hidden />
        </button>
      </div>

      {state.kind === 'captured' ? (
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" variant="secondary" onClick={retake} icon={<RotateCcw size={20} aria-hidden />} data-testid="camera-retake">
            {t.scan.camera.retake}
          </Button>
          <Button size="lg" onClick={() => onUse(new File([state.blob], 'plan.jpg', { type: 'image/jpeg' }))} data-testid="camera-use">
            {t.scan.camera.use}
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-6">
          <button type="button" onClick={onChoose} className="grid h-12 w-12 place-items-center rounded-full bg-white text-ink-soft ring-1 ring-line" aria-label={t.scan.camera.choose}>
            <ImagePlus size={22} aria-hidden />
          </button>
          <motion.button
            type="button"
            onClick={shoot}
            disabled={state.kind !== 'live'}
            whileTap={{ scale: 0.92 }}
            className="grid h-[76px] w-[76px] place-items-center rounded-full bg-white ring-[5px] ring-primary disabled:opacity-40"
            aria-label={t.scan.camera.shutter}
            data-testid="camera-shutter"
          >
            <span className="grid h-[58px] w-[58px] place-items-center rounded-full bg-primary text-white">
              <Camera size={26} aria-hidden />
            </span>
          </motion.button>
          <span className="h-12 w-12" aria-hidden />
        </div>
      )}
    </div>
  )
}
