import { describe, expect, it } from 'vitest'
import { buildCloudflareImageUrl, buildTaskThumbnailUrl } from './imageDelivery'

describe('image delivery helpers', () => {
  it('builds a Cloudflare image transformation URL from a COS URL', () => {
    expect(
      buildTaskThumbnailUrl('https://img.artimg.top/temp/2026-04-18/image-a.jpg'),
    ).toBe(
      'https://img.artimg.top/cdn-cgi/image/width=512,quality=60,format=auto/temp/2026-04-18/image-a.jpg',
    )
  })

  it('preserves the source query string for transformed images', () => {
    expect(
      buildCloudflareImageUrl('https://img.artimg.top/temp/image-a.jpg?v=1', {
        width: 320,
        quality: 55,
      }),
    ).toBe('https://img.artimg.top/cdn-cgi/image/width=320,quality=55,format=auto/temp/image-a.jpg?v=1')
  })

  it('falls back to the original value for non-transformable image sources', () => {
    expect(buildTaskThumbnailUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc')
    expect(buildTaskThumbnailUrl('/local-image.png')).toBe('/local-image.png')
  })

  it('does not wrap an already transformed URL again', () => {
    const transformed = 'https://img.artimg.top/cdn-cgi/image/width=512/temp/image-a.jpg'
    expect(buildTaskThumbnailUrl(transformed)).toBe(transformed)
  })
})
