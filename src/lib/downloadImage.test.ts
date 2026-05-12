import { describe, expect, it } from 'vitest'
import { buildDownloadRequestUrl } from './downloadImage'

describe('download image helpers', () => {
  it('adds a cache-busting download parameter to remote image URLs', () => {
    expect(buildDownloadRequestUrl('https://img.artimg.top/temp/image.png', 123)).toBe(
      'https://img.artimg.top/temp/image.png?download=123',
    )
  })

  it('preserves existing query parameters when adding the download parameter', () => {
    expect(buildDownloadRequestUrl('https://img.artimg.top/temp/image.png?size=large', 456)).toBe(
      'https://img.artimg.top/temp/image.png?size=large&download=456',
    )
  })

  it('leaves data URLs unchanged', () => {
    const dataUrl = 'data:image/png;base64,abc123'
    expect(buildDownloadRequestUrl(dataUrl, 789)).toBe(dataUrl)
  })
})
