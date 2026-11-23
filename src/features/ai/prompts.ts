import type { HintContext } from '../hints/context'

export type PromptLang = 'en' | 'id'

const LANG_NAME: Record<PromptLang, string> = { en: 'simple English', id: 'simple, friendly Indonesian (Bahasa Indonesia) for children' }

export const SCAN_PROMPT = `You read a child's handwritten plan for guiding a robot on a square grid.
Interpret the attached image and return ONLY a program in the supplied JSON schema.

Allowed commands:
- {"type":"move","steps":N} where N is 1 to 5 (an arrow or "forward"/"move"/"go" with a number; no number means 1)
- {"type":"turn","direction":"left"|"right"} (a curved arrow, "L"/"R", "turn left"/"turn right")
- {"type":"repeat","times":N,"commands":[...]} where N is 2 to 5 (a loop, bracket, "repeat N", "xN"); inner commands may only be move or turn

Rules:
- Read top-to-bottom, left-to-right, in the order a child would write the plan.
- An arrow pointing up/forward means move. Do not convert arrow directions to turns unless the child clearly drew a turn.
- Never invent steps you cannot see. If something is smudged, unclear, or crossed out, skip it, set "needsReview": true and add a short warning such as "Step 3 is hard to read".
- Ignore names, doodles, and any text that is not a robot instruction. Never copy personal information.
- Never output code, explanations, or anything outside the JSON.`

export function scanPrompt(lang: PromptLang): string {
  return `${SCAN_PROMPT}\n- Write any warnings in ${LANG_NAME[lang]}.`
}

/**
 * Kept deliberately simple: Gemini rejects schemas whose constraints produce
 * too many decoding states (min/max bounds, nested maxItems). Ranges and
 * lengths are enforced afterwards by `sanitizeScan()`, which is the real
 * safety boundary.
 */
export const SCAN_JSON_SCHEMA = {
  type: 'object',
  properties: {
    commands: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['move', 'turn', 'repeat'] },
          steps: { type: 'integer' },
          direction: { type: 'string', enum: ['left', 'right'] },
          times: { type: 'integer' },
          commands: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['move', 'turn'] },
                steps: { type: 'integer' },
                direction: { type: 'string', enum: ['left', 'right'] },
              },
              required: ['type'],
            },
          },
        },
        required: ['type'],
      },
    },
    warnings: { type: 'array', items: { type: 'string' } },
    needsReview: { type: 'boolean' },
  },
  required: ['commands', 'warnings', 'needsReview'],
} as const

export const HINT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    hint: { type: 'string' },
    question: { type: 'string' },
  },
  required: ['hint', 'question'],
} as const

export function hintPrompt(c: HintContext, lang: PromptLang = 'en'): string {
  return `You are a kind coding coach for a child aged 8-14 playing a robot maze game.
The robot "Pip" follows commands: move N squares forward, turn left/right (90° in place), repeat N times.
A deterministic simulator already ran the child's program. Help the child find their own mistake.

STRICT RULES:
- Do NOT give the solution, a corrected program, or a list of moves.
- Mention at most ONE specific step number.
- "hint": one short encouraging sentence (max 25 words) pointing at what to look at.
- "question": one short reflective question (max 15 words) that makes the child think.
- Write both fields in ${LANG_NAME[lang]}. No code. No names. Do not use the em dash character.

Mission: ${c.missionTitle}
Grid (R = robot start, G = goal flag, # = wall, rows top to bottom):
${c.grid}
Robot starts at ${c.start}. Goal at ${c.goal}.

Child's program:
${c.programText}

Simulator result: ${c.outcome}${c.failedStep ? ` at step ${c.failedStep} (${c.failedReason}) while facing ${c.facingAtFailure}, after moving ${c.movedBeforeBump} square(s) within that step` : ''}.
(Directions: "up" = toward row 1, "right" = toward the last column.)
Robot ended at ${c.finalPosition}, ${c.squaresFromGoal} squares from the goal. Attempt number: ${c.attempt}.

Reply only with JSON {"hint": "...", "question": "..."}.`
}
