/**
 * Tiny original sound effects synthesised with the Web Audio API.
 * - One shared AudioContext, created lazily on the first real user gesture.
 * - Short envelopes only, no loops; quick repeats are throttled.
 * - Fully silent while muted.
 */
export type SfxName =
  | 'tap'
  | 'add-block'
  | 'remove-block'
  | 'robot-move'
  | 'robot-turn'
  | 'collision'
  | 'scan-success'
  | 'hint'
  | 'victory'
  | 'sheet-open'
  | 'error'
  | 'nav'
  | 'select'
  | 'toggle'
  | 'star'
  | 'achievement'
  | 'unlock'
  | 'whoosh'
  | 'robot-cheer'

type Tone = {
  freq: number
  to?: number
  dur: number
  type?: OscillatorType
  gain?: number
  at?: number
}

const RECIPES: Record<SfxName, Tone[]> = {
  tap: [{ freq: 660, dur: 0.05, type: 'sine', gain: 0.5 }],
  'add-block': [{ freq: 520, to: 780, dur: 0.09, type: 'triangle', gain: 0.6 }],
  'remove-block': [{ freq: 600, to: 360, dur: 0.1, type: 'triangle', gain: 0.55 }],
  'robot-move': [{ freq: 300, to: 260, dur: 0.07, type: 'triangle', gain: 0.55 }],
  'robot-turn': [{ freq: 880, to: 990, dur: 0.05, type: 'sine', gain: 0.35 }],
  collision: [
    { freq: 140, to: 80, dur: 0.16, type: 'sine', gain: 0.9 },
    { freq: 90, dur: 0.08, type: 'triangle', gain: 0.4, at: 0.02 },
  ],
  'scan-success': [
    { freq: 660, dur: 0.1, type: 'sine', gain: 0.5 },
    { freq: 990, dur: 0.16, type: 'sine', gain: 0.5, at: 0.1 },
  ],
  hint: [{ freq: 740, to: 1180, dur: 0.18, type: 'sine', gain: 0.4 }],
  victory: [
    { freq: 523.25, dur: 0.14, type: 'triangle', gain: 0.6 },
    { freq: 659.25, dur: 0.14, type: 'triangle', gain: 0.6, at: 0.13 },
    { freq: 783.99, dur: 0.32, type: 'triangle', gain: 0.65, at: 0.26 },
  ],
  'sheet-open': [{ freq: 420, to: 560, dur: 0.08, type: 'sine', gain: 0.35 }],
  error: [{ freq: 330, to: 280, dur: 0.12, type: 'sine', gain: 0.45 }],
  nav: [{ freq: 560, to: 700, dur: 0.06, type: 'sine', gain: 0.32 }],
  select: [
    { freq: 620, dur: 0.06, type: 'triangle', gain: 0.45 },
    { freq: 930, dur: 0.09, type: 'triangle', gain: 0.4, at: 0.05 },
  ],
  toggle: [{ freq: 760, to: 880, dur: 0.05, type: 'sine', gain: 0.32 }],
  star: [
    { freq: 1046.5, dur: 0.09, type: 'triangle', gain: 0.45 },
    { freq: 1568, dur: 0.14, type: 'sine', gain: 0.3, at: 0.05 },
  ],
  achievement: [
    { freq: 659.25, dur: 0.1, type: 'triangle', gain: 0.5 },
    { freq: 880, dur: 0.1, type: 'triangle', gain: 0.5, at: 0.09 },
    { freq: 1174.66, dur: 0.24, type: 'sine', gain: 0.45, at: 0.18 },
  ],
  unlock: [
    { freq: 392, to: 523.25, dur: 0.12, type: 'triangle', gain: 0.5 },
    { freq: 783.99, dur: 0.2, type: 'sine', gain: 0.4, at: 0.11 },
  ],
  whoosh: [{ freq: 260, to: 520, dur: 0.14, type: 'sine', gain: 0.22 }],
  'robot-cheer': [
    { freq: 880, to: 1320, dur: 0.08, type: 'square', gain: 0.12 },
    { freq: 1320, to: 990, dur: 0.1, type: 'square', gain: 0.1, at: 0.08 },
  ],
}

const MASTER_GAIN = 0.14
const THROTTLE_MS: Partial<Record<SfxName, number>> = { tap: 45, 'robot-move': 60, 'robot-turn': 60, victory: 1500, nav: 80, star: 90, achievement: 400 }

class SfxEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private muted = false
  private unlocked = false
  private last = new Map<SfxName, number>()
  private volume = 0.7

  /** 0..1 on top of the quiet master gain. */
  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v))
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(MASTER_GAIN * this.volume * 1.6, this.ctx.currentTime, 0.02)
  }

  setMuted(m: boolean) {
    this.muted = m
    if (m && this.ctx?.state === 'running') void this.ctx.suspend()
    if (!m && this.ctx?.state === 'suspended' && this.unlocked) void this.ctx.resume()
  }

  /** Call from a user gesture handler. Never creates audio before that. */
  unlock() {
    this.unlocked = true
    if (this.muted) return
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!Ctor) return
        this.ctx = new Ctor()
        this.master = this.ctx.createGain()
        this.master.gain.value = MASTER_GAIN * this.volume * 1.6
        this.master.connect(this.ctx.destination)
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume()
    } catch {
      this.ctx = null
    }
  }

  play(name: SfxName, opts: { pitch?: number } = {}) {
    if (this.muted || !this.unlocked || this.volume <= 0) return
    this.unlock()
    const ctx = this.ctx
    const master = this.master
    if (!ctx || !master || ctx.state !== 'running') return
    const now = performance.now()
    const gap = THROTTLE_MS[name] ?? 30
    if (now - (this.last.get(name) ?? 0) < gap) return
    this.last.set(name, now)

    const t0 = ctx.currentTime + 0.005
    const pitch = opts.pitch ?? 1
    for (const tone of RECIPES[name]) {
      const start = t0 + (tone.at ?? 0)
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = tone.type ?? 'sine'
      osc.frequency.setValueAtTime(tone.freq * pitch, start)
      if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to * pitch, start + tone.dur)
      const peak = tone.gain ?? 0.5
      g.gain.setValueAtTime(0.0001, start)
      g.gain.exponentialRampToValueAtTime(peak, start + 0.012)
      g.gain.exponentialRampToValueAtTime(0.0001, start + tone.dur)
      osc.connect(g).connect(master)
      osc.start(start)
      osc.stop(start + tone.dur + 0.02)
      osc.onended = () => {
        osc.disconnect()
        g.disconnect()
      }
    }
  }
}

export const sfx = new SfxEngine()
