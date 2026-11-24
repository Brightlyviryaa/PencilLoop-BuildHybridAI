import { devicePrefsStore } from '../../app/devicePrefs'
import { sfx } from '../audio/sfx'
import type { Lang } from '../progress/store'

/**
 * Voice guidance with the browser's Web Speech API (speechSynthesis).
 *
 * - Only speaks after a user gesture (autoplay policy); callers start it from a click.
 * - Picks a voice that really matches the language (id-ID / en-*). If the device
 *   has none, it reports "unavailable" and the UI keeps the text transcript.
 * - Lowers sound effects while speaking so blips never cover a sentence.
 */
export type SpeakResult = 'spoken' | 'unavailable' | 'blocked' | 'muted' | 'interrupted'

const LOCALES: Record<Lang, string[]> = { id: ['id-ID', 'id', 'in-ID'], en: ['en-US', 'en-GB', 'en-AU', 'en'] }

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
}

let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const s = synth()
  if (!s) return Promise.resolve([])
  if (voicesReady) return voicesReady
  voicesReady = new Promise((resolve) => {
    const now = s.getVoices()
    if (now.length) return resolve(now)
    const done = () => resolve(s.getVoices())
    s.addEventListener?.('voiceschanged', done, { once: true })
    setTimeout(done, 1500)
  })
  return voicesReady
}

/** Best voice for a language, preferring local (offline) voices. */
export async function voiceFor(lang: Lang): Promise<SpeechSynthesisVoice | null> {
  const voices = await loadVoices()
  const norm = (l: string) => l.toLowerCase().replace('_', '-')
  const want = LOCALES[lang].map(norm)
  const base = lang === 'id' ? ['id', 'in'] : ['en']
  const exact = voices.filter((v) => want.includes(norm(v.lang)))
  const pool = exact.length ? exact : voices.filter((v) => base.includes(norm(v.lang).split('-')[0]))
  return pool.find((v) => v.localService) ?? pool[0] ?? null
}

export function voiceSupported(): boolean {
  return synth() !== null
}

let current: SpeechSynthesisUtterance | null = null

export function stopSpeaking() {
  const s = synth()
  current = null
  sfx.duck(false)
  s?.cancel()
}

export async function speak(text: string, lang: Lang): Promise<SpeakResult> {
  const s = synth()
  const prefs = devicePrefsStore.get()
  if (!prefs.voice) return 'muted'
  if (!s) return 'unavailable'
  const voice = await voiceFor(lang)
  if (!voice) return 'unavailable'
  s.cancel()
  return new Promise<SpeakResult>((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.voice = voice
    u.lang = voice.lang
    u.rate = lang === 'id' ? 0.95 : 0.98
    u.pitch = 1.15
    u.volume = prefs.voiceVolume
    current = u
    sfx.duck(true)
    const finish = (r: SpeakResult) => {
      if (current === u) {
        current = null
        sfx.duck(false)
      }
      resolve(r)
    }
    u.onend = () => finish('spoken')
    u.onerror = (e) => finish(e.error === 'not-allowed' ? 'blocked' : e.error === 'interrupted' || e.error === 'canceled' ? 'interrupted' : 'unavailable')
    s.speak(u)
  })
}
