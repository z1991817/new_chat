import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AppSettings,
  TaskParams,
  InputImage,
  MaskDraft,
  TaskRecord,
  ExportData,
  StoredImage,
} from './types'
import { DEFAULT_SETTINGS, DEFAULT_PARAMS } from './types'
import { hashDataUrl } from './lib/imageHash'
import { validateMaskMatchesImage } from './lib/canvasImage'
import { orderInputImagesForMask } from './lib/mask'
import { calculateImageSize, normalizeImageSize } from './lib/size'
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate'
import {
  BackendApiError,
  type BackendModel,
  type BackendUser,
  type CreationRecord,
  createBananaImage,
  createImageToImage,
  createTextToImage,
  getCurrentUser,
  getMyCreationsPage,
  getModels,
  login as loginApi,
  queryTask,
  register as registerApi,
  resolveAssetUrl,
  sendCode as sendCodeApi,
  uploadImage,
} from './lib/backendApi'

// ===== Image cache =====
// 内存缓存，id → dataUrl，避免重复下载或重复转换

const imageCache = new Map<string, string>()
const BANANA_TASK_STORAGE_KEY = 'banana-create-task'
const BANANA_SSE_FIRST_EVENT_TIMEOUT_MS = 5000
const BANANA_SSE_FALLBACK_DELAY_MS = 5000
const BANANA_POLL_INTERVAL_MS = 3000
const MY_CREATIONS_PAGE_SIZE = 15

let myCreationsPage = 0
let myCreationsTotalPages = 1
let myCreationsLoading = false

export function getCachedImage(id: string): string | undefined {
  return imageCache.get(id)
}

export async function ensureImageCached(id: string): Promise<string | undefined> {
  if (imageCache.has(id)) return imageCache.get(id)

  if (/^data:image\//i.test(id)) {
    imageCache.set(id, id)
    return id
  }

  if (/^https?:\/\//i.test(id)) {
    // 远程图片直接走 URL，让浏览器原生缓存生效，避免每次刷新都 fetch+blob 一遍。
    imageCache.set(id, id)
    return id
  }

  const fromInput = useStore.getState().inputImages.find((img) => img.id === id)?.dataUrl
  if (fromInput) {
    imageCache.set(id, fromInput)
    return fromInput
  }

  return undefined
}

async function storeImageInMemory(
  dataUrl: string,
  _source: NonNullable<StoredImage['source']> = 'upload',
): Promise<string> {
  const id = await hashDataUrl(dataUrl)
  imageCache.set(id, dataUrl)
  return id
}

function orderImagesWithMaskFirst(images: InputImage[], maskTargetImageId: string | null | undefined) {
  if (!maskTargetImageId) return images
  const maskIdx = images.findIndex((img) => img.id === maskTargetImageId)
  if (maskIdx <= 0) return images
  const next = [...images]
  const [maskImage] = next.splice(maskIdx, 1)
  next.unshift(maskImage)
  return next
}

// ===== Store 类型 =====

interface AppState {
  // 设置
  settings: AppSettings
  setSettings: (s: Partial<AppSettings>) => void
  token: string
  user: BackendUser | null
  setAuth: (payload: { token: string; user: BackendUser | null } | null) => void
  models: BackendModel[]
  setModels: (models: BackendModel[]) => void
  dismissedCodexCliPrompts: string[]
  dismissCodexCliPrompt: (key: string) => void

  // 输入
  prompt: string
  setPrompt: (p: string) => void
  inputImages: InputImage[]
  addInputImage: (img: InputImage) => void
  updateInputImage: (id: string, patch: Partial<InputImage>) => void
  removeInputImage: (idx: number) => void
  clearInputImages: () => void
  setInputImages: (imgs: InputImage[]) => void
  moveInputImage: (fromIdx: number, toIdx: number) => void
  maskDraft: MaskDraft | null
  setMaskDraft: (draft: MaskDraft | null) => void
  clearMaskDraft: () => void
  maskEditorImageId: string | null
  setMaskEditorImageId: (id: string | null) => void

  // 参数
  params: TaskParams
  setParams: (p: Partial<TaskParams>) => void

  // 任务列表
  tasks: TaskRecord[]
  setTasks: (t: TaskRecord[]) => void

  // 搜索和筛选
  searchQuery: string
  setSearchQuery: (q: string) => void
  filterStatus: 'all' | 'running' | 'done' | 'error'
  setFilterStatus: (status: AppState['filterStatus']) => void
  filterFavorite: boolean
  setFilterFavorite: (f: boolean) => void

  // 多选
  selectedTaskIds: string[]
  setSelectedTaskIds: (ids: string[] | ((prev: string[]) => string[])) => void
  toggleTaskSelection: (id: string, force?: boolean) => void
  clearSelection: () => void

  // UI
  detailTaskId: string | null
  setDetailTaskId: (id: string | null) => void
  lightboxImageId: string | null
  lightboxImageList: string[]
  setLightboxImageId: (id: string | null, list?: string[]) => void
  showSettings: boolean
  setShowSettings: (v: boolean) => void
  loginOpen: boolean
  setLoginOpen: (v: boolean) => void

  // Toast
  toast: { message: string; type: 'info' | 'success' | 'error' } | null
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void

  // Confirm dialog
  confirmDialog: {
    title: string
    message: string
    confirmText?: string
    messageAlign?: 'left' | 'center'
    tone?: 'danger' | 'warning'
    action: () => void
    cancelAction?: () => void
  } | null
  setConfirmDialog: (d: AppState['confirmDialog']) => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Settings
      settings: { ...DEFAULT_SETTINGS },
      setSettings: (s) => set((st) => ({
        settings: {
          ...st.settings,
          ...s,
          apiMode:
            s.apiMode === 'images' || s.apiMode === 'responses'
              ? s.apiMode
              : st.settings.apiMode ?? DEFAULT_SETTINGS.apiMode,
          codexCli: s.codexCli ?? st.settings.codexCli ?? DEFAULT_SETTINGS.codexCli,
          apiProxy: s.apiProxy ?? st.settings.apiProxy ?? DEFAULT_SETTINGS.apiProxy,
        },
      })),
      token: '',
      user: null,
      setAuth: (payload) =>
        set(() => ({
          token: payload?.token ?? '',
          user: payload?.user ?? null,
        })),
      models: [],
      setModels: (models) => set({ models }),
      dismissedCodexCliPrompts: [],
      dismissCodexCliPrompt: (key) => set((st) => ({
        dismissedCodexCliPrompts: st.dismissedCodexCliPrompts.includes(key)
          ? st.dismissedCodexCliPrompts
          : [...st.dismissedCodexCliPrompts, key],
      })),

