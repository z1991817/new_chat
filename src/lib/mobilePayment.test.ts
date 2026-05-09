import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PAYMENT_RETURN_MARKER_KEY,
  PENDING_PAYMENT_STORAGE_KEY,
  clearPendingPayment,
  createPendingPayment,
  hasPaymentReturnMarker,
  markPaymentReturn,
  readPendingPayment,
  resolvePayType,
  savePendingPayment,
} from './mobilePayment'

describe('mobile payment helpers', () => {
  beforeEach(() => {
    const values = new Map<string, string>()
    const sessionStorageMock = {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    }

    vi.stubGlobal('window', {
      navigator: { userAgent: '' },
      sessionStorage: sessionStorageMock,
    })
    vi.stubGlobal('sessionStorage', sessionStorageMock)
  })

  afterEach(() => {
    sessionStorage.clear()
    vi.unstubAllGlobals()
  })

  it('resolves WeChat browser to payType 1', () => {
    expect(resolvePayType('Mozilla/5.0 iPhone MicroMessenger')).toBe(1)
  })

  it('resolves regular mobile browser to payType 3', () => {
    expect(resolvePayType('Mozilla/5.0 iPhone Mobile Safari')).toBe(3)
  })

  it('resolves desktop browser to payType 2', () => {
    expect(resolvePayType('Mozilla/5.0 Windows NT 10.0 Win64 x64')).toBe(2)
  })

  it('saves and reads pending payment snapshots', () => {
    const pendingPayment = createPendingPayment(
      {
        amount: 9.9,
        orderId: 12,
        orderNo: 'RC12',
        packageName: '1000积分',
        payUrl: 'https://pay.example.com/order',
        points: 1000,
      },
      3,
    )

    expect(pendingPayment).not.toBeNull()
    savePendingPayment(pendingPayment!)

    expect(readPendingPayment()).toEqual({
      amount: 9.9,
      orderId: 12,
      packageName: '1000积分',
      payType: 3,
      payUrl: 'https://pay.example.com/order',
      points: 1000,
    })
  })

  it('clears pending payment and return marker together', () => {
    sessionStorage.setItem(PENDING_PAYMENT_STORAGE_KEY, '{}')
    markPaymentReturn()

    expect(hasPaymentReturnMarker()).toBe(true)
    clearPendingPayment()

    expect(sessionStorage.getItem(PENDING_PAYMENT_STORAGE_KEY)).toBeNull()
    expect(sessionStorage.getItem(PAYMENT_RETURN_MARKER_KEY)).toBeNull()
  })
})
