import { calculateImageSize, parseRatio, type SizeTier } from './size'

const DISALLOWED_GPT_IMAGE_2_SQUARE_TIER: SizeTier = '4K'
const GPT_IMAGE_2_SQUARE_FALLBACK_TIER: SizeTier = '2K'

export function isGptImage2Model(model: string) {
  return model.trim().toLowerCase() === 'gpt-image-2'
}

export function normalizeRatioKey(ratio: string | undefined) {
  if (!ratio) return null
  const parsed = parseRatio(ratio)
  if (!parsed) return null
  return `${parsed.width}:${parsed.height}`
}

export function isResolutionAllowedForModel(model: string, ratio: string, tier: SizeTier) {
  return !(
    isGptImage2Model(model) &&
    normalizeRatioKey(ratio) === '1:1' &&
    tier === DISALLOWED_GPT_IMAGE_2_SQUARE_TIER
  )
}

export function resolveAllowedSizeTier(model: string, ratio: string, tier: SizeTier): SizeTier {
  return isResolutionAllowedForModel(model, ratio, tier) ? tier : GPT_IMAGE_2_SQUARE_FALLBACK_TIER
}

export function resolveAllowedImageSize(model: string, ratio: string, tier: SizeTier) {
  return calculateImageSize(resolveAllowedSizeTier(model, ratio, tier), ratio)
}