      // Input
      prompt: '',
      setPrompt: (prompt) => set({ prompt }),
      inputImages: [],
      addInputImage: (img) =>
        set((s) => {
          if (s.inputImages.find((i) => i.id === img.id)) return s
          return { inputImages: [...s.inputImages, img] }
        }),
      updateInputImage: (id, patch) =>
        set((s) => ({
          inputImages: s.inputImages.map((img) => (img.id === id ? { ...img, ...patch } : img)),
        })),
      removeInputImage: (idx) =>
        set((s) => {
          const removed = s.inputImages[idx]
          const shouldClearMask = removed?.id === s.maskDraft?.targetImageId
          return {
            inputImages: s.inputImages.filter((_, i) => i !== idx),
            ...(shouldClearMask ? { maskDraft: null, maskEditorImageId: null } : {}),
          }
        }),
      clearInputImages: () =>
        set((s) => {
          for (const img of s.inputImages) imageCache.delete(img.id)
          return { inputImages: [], maskDraft: null, maskEditorImageId: null }
        }),
      setInputImages: (imgs) =>
        set((s) => {
          const inputImages = orderImagesWithMaskFirst(imgs, s.maskDraft?.targetImageId)
          const shouldClearMask =
            Boolean(s.maskDraft) && !inputImages.some((img) => img.id === s.maskDraft?.targetImageId)
          return {
            inputImages,
            ...(shouldClearMask ? { maskDraft: null, maskEditorImageId: null } : {}),
          }
        }),
      moveInputImage: (fromIdx, toIdx) =>
        set((s) => {
          const images = [...s.inputImages]
          if (fromIdx < 0 || fromIdx >= images.length) return s
          const maskTargetImageId = s.maskDraft?.targetImageId
          if (maskTargetImageId && images[fromIdx]?.id === maskTargetImageId) return s
          const minTargetIdx = maskTargetImageId && images.some((img) => img.id === maskTargetImageId) ? 1 : 0
          const targetIdx = Math.max(minTargetIdx, Math.min(images.length, toIdx))
          const insertIdx = fromIdx < targetIdx ? targetIdx - 1 : targetIdx
          if (insertIdx === fromIdx) return s
          const [moved] = images.splice(fromIdx, 1)
          images.splice(insertIdx, 0, moved)
          return { inputImages: images }
        }),
      maskDraft: null,
      setMaskDraft: (maskDraft) =>
        set((s) => ({
          maskDraft,
          inputImages: orderImagesWithMaskFirst(s.inputImages, maskDraft?.targetImageId),
        })),
      clearMaskDraft: () => set({ maskDraft: null }),
      maskEditorImageId: null,
      setMaskEditorImageId: (maskEditorImageId) => set({ maskEditorImageId }),

      // Params
      params: { ...DEFAULT_PARAMS },
      setParams: (p) => set((s) => ({ params: { ...s.params, ...p } })),

      // Tasks
      tasks: [],
      setTasks: (tasks) => set({ tasks }),

      // Search & Filter
      searchQuery: '',
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      filterStatus: 'all',
      setFilterStatus: (filterStatus) => set({ filterStatus }),
      filterFavorite: false,
      setFilterFavorite: (filterFavorite) => set({ filterFavorite }),

      // Selection
      selectedTaskIds: [],
      setSelectedTaskIds: (updater) => set((s) => ({
        selectedTaskIds: typeof updater === 'function' ? updater(s.selectedTaskIds) : updater
      })),
      toggleTaskSelection: (id, force) => set((s) => {
        const isSelected = s.selectedTaskIds.includes(id)
        const shouldSelect = force !== undefined ? force : !isSelected
        if (shouldSelect === isSelected) return s
        return {
          selectedTaskIds: shouldSelect
            ? [...s.selectedTaskIds, id]
            : s.selectedTaskIds.filter((x) => x !== id)
        }
      }),
      clearSelection: () => set({ selectedTaskIds: [] }),

      // UI
      detailTaskId: null,
      setDetailTaskId: (detailTaskId) => set({ detailTaskId }),
      lightboxImageId: null,
      lightboxImageList: [],
      setLightboxImageId: (lightboxImageId, list) =>
        set({ lightboxImageId, lightboxImageList: list ?? (lightboxImageId ? [lightboxImageId] : []) }),
      showSettings: false,
      setShowSettings: (showSettings) => set({ showSettings }),
      loginOpen: false,
      setLoginOpen: (loginOpen) => set({ loginOpen }),

      // Toast
      toast: null,
      showToast: (message, type = 'info') => {
        set({ toast: { message, type } })
        setTimeout(() => {
          set((s) => (s.toast?.message === message ? { toast: null } : s))
        }, 3000)
      },

      // Confirm
      confirmDialog: null,
      setConfirmDialog: (confirmDialog) => set({ confirmDialog }),
    }),
    {
      name: 'gpt-image-playground',
      partialize: (state) => ({
        settings: state.settings,
        params: state.params,
        token: state.token,
        user: state.user,
        dismissedCodexCliPrompts: state.dismissedCodexCliPrompts,
      }),
    },
  ),
)

// ===== Actions =====

let uid = 0
function genId(): string {
  return Date.now().toString(36) + (++uid).toString(36) + Math.random().toString(36).slice(2, 6)
}

export function getCodexCliPromptKey(settings: AppSettings): string {
  return `${settings.baseUrl}\n${settings.apiKey}`
}

export function showCodexCliPrompt(force = false, reason = '接口返回的提示词已被改写') {
  const state = useStore.getState()
  const settings = state.settings
  const promptKey = getCodexCliPromptKey(settings)
  if (!force && (settings.codexCli || state.dismissedCodexCliPrompts.includes(promptKey))) return

  state.setConfirmDialog({
    title: '检测到 Codex CLI API',
    message: `${reason}，当前 API 来源很可能是 Codex CLI。\n\n是否开启 Codex CLI 兼容模式？开启后会禁用在此处无效的质量参数，并在 Images API 多图生成时使用并发请求，解决该 API 数量参数无效的问题。同时，提示词文本开头会加入简短的不改写要求，避免模型重写提示词，偏离原意。`,
    confirmText: '开启',
    action: () => {
      const state = useStore.getState()
      state.dismissCodexCliPrompt(promptKey)
      state.setSettings({ codexCli: true })
    },
    cancelAction: () => useStore.getState().dismissCodexCliPrompt(promptKey),
  })
}

function normalizeParamsForSettings(params: TaskParams, settings: AppSettings): TaskParams {
  const normalizedAspectRatio = normalizeAspectRatioInput(params.aspectRatio)
  return {
    ...params,
    aspectRatio: normalizedAspectRatio ?? (DEFAULT_PARAMS.aspectRatio || '1:1'),
    size: normalizeImageSize(params.size) || DEFAULT_PARAMS.size,
    quality: settings.codexCli ? DEFAULT_PARAMS.quality : params.quality,
  }
}

function normalizeTaskStatus(status: string | null | undefined): TaskRecord['status'] {
  const normalized = (status ?? '').toLowerCase()
  if (normalized === 'success' || normalized === 'uploaded' || normalized === 'done') return 'done'
  if (normalized === 'failed' || normalized === 'error') return 'error'
  return 'running'
}

function normalizeQuality(value: string | null | undefined): TaskParams['quality'] {
  if (value === 'low' || value === 'medium' || value === 'high') return value
  return 'auto'
}

function normalizeFormat(value: string | null | undefined): TaskParams['output_format'] {
  if (value === 'jpeg' || value === 'webp') return value
  return 'png'
}

function parseTime(value: string | number | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (!value) return Date.now()
  const parsed = Date.parse(String(value))
  return Number.isFinite(parsed) ? parsed : Date.now()
}

