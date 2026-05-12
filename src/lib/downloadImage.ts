const MIME_EXTENSION: Record<string, string> = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
}

function getExtension(src: string, mimeType: string) {
  const fromMime = MIME_EXTENSION[mimeType]
  if (fromMime) return fromMime

  try {
    const pathname = new URL(src, window.location.href).pathname
    const match = pathname.match(/\.([a-z0-9]+)$/i)
    if (match?.[1]) return match[1].toLowerCase()
  } catch {
    // Keep the default below for data URLs or malformed remote URLs.
  }

  return 'png'
}

function getUrlBase() {
  return typeof window === 'undefined' ? 'https://artimg.top/' : window.location.href
}

function isHttpUrl(src: string) {
  try {
    const url = new URL(src, getUrlBase())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function buildDownloadRequestUrl(src: string, cacheBustValue = Date.now()) {
  try {
    const url = new URL(src, getUrlBase())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return src
    url.searchParams.set('download', String(cacheBustValue))
    return url.toString()
  } catch {
    return src
  }
}

export async function downloadImage(src: string, filenamePrefix = 'image') {
  const downloadUrl = buildDownloadRequestUrl(src)
  const response = await fetch(
    downloadUrl,
    isHttpUrl(downloadUrl)
      ? {
          mode: 'cors',
          cache: 'no-store',
        }
      : undefined,
  )
  if (!response.ok) {
    throw new Error(`图片下载失败：HTTP ${response.status}`)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filenamePrefix}-${Date.now()}.${getExtension(src, blob.type)}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
