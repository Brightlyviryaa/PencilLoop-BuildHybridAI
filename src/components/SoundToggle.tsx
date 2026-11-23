import { Volume2, VolumeX } from 'lucide-react'
import { sfx } from '../features/audio/sfx'
import { useSettings } from '../features/progress/store'
import { useT } from '../i18n'
import { IconButton } from './Button'

export function SoundToggle({ variant = 'ghost' as 'ghost' | 'secondary' }) {
  const [s, update] = useSettings()
  const t = useT()
  return (
    <IconButton
      label={s.muted ? t.sound.turnOn : t.sound.turnOff}
      aria-pressed={!s.muted}
      variant={variant}
      sound={false}
      onClick={() => {
        const muted = !s.muted
        update({ muted })
        sfx.setMuted(muted)
        if (!muted) {
          sfx.unlock()
          sfx.play('tap')
        }
      }}
    >
      {s.muted ? <VolumeX size={22} aria-hidden /> : <Volume2 size={22} aria-hidden />}
    </IconButton>
  )
}
