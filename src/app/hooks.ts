import { useEffect, useState, useSyncExternalStore } from 'react'
import { sfx, type SfxName } from '../features/audio/sfx'
import { settingsStore, useSettings } from '../features/progress/store'

const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null

function useSystemReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      mq?.addEventListener('change', cb)
      return () => mq?.removeEventListener('change', cb)
    },
    () => mq?.matches ?? false,
    () => false,
  )
}

/** True when the child (or their OS) asked for reduced motion. */
export function useReducedMotionPref(): boolean {
  const [s] = useSettings()
  const system = useSystemReducedMotion()
  if (s.motion === 'reduced') return true
  if (s.motion === 'full') return false
  return system
}

export function playSfx(name: SfxName, opts?: { pitch?: number }) {
  if (settingsStore.get().muted) return
  sfx.play(name, opts)
}

/** Unlock audio on the first real user gesture and keep mute in sync. */
export function useAudioLifecycle() {
  const [s] = useSettings()
  useEffect(() => {
    sfx.setMuted(s.muted)
  }, [s.muted])
  useEffect(() => {
    sfx.setVolume(s.volume)
  }, [s.volume])
  useEffect(() => {
    const unlock = () => sfx.unlock()
    window.addEventListener('pointerdown', unlock, { capture: true })
    window.addEventListener('keydown', unlock, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true })
      window.removeEventListener('keydown', unlock, { capture: true })
    }
  }, [])
}

export function useMediaQuery(query: string): boolean {
  const [m, setM] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const mql = window.matchMedia(query)
    const on = () => setM(mql.matches)
    on()
    mql.addEventListener('change', on)
    return () => mql.removeEventListener('change', on)
  }, [query])
  return m
}