function toLocalTask(record: CreationRecord, settings: AppSettings): TaskRecord {
  const createdAt = parseTime(record.created_at)
  const updatedAt = parseTime(record.updated_at)
  const outputUrl = resolveAssetUrl(settings, record.thumbnail_url || record.cos_url || '')
  const outputCosUrl = resolveAssetUrl(settings, record.cos_url || '')
  const sourceUrl = resolveAssetUrl(settings, record.source_image_url || '')
  const taskId = `remote-${record.id}`
  const size = record.size?.trim() || DEFAULT_PARAMS.size
  const quantity = Number(record.n) > 0 ? Number(record.n) : 1

  return {
    id: taskId,
    prompt: record.prompt?.trim() || '',
    model: record.model?.trim() || undefined,
    params: {
      ...DEFAULT_PARAMS,
      aspectRatio: buildAspectRatio(size),
      size,
      quality: normalizeQuality(record.quality),
      output_format: normalizeFormat(undefined),
      n: quantity,
    },
    inputImageIds: sourceUrl ? [sourceUrl] : [],
    outputImages: outputUrl ? [outputUrl] : [],
    outputCosUrlByImage: outputUrl && outputCosUrl ? { [outputUrl]: outputCosUrl } : undefined,
    status: normalizeTaskStatus(record.status),
    error: null,
    createdAt,
    finishedAt: updatedAt,
    elapsed: updatedAt >= createdAt ? updatedAt - createdAt : null,
  }
}

function buildAspectRatio(size: string): string {
  const value = size.trim()
  const simplify = (width: number, height: number) => {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
    const divisor = gcd(width, height)
    return `${Math.max(1, Math.round(width / divisor))}:${Math.max(1, Math.round(height / divisor))}`
  }
  if (/^\d+:\d+$/.test(value)) {
    const [width, height] = value.split(':').map((item) => Number(item))
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
      return simplify(width, height)
    }
    return '1:1'
  }
  const match = value.match(/^\s*(\d+)\s*[xX×]\s*(\d+)\s*$/)
  if (!match) return '1:1'
  return simplify(Number(match[1]), Number(match[2]))
}

function normalizeAspectRatioInput(value: string | undefined): string | null {
  if (!value) return null
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*[:xX×]\s*(\d+(?:\.\d+)?)$/)
  if (!match) return null

  const width = Number(match[1])
  const height = Number(match[2])
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null
  }

  return `${width}:${height}`
}

function buildImageSizeTier(size: string): '1K' | '2K' | '4K' {
  const normalized = normalizeImageSize(size).trim().replace(/[X×]/g, 'x')
  const match = normalized.match(/^(\d+)x(\d+)$/)
  if (!match) return '1K'

  const ratio = buildAspectRatio(normalized)
  const tiers: Array<'1K' | '2K' | '4K'> = ['1K', '2K', '4K']
  for (const tier of tiers) {
    const tierSize = calculateImageSize(tier, ratio)
    if (!tierSize) continue
    if (normalizeImageSize(tierSize).trim().replace(/[X×]/g, 'x') === normalized) {
      return tier
    }
  }

  // Fallback for non-preset custom sizes.
  const width = Number(match[1])
  const height = Number(match[2])
  const maxEdge = Math.max(width, height)
  if (maxEdge >= 3000) return '4K'
  if (maxEdge >= 1600) return '2K'
  return '1K'
}

function resolveRequestSize(size: string): string {
  const normalized = normalizeImageSize(size).trim()
  if (/^\d+\s*[xX×]\s*\d+$/.test(normalized)) {
    return normalized.replace(/[X×]/g, 'x')
  }
  const ratio = buildAspectRatio(size)
  return calculateImageSize('1K', ratio) ?? '1024x1024'
}

function normalizeBackendQuality(value: TaskParams['quality']): 'low' | 'medium' | 'high' {
  if (value === 'low' || value === 'high') return value
  return 'medium'
}

function normalizeBackendOutputFormat(value: TaskParams['output_format']): 'jpg' | 'png' | 'webp' {
  if (value === 'jpeg') return 'jpg'
  if (value === 'webp') return 'webp'
  return 'png'
}

function isGptImage15Model(modelKey: string): boolean {
  const normalized = modelKey.trim().toLowerCase()
  return normalized === 'gpt-image-1.5' || normalized === 'gpt-image/1.5'
}

async function dataUrlToFile(dataUrl: string, fileName: string): Promise<File> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const mime = blob.type || 'image/png'
  return new File([blob], fileName, { type: mime })
}

interface PersistedTaskMeta {
  localTaskId: string
  taskId: string
  queryPath: string
  ssePath?: string
  prompt: string
  createdAt: number
}

interface TaskTerminalPayload {
  status: TaskRecord['status']
  error?: string
  result?: {
    size?: string
    quality?: string
    outputFormat?: string
    quantity?: number
    cosUrl?: string | null
    previewUrl?: string | null
  }
}

class TaskFailedError extends Error {}
class SseTransportError extends Error {}

function persistActiveTaskMeta(meta: PersistedTaskMeta) {
  try {
    localStorage.setItem(BANANA_TASK_STORAGE_KEY, JSON.stringify(meta))
  } catch {
    // ignore
  }
}

