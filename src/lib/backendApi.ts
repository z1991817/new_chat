import type { AppSettings } from '../types'

interface BackendEnvelope<T> {
  success?: boolean
  code?: number
  message?: string
  data?: T
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE'
  token?: string
  body?: unknown
  signal?: AbortSignal
}

export class BackendApiError extends Error {
  status?: number
  code?: number

  constructor(message: string, options: { status?: number; code?: number } = {}) {
    super(message)
    this.name = 'BackendApiError'
    this.status = options.status
    this.code = options.code
  }
}

export interface BackendUser {
  id: number
  username: string
  nickname?: string | null
  email?: string | null
  avatar?: string | null
  points?: number | null
}

export interface BackendModelSku {
  id: number
  sku_code: string
  sku_name: string
  image_size?: string | null
  unit_consume_points?: number | null
  consume_points?: number | null
  is_default?: number
}

export interface BackendModel {
  id: number
  name: string
  model_key: string
  manufacturer?: string | null
  description?: string | null
  aspect_ratio?: string | null
  aspect_ratios?: string[]
  unit_consume_points?: number | null
  consume_points?: number | null
  default_sku_code?: string | null
  skus?: BackendModelSku[]
}

export interface CreationRecord {
  id: number
  prompt?: string | null
  source_image_url?: string | null
  model?: string | null
  size?: string | null
  quality?: string | null
  n?: number | null
  cos_url?: string | null
  thumbnail_url?: string | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
}

interface PaginatedCreations {
  list?: CreationRecord[]
  pagination?: {
    page?: number
    pageSize?: number
    totalPages?: number
  }
}

export interface RechargeOrderRecord {
  id: number
  order_no?: string | null
  package_name?: string | null
  amount?: number | null
  points?: number | null
  status?: string | null
  payment_channel?: string | null
  created_at?: string | null
}

export interface PointsLogRecord {
  id: number
  change_type?: string | null
  change_amount: number
  balance_after?: number | null
  order_no?: string | null
  remark?: string | null
  created_at?: string | null
}

export interface RechargePackage {
  id: string
  name: string
  amount: number
  points: number
}

export interface RechargeOrderPayload {
  packageId: string
  payType: 1 | 2 | 3 | 11
}

export interface RechargeOrderResult {
  orderId: number
  orderNo: string
  amount: number
  points: number
  packageName: string
  payUrl?: string | null
}

interface BackendPaginationList<T> {
  total?: number
  list?: T[]
  page?: number
  pageSize?: number
  totalPages?: number
}

interface PaginationList<T> {
  total: number
  list: T[]
  page: number
  pageSize: number
  totalPages: number
}

export interface TaskMeta {
  taskId: string
  queryPath: string
  ssePath?: string
}

export interface TaskQueryResult {
  status?: string
  errorMessage?: string | null
  prompt?: string
  size?: string
  quality?: string
  outputFormat?: string
  quantity?: number
  cosUrl?: string | null
  previewUrl?: string | null
  recordId?: number | null
}

interface BackendTaskEnvelope {
  taskId?: string
  queryPath?: string
  ssePath?: string
  upload?: {
    taskId?: string
    queryPath?: string
    ssePath?: string
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '')
}

function normalizeOrigin(baseUrl: string): string {
  const value = baseUrl.trim()
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`
  return normalizeBaseUrl(withProtocol)
}

function buildUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path
  return new URL(path.startsWith('/') ? path : `/${path}`, `${normalizeBaseUrl(baseUrl)}/`).toString()
}

function shouldUseImageBase(path: string): boolean {
  const normalized = path.trim().toLowerCase()
  return (
    normalized.startsWith('/temp/') ||
    normalized.startsWith('/generated/') ||
    normalized.startsWith('/apptempdata/') ||
    normalized.includes('imagemogr2/')
  )
}

function resolveImageBaseOrigin(settings: AppSettings): string {
  const envValue = import.meta.env.VITE_IMAGE_BASE_URL?.trim()
  if (envValue) return normalizeOrigin(envValue)
  return 'https://claude.artimg.top'
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function isSuccessCode(code: number | undefined): boolean {
  return code === 200 || code === 202
}

async function requestBackend<T>(settings: AppSettings, path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const headers = new Headers({
    Accept: 'application/json',
    'Cache-Control': 'no-store',
  })
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`)

  let body: BodyInit | undefined
  if (options.body instanceof FormData) {
    body = options.body
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(options.body)
  }

  const response = await fetch(buildUrl(settings.baseUrl, path), {
    method,
    headers,
    body,
    signal: options.signal,
  })

  const payload = await parseJsonSafe(response)
  const envelope = (payload && typeof payload === 'object' ? payload as BackendEnvelope<T> : null)
  const message =
    (envelope?.message && String(envelope.message)) ||
    (typeof payload === 'string' && payload) ||
    `请求失败（HTTP ${response.status}）`

  if (!response.ok) {
    throw new BackendApiError(message, {
      status: response.status,
      code: envelope?.code,
    })
  }

  if (envelope && envelope.code !== undefined && !isSuccessCode(envelope.code)) {
    throw new BackendApiError(message, {
      status: response.status,
      code: envelope.code,
    })
  }

  if (envelope) {
    return (envelope.data ?? (undefined as T))
  }
  return payload as T
}

