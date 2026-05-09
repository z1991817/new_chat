import type { RechargeOrderResult } from './backendApi'

export type MobilePayType = 1 | 3
export type PayType = MobilePayType | 2

export const PENDING_PAYMENT_STORAGE_KEY = 'checkout-pending-payment'
export const PAYMENT_RETURN_MARKER_KEY = 'checkout-payment-return'

export interface PendingPayment {
  amount: number | null
  orderId: number
  packageName: string
  payType: MobilePayType
  payUrl: string
  points: number | null
}

export function isWechatBrowser(userAgent: string): boolean {
  return /MicroMessenger/i.test(userAgent)
}

export function isMobileBrowser(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(userAgent)
}

export function resolvePayType(userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : ''): PayType {
  if (isWechatBrowser(userAgent)) return 1
  if (isMobileBrowser(userAgent)) return 3
  return 2
}

export function isMobilePayType(payType: PayType): payType is MobilePayType {
  return payType === 1 || payType === 3
}

function parseNumber(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(numeric) ? numeric : null
}

export function createPendingPayment(order: RechargeOrderResult, payType: MobilePayType): PendingPayment | null {
  if (!order.payUrl) return null
  return {
    amount: parseNumber(order.amount),
    orderId: order.orderId,
    packageName: order.packageName,
    payType,
    payUrl: order.payUrl,
    points: parseNumber(order.points),
  }
}

function readSessionValue(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSessionValue(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value)
  } catch {
    // Ignore storage failures: payment navigation should still continue.
  }
}

function removeSessionValue(key: string): void {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // Ignore storage failures.
  }
}

export function savePendingPayment(payment: PendingPayment): void {
  writeSessionValue(PENDING_PAYMENT_STORAGE_KEY, JSON.stringify(payment))
}

export function readPendingPayment(): PendingPayment | null {
  const raw = readSessionValue(PENDING_PAYMENT_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<PendingPayment>
    if (
      typeof parsed.orderId !== 'number' ||
      !isMobilePayType(parsed.payType as PayType) ||
      typeof parsed.payUrl !== 'string' ||
      !parsed.payUrl
    ) {
      return null
    }

    return {
      amount: parseNumber(parsed.amount),
      orderId: parsed.orderId,
      packageName: typeof parsed.packageName === 'string' ? parsed.packageName : '',
      payType: parsed.payType as MobilePayType,
      payUrl: parsed.payUrl,
      points: parseNumber(parsed.points),
    }
  } catch {
    return null
  }
}

export function clearPendingPayment(): void {
  removeSessionValue(PENDING_PAYMENT_STORAGE_KEY)
  removeSessionValue(PAYMENT_RETURN_MARKER_KEY)
}

export function markPaymentReturn(): void {
  writeSessionValue(PAYMENT_RETURN_MARKER_KEY, '1')
}

export function hasPaymentReturnMarker(): boolean {
  return readSessionValue(PAYMENT_RETURN_MARKER_KEY) === '1'
}

export function clearPaymentReturnMarker(): void {
  removeSessionValue(PAYMENT_RETURN_MARKER_KEY)
}