function readActiveTaskMeta(): PersistedTaskMeta | null {
  try {
    const raw = localStorage.getItem(BANANA_TASK_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistedTaskMeta>
    if (!parsed?.localTaskId || !parsed?.taskId || !parsed?.queryPath) return null
    return {
      localTaskId: parsed.localTaskId,
      taskId: parsed.taskId,
      queryPath: parsed.queryPath,
      ssePath: parsed.ssePath,
      prompt: parsed.prompt || '',
      createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : Date.now(),
    }
  } catch {
    return null
  }
}

function clearActiveTaskMeta() {
  try {
    localStorage.removeItem(BANANA_TASK_STORAGE_KEY)
  } catch {
    // ignore
  }
}

function mapQueryResultToTerminal(query: Awaited<ReturnType<typeof queryTask>>): TaskTerminalPayload {
  const status = normalizeTaskStatus(query.status)
  if (status === 'done') {
    return {
      status: 'done',
      result: {
        size: query.size,
        quality: query.quality,
        outputFormat: query.outputFormat,
        quantity: query.quantity,
        cosUrl: query.cosUrl,
        previewUrl: query.previewUrl,
      },
    }
  }
  if (status === 'error') {
    return {
      status: 'error',
      error: query.errorMessage?.trim() || '生成失败',
    }
  }
  return { status: 'running' }
}

function parseSseEventPayload(eventData: string): TaskTerminalPayload {
  let parsed: unknown = null
  try {
    parsed = JSON.parse(eventData)
  } catch {
    return { status: 'running' }
  }
  if (!parsed || typeof parsed !== 'object') return { status: 'running' }
  const payload = parsed as Record<string, unknown>
  const event = typeof payload.event === 'string' ? payload.event : ''
  const data = payload.data && typeof payload.data === 'object' ? payload.data as Record<string, unknown> : payload
  const rawStatus =
    typeof data.status === 'string'
      ? data.status
      : event === 'task_success'
      ? 'success'
      : event === 'task_failed'
      ? 'failed'
      : 'running'
  const status = normalizeTaskStatus(rawStatus)
  if (status === 'done') {
    return {
      status: 'done',
      result: {
        size: typeof data.size === 'string' ? data.size : undefined,
        quality: typeof data.quality === 'string' ? data.quality : undefined,
        outputFormat:
          typeof data.outputFormat === 'string'
            ? data.outputFormat
            : typeof data.output_format === 'string'
            ? data.output_format
            : undefined,
        quantity:
          typeof data.quantity === 'number'
            ? data.quantity
            : typeof data.n === 'number'
            ? data.n
            : undefined,
        cosUrl:
          typeof data.cosUrl === 'string'
            ? data.cosUrl
            : typeof data.cos_url === 'string'
            ? data.cos_url
            : null,
        previewUrl:
          typeof data.previewUrl === 'string'
            ? data.previewUrl
            : typeof data.preview_url === 'string'
            ? data.preview_url
            : null,
      },
    }
  }
  if (status === 'error') {
    const error =
      (typeof data.errorMessage === 'string' && data.errorMessage) ||
      (typeof data.error_message === 'string' && data.error_message) ||
      (typeof payload.message === 'string' && payload.message) ||
      '生成失败'
    return { status: 'error', error }
  }
  return { status: 'running' }
}

function applyTaskSuccess(task: TaskRecord, terminal: TaskTerminalPayload) {
  const state = useStore.getState()
  const outputCosUrl = resolveAssetUrl(state.settings, terminal.result?.cosUrl || '')
  const outputUrl = resolveAssetUrl(
    state.settings,
    terminal.result?.previewUrl || terminal.result?.cosUrl || '',
  )
  if (!outputUrl) {
    throw new Error('任务已完成但未返回图片地址')
  }
  updateTaskInStore(task.id, {
    outputImages: [outputUrl],
    outputCosUrlByImage: outputCosUrl ? { [outputUrl]: outputCosUrl } : undefined,
    actualParams: {
      size: terminal.result?.size || task.params.size,
      quality: normalizeQuality(terminal.result?.quality),
      output_format: normalizeFormat(terminal.result?.outputFormat),
      n: terminal.result?.quantity && terminal.result.quantity > 0 ? terminal.result.quantity : 1,
    },
    status: 'done',
    finishedAt: Date.now(),
    elapsed: Date.now() - task.createdAt,
    error: null,
  })
}

async function waitTaskByPolling(
  settings: AppSettings,
  token: string,
  queryPath: string,
  timeoutAt: number,
): Promise<TaskTerminalPayload> {
  for (;;) {
    const query = await queryTask(settings, token, queryPath)
    const terminal = mapQueryResultToTerminal(query)
    if (terminal.status === 'done' || terminal.status === 'error') return terminal
    if (Date.now() >= timeoutAt) {
      throw new Error('任务处理超时，请稍后在“我的记录”中查看结果')
    }
    await new Promise((resolve) => window.setTimeout(resolve, BANANA_POLL_INTERVAL_MS))
  }
}

async function waitTaskBySse(
  settings: AppSettings,
  token: string,
  ssePath: string,
  timeoutAt: number,
): Promise<TaskTerminalPayload> {
  const sseUrl = resolveAssetUrl(settings, ssePath)
  if (!sseUrl) throw new SseTransportError('SSE 地址无效')

  const controller = new AbortController()
  let firstEventReceived = false
  let firstEventTimeout = false
  const firstEventTimer = window.setTimeout(() => {
    firstEventTimeout = true
    controller.abort()
  }, BANANA_SSE_FIRST_EVENT_TIMEOUT_MS)

  try {
    const response = await fetch(sseUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-store',
      },
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new SseTransportError(`SSE 连接失败（HTTP ${response.status}）`)
    }
    if (!response.body) {
      throw new SseTransportError('SSE 响应体为空')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (Date.now() < timeoutAt) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '')

      let separatorIndex = buffer.indexOf('\n\n')
      while (separatorIndex !== -1) {
        const chunk = buffer.slice(0, separatorIndex).replace(/\r/g, '')
        buffer = buffer.slice(separatorIndex + 2)
        separatorIndex = buffer.indexOf('\n\n')

        const dataLines: string[] = []
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart())
        }
        if (!dataLines.length) continue
        if (!firstEventReceived) {
          firstEventReceived = true
          window.clearTimeout(firstEventTimer)
        }

        const terminal = parseSseEventPayload(dataLines.join('\n'))
        if (terminal.status === 'done') return terminal
        if (terminal.status === 'error') {
          throw new TaskFailedError(terminal.error || '生成失败')
        }
      }
    }

    throw new SseTransportError('SSE 连接中断，未收到终态')
  } catch (error) {
    if (error instanceof TaskFailedError) throw error
    if (firstEventTimeout) {
      throw new SseTransportError('SSE 首事件超时')
    }
    if (Date.now() >= timeoutAt) {
      throw new Error('任务处理超时，请稍后在“我的记录”中查看结果')
    }
    throw error instanceof Error ? new SseTransportError(error.message) : new SseTransportError('SSE 连接异常')
  } finally {
    window.clearTimeout(firstEventTimer)
  }
}

async function waitTaskWithSseFallback(
  settings: AppSettings,
  token: string,
  queryPath: string,
  ssePath: string | undefined,
  timeoutAt: number,
): Promise<TaskTerminalPayload> {
  if (!ssePath) {
    return waitTaskByPolling(settings, token, queryPath, timeoutAt)
  }
  try {
    return await waitTaskBySse(settings, token, ssePath, timeoutAt)
  } catch (error) {
    if (error instanceof TaskFailedError) {
      return { status: 'error', error: error.message }
    }
    if (!(error instanceof SseTransportError)) {
      throw error
    }
    await new Promise((resolve) => window.setTimeout(resolve, BANANA_SSE_FALLBACK_DELAY_MS))
    return waitTaskByPolling(settings, token, queryPath, timeoutAt)
  }
}

function isUnauthorizedError(error: unknown): boolean {
  return error instanceof BackendApiError && (error.status === 401 || error.code === 401)
}

function handleUnauthorized() {
  const state = useStore.getState()
  if (state.token) {
    state.showToast('登录失效，请重新登录', 'error')
  }
  state.setAuth(null)
  state.setLoginOpen(true)
}

function normalizeBackendBaseUrl(baseUrl: string): string {
  const value = (baseUrl || '').trim()
  if (!value) return DEFAULT_SETTINGS.baseUrl
  if (/^https?:\/\/api\.openai\.com(?:\/|$)/i.test(value)) {
    return DEFAULT_SETTINGS.baseUrl
  }
  return value
}

export async function refreshCurrentUser(options: { silent?: boolean } = {}) {
  const state = useStore.getState()
  if (!state.token) return null
  try {
    const user = await getCurrentUser(state.settings, state.token)
    state.setAuth({ token: state.token, user })
    return user
  } catch (error) {
    if (isUnauthorizedError(error)) {
      handleUnauthorized()
      return null
    }
    if (!options.silent) {
      state.showToast(error instanceof Error ? error.message : '获取用户信息失败', 'error')
    }
    return null
  }
}

