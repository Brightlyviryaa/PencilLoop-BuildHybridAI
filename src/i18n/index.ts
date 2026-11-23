import { settingsStore, useStore, type Lang, type Settings } from '../features/progress/store'
import { en, type Dict } from './en/index'
import { id } from './id/index'

export type { Dict }
export type { Lang }

const DICTS: Record<Lang, Dict> = { en, id }

/** Browser language when supported (Indonesian or English), otherwise English. */
export function detectLang(languages: readonly string[] = typeof navigator !== 'undefined' ? (navigator.languages ?? [navigator.language]) : []): Lang {
  for (const l of languages) {
    const p = (l ?? '').toLowerCase().split('-')[0]
    if (p === 'id' || p === 'in') return 'id'
    if (p === 'en') return 'en'
  }
  return 'en'
}

export function resolveLang(s: Pick<Settings, 'language'>): Lang {
  return s.language ?? detectLang()
}

export function getLang(): Lang {
  return resolveLang(settingsStore.get())
}

export function getT(lang: Lang = getLang()): Dict {
  return DICTS[lang]
}

export function useLang(): Lang {
  return resolveLang(useStore(settingsStore))
}

/** The dictionary for the current language. Re-renders instantly on change, no reload. */
export function useT(): Dict {
  return DICTS[useLang()]
}

export function setLang(lang: Lang) {
  settingsStore.set((s) => ({ ...s, language: lang }))
}

export const LANG_LABEL: Record<Lang, string> = { id: 'Indonesia', en: 'English' }
