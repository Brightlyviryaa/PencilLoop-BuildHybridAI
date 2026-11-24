import { devicePrefsStore } from './devicePrefs'

/** Short vibration on phones that support it, only when the player allows haptics. */
export function haptic(pattern: number | number[]) {
  if (!devicePrefsStore.get().haptics) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* unsupported */
  }
}