export async function refreshModels(options: { silent?: boolean } = {}) {
  const state = useStore.getState()
  try {
    const models = await getModels(state.settings, state.token || undefined)
    state.setModels(models)
    if (models.length > 0 && !models.some((item) => item.model_key === state.settings.model)) {
      state.setSettings({ model: models[0].model_key })
    }
    return models
  } catch (error) {
    if (!options.silent) {
      state.showToast(error instanceof Error ? error.message : '获取模型列表失败', 'error')
    }
    return []
  }
}

export async function refreshMyCreations(options: { silent?: boolean } = {}) {
  const state = useStore.getState()
  if (!state.token) return []
  if (myCreationsLoading) return state.tasks
  myCreationsLoading = true
  try {
    const pageData = await getMyCreationsPage(state.settings, state.token, 1, MY_CREATIONS_PAGE_SIZE)
    const list = pageData?.list ?? []
    const remoteTasks = list.map((item) => toLocalTask(item, state.settings)).sort((a, b) => b.createdAt - a.createdAt)
    const localRunningTasks = state.tasks.filter(
      (task) => task.status === 'running' && !task.id.startsWith('remote-'),
    )
    const tasks = [...localRunningTasks, ...remoteTasks]
    myCreationsPage = 1
    myCreationsTotalPages = Math.max(pageData?.pagination?.totalPages ?? 1, 1)
    state.setTasks(tasks)
    return tasks
  } catch (error) {
    if (isUnauthorizedError(error)) {
      handleUnauthorized()
      return []
    }
    if (!options.silent) {
      state.showToast(error instanceof Error ? error.message : '加载我的记录失败', 'error')
    }
    return []
  } finally {
    myCreationsLoading = false
  }
}

export async function loadMoreMyCreations(options: { silent?: boolean } = {}) {
  const state = useStore.getState()
  if (!state.token) return false
  if (myCreationsLoading) return false
  if (myCreationsPage >= myCreationsTotalPages) return false

  myCreationsLoading = true
  try {
    const nextPage = myCreationsPage + 1
    const pageData = await getMyCreationsPage(state.settings, state.token, nextPage, MY_CREATIONS_PAGE_SIZE)
    const list = pageData?.list ?? []
    const incoming = list.map((item) => toLocalTask(item, state.settings)).sort((a, b) => b.createdAt - a.createdAt)
    const existingIds = new Set(state.tasks.map((task) => task.id))
    const appendTasks = incoming.filter((task) => !existingIds.has(task.id))
    if (appendTasks.length > 0) {
      const merged = [...state.tasks, ...appendTasks]
      state.setTasks(merged)
    }
    myCreationsPage = nextPage
    myCreationsTotalPages = Math.max(pageData?.pagination?.totalPages ?? myCreationsTotalPages, myCreationsTotalPages, 1)
    return appendTasks.length > 0
  } catch (error) {
    if (isUnauthorizedError(error)) {
      handleUnauthorized()
      return false
    }
    if (!options.silent) {
      state.showToast(error instanceof Error ? error.message : '加载更多记录失败', 'error')
    }
    return false
  } finally {
    myCreationsLoading = false
  }
}

export async function loginWithPassword(username: string, password: string) {
  const state = useStore.getState()
  const response = await loginApi(state.settings, { username, password })
  if (!response?.token) throw new Error('登录失败：未返回 token')
  state.setAuth({ token: response.token, user: response.user ?? null })
  await Promise.all([
    refreshCurrentUser({ silent: true }),
    refreshModels({ silent: true }),
    refreshMyCreations({ silent: true }),
  ])
}

export async function registerWithPassword(username: string, password: string, email: string, code: string) {
  const state = useStore.getState()
  const response = await registerApi(state.settings, { username, password, email, code })
  if (!response?.token) throw new Error('注册失败：未返回 token')
  state.setAuth({ token: response.token, user: response.user ?? null })
  await Promise.all([
    refreshCurrentUser({ silent: true }),
    refreshModels({ silent: true }),
    refreshMyCreations({ silent: true }),
  ])
}

export async function sendRegisterCode(email: string) {
  const state = useStore.getState()
  await sendCodeApi(state.settings, email)
}

export function logout() {
  const state = useStore.getState()
  clearActiveTaskMeta()
  myCreationsPage = 0
  myCreationsTotalPages = 1
  myCreationsLoading = false
  state.setAuth(null)
  state.setTasks([])
  state.clearSelection()
}

/** 初始化：任务数据以服务端返回为准，图片仅保留内存缓存 */
export async function initStore() {
  const state = useStore.getState()
  const normalizedBaseUrl = normalizeBackendBaseUrl(state.settings.baseUrl)
  if (normalizedBaseUrl !== state.settings.baseUrl) {
    state.setSettings({ baseUrl: normalizedBaseUrl })
  }
  state.setTasks([])

  await refreshModels({ silent: true })
  if (state.token) {
    await Promise.all([
      refreshCurrentUser({ silent: true }),
      refreshMyCreations({ silent: true }),
    ])

    const activeTaskMeta = readActiveTaskMeta()
    if (activeTaskMeta && activeTaskMeta.localTaskId) {
      const latestState = useStore.getState()
      let resumeTask = latestState.tasks.find((item) => item.id === activeTaskMeta.localTaskId)
      if (!resumeTask) {
        resumeTask = {
          id: activeTaskMeta.localTaskId,
          prompt: activeTaskMeta.prompt || '',
          params: { ...DEFAULT_PARAMS },
          inputImageIds: [],
          outputImages: [],
          status: 'running',
          error: null,
          createdAt: activeTaskMeta.createdAt || Date.now(),
          finishedAt: null,
          elapsed: null,
        }
        latestState.setTasks([resumeTask, ...latestState.tasks])
      }
      if (resumeTask.status === 'running') {
        void executeTask(activeTaskMeta.localTaskId, activeTaskMeta)
      } else {
        clearActiveTaskMeta()
      }
    }
  }
}

