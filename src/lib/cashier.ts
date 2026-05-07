import type { RechargeOrderResult } from './backendApi'

const CASHIER_ORDER_STORAGE_KEY = 'art-image-cashier-orders'
const CASHIER_ORDER_MAX_AGE_MS = 30 * 60 * 1000

export interface CashierOrderSnapshot {
  orderId: number
  orderNo: string
  amount: number
  points: number
  packageName: string
  payUrl: string
  createdAt: number
}

function readOrderMap(): Record<string, CashierOrderSnapshot> {
  try {
    const raw = localStorage.getItem(CASHIER_ORDER_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, CashierOrderSnapshot>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function pruneOrderMap(orderMap: Record<string, CashierOrderSnapshot>) {
  const now = Date.now()
  return Object.fromEntries(
    Object.entries(orderMap).filter(([, order]) => {
      return order?.createdAt && now - order.createdAt < CASHIER_ORDER_MAX_AGE_MS
    }),
  )
}

export function saveCashierOrder(order: RechargeOrderResult): CashierOrderSnapshot | null {
  if (!order.payUrl) return null

  const snapshot: CashierOrderSnapshot = {
    orderId: order.orderId,
    orderNo: order.orderNo,
    amount: Number(order.amount),
    points: Number(order.points),
    packageName: order.packageName,
    payUrl: order.payUrl,
    createdAt: Date.now(),
  }

  const orderMap = pruneOrderMap(readOrderMap())
  orderMap[String(snapshot.orderId)] = snapshot
  localStorage.setItem(CASHIER_ORDER_STORAGE_KEY, JSON.stringify(orderMap))
  return snapshot
}

export function getCashierOrder(orderId: number): CashierOrderSnapshot | null {
  const orderMap = pruneOrderMap(readOrderMap())
  const snapshot = orderMap[String(orderId)]
  if (!snapshot?.payUrl) return null
  return snapshot
}
