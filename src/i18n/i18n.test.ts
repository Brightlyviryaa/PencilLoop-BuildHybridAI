import { describe, expect, it } from 'vitest'
import { detectLang } from './index'
import { en } from './en'
import { id } from './id'

type Node = unknown
const SAMPLE = [1, 'x', 'left', 3, 2, 1, 1, 1] as const

/** Flatten a dictionary into path -> rendered strings (functions are called with sample args). */
function flatten(n: Node, path = '', out: Record<string, string[]> = {}): Record<string, string[]> {
  if (typeof n === 'string') out[path] = [n]
  else if (typeof n === 'function') {
    const variants = [SAMPLE, [2, 'y', 'right', 1, 0, 2, 3, 4], [3, null, 'left', 2, 2, 1, 1, 1]].map((args) =>
      String((n as (...a: unknown[]) => unknown)(...args)),
    )
    out[path] = variants
  } else if (Array.isArray(n)) n.forEach((v, i) => flatten(v, `${path}[${i}]`, out))
  else if (n && typeof n === 'object') for (const [k, v] of Object.entries(n)) flatten(v, path ? `${path}.${k}` : k, out)
  return out
}

describe('i18n dictionaries', () => {
  const fe = flatten(en)
  const fi = flatten(id)

  it('Indonesian and English have exactly the same keys (including array lengths)', () => {
    expect(Object.keys(fi).sort()).toEqual(Object.keys(fe).sort())
  })

  it('no em dashes, en dashes, curly quotes or ellipsis characters in any visible text', () => {
    const bad = /[–—‘’“”…]/
    for (const [lang, dict] of [
      ['en', fe],
      ['id', fi],
    ] as const) {
      for (const [k, vals] of Object.entries(dict)) for (const v of vals) expect(bad.test(v), `${lang}:${k} -> ${v}`).toBe(false)
    }
  })

  it('no empty strings', () => {
    for (const [k, vals] of Object.entries({ ...fe, ...fi })) for (const v of vals) expect(v.trim().length, k).toBeGreaterThan(0)
  })

  it('detects the browser language with an English fallback', () => {
    expect(detectLang(['id-ID', 'en'])).toBe('id')
    expect(detectLang(['in'])).toBe('id')
    expect(detectLang(['en-US'])).toBe('en')
    expect(detectLang(['fr-FR', 'id'])).toBe('id')
    expect(detectLang(['fr-FR'])).toBe('en')
    expect(detectLang([])).toBe('en')
  })
})