export function resolveAssetUrl(settings: AppSettings, value: string | null | undefined): string {
  if (!value) return ''
  if (!/^https?:\/\//i.test(value) && shouldUseImageBase(value)) {
    return buildUrl(resolveImageBaseOrigin(settings), value)
  }
  return buildUrl(settings.baseUrl, value)
}

export async function login(settings: AppSettings, payload: { username: string; password: string }) {
  return requestBackend<{ token: string; user: BackendUser }>(settings, '/app/login', {
    method: 'POST',
    body: payload,
  })
}

export async function register(settings: AppSettings, payload: { username: string; password: string; email: string; code: string }) {
  return requestBackend<{ token: string; user: BackendUser }>(settings, '/app/register', {
    method: 'POST',
    body: payload,
  })
}

export async function sendCode(settings: AppSettings, email: string) {
  return requestBackend<unknown>(settings, '/app/send-code', {
    method: 'POST',
    body: { email },
  })
}

export async function getCurrentUser(settings: AppSettings, token: string) {
  return requestBackend<BackendUser>(settings, '/app/me', { token })
}

export async function getModels(settings: AppSettings, token?: string) {
  const response = await requestBackend<{ list?: BackendModel[] }>(settings, '/app/models', { token })
  return response?.list ?? []
}

export async function uploadImage(settings: AppSettings, token: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return requestBackend<{ id?: number; url?: string; filename?: string }>(settings, '/app/images/upload', {
    method: 'POST',
    token,
    body: formData,
  })
}

export async function createBananaImage(
  settings: AppSettings,
  token: string,
  payload: {
    type: 'text-to-image' | 'image-to-image'
    model: string
    prompt: string
    aspectRatio: string
    imageSize: '1K' | '2K' | '4K'
    outputFormat?: 'jpg' | 'png' | 'webp'
    skuCode?: string
    imageUrl?: string
    imageUrls?: string[]
    idempotencyKey: string
    skuId?: number
  },
) {
  const response = await requestBackend<BackendTaskEnvelope>(settings, '/app/banana-CreateImage', {
    method: 'POST',
    token,
    body: payload,
  })

  return {
    taskId: response?.upload?.taskId ?? response?.taskId ?? '',
    queryPath: response?.upload?.queryPath ?? response?.queryPath ?? '',
    ssePath: response?.upload?.ssePath ?? response?.ssePath,
  } as TaskMeta
}

export async function createTextToImage(
  settings: AppSettings,
  token: string,
  payload: {
    prompt: string
    size?: string
    imageSize?: '1K' | '2K' | '4K'
    aspectRatio: string
    model: string
    skuId?: number
    skuCode?: string
    outputFormat?: 'jpg' | 'png' | 'webp'
    n?: 1
    quality?: 'low' | 'medium' | 'high'
    style?: 'vivid' | 'natural'
    uploadToCos: true
    idempotencyKey: string
  },
) {
  const response = await requestBackend<BackendTaskEnvelope>(settings, '/app/text-to-image', {
    method: 'POST',
    token,
    body: payload,
  })

  return {
    taskId: response?.upload?.taskId ?? response?.taskId ?? '',
    queryPath: response?.upload?.queryPath ?? '',
    ssePath: response?.upload?.ssePath,
  } as TaskMeta
}

