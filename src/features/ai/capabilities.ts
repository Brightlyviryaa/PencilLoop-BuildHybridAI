/**
 * Read-only capability detection for the Chrome built-in Prompt API.
 * This only tells us whether a local model COULD run ("Ready for local").
 * Which engine actually answered is only ever taken from the SDK response's
 * `inferenceSource`.
 */

type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available'

interface LanguageModelStatic {
  availability(options?: Record<string, unknown>): Promise<Availability>
}

declare global {
  // Chrome's built-in AI global (Chrome Desktop 139+, behind flags in some builds).
  // eslint-disable-next-line no-var
  var LanguageModel: LanguageModelStatic | undefined
}

export type LocalAvailability = Availability | 'no-api' | 'error'

export async function checkLocalModel(withImage: boolean): Promise<LocalAvailability> {
  const LM = globalThis.LanguageModel
  if (!LM || typeof LM.availability !== 'function') return 'no-api'
  try {
    return await LM.availability({
      expectedInputs: withImage ? [{ type: 'text', languages: ['en'] }, { type: 'image' }] : [{ type: 'text', languages: ['en'] }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
    })
  } catch {
    return 'error'
  }
}

export function isLikelyMobile(): boolean {
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData
  if (uaData && typeof uaData.mobile === 'boolean') return uaData.mobile
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

export function chromeMajorVersion(): number | null {
  const m = navigator.userAgent.match(/Chrome\/(\d+)/)
  return m && !/Edg\/|OPR\//.test(navigator.userAgent) ? Number(m[1]) : null
}
