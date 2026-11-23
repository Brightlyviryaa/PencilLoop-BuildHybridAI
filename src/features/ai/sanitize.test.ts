import { describe, expect, it } from 'vitest'
import { runProgram, toProgram } from '../maze/interpreter'
import { MISSIONS } from '../maze/missions'
import { SanitizeError, extractJson, sanitizeHint, sanitizeScan } from './sanitize'

describe('extractJson', () => {
  it('reads plain and fenced JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 })
    expect(extractJson('Here you go:\n```json\n{"a":2}\n```')).toEqual({ a: 2 })
  })
  it('rejects non-JSON', () => {
    expect(() => extractJson('move 2 then turn')).toThrow(SanitizeError)
    expect(() => extractJson('{ broken')).toThrow(SanitizeError)
  })
})

describe('sanitizeScan', () => {
  it('accepts a clean program', () => {
    const r = sanitizeScan({
      version: 1,
      commands: [
        { type: 'move', steps: 2 },
        { type: 'turn', direction: 'left' },
        { type: 'repeat', times: 3, commands: [{ type: 'move', steps: 1 }] },
      ],
      warnings: [],
      needsReview: false,
    })
    expect(r.needsReview).toBe(false)
    expect(r.commands).toHaveLength(3)
    expect(runProgram(MISSIONS[0], toProgram(r.commands)).outcome).not.toBe('INVALID_PROGRAM')
  })

  it('clamps illegal numbers and flags review', () => {
    const r = sanitizeScan({ commands: [{ type: 'move', steps: 0 }, { type: 'move', steps: 1000 }, { type: 'repeat', times: 99, commands: [{ type: 'turn', direction: 'right' }] }] })
    expect(r.commands).toEqual([
      { type: 'move', steps: 1 },
      { type: 'move', steps: 5 },
      { type: 'repeat', times: 5, commands: [{ type: 'turn', direction: 'right' }] },
    ])
    expect(r.needsReview).toBe(true)
    expect(r.warnings.length).toBeGreaterThan(0)
  })

  it('drops unknown commands, properties and code-like content', () => {
    const r = sanitizeScan({
      commands: [
        { type: 'move', steps: 1, code: 'alert(1)', __proto__: { evil: true } },
        { type: 'eval', value: 'fetch("x")' },
        { type: 'turn', direction: 'up' },
        'rm -rf',
      ],
    })
    expect(r.commands).toEqual([{ type: 'move', steps: 1 }])
    expect(JSON.stringify(r.commands)).not.toContain('alert')
    expect(r.needsReview).toBe(true)
  })

  it('removes deeply nested repeats beyond the limit', () => {
    const r = sanitizeScan({
      commands: [
        {
          type: 'repeat',
          times: 2,
          commands: [
            { type: 'move', steps: 1 },
            { type: 'repeat', times: 2, commands: [{ type: 'repeat', times: 2, commands: [{ type: 'move', steps: 1 }] }] },
          ],
        },
      ],
    })
    // innermost repeat (depth 3) removed, which leaves its parent empty → also removed
    expect(r.commands).toEqual([{ type: 'repeat', times: 2, commands: [{ type: 'move', steps: 1 }] }])
  })

  it('normalises friendly synonyms', () => {
    const r = sanitizeScan({ commands: [{ type: 'Forward', steps: '3' }, { type: 'LEFT' }, { type: 'loop', times: 2, commands: [{ type: 'right' }] }] })
    expect(r.commands).toEqual([
      { type: 'move', steps: 3 },
      { type: 'turn', direction: 'left' },
      { type: 'repeat', times: 2, commands: [{ type: 'turn', direction: 'right' }] },
    ])
  })

  it('caps the node count', () => {
    const r = sanitizeScan({ commands: Array.from({ length: 80 }, () => ({ type: 'turn', direction: 'left' })) })
    expect(r.commands.length).toBeLessThanOrEqual(30)
    expect(r.needsReview).toBe(true)
  })

  it('throws on empty / garbage output', () => {
    expect(() => sanitizeScan(null)).toThrow(SanitizeError)
    expect(() => sanitizeScan({ commands: [] })).toThrow(SanitizeError)
    expect(() => sanitizeScan({ commands: 'move 2' })).toThrow(SanitizeError)
  })

  it('passes through model warnings safely', () => {
    const r = sanitizeScan({ commands: [{ type: 'move', steps: 2 }], warnings: ['Step 3 was smudged', 42], needsReview: true })
    expect(r.warnings).toContain('Step 3 was smudged')
    expect(r.needsReview).toBe(true)
  })
})

describe('sanitizeHint', () => {
  it('accepts a short guiding hint', () => {
    const r = sanitizeHint({ hint: 'Pip bumped right after turning.', question: 'Which way is Pip facing after step 2?' })
    expect(r.hint).toContain('Pip')
  })
  it('rejects hints that spell out the solution', () => {
    expect(() =>
      sanitizeHint({ hint: 'Move 3, turn left, move 3, turn right, move 2 and you win.', question: '' }),
    ).toThrow(SanitizeError)
  })
  it('trims long hints to 35 words', () => {
    const long = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ')
    expect(sanitizeHint({ hint: long, question: 'Why?' }).hint.split(/\s+/).length).toBeLessThanOrEqual(35)
  })
  it('throws on empty hint', () => {
    expect(() => sanitizeHint({ hint: '' })).toThrow(SanitizeError)
  })
})
