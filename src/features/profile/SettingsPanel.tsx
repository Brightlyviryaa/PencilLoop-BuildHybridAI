import { Languages, Volume2, Wind } from 'lucide-react'
import { playSfx } from '../../app/hooks'
import { SettingRow, Segmented, Slider, Toggle } from '../../components/Controls'
import { LANG_LABEL, setLang, useLang, useT } from '../../i18n'
import { sfx } from '../audio/sfx'
import { LANGS, useSettings, type Settings } from '../progress/store'

/** Language, sound + volume and motion. Shared by Profile and the in-game quick settings. */
export function SettingsPanel() {
  const t = useT()
  const lang = useLang()
  const [s, update] = useSettings()
  return (
    <div className="divide-y divide-line/70">
      <SettingRow
        stack
        icon={<Languages size={20} aria-hidden />}
        title={t.settings.language}
        desc={t.settings.languageDesc}
        control={<Segmented label={t.settings.language} value={lang} options={LANGS.map((l) => ({ value: l, label: LANG_LABEL[l] }))} onChange={setLang} testId="setting-language" />}
      />
      <SettingRow
        icon={<Volume2 size={20} aria-hidden />}
        title={t.settings.sound}
        desc={t.settings.soundDesc}
        control={
          <Toggle
            label={t.settings.sound}
            checked={!s.muted}
            testId="toggle-sound"
            onChange={(on) => {
              update({ muted: !on })
              sfx.setMuted(!on)
              if (on) {
                sfx.unlock()
                playSfx('toggle')
              }
            }}
          />
        }
      />
      <div className="flex items-center gap-3 py-3 pl-[52px]">
        <span className="w-16 shrink-0 text-sm font-bold text-ink-muted">{t.settings.volume}</span>
        <Slider
          label={t.settings.volume}
          value={s.volume}
          disabled={s.muted}
          onChange={(v) => {
            update({ volume: v })
            sfx.setVolume(v)
          }}
          onCommit={() => playSfx('select')}
        />
        <span className="tabular w-10 shrink-0 text-right text-sm font-bold text-ink-muted">{Math.round(s.volume * 100)}</span>
      </div>
      <SettingRow
        stack
        icon={<Wind size={20} aria-hidden />}
        title={t.settings.motion}
        desc={t.settings.motionDesc}
        control={
          <Segmented<Settings['motion']>
            label={t.settings.motion}
            value={s.motion}
            options={(['system', 'reduced', 'full'] as const).map((v) => ({ value: v, label: t.settings.motionOpts[v] }))}
            onChange={(v) => update({ motion: v })}
          />
        }
      />
    </div>
  )
}
