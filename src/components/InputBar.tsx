import { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Coins } from 'lucide-react'
import { useStore, submitTask, addImageFromFile, updateTaskInStore, removeMultipleTasks } from '../store'
import { DEFAULT_IMAGES_MODEL, DEFAULT_RESPONSES_MODEL } from '../types'
import { calculateImageSize, normalizeImageSize, type SizeTier } from '../lib/size'
import { createMaskPreviewDataUrl } from '../lib/canvasImage'
import { resolveAssetUrl } from '../lib/backendApi'
import Select from './Select'
import ModelPicker from './ModelPicker'
import ViewportTooltip from './ViewportTooltip'

/** 通用悬浮气泡提示 */
function ButtonTooltip({ visible, text }: { visible: boolean; text: string }) {
  return (
    <ViewportTooltip visible={visible} className="z-10 whitespace-nowrap">
      {text}
    </ViewportTooltip>
  )
}

/** API 支持的最大参考图数量 */
const API_MAX_IMAGES = 16
const DEFAULT_RATIO_OPTIONS = [
  { label: '1:1', value: '1:1' },
  { label: '3:2', value: '3:2' },
  { label: '2:3', value: '2:3' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
  { label: '4:3', value: '4:3' },
  { label: '3:4', value: '3:4' },
  { label: '21:9', value: '21:9' },
] as const
const DEFAULT_RESOLUTION_OPTIONS = [
  { label: '1K', value: '1K' },
  { label: '2K', value: '2K' },
  { label: '4K', value: '4K' },
] as const

const KNOWN_SIZE_TIERS: SizeTier[] = ['1K', '2K', '4K']
const RATIO_PATTERN = /^\s*\d+(?:\.\d+)?\s*[:xX×]\s*\d+(?:\.\d+)?\s*$/

function isKnownSizeTier(value: string): value is SizeTier {
  return KNOWN_SIZE_TIERS.includes(value as SizeTier)
}

function normalizeRatioOptions(aspectRatios: string[] | undefined) {
  if (!aspectRatios || aspectRatios.length === 0) {
    return DEFAULT_RATIO_OPTIONS.map((item) => ({ label: item.label, value: item.value }))
  }

  const seen = new Set<string>()
  const options = aspectRatios
    .map((item) => item.trim())
    .filter((item) => {
      if (!RATIO_PATTERN.test(item)) return false
      if (seen.has(item)) return false
      seen.add(item)
      return true
    })
    .map((item) => ({ label: item, value: item }))

  return options.length > 0
    ? options
    : DEFAULT_RATIO_OPTIONS.map((item) => ({ label: item.label, value: item.value }))
}

function normalizeAspectRatioValue(value: string): string | null {
  const raw = value.trim()
  if (!RATIO_PATTERN.test(raw)) return null
  const parts = raw.split(/[:xX×]/).map((item) => Number(item.trim()))
  const width = parts[0]
  const height = parts[1]
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null
  return `${width}:${height}`
}

function parseSize(size: string) {
  const match = size.match(/^\s*(\d+)\s*[xX×]\s*(\d+)\s*$/)
  if (!match) return null

  const width = Number(match[1])
  const height = Number(match[2])
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null
  }

  return { width, height }
}

function pickClosestRatio(size: string, ratioOptions: Array<{ value: string }>): string {
  const parsed = parseSize(size)
  if (!parsed) return ratioOptions[0]?.value ?? '1:1'

  const actualRatio = parsed.width / parsed.height
  let closest = ratioOptions[0]?.value ?? '1:1'
  let smallestDelta = Number.POSITIVE_INFINITY
  for (const item of ratioOptions) {
    const [width, height] = item.value.split(':').map(Number)
    const delta = Math.abs(actualRatio - width / height)
    if (delta < smallestDelta) {
      smallestDelta = delta
      closest = item.value
    }
  }

  return closest
}

function pickResolutionTier(size: string): SizeTier {
  const parsed = parseSize(size)
  if (!parsed) return '1K'

  const maxEdge = Math.max(parsed.width, parsed.height)
  if (maxEdge >= 3000) return '4K'
  if (maxEdge >= 1600) return '2K'
  return '1K'
}

function toNormalizedSize(size: string): string | null {
  const parsed = parseSize(size)
  return parsed ? `${parsed.width}x${parsed.height}` : null
}

function pickResolutionValue(size: string, ratio: string, resolutionValues: string[]): string {
  const normalizedSize = toNormalizedSize(size)
  if (normalizedSize) {
    for (const value of resolutionValues) {
      const normalizedValue = value.trim()
      const directSize = toNormalizedSize(normalizedValue)
      if (directSize === normalizedSize) return normalizedValue
      if (isKnownSizeTier(normalizedValue)) {
        const presetSize = calculateImageSize(normalizedValue, ratio)
        if (presetSize === normalizedSize) return normalizedValue
      }
    }
  }

  const preferredTier = pickResolutionTier(size)
  if (resolutionValues.includes(preferredTier)) return preferredTier
  return resolutionValues[0] ?? '1K'
}

