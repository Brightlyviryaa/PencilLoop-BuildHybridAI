/**
 * Client-side image preparation for the scan flow. Everything stays in
 * memory; nothing is uploaded here.
 * - decodes JPEG/PNG/WebP (and HEIC where the browser can decode it)
 * - optional 90° rotation
 * - resizes so the longest side is ≤ 1280px (keeps handwriting legible)
 * - always outputs JPEG, which the on-device model accepts
 */
export interface PreparedImage {
  base64: string
  mimeType: 'image/jpeg'
  width: number
  height: number
  previewUrl: string
  bytes: number
}

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const MAX_INPUT_BYTES = 15 * 1024 * 1024
const MAX_SIDE = 1280

export type ImageErrorCode = 'format' | 'large' | 'type' | 'empty' | 'process' | 'generic'

export class ImageError extends Error {
  readonly code: ImageErrorCode
  constructor(code: ImageErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

async function decode(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file)
  } catch {
    // Fallback via <img>, which can decode HEIC on Safari.
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.decoding = 'async'
      img.src = url
      await img.decode()
      return img
    } catch {
      throw new ImageError('format', 'This photo format could not be opened. Please choose a JPG or PNG picture.')
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

export async function prepareImage(file: File, rotation: 0 | 90 | 180 | 270 = 0): Promise<PreparedImage> {
  if (file.size > MAX_INPUT_BYTES) throw new ImageError('large', 'That photo is very large. Please choose one under 15 MB.')
  if (file.type && !ACCEPTED_TYPES.includes(file.type.toLowerCase()))
    throw new ImageError('type', 'Please choose a photo (JPG or PNG).')

  const src = await decode(file)
  const sw = 'naturalWidth' in src ? src.naturalWidth : src.width
  const sh = 'naturalHeight' in src ? src.naturalHeight : src.height
  if (!sw || !sh) throw new ImageError('empty', 'That photo looks empty.')
  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh))
  const w = Math.round(sw * scale)
  const h = Math.round(sh * scale)
  const swap = rotation === 90 || rotation === 270
  const canvas = document.createElement('canvas')
  canvas.width = swap ? h : w
  canvas.height = swap ? w : h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ImageError('process', 'Could not process the photo on this device.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(src as CanvasImageSource, -w / 2, -h / 2, w, h)
  if ('close' in src) src.close()

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new ImageError('process', 'Could not compress the photo.'))), 'image/jpeg', 0.86),
  )
  const base64 = await blobToBase64(blob)
  // Release the canvas backing store promptly.
  canvas.width = 0
  canvas.height = 0
  return { base64, mimeType: 'image/jpeg', width: swap ? h : w, height: swap ? w : h, previewUrl: URL.createObjectURL(blob), bytes: blob.size }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => {
      const s = String(r.result)
      resolve(s.slice(s.indexOf(',') + 1))
    }
    r.onerror = () => reject(new ImageError('generic', 'Could not read the photo.'))
    r.readAsDataURL(blob)
  })
}

export function releaseImage(img: PreparedImage | null) {
  if (img) URL.revokeObjectURL(img.previewUrl)
}