/** 提交新任务 */
export async function submitTask(options: { allowFullMask?: boolean } = {}) {
  const { token, settings, prompt, inputImages, maskDraft, params, showToast, setConfirmDialog, setLoginOpen } =
    useStore.getState()

  if (!token) {
    showToast('请先登录后再生成', 'error')
    setLoginOpen(true)
    return
  }

  if (!prompt.trim()) {
    showToast('请输入提示词', 'error')
    return
  }

  clearActiveTaskMeta()

  let orderedInputImages = inputImages
  let maskImageId: string | null = null
  let maskTargetImageId: string | null = null

  if (maskDraft) {
    try {
      orderedInputImages = orderInputImagesForMask(inputImages, maskDraft.targetImageId)
      const coverage = await validateMaskMatchesImage(maskDraft.maskDataUrl, orderedInputImages[0].dataUrl)
      if (coverage === 'full' && !options.allowFullMask) {
        setConfirmDialog({
          title: '确认编辑整张图片？',
          message: '当前遮罩覆盖了整张图片，提交后可能会重绘全部内容。是否继续？',
          confirmText: '继续提交',
          tone: 'warning',
          action: () => {
            void submitTask({ allowFullMask: true })
          },
        })
        return
      }
      maskImageId = await storeImageInMemory(maskDraft.maskDataUrl, 'mask')
      maskTargetImageId = maskDraft.targetImageId
    } catch (err) {
      if (!inputImages.some((img) => img.id === maskDraft.targetImageId)) {
        useStore.getState().clearMaskDraft()
      }
      showToast(err instanceof Error ? err.message : String(err), 'error')
      return
    }
  }

  // 统一把当前输入图放进内存缓存，便于后续上传与复用
  for (const img of orderedInputImages) {
    await storeImageInMemory(img.dataUrl, 'upload')
  }

  const normalizedParams = normalizeParamsForSettings(params, settings)
  if (
    normalizedParams.aspectRatio !== params.aspectRatio ||
    normalizedParams.size !== params.size ||
    normalizedParams.quality !== params.quality
  ) {
    useStore.getState().setParams({
      aspectRatio: normalizedParams.aspectRatio,
      size: normalizedParams.size,
      quality: normalizedParams.quality,
    })
  }

  const taskId = genId()
  const model = settings.model.trim()
  const modelConfig = useStore.getState().models.find((item) => item.model_key === model)
  const requestSize = resolveRequestSize(normalizedParams.size)
  const requestImageSizeTier = buildImageSizeTier(requestSize)
  const matchedSkuBySize = modelConfig?.skus?.find((sku) => {
    return sku.image_size?.trim().toUpperCase() === requestImageSizeTier
  })
  const defaultSku = modelConfig?.skus?.find((sku) => sku.is_default === 1)
  const selectedSku = matchedSkuBySize ?? defaultSku
  const unitConsumePoints =
    typeof selectedSku?.unit_consume_points === 'number'
      ? selectedSku.unit_consume_points
      : typeof selectedSku?.consume_points === 'number'
      ? selectedSku.consume_points
      : typeof modelConfig?.unit_consume_points === 'number'
      ? modelConfig.unit_consume_points
      : typeof modelConfig?.consume_points === 'number'
      ? modelConfig.consume_points
      : null
  const task: TaskRecord = {
    id: taskId,
    prompt: prompt.trim(),
    model,
    skuId: selectedSku?.id ?? null,
    skuCode: selectedSku?.sku_code ?? modelConfig?.default_sku_code ?? null,
    unitConsumePoints,
    consumePoints: unitConsumePoints,
    params: normalizedParams,
    inputImageIds: orderedInputImages.map((i) => i.id),
    maskTargetImageId,
    maskImageId,
    outputImages: [],
    status: 'running',
    error: null,
    createdAt: Date.now(),
    finishedAt: null,
    elapsed: null,
  }

  const latestTasks = useStore.getState().tasks
  useStore.getState().setTasks([task, ...latestTasks])

  // 异步调用 API
  void executeTask(taskId)
}

async function ensureUploadedInputUrl(imgId: string, index: number, token: string, settings: AppSettings): Promise<string> {
  const state = useStore.getState()
  const existing = state.inputImages.find((img) => img.id === imgId)
  if (existing?.remoteUrl) return existing.remoteUrl

  const source = existing?.dataUrl || (await ensureImageCached(imgId))
  if (!source) throw new Error('输入图片已不存在')
  const file = await dataUrlToFile(source, `input-${index + 1}.png`)
  const uploaded = await uploadImage(settings, token, file)
  if (!uploaded?.url) throw new Error('上传图片失败：后端未返回 URL')

  if (existing) {
    state.updateInputImage(imgId, { remoteUrl: uploaded.url })
  }

  return uploaded.url
}

async function executeTask(taskId: string, resumeMeta?: PersistedTaskMeta) {
  const state = useStore.getState()
  const { settings, token } = state
  const task = state.tasks.find((t) => t.id === taskId)
  if (!task) return
  if (!token) {
    updateTaskInStore(taskId, {
      status: 'error',
      error: '请先登录后再生成',
      finishedAt: Date.now(),
      elapsed: Date.now() - task.createdAt,
    })
    return
  }

  try {
    let activeMeta = resumeMeta
    if (!activeMeta) {
      const uploadedImageUrls: string[] = []
      for (let i = 0; i < task.inputImageIds.length; i++) {
        const imageUrl = await ensureUploadedInputUrl(task.inputImageIds[i], i, token, settings)
        uploadedImageUrls.push(imageUrl)
      }

      const isImageToImage = uploadedImageUrls.length > 0
      const uploadedImageUrlsWithBase = uploadedImageUrls.map((url) => resolveAssetUrl(settings, url) || url)
      const model = settings.model.trim()
      const modelConfig = state.models.find((item) => item.model_key === model)
      const requestSize = resolveRequestSize(task.params.size)
      const requestImageSizeTier = buildImageSizeTier(requestSize)
      const matchedSkuBySize = modelConfig?.skus?.find((sku) => {
        return sku.image_size?.trim().toUpperCase() === requestImageSizeTier
      })
      const defaultSku = modelConfig?.skus?.find((sku) => sku.is_default === 1)
      const requestSkuByTaskId = task.skuId != null
        ? modelConfig?.skus?.find((sku) => sku.id === task.skuId)
        : undefined
      const requestSkuByTaskCode = task.skuCode
        ? modelConfig?.skus?.find((sku) => sku.sku_code === task.skuCode)
        : undefined
      const requestSku = requestSkuByTaskId ?? requestSkuByTaskCode ?? matchedSkuBySize ?? defaultSku
      const requestSkuCode = requestSku?.sku_code || task.skuCode || modelConfig?.default_sku_code || ''
      const requestAspectRatio = normalizeAspectRatioInput(task.params.aspectRatio) ?? (DEFAULT_PARAMS.aspectRatio || '1:1')
      const requestQuality = normalizeBackendQuality(task.params.quality)
      const requestIdempotencyKey = `${task.id}-${Date.now()}`
      const requiresSizeParam = isGptImage15Model(model)
      const taskMeta = /banana/i.test(model)
        ? await createBananaImage(settings, token, {
            type: isImageToImage ? 'image-to-image' : 'text-to-image',
            model,
            prompt: task.prompt,
            aspectRatio: requestAspectRatio,
            imageSize: requestImageSizeTier,
            outputFormat: normalizeBackendOutputFormat(task.params.output_format),
            skuCode: requestSkuCode || undefined,
            imageUrl: isImageToImage ? uploadedImageUrlsWithBase[0] : undefined,
            imageUrls: isImageToImage ? uploadedImageUrlsWithBase : undefined,
            idempotencyKey: requestIdempotencyKey,
            skuId: requestSku?.id,
          })
        : isImageToImage
        ? await createImageToImage(settings, token, {
            prompt: task.prompt,
            aspectRatio: requestAspectRatio,
            imageSize: requestImageSizeTier,
            model,
            skuId: requestSku?.id,
            skuCode: requestSkuCode || undefined,
            outputFormat: normalizeBackendOutputFormat(task.params.output_format),
            imageUrl: uploadedImageUrlsWithBase,
            quality: requestQuality,
            style: 'vivid',
            uploadToCos: true,
            idempotencyKey: requestIdempotencyKey,
            ...(requiresSizeParam ? { size: requestSize } : {}),
          })
        : await createTextToImage(settings, token, {
            prompt: task.prompt,
            aspectRatio: requestAspectRatio,
            imageSize: requestImageSizeTier,
            model,
            skuId: requestSku?.id,
            skuCode: requestSkuCode || undefined,
            outputFormat: normalizeBackendOutputFormat(task.params.output_format),
            n: 1,
            quality: requestQuality,
            style: 'vivid',
            uploadToCos: true,
            idempotencyKey: requestIdempotencyKey,
            ...(requiresSizeParam ? { size: requestSize } : {}),
          })

      if (!taskMeta?.queryPath || !taskMeta?.taskId) {
        throw new Error('任务创建成功但缺少 taskId 或 queryPath')
      }
      activeMeta = {
        localTaskId: task.id,
        taskId: taskMeta.taskId,
        queryPath: taskMeta.queryPath,
        ssePath: taskMeta.ssePath,
        prompt: task.prompt,
        createdAt: Date.now(),
      }
      persistActiveTaskMeta(activeMeta)
    }
    if (!activeMeta) {
      throw new Error('任务元信息丢失')
    }

    const timeoutAt = Date.now() + Math.max(settings.timeout * 1000, 60_000)
    const terminal = await waitTaskWithSseFallback(
      settings,
      token,
      activeMeta.queryPath,
      activeMeta.ssePath,
      timeoutAt,
    )
    if (terminal.status === 'done') {
      applyTaskSuccess(task, terminal)
      useStore.getState().showToast('生成完成', 'success')
      const currentMask = useStore.getState().maskDraft
      if (task.maskTargetImageId && currentMask?.targetImageId === task.maskTargetImageId) {
        useStore.getState().clearMaskDraft()
      }
      clearActiveTaskMeta()
      void refreshCurrentUser({ silent: true })
    } else {
      throw new Error(terminal.error || '生成失败')
    }
  } catch (err) {
    if (isUnauthorizedError(err)) {
      handleUnauthorized()
    }

    clearActiveTaskMeta()
    updateTaskInStore(taskId, {
      status: 'error',
      error: err instanceof Error ? err.message : String(err),
      finishedAt: Date.now(),
      elapsed: Date.now() - task.createdAt,
    })
    useStore.getState().setDetailTaskId(taskId)
  }

}