function buildImageSizeTier(size: string, ratio: string): SizeTier {
  const normalizedSize = normalizeImageSize(size).trim().replace(/[X×]/g, 'x')
  const parsed = parseSize(normalizedSize)
  if (!parsed) return '1K'

  for (const tier of KNOWN_SIZE_TIERS) {
    const tierSize = calculateImageSize(tier, ratio)
    if (!tierSize) continue
    if (normalizeImageSize(tierSize).trim().replace(/[X×]/g, 'x') === normalizedSize) return tier
  }

  const maxEdge = Math.max(parsed.width, parsed.height)
  if (maxEdge >= 3000) return '4K'
  if (maxEdge >= 1600) return '2K'
  return '1K'
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth < 640 : false),
  )
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return isMobile
}

export default function InputBar() {
  const prompt = useStore((s) => s.prompt)
  const setPrompt = useStore((s) => s.setPrompt)
  const inputImages = useStore((s) => s.inputImages)
  const removeInputImage = useStore((s) => s.removeInputImage)
  const clearInputImages = useStore((s) => s.clearInputImages)
  const params = useStore((s) => s.params)
  const setParams = useStore((s) => s.setParams)
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const token = useStore((s) => s.token)
  const setLoginOpen = useStore((s) => s.setLoginOpen)
  const models = useStore((s) => s.models)
  const setLightboxImageId = useStore((s) => s.setLightboxImageId)
  const showToast = useStore((s) => s.showToast)
  const setConfirmDialog = useStore((s) => s.setConfirmDialog)
  const selectedTaskIds = useStore((s) => s.selectedTaskIds)
  const setSelectedTaskIds = useStore((s) => s.setSelectedTaskIds)
  const clearSelection = useStore((s) => s.clearSelection)
  const tasks = useStore((s) => s.tasks)
  const filterStatus = useStore((s) => s.filterStatus)
  const filterFavorite = useStore((s) => s.filterFavorite)
  const searchQuery = useStore((s) => s.searchQuery)

  const filteredTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => b.createdAt - a.createdAt)
    const q = searchQuery.trim().toLowerCase()
    
    return sorted.filter((t) => {
      if (filterFavorite && !t.isFavorite) return false
      const matchStatus = filterStatus === 'all' || t.status === filterStatus
      if (!matchStatus) return false
      
      if (!q) return true
      const prompt = (t.prompt || '').toLowerCase()
      const paramStr = JSON.stringify(t.params).toLowerCase()
      return prompt.includes(q) || paramStr.includes(q)
    })
  }, [tasks, searchQuery, filterStatus, filterFavorite])

  const handleSelectAllToggle = useCallback(() => {
    if (selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0) {
      clearSelection()
    } else {
      setSelectedTaskIds(filteredTasks.map((t) => t.id))
    }
  }, [selectedTaskIds.length, filteredTasks, clearSelection, setSelectedTaskIds])

  const handleToggleFavorite = useCallback(() => {
    const selectedTasks = tasks.filter((t) => selectedTaskIds.includes(t.id))
    const allFavorite = selectedTasks.length > 0 && selectedTasks.every((t) => t.isFavorite)
    const newFavoriteState = !allFavorite
    setConfirmDialog({
      title: newFavoriteState ? '批量收藏' : '批量取消收藏',
      message: newFavoriteState
        ? `确定要收藏选中的 ${selectedTaskIds.length} 条记录吗？`
        : `确定要取消收藏选中的 ${selectedTaskIds.length} 条记录吗？`,
      confirmText: newFavoriteState ? '确认收藏' : '确认取消',
      action: () => {
        selectedTaskIds.forEach((id) => {
          updateTaskInStore(id, { isFavorite: newFavoriteState })
        })
        clearSelection()
      },
    })
  }, [tasks, selectedTaskIds, clearSelection, setConfirmDialog])

  const handleDeleteSelected = useCallback(() => {
    setConfirmDialog({
      title: '批量删除',
      message: `确定要删除选中的 ${selectedTaskIds.length} 条记录吗？`,
      action: () => {
        removeMultipleTasks(selectedTaskIds)
      },
    })
  }, [selectedTaskIds, setConfirmDialog])
  const maskDraft = useStore((s) => s.maskDraft)
  const clearMaskDraft = useStore((s) => s.clearMaskDraft)
  const moveInputImage = useStore((s) => s.moveInputImage)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const imagesRef = useRef<HTMLDivElement>(null)
  const prevHeightRef = useRef(42)

  const [isDragging, setIsDragging] = useState(false)
  const [submitHover, setSubmitHover] = useState(false)
  const [attachHover, setAttachHover] = useState(false)
  const [imageHintId, setImageHintId] = useState<string | null>(null)
  const [mobileCollapsed, setMobileCollapsed] = useState(false)
  const [maskPreviewUrl, setMaskPreviewUrl] = useState('')
  const [imageDragIndex, setImageDragIndex] = useState<number | null>(null)
  const [imageDragOverIndex, setImageDragOverIndex] = useState<number | null>(null)
  const [touchDragPreview, setTouchDragPreview] = useState<{ src: string; x: number; y: number } | null>(null)
  const handleRef = useRef<HTMLDivElement>(null)
  const dragTouchRef = useRef({ startY: 0, moved: false })
  const imageDragIndexRef = useRef<number | null>(null)
  const imageTouchDragRef = useRef({ index: null as number | null, startX: 0, startY: 0, moved: false })
  const imageDragOverIndexRef = useRef<number | null>(null)
  const imageDragPreviewRef = useRef<HTMLElement | null>(null)
  const suppressImageClickRef = useRef(false)
  const imageHintTimerRef = useRef<number | null>(null)
  const dragCounter = useRef(0)
  const isMobile = useIsMobile()

  const canSubmit = Boolean(prompt.trim() && token)
  const atImageLimit = inputImages.length >= API_MAX_IMAGES
  const maskTargetImage = maskDraft
    ? inputImages.find((img) => img.id === maskDraft.targetImageId) ?? null
    : null
  const referenceImages = maskTargetImage
    ? inputImages.filter((img) => img.id !== maskTargetImage.id)
    : inputImages
  const selectedModelConfig = useMemo(
    () => models.find((item) => item.model_key === settings.model),
    [models, settings.model],
  )
  const ratioOptions = useMemo(
    () => normalizeRatioOptions(selectedModelConfig?.aspect_ratios),
    [selectedModelConfig?.aspect_ratios],
  )
  const baseResolutionOptions = useMemo(() => {
    const modelSkus = selectedModelConfig?.skus ?? []
    const seen = new Set<string>()
    const options = modelSkus
      .map((sku) => {
        const imageSize = sku.image_size?.trim()
        const value = imageSize || sku.sku_code?.trim()
        if (!value) return null
        if (seen.has(value)) return null
        seen.add(value)
        return {
          label: sku.sku_name?.trim() || value,
          value,
        }
      })
      .filter((item): item is { label: string; value: string } => Boolean(item))

    return options.length > 0
      ? options
      : DEFAULT_RESOLUTION_OPTIONS.map((item) => ({ label: item.label, value: item.value }))
  }, [selectedModelConfig?.skus])
  const selectedRatio = useMemo(() => {
    const preferred = normalizeAspectRatioValue(params.aspectRatio || '')
    if (preferred && ratioOptions.some((item) => item.value === preferred)) {
      return preferred
    }
    return pickClosestRatio(params.size, ratioOptions)
  }, [params.aspectRatio, params.size, ratioOptions])
  const resolutionOptions = baseResolutionOptions
  const selectedResolution = useMemo(
    () => pickResolutionValue(params.size, selectedRatio, resolutionOptions.map((item) => item.value)),
    [params.size, selectedRatio, resolutionOptions],
  )
  const consumePointInfo = useMemo(() => {
    const requestImageSizeTier = buildImageSizeTier(params.size, selectedRatio)
    const matchedSkuBySize = selectedModelConfig?.skus?.find((sku) => {
      return sku.image_size?.trim().toUpperCase() === requestImageSizeTier
    })
    const defaultSku = selectedModelConfig?.skus?.find((sku) => sku.is_default === 1)
    const selectedSku = matchedSkuBySize ?? defaultSku
    const points =
      typeof selectedSku?.unit_consume_points === 'number'
        ? selectedSku.unit_consume_points
        : typeof selectedSku?.consume_points === 'number'
        ? selectedSku.consume_points
        : typeof selectedModelConfig?.unit_consume_points === 'number'
        ? selectedModelConfig.unit_consume_points
        : typeof selectedModelConfig?.consume_points === 'number'
        ? selectedModelConfig.consume_points
        : null

    return {
      points,
      tier: requestImageSizeTier,
      skuName: selectedSku?.sku_name?.trim() || requestImageSizeTier,
    }
  }, [params.size, selectedModelConfig, selectedRatio])
  const modelFallbackOptions = useMemo(() => {
    const defaults =
      settings.apiMode === 'responses'
        ? [DEFAULT_RESPONSES_MODEL, DEFAULT_IMAGES_MODEL]
        : [DEFAULT_IMAGES_MODEL, DEFAULT_RESPONSES_MODEL]
    const values = [settings.model, ...defaults].filter((value, index, array) => {
      return Boolean(value) && array.indexOf(value) === index
    })
    return values.map((value) => ({ label: value, value }))
  }, [settings.apiMode, settings.model])

  useEffect(() => {
    if (settings.apiMode === 'responses' && params.moderation !== 'auto') {
      setParams({ moderation: 'auto' })
    }
  }, [params.moderation, settings.apiMode, setParams])

  useEffect(() => {
    if (params.quality !== 'auto') {
      setParams({ quality: 'auto' })
    }
  }, [params.quality, setParams])

  useEffect(() => {
    const current = normalizeAspectRatioValue(params.aspectRatio || '')
    if (current === selectedRatio) return
    setParams({ aspectRatio: selectedRatio })
  }, [params.aspectRatio, selectedRatio, setParams])

  useEffect(() => () => {
    if (imageHintTimerRef.current != null) {
      window.clearTimeout(imageHintTimerRef.current)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!maskDraft || !maskTargetImage) {
      setMaskPreviewUrl('')
      return
    }

    createMaskPreviewDataUrl(maskTargetImage.dataUrl, maskDraft.maskDataUrl)
      .then((url) => {
        if (!cancelled) setMaskPreviewUrl(url)
      })
      .catch(() => {
        if (!cancelled) setMaskPreviewUrl('')
      })

    return () => {
      cancelled = true
    }
  }, [maskDraft, maskTargetImage?.id, maskTargetImage?.dataUrl])

  const applySizeFromPreset = useCallback(
    (ratio: string, resolutionValue: string) => {
      const normalized = resolutionValue.trim()
      if (isKnownSizeTier(normalized)) {
        const size = calculateImageSize(normalized, ratio)
        if (size) setParams({ size })
        return
      }

      const directSize = parseSize(normalized)
      if (directSize) {
        setParams({ size: `${directSize.width}x${directSize.height}` })
      }
    },
    [setParams],
  )

  const clearImageHintTimer = () => {
    if (imageHintTimerRef.current != null) {
      window.clearTimeout(imageHintTimerRef.current)
      imageHintTimerRef.current = null
    }
  }

  const showImageHint = (id: string) => setImageHintId(id)

  const hideImageHint = () => {
    setImageHintId(null)
    clearImageHintTimer()
  }

  const startImageHintTouch = (id: string) => {
    clearImageHintTimer()
    imageHintTimerRef.current = window.setTimeout(() => {
      setImageHintId(id)
      imageHintTimerRef.current = null
    }, 450)
  }

  const handleFiles = async (files: FileList | File[]) => {
    try {
      const currentCount = useStore.getState().inputImages.length
      if (currentCount >= API_MAX_IMAGES) {
        useStore.getState().showToast(
          `参考图数量已达上限（${API_MAX_IMAGES} 张），无法继续添加`,
          'error',
        )
        return
      }

      const remaining = API_MAX_IMAGES - currentCount
      const accepted = Array.from(files).filter((f) => f.type.startsWith('image/'))
      const toAdd = accepted.slice(0, remaining)
      const discarded = accepted.length - toAdd.length

      for (const file of toAdd) {
        await addImageFromFile(file)
      }

      if (discarded > 0) {
        useStore.getState().showToast(
          `已达上限 ${API_MAX_IMAGES} 张，${discarded} 张图片被丢弃`,
          'error',
        )
      }
    } catch (err) {
      useStore.getState().showToast(
        `图片添加失败：${err instanceof Error ? err.message : String(err)}`,
        'error',
      )
    }
  }

  const handleFilesRef = useRef(handleFiles)
  handleFilesRef.current = handleFiles

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleFilesRef.current(e.target.files || [])
    e.target.value = ''
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      if (token) {
        submitTask()
      } else {
        setLoginOpen(true)
      }
    }
  }

  // 粘贴图片
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      const imageFiles: File[] = []
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) imageFiles.push(file)
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault()
        handleFilesRef.current(imageFiles)
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  // 拖拽图片 - 监听整个页面
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current++
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDragging(true)
      }
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current--
      if (dragCounter.current === 0) {
        setIsDragging(false)
      }
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounter.current = 0
      setIsDragging(false)
      const files = e.dataTransfer?.files
      if (files && files.length > 0) {
        handleFilesRef.current(files)
      }
    }

    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('drop', handleDrop)
    }
  }, [])

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return

    // 计算图片区域和其他固定元素占用的高度
    const imagesHeight = imagesRef.current?.offsetHeight ?? 0
    const fixedOverhead = imagesHeight + 140

    // textarea 最大高度 = 页面 40% 减去固定开销，至少保留 80px
    const maxH = Math.max(window.innerHeight * 0.4 - fixedOverhead, 80)

    // 1. 关闭过渡动画，设高度为 0 以获取真实的文本内容高度
    el.style.transition = 'none'
    el.style.height = '0'
    el.style.overflowY = 'hidden'
    const scrollH = el.scrollHeight
    const minH = 42
    const desired = Math.max(scrollH, minH)
    const targetH = desired > maxH ? maxH : desired

    // 2. 将高度设回上一次的实际高度，强制重绘，准备开始动画
    el.style.height = prevHeightRef.current + 'px'
    void el.offsetHeight

    // 3. 恢复平滑过渡，并设置目标高度
    el.style.transition = 'height 150ms ease, border-color 200ms, box-shadow 200ms'
    el.style.height = targetH + 'px'
    el.style.overflowY = desired > maxH ? 'auto' : 'hidden'

    prevHeightRef.current = targetH
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [prompt, adjustTextareaHeight])

  // 图片队列变化时也重新计算
  useEffect(() => {
    adjustTextareaHeight()
  }, [inputImages.length, Boolean(maskDraft), maskPreviewUrl, adjustTextareaHeight])

  useEffect(() => {
    window.addEventListener('resize', adjustTextareaHeight)
    return () => window.removeEventListener('resize', adjustTextareaHeight)
  }, [adjustTextareaHeight])

  // 移动端拖动条手势
  useEffect(() => {
    const el = handleRef.current
    if (!el) return
    const onTouchStart = (e: TouchEvent) => {
      dragTouchRef.current = { startY: e.touches[0].clientY, moved: false }
    }
    const onTouchMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - dragTouchRef.current.startY
      if (Math.abs(dy) > 10) dragTouchRef.current.moved = true
      if (dy > 30) setMobileCollapsed(true)
      if (dy < -30) setMobileCollapsed(false)
    }
    const onTouchEnd = () => {
      if (!dragTouchRef.current.moved) {
        setMobileCollapsed((v) => !v)
      }
    }
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  const selectClass = 'px-3 py-1.5 rounded-xl border border-gray-200/60 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] hover:bg-white dark:hover:bg-white/[0.06] text-xs transition-all duration-200 shadow-sm'

  const getTouchDropIndex = (touch: React.Touch) => {
    const target = document
      .elementFromPoint(touch.clientX, touch.clientY)
      ?.closest<HTMLElement>('[data-input-image-index]')
    if (!target) return null
    const idx = Number(target.dataset.inputImageIndex)
    if (!Number.isInteger(idx)) return null
    const rect = target.getBoundingClientRect()
    return touch.clientX < rect.left + rect.width / 2 ? idx : idx + 1
  }

  const normalizeImageDropIndex = (idx: number) => {
    const minIdx = maskTargetImage ? 1 : 0
    return Math.max(minIdx, Math.min(inputImages.length, idx))
  }

  const isBeforeMaskDropArea = (clientX: number) => {
    if (!maskTargetImage) return false
    const maskEl = document.querySelector<HTMLElement>('[data-input-image-index="0"]')
    if (!maskEl) return false
    const rect = maskEl.getBoundingClientRect()
    return clientX < rect.left + rect.width / 2
  }

  const resetImageDrag = () => {
    setImageDragIndex(null)
    setImageDragOverIndex(null)
    imageDragIndexRef.current = null
    imageDragOverIndexRef.current = null
    imageTouchDragRef.current = { index: null, startX: 0, startY: 0, moved: false }
    setTouchDragPreview(null)
    imageDragPreviewRef.current?.remove()
    imageDragPreviewRef.current = null
    hideImageHint()
  }

  useEffect(() => {
    if (!touchDragPreview) return
    const previousOverflow = document.body.style.overflow
    const previousOverscroll = document.body.style.overscrollBehavior
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscroll
    }
  }, [touchDragPreview])

  const getDataTransferDragIndex = (e: React.DragEvent) => {
    const value = e.dataTransfer.getData('text/plain')
    const idx = Number(value)
    return Number.isInteger(idx) ? idx : null
  }

  const setImageDragTarget = (idx: number | null, clientX?: number) => {
    const fromIdx = imageDragIndexRef.current
    if (fromIdx !== null && maskTargetImage && (idx === 0 || (clientX != null && isBeforeMaskDropArea(clientX)))) {
      showImageHint(maskTargetImage.id)
      imageDragOverIndexRef.current = null
      setImageDragOverIndex(null)
      return
    }

    if (fromIdx !== null) hideImageHint()
    const normalizedIdx = idx == null ? null : normalizeImageDropIndex(idx)
    const isNoopTarget = fromIdx !== null && normalizedIdx !== null && (normalizedIdx === fromIdx || normalizedIdx === fromIdx + 1)
    const nextIdx = isNoopTarget ? null : normalizedIdx
    imageDragOverIndexRef.current = nextIdx
    setImageDragOverIndex(nextIdx)
  }

  const renderImageThumb = (img: (typeof inputImages)[number], idx: number) => {
    const isMaskTarget = maskDraft?.targetImageId === img.id
    const imageHintText = isMaskTarget
      ? '遮罩图必须为第一张图'
      : maskTargetImage
        ? '只能有一张遮罩图'
        : ''
    const remoteDisplaySrc = img.remoteUrl ? resolveAssetUrl(settings, img.remoteUrl) : ''
    const displaySrc = isMaskTarget && maskPreviewUrl ? maskPreviewUrl : (remoteDisplaySrc || img.dataUrl)
    const isImageDragging = imageDragIndex === idx
    const isLast = idx === inputImages.length - 1
    const showDropBefore = imageDragOverIndex === idx && imageDragIndex !== idx
    const showDropAfter = imageDragOverIndex === inputImages.length && isLast && imageDragIndex !== idx

    const handleDragStart = (e: React.DragEvent) => {
      if (isMaskTarget) {
        e.preventDefault()
        return
      }
      hideImageHint()
      imageDragIndexRef.current = idx
      setImageDragIndex(idx)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(idx))
      const preview = document.createElement('div')
      preview.style.cssText = 'position:fixed;left:-1000px;top:-1000px;width:52px;height:52px;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.25);'
      const previewImg = document.createElement('img')
      previewImg.src = displaySrc
      previewImg.style.cssText = 'width:52px;height:52px;object-fit:cover;display:block;'
      preview.appendChild(previewImg)
      document.body.appendChild(preview)
      imageDragPreviewRef.current = preview
      e.dataTransfer.setDragImage(preview, 26, 26)
    }

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      const fromIdx = imageDragIndexRef.current
      if (fromIdx === null || fromIdx === idx) return
      const rect = e.currentTarget.getBoundingClientRect()
      setImageDragTarget(e.clientX < rect.left + rect.width / 2 ? idx : idx + 1, e.clientX)
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      const fromIdx = imageDragIndexRef.current ?? getDataTransferDragIndex(e)
      const toIdx = imageDragOverIndexRef.current
      if (fromIdx !== null && toIdx !== null) {
        moveInputImage(fromIdx, toIdx)
      }
      resetImageDrag()
    }

    const handleTouchStart = (e: React.TouchEvent) => {
      if (isMaskTarget) {
        startImageHintTouch(img.id)
        return
      }
      const touch = e.touches[0]
      imageDragIndexRef.current = idx
      imageTouchDragRef.current = { index: idx, startX: touch.clientX, startY: touch.clientY, moved: false }
      setTouchDragPreview(null)
    }

    const handleTouchMove = (e: React.TouchEvent) => {
      const touch = e.touches[0]
      const touchDrag = imageTouchDragRef.current
      if (touchDrag.index === null) return

      touchDrag.moved = true
      clearImageHintTimer()
      setImageHintId(null)
      suppressImageClickRef.current = true
      e.preventDefault()
      setImageDragIndex(touchDrag.index)
      setTouchDragPreview({ src: displaySrc, x: touch.clientX, y: touch.clientY })
      const dropIndex = getTouchDropIndex(touch)
      setImageDragTarget(dropIndex, touch.clientX)
    }

    const handleTouchEnd = (e: React.TouchEvent) => {
      const touchDrag = imageTouchDragRef.current
      clearImageHintTimer()
      if (touchDrag.index !== null && imageDragOverIndexRef.current !== null) {
        e.preventDefault()
        moveInputImage(touchDrag.index, imageDragOverIndexRef.current)
        window.setTimeout(() => {
          suppressImageClickRef.current = false
        }, 0)
      }
      resetImageDrag()
    }

    const handleTouchCancel = () => {
      suppressImageClickRef.current = false
      hideImageHint()
      resetImageDrag()
    }

    return (
      <div
        key={img.id}
        data-input-image-index={idx}
        className={`relative group inline-block shrink-0 transition-opacity ${isImageDragging ? 'opacity-40' : ''}`}
        style={{ touchAction: isMaskTarget ? 'auto' : 'none' }}
        draggable={!isMobile && !isMaskTarget}
        onMouseEnter={() => imageHintText && (!isMobile || isMaskTarget) && showImageHint(img.id)}
        onMouseLeave={hideImageHint}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={resetImageDrag}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        <ButtonTooltip
          visible={imageHintId === img.id && Boolean(imageHintText) && (!isMobile || isMaskTarget)}
          text={imageHintText}
        />
        {showDropBefore && (
          <div className="absolute -left-[5px] top-0 bottom-0 w-[2px] bg-blue-500 rounded-full z-40 shadow-sm pointer-events-none" />
        )}
        {showDropAfter && (
          <div className="absolute -right-[5px] top-0 bottom-0 w-[2px] bg-blue-500 rounded-full z-40 shadow-sm pointer-events-none" />
        )}
        <div
          className={`relative w-[52px] h-[52px] rounded-xl overflow-hidden shadow-sm cursor-grab active:cursor-grabbing select-none ${
            isMaskTarget
              ? 'border-2 border-blue-500'
              : 'border border-gray-200 dark:border-white/[0.08]'
          }`}
          onClick={() => {
            if (suppressImageClickRef.current) return
            setLightboxImageId(img.id, inputImages.map((i) => i.id))
          }}
        >
          <img
            src={displaySrc}
            className="w-full h-full object-cover hover:opacity-90 transition-opacity pointer-events-none"
            alt=""
          />
          {isMaskTarget && (
            <span className="absolute left-1 top-1 rounded bg-blue-500/90 px-1.5 py-0.5 text-[8px] leading-none text-white font-bold tracking-wider backdrop-blur-sm z-10 pointer-events-none">
              MASK
            </span>
          )}
        </div>
        {!isMaskTarget && (
          <span
            className="absolute -top-2 -right-2 w-[22px] h-[22px] rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600 z-30"
            onClick={(e) => {
              e.stopPropagation()
              removeInputImage(idx)
            }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        )}
      </div>
    )
  }

  const renderClearAllButton = () => (
    <button
      onClick={() =>
        setConfirmDialog({
          title: maskTargetImage ? '清空全部输入图' : '清空参考图',
          message: maskTargetImage
            ? `确定要清空遮罩主图、${referenceImages.length} 张参考图和当前遮罩吗？`
            : `确定要清空全部 ${inputImages.length} 张参考图吗？`,
          action: () => clearInputImages(),
        })
      }
      className="w-[52px] h-[52px] rounded-xl border border-dashed border-gray-300 dark:border-white/[0.08] flex flex-col items-center justify-center gap-0.5 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-950/30 transition-all cursor-pointer flex-shrink-0"
      title={maskTargetImage ? '清空遮罩主图、参考图和遮罩' : '清空全部参考图'}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      <span className="text-[8px] leading-none">{maskTargetImage ? '清空全部' : '清空'}</span>
    </button>
  )

  const renderImageThumbs = () => {
    return (
      <div ref={imagesRef}>
        <div className="grid grid-cols-[repeat(auto-fill,52px)] justify-between gap-x-2 gap-y-3 mb-3">
          {inputImages.map((img, idx) => renderImageThumb(img, idx))}
          {renderClearAllButton()}
        </div>
        {touchDragPreview && createPortal(
          <div
            className="fixed z-[140] h-[52px] w-[52px] overflow-hidden rounded-xl shadow-xl pointer-events-none opacity-90"
            style={{ left: touchDragPreview.x, top: touchDragPreview.y, transform: 'translate(-50%, -50%)' }}
          >
            <img src={touchDragPreview.src} className="h-full w-full object-cover" alt="" />
          </div>,
          document.body,
        )}
      </div>
    )
  }

  const renderParams = (cols: string) => (
    <div className={`grid ${cols} gap-2 text-xs flex-1`}>
      <label className="flex flex-col gap-0.5 col-span-2">
        <span className="text-gray-400 dark:text-gray-500 ml-1">模型</span>
        <ModelPicker
          value={settings.model}
          onChange={(val) => setSettings({ model: val })}
          models={models}
          fallbackOptions={modelFallbackOptions}
          className={selectClass}
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-gray-400 dark:text-gray-500 ml-1">比例</span>
        <Select
          value={selectedRatio}
          onChange={(val) => {
            const ratio = String(val)
            setParams({ aspectRatio: ratio })
            applySizeFromPreset(ratio, selectedResolution)
          }}
          options={ratioOptions}
          className={selectClass}
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-gray-400 dark:text-gray-500 ml-1">分辨率</span>
        <Select
          value={selectedResolution}
          onChange={(val) => applySizeFromPreset(selectedRatio, String(val))}
          options={resolutionOptions}
          className={selectClass}
        />
      </label>
      <label className="flex flex-col gap-0.5">
        <span className="text-gray-400 dark:text-gray-500 ml-1">格式</span>
        <Select
          value={params.output_format}
          onChange={(val) => setParams({ output_format: val as any })}
          options={[
            { label: 'PNG', value: 'png' },
            { label: 'JPEG', value: 'jpeg' },
            { label: 'WebP', value: 'webp' },
          ]}
          className={selectClass}
        />
      </label>
    </div>
  )

  const renderConsumeBadge = (compact = false) => (
    <div
      className={[
        'inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 shadow-sm shadow-amber-900/5 ring-1 ring-white/60 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-white/[0.04]',
        compact ? 'px-2.5 py-2 text-xs' : 'px-3 py-2 text-sm',
      ].join(' ')}
      title={
        consumePointInfo.points != null
          ? `${consumePointInfo.skuName} 预计消耗 ${consumePointInfo.points} 积分`
          : '当前模型暂未返回积分消耗'
      }
    >
      <Coins className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={1.9} aria-hidden="true" />
      <span className="whitespace-nowrap font-semibold">
        {consumePointInfo.points != null
          ? compact
            ? `${consumePointInfo.points} 积分`
            : `消耗 ${consumePointInfo.points} 积分`
          : '积分待确认'}
      </span>
    </div>
  )

  return (
    <>
      {/* 全屏拖拽遮罩 */}
      {isDragging && (
        <div className="fixed inset-0 z-[100] bg-white/60 dark:bg-gray-900/60 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-4 p-8 rounded-3xl">
            <div className={`w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center ${
              atImageLimit ? 'bg-red-50 dark:bg-red-500/10 border-red-300' : 'bg-blue-50 dark:bg-blue-500/10 border-blue-400'
            }`}>
              {atImageLimit ? (
                <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="text-center">
              {atImageLimit ? (
                <>
                  <p className="text-lg font-semibold text-red-500">已达上限 {API_MAX_IMAGES} 张</p>
                  <p className="text-sm text-gray-400 mt-1">请先移除部分参考图后再添加</p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">释放以添加参考图</p>
                  <p className="text-sm text-gray-400 mt-1">支持 JPG、PNG、WebP 等格式</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div data-input-bar className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-4xl px-3 sm:px-4 transition-all duration-300">
        {selectedTaskIds.length > 0 && (
          <div className="flex justify-center mb-3">
            <div className="bg-gray-800/90 dark:bg-gray-800/90 backdrop-blur shadow-lg rounded-full flex items-center p-1 border border-white/10 pointer-events-auto">
              <button
                onClick={clearSelection}
                className="p-2 text-gray-300 hover:text-white transition-colors"
                title="取消选择"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="w-px h-5 bg-white/20 mx-1"></div>
              <button
                onClick={handleSelectAllToggle}
                className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                title={selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0 ? "取消全选" : "全选当前可见"}
              >
                {selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0 ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path strokeDasharray="4 4" d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z" />
                  </svg>
                )}
              </button>
              <div className="w-px h-5 bg-white/20 mx-1"></div>
              <button
                onClick={handleToggleFavorite}
                className="p-2 text-yellow-400 hover:text-yellow-300 transition-colors"
                title="收藏/取消收藏"
              >
                {selectedTaskIds.length > 0 && selectedTaskIds.every((id) => tasks.find((t) => t.id === id)?.isFavorite) ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                )}
              </button>
              <div className="w-px h-5 bg-white/20 mx-1"></div>
              <button
                onClick={handleDeleteSelected}
                className="p-2 text-red-400 hover:text-red-300 transition-colors"
                title="删除选中"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        )}
        <div ref={cardRef} className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl border border-white/50 dark:border-white/[0.08] shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] rounded-2xl sm:rounded-3xl p-3 sm:p-4 ring-1 ring-black/5 dark:ring-white/10">
          {/* 移动端拖动条 */}
          <div
            ref={handleRef}
            className="sm:hidden flex justify-center pt-0.5 pb-2 -mt-1 cursor-pointer touch-none"
            onClick={() => setMobileCollapsed((v) => !v)}
          >
            <div className={`w-10 h-1 rounded-full bg-gray-300 dark:bg-white/[0.06] transition-transform duration-200 ${mobileCollapsed ? 'scale-x-75' : ''}`} />
          </div>

          {/* 输入图片行（移动端可折叠） */}
          {inputImages.length > 0 && (
            isMobile ? (
              <>
                <div className={`collapse-section${mobileCollapsed ? ' collapsed' : ''}`}>
                  <div className="collapse-inner">
                    {renderImageThumbs()}
                  </div>
                </div>
                {mobileCollapsed && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mb-2 ml-1">
                    {maskDraft ? `1 张遮罩主图 · ${referenceImages.length} 张参考图` : `${inputImages.length} 张参考图`}
                  </div>
                )}
              </>
            ) : (
              renderImageThumbs()
            )
          )}

          {/* 输入框 */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="描述你想生成的图片..."
            className="w-full px-4 py-3 rounded-2xl border border-gray-200/60 dark:border-white/[0.08] bg-white/50 dark:bg-white/[0.03] text-sm focus:outline-none leading-relaxed resize-none shadow-sm transition-[border-color,box-shadow] duration-200"
          />

          {/* 参数 + 按钮 */}
          <div className="mt-3">
            {/* 桌面端布局 */}
            <div className="hidden sm:flex items-end justify-between gap-3">
              {renderParams('grid-cols-6')}

              <div className="flex items-end gap-2 flex-shrink-0 mb-0.5">
                {renderConsumeBadge()}
                <div
                  className="relative"
                  onMouseEnter={() => setAttachHover(true)}
                  onMouseLeave={() => setAttachHover(false)}
                >
                  <ButtonTooltip visible={atImageLimit && attachHover} text={`参考图数量已达上限（${API_MAX_IMAGES} 张），无法继续添加`} />
                  <button
                    onClick={() => !atImageLimit && fileInputRef.current?.click()}
                    className={`p-2.5 rounded-xl transition-all shadow-sm ${
                      atImageLimit
                        ? 'bg-gray-200 dark:bg-white/[0.04] text-gray-300 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 dark:bg-white/[0.06] hover:bg-gray-300 dark:hover:bg-white/[0.1] text-gray-500 dark:text-gray-300 hover:shadow'
                    }`}
                    title={atImageLimit ? `已达上限 ${API_MAX_IMAGES} 张` : '添加参考图'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                </div>
                <div
                  className="relative"
                  onMouseEnter={() => setSubmitHover(true)}
                  onMouseLeave={() => setSubmitHover(false)}
                >
                  <ButtonTooltip visible={!token && submitHover} text="请先登录后再生成" />
                  <button
                    onClick={() => token ? submitTask() : setLoginOpen(true)}
                    disabled={token ? !canSubmit : false}
                    className={`p-2.5 rounded-xl transition-all shadow-sm hover:shadow ${
                      !token
                        ? 'bg-gray-300 dark:bg-white/[0.06] text-white cursor-pointer'
                        : 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-white/[0.04] disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                    title={token ? (maskDraft ? '遮罩编辑 (Ctrl+Enter)' : '生成 (Ctrl+Enter)') : '请先登录'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* 移动端布局 */}
            <div className="sm:hidden flex flex-col gap-2">
              <div className={`collapse-section${mobileCollapsed ? ' collapsed' : ''}`}>
                <div className="collapse-inner">
                  {renderParams('grid-cols-2')}
                  <div className="h-2" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {renderConsumeBadge(true)}
                <div
                  className="relative"
                  onMouseEnter={() => setAttachHover(true)}
                  onMouseLeave={() => setAttachHover(false)}
                >
                  <ButtonTooltip visible={atImageLimit && attachHover} text={`参考图数量已达上限（${API_MAX_IMAGES} 张），无法继续添加`} />
                  <button
                    onClick={() => !atImageLimit && fileInputRef.current?.click()}
                    className={`p-2.5 rounded-xl transition-all shadow-sm flex-shrink-0 ${
                      atImageLimit
                        ? 'bg-gray-200 dark:bg-white/[0.04] text-gray-300 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 dark:bg-white/[0.06] hover:bg-gray-300 dark:hover:bg-white/[0.1] text-gray-500 dark:text-gray-300'
                    }`}
                    title={atImageLimit ? `已达上限 ${API_MAX_IMAGES} 张` : '添加参考图'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                </div>
                <div
                  className="relative flex-1"
                  onMouseEnter={() => setSubmitHover(true)}
                  onMouseLeave={() => setSubmitHover(false)}
                >
                  <ButtonTooltip visible={!token && submitHover} text="请先登录后再生成" />
                  <button
                    onClick={() => token ? submitTask() : setLoginOpen(true)}
                    disabled={token ? !canSubmit : false}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm ${
                      !token
                        ? 'bg-gray-300 dark:bg-white/[0.06] text-white cursor-pointer'
                        : 'bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-white/[0.04] disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    {maskDraft ? '遮罩编辑' : '生成图像'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>
    </>
  )
}
