export const TASK_THUMBNAIL_IMAGE_OPTIONS = {
  width: 512,
  quality: 60,
} as const

interface CloudflareImageOptions {
  width: number
  quality: number
  format?: 'auto' | 'webp' | 'avif'
}

export function buildCloudflareImageUrl(
  sourceUrl: string,
  options: CloudflareImageOptions,
): string | null {
  const trimmed = sourceUrl.trim()
  if (!trimmed || /^data:image\//i.test(trimmed) || /^blob:/i.test(trimmed)) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (url.pathname.startsWith('/cdn-cgi/image/')) return trimmed

  const width = Math.max(1, Math.round(options.width))
  const quality = Math.max(1, Math.min(100, Math.round(options.quality)))
  const format = options.format ?? 'auto'
  const transform = `width=${width},quality=${quality},format=${format}`

  return `${url.origin}/cdn-cgi/image/${transform}${url.pathname}${url.search}`
}

export function buildTaskThumbnailUrl(cosUrl: string): string {
  return buildCloudflareImageUrl(cosUrl, {
    width: TASK_THUMBNAIL_IMAGE_OPTIONS.width,
    quality: TASK_THUMBNAIL_IMAGE_OPTIONS.quality,
    format: 'auto',
  }) ?? cosUrl
}