export function updateTaskInStore(taskId: string, patch: Partial<TaskRecord>) {
  const { tasks, setTasks } = useStore.getState()
  const updated = tasks.map((t) =>
    t.id === taskId ? { ...t, ...patch } : t,
  )
  setTasks(updated)
}

/** 重试失败的任务：创建新任务并执行 */
export async function retryTask(task: TaskRecord) {
  const { settings } = useStore.getState()
  const normalizedParams = normalizeParamsForSettings(task.params, settings)
  const taskId = genId()
  const newTask: TaskRecord = {
    id: taskId,
    prompt: task.prompt,
    params: normalizedParams,
    inputImageIds: [...task.inputImageIds],
    maskTargetImageId: task.maskTargetImageId ?? null,
    maskImageId: task.maskImageId ?? null,
    outputImages: [],
    status: 'running',
    error: null,
    createdAt: Date.now(),
    finishedAt: null,
    elapsed: null,
  }

  const latestTasks = useStore.getState().tasks
  useStore.getState().setTasks([newTask, ...latestTasks])

  executeTask(taskId)
}

/** 复用配置 */
export async function reuseConfig(task: TaskRecord) {
  const { setPrompt, setParams, setInputImages, setMaskDraft, clearMaskDraft, showToast } = useStore.getState()
  setPrompt(task.prompt)
  setParams(task.params)

  // 恢复输入图片
  const imgs: InputImage[] = []
  for (const imgId of task.inputImageIds) {
    const dataUrl = await ensureImageCached(imgId)
    if (dataUrl) {
      imgs.push({
        id: imgId,
        dataUrl,
        remoteUrl: /^https?:\/\//i.test(imgId) ? imgId : undefined,
      })
    }
  }
  setInputImages(imgs)
  const maskTargetImageId = task.maskTargetImageId ?? (task.maskImageId ? task.inputImageIds[0] : null)
  if (maskTargetImageId && task.maskImageId && imgs.some((img) => img.id === maskTargetImageId)) {
    const maskDataUrl = await ensureImageCached(task.maskImageId)
    if (maskDataUrl) {
      setMaskDraft({
        targetImageId: maskTargetImageId,
        maskDataUrl,
        updatedAt: Date.now(),
      })
    } else {
      clearMaskDraft()
    }
  } else {
    clearMaskDraft()
  }
  showToast('已复用配置到输入框', 'success')
}

/** 编辑输出：将输出图加入输入 */
export async function editOutputs(task: TaskRecord) {
  const { inputImages, addInputImage, showToast } = useStore.getState()
  if (!task.outputImages?.length) return

  let added = 0
  for (const imgId of task.outputImages) {
    if (inputImages.find((i) => i.id === imgId)) continue
    const dataUrl = await ensureImageCached(imgId)
    if (dataUrl) {
      addInputImage({
        id: imgId,
        dataUrl,
        remoteUrl: /^https?:\/\//i.test(imgId) ? imgId : undefined,
      })
      added++
    }
  }
  showToast(`已添加 ${added} 张输出图到输入`, 'success')
}

/** 删除多条任务 */
export async function removeMultipleTasks(taskIds: string[]) {
  const { tasks, setTasks, inputImages, showToast, selectedTaskIds } = useStore.getState()
  
  if (!taskIds.length) return

  const toDelete = new Set(taskIds)
  const remaining = tasks.filter(t => !toDelete.has(t.id))

  // 收集所有被删除任务的关联图片
  const deletedImageIds = new Set<string>()
  for (const t of tasks) {
    if (toDelete.has(t.id)) {
      for (const id of t.inputImageIds || []) deletedImageIds.add(id)
      if (t.maskImageId) deletedImageIds.add(t.maskImageId)
      for (const id of t.outputImages || []) deletedImageIds.add(id)
    }
  }

  setTasks(remaining)

  // 找出其他任务仍引用的图片
  const stillUsed = new Set<string>()
  for (const t of remaining) {
    for (const id of t.inputImageIds || []) stillUsed.add(id)
    if (t.maskImageId) stillUsed.add(t.maskImageId)
    for (const id of t.outputImages || []) stillUsed.add(id)
  }
  for (const img of inputImages) stillUsed.add(img.id)

  // 删除孤立图片
  for (const imgId of deletedImageIds) {
    if (!stillUsed.has(imgId)) {
      imageCache.delete(imgId)
    }
  }

  // 如果删除的任务在选中列表中，则移除
  const newSelection = selectedTaskIds.filter(id => !toDelete.has(id))
  if (newSelection.length !== selectedTaskIds.length) {
    useStore.getState().setSelectedTaskIds(newSelection)
  }

  showToast(`已删除 ${taskIds.length} 条记录`, 'success')
}