export async function createImageToImage(
  settings: AppSettings,
  token: string,
  payload: {
    prompt: string
    size?: string
    imageSize?: '1K' | '2K' | '4K'
    aspectRatio: string
    model: string
    skuId?: number
    skuCode?: string
    outputFormat?: 'jpg' | 'png' | 'webp'
    imageUrl: string[]
    quality?: 'low' | 'medium' | 'high'
    style?: 'vivid' | 'natural'
    uploadToCos: true
    idempotencyKey: string
  },
) {
  const response = await requestBackend<BackendTaskEnvelope>(settings, '/app/image-to-image', {
    method: 'POST',
    token,
    body: payload,
  })

  return {
    taskId: response?.upload?.taskId ?? response?.taskId ?? '',
    queryPath: response?.upload?.queryPath ?? '',
    ssePath: response?.upload?.ssePath,
  } as TaskMeta
}

export async function queryTask(settings: AppSettings, token: string, queryPath: string): Promise<TaskQueryResult> {
  const data = await requestBackend<{
    status?: string
    errorMessage?: string | null
    error_message?: string | null
    prompt?: string
    size?: string
    quality?: string
    outputFormat?: string
    quantity?: number
    cosUrl?: string | null
    previewUrl?: string | null
    recordId?: number | null
    output_format?: string
    n?: number
    cos_url?: string | null
    preview_url?: string | null
  }>(settings, queryPath, {
    method: 'GET',
    token,
  })

  return {
    status: data?.status,
    errorMessage: data?.errorMessage ?? data?.error_message ?? null,
    prompt: data?.prompt,
    size: data?.size,
    quality: data?.quality,
    outputFormat: data?.outputFormat ?? data?.output_format,
    quantity: data?.quantity ?? data?.n,
    cosUrl: data?.cosUrl ?? data?.cos_url ?? null,
    previewUrl: data?.previewUrl ?? data?.preview_url ?? null,
    recordId: data?.recordId ?? null,
  }
}

export async function getMyCreationsPage(
  settings: AppSettings,
  token: string,
  page: number,
  pageSize: number,
) {
  return requestBackend<PaginatedCreations>(
    settings,
    `/app/my-creations?page=${page}&pageSize=${pageSize}`,
    { method: 'GET', token },
  )
}

export async function getAllMyCreations(settings: AppSettings, token: string, pageSize = 50): Promise<CreationRecord[]> {
  const records: CreationRecord[] = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const pageData = await getMyCreationsPage(settings, token, page, pageSize)
    const list = pageData?.list ?? []
    records.push(...list)
    totalPages = Math.max(pageData?.pagination?.totalPages ?? 1, 1)
    page += 1
    if (page > 200) break
  }

  return records
}

function normalizePaginationList<T>(payload: BackendPaginationList<T> | undefined, fallbackPage: number, fallbackPageSize: number): PaginationList<T> {
  const page = Math.max(payload?.page ?? fallbackPage, 1)
  const pageSize = Math.max(payload?.pageSize ?? fallbackPageSize, 1)
  const total = Math.max(payload?.total ?? 0, 0)
  const inferredTotalPages = Math.ceil(total / pageSize)
  const totalPages = Math.max(payload?.totalPages ?? (inferredTotalPages || 1), 1)
  return {
    total,
    list: payload?.list ?? [],
    page,
    pageSize,
    totalPages,
  }
}

export async function getRechargeOrders(
  settings: AppSettings,
  token: string,
  page: number,
  pageSize: number,
): Promise<PaginationList<RechargeOrderRecord>> {
  const data = await requestBackend<BackendPaginationList<RechargeOrderRecord>>(
    settings,
    `/app/recharge/orders?page=${page}&pageSize=${pageSize}`,
    { method: 'GET', token },
  )
  return normalizePaginationList(data, page, pageSize)
}

export async function getPointsLogs(
  settings: AppSettings,
  token: string,
  page: number,
  pageSize: number,
): Promise<PaginationList<PointsLogRecord>> {
  const data = await requestBackend<BackendPaginationList<PointsLogRecord>>(
    settings,
    `/app/points/logs?page=${page}&pageSize=${pageSize}`,
    { method: 'GET', token },
  )
  return normalizePaginationList(data, page, pageSize)
}

export async function getRechargePackages(settings: AppSettings, token: string): Promise<RechargePackage[]> {
  const data = await requestBackend<RechargePackage[] | { list?: RechargePackage[] }>(
    settings,
    '/app/recharge/packages',
    { method: 'GET', token },
  )
  if (Array.isArray(data)) return data
  return data?.list ?? []
}

export async function createRechargeOrder(
  settings: AppSettings,
  token: string,
  payload: RechargeOrderPayload,
): Promise<RechargeOrderResult> {
  return requestBackend<RechargeOrderResult>(settings, '/app/recharge/orders', {
    method: 'POST',
    token,
    body: payload,
  })
}
