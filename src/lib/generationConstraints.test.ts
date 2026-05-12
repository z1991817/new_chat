import { describe, expect, it } from 'vitest'
import {
  isResolutionAllowedForModel,
  resolveAllowedImageSize,
  resolveAllowedSizeTier,
} from './generationConstraints'

describe('generation constraints', () => {
  it('blocks 4K only for gpt-image-2 square output', () => {
    expect(isResolutionAllowedForModel('gpt-image-2', '1:1', '4K')).toBe(false)
    expect(isResolutionAllowedForModel('GPT-IMAGE-2', '1:1', '4K')).toBe(false)
    expect(isResolutionAllowedForModel('gpt-image-2', '16:9', '4K')).toBe(true)
    expect(isResolutionAllowedForModel('gpt-image-1.5', '1:1', '4K')).toBe(true)
    expect(isResolutionAllowedForModel('gpt-image-2', '1:1', '2K')).toBe(true)
  })

  it('falls back to 2K for blocked gpt-image-2 square output', () => {
    expect(resolveAllowedSizeTier('gpt-image-2', '1:1', '4K')).toBe('2K')
    expect(resolveAllowedImageSize('gpt-image-2', '1:1', '4K')).toBe('2048x2048')
  })
})
