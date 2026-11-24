import { z } from 'zod'
import { createStore, useStore } from '../features/progress/store'

/**
 * Preferences that only make sense on this device and never sync to the
 * cloud (so the Firestore schema stays unchanged): voice guidance, haptics,
 * and whether the first-time tutorial has been completed here.
 */
export const devicePrefsSchema = z.object({
  voice: z.boolean(),
  voiceVolume: z.number().min(0).max(1),
  haptics: z.boolean(),
  tutorialDone: z.boolean(),
  /** Hide the "hold and drag" helper once the player has moved a block. */
  dragHintSeen: z.boolean(),
})
export type DevicePrefs = z.infer<typeof devicePrefsSchema>

export const DEFAULT_DEVICE_PREFS: DevicePrefs = { voice: true, voiceVolume: 0.9, haptics: true, tutorialDone: false, dragHintSeen: false }

export const devicePrefsStore = createStore<DevicePrefs>(
  'pencilloop:device:v1',
  (raw) => {
    const r = devicePrefsSchema.partial().safeParse(raw)
    return r.success ? { ...DEFAULT_DEVICE_PREFS, ...r.data } : undefined
  },
  DEFAULT_DEVICE_PREFS,
)

export function useDevicePrefs(): [DevicePrefs, (p: Partial<DevicePrefs>) => void] {
  return [useStore(devicePrefsStore), (p) => devicePrefsStore.set((s) => ({ ...s, ...p }))]
}