/** 删除单条任务 */
export async function removeTask(task: TaskRecord) {
  const { tasks, setTasks, inputImages, showToast } = useStore.getState()

  // 收集此任务关联的图片
  const taskImageIds = new Set([
    ...(task.inputImageIds || []),
    ...(task.maskImageId ? [task.maskImageId] : []),
    ...(task.outputImages || []),
  ])

  // 从列表移除
  const remaining = tasks.filter((t) => t.id !== task.id)
  setTasks(remaining)

  // 找出其他任务仍引用的图片
  const stillUsed = new Set<string>()
  for (const t of remaining) {
    for (const id of t.inputImageIds || []) stillUsed.add(id)
    if (t.maskImageId) stillUsed.add(t.maskImageId)
    for (const id of t.outputImages || []) stillUsed.add(id)
  }
  for (const img of inputImages) stillUsed.add(img.id)

  // 删除孤立图片
  for (const imgId of taskImageIds) {
    if (!stillUsed.has(imgId)) {
      imageCache.delete(imgId)
    }
  }

  showToast('记录已删除', 'success')
}

/** 清空所有数据（含配置重置） */
export async function clearAllData() {
  imageCache.clear()
  const { setTasks, clearInputImages, clearMaskDraft, setSettings, setParams, showToast } = useStore.getState()
  setTasks([])
  clearInputImages()
  useStore.setState({ dismissedCodexCliPrompts: [] })
  clearMaskDraft()
  setSettings({ ...DEFAULT_SETTINGS })
  setParams({ ...DEFAULT_PARAMS })
  showToast('所有数据已清空', 'success')
}

/** 从 dataUrl 解析出 MIME 扩展名和二进制数据 */
function dataUrlToBytes(dataUrl: string): { ext: string; bytes: Uint8Array } {
  const match = dataUrl.match(/^data:image\/(\w+);base64,/)
  const ext = match?.[1] ?? 'png'
  const b64 = dataUrl.replace(/^data:[^;]+;base64,/, '')
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return { ext, bytes }
}

/** 将二进制数据还原为 dataUrl */
function bytesToDataUrl(bytes: Uint8Array, filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? 'png'
  const mimeMap: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' }
  const mime = mimeMap[ext] ?? 'image/png'
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return `data:${mime};base64,${btoa(binary)}`
}

/** 导出数据为 ZIP */
export async function exportData() {
  try {
    const { settings, tasks } = useStore.getState()
    const exportedAt = Date.now()
    const imageCreatedAtFallback = new Map<string, number>()

    for (const task of tasks) {
      for (const id of [
        ...(task.inputImageIds || []),
        ...(task.maskImageId ? [task.maskImageId] : []),
        ...(task.outputImages || []),
      ]) {
        const prev = imageCreatedAtFallback.get(id)
        if (prev == null || task.createdAt < prev) {
          imageCreatedAtFallback.set(id, task.createdAt)
        }
      }
    }

    const imageFiles: ExportData['imageFiles'] = {}
    const zipFiles: Record<string, Uint8Array | [Uint8Array, { mtime: Date }]> = {}

    const exportedImageIds = new Set<string>()
    for (const id of imageCreatedAtFallback.keys()) {
      const dataUrl = imageCache.get(id)
      if (!dataUrl?.startsWith('data:image/')) continue
      const { ext, bytes } = dataUrlToBytes(dataUrl)
      const path = `images/${id}.${ext}`
      const createdAt = imageCreatedAtFallback.get(id) ?? exportedAt
      imageFiles[id] = { path, createdAt, source: 'upload' }
      zipFiles[path] = [bytes, { mtime: new Date(createdAt) }]
      exportedImageIds.add(id)
    }

    for (const img of useStore.getState().inputImages) {
      if (exportedImageIds.has(img.id)) continue
      if (!img.dataUrl?.startsWith('data:image/')) continue
      const { ext, bytes } = dataUrlToBytes(img.dataUrl)
      const path = `images/${img.id}.${ext}`
      imageFiles[img.id] = { path, createdAt: exportedAt, source: 'upload' }
      zipFiles[path] = [bytes, { mtime: new Date(exportedAt) }]
    }

    const manifest: ExportData = {
      version: 2,
      exportedAt: new Date(exportedAt).toISOString(),
      settings,
      tasks,
      imageFiles,
    }

    zipFiles['manifest.json'] = [strToU8(JSON.stringify(manifest, null, 2)), { mtime: new Date(exportedAt) }]

    const zipped = zipSync(zipFiles, { level: 6 })
    const blob = new Blob([zipped.buffer as ArrayBuffer], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gpt-image-playground-${Date.now()}.zip`
    a.click()
    URL.revokeObjectURL(url)
    useStore.getState().showToast('数据已导出', 'success')
  } catch (e) {
    useStore
      .getState()
      .showToast(
        `导出失败：${e instanceof Error ? e.message : String(e)}`,
        'error',
      )
  }
}

/** 导入 ZIP 数据 */
export async function importData(file: File) {
  try {
    const buffer = await file.arrayBuffer()
    const unzipped = unzipSync(new Uint8Array(buffer))

    const manifestBytes = unzipped['manifest.json']
    if (!manifestBytes) throw new Error('ZIP 中缺少 manifest.json')

    const data: ExportData = JSON.parse(strFromU8(manifestBytes))
    if (!data.tasks || !data.imageFiles) throw new Error('无效的数据格式')

    // 还原图片
    for (const [id, info] of Object.entries(data.imageFiles)) {
      const bytes = unzipped[info.path]
      if (!bytes) continue
      const dataUrl = bytesToDataUrl(bytes, info.path)
      imageCache.set(id, dataUrl)
    }

    if (data.settings) {
      useStore.getState().setSettings(data.settings)
    }

    useStore.getState().setTasks(data.tasks)
    useStore
      .getState()
      .showToast(`已导入 ${data.tasks.length} 条记录`, 'success')
  } catch (e) {
    useStore
      .getState()
      .showToast(
        `导入失败：${e instanceof Error ? e.message : String(e)}`,
        'error',
      )
  }
}

/** 添加图片到输入（文件上传）—— 仅放入内存缓存 */
export async function addImageFromFile(file: File): Promise<void> {
  if (!file.type.startsWith('image/')) return
  const dataUrl = await fileToDataUrl(file)
  const id = await hashDataUrl(dataUrl)
  imageCache.set(id, dataUrl)
  useStore.getState().addInputImage({ id, dataUrl })

  const { token, settings } = useStore.getState()
  if (!token) return

  try {
    const uploaded = await uploadImage(settings, token, file)
    if (uploaded?.url) {
      useStore.getState().updateInputImage(id, { remoteUrl: uploaded.url })
    }
  } catch (error) {
    useStore
      .getState()
      .showToast(
        `图片上传失败：${error instanceof Error ? error.message : String(error)}`,
        'error',
      )
  }
}

/** 添加图片到输入（右键菜单）—— 支持 data/blob/http URL */
export async function addImageFromUrl(src: string): Promise<void> {
  const res = await fetch(src)
  const blob = await res.blob()
  if (!blob.type.startsWith('image/')) throw new Error('不是有效的图片')
  const dataUrl = await blobToDataUrl(blob)
  const id = await hashDataUrl(dataUrl)
  imageCache.set(id, dataUrl)
  useStore.getState().addInputImage({ id, dataUrl })
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
