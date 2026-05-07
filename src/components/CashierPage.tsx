import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { RefreshCw } from 'lucide-react'
import { refreshCurrentUser, useStore } from '../store'
import { getRechargeOrder } from '../lib/backendApi'
import { type CashierOrderSnapshot, getCashierOrder } from '../lib/cashier'

const POLL_INTERVAL_MS = 3000

type CashierStatus = 'loading' | 'pending' | 'paid' | 'failed' | 'expired' | 'missing'

function formatAmount(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '-'
}

function normalizeStatus(status: string | null | undefined): CashierStatus {
  const normalized = (status ?? '').toLowerCase()
  if (normalized === 'paid' || normalized === 'success') return 'paid'
  if (normalized === 'failed' || normalized === 'cancelled' || normalized === 'canceled') return 'failed'
  if (normalized === 'expired' || normalized === 'closed') return 'expired'
  return 'pending'
}

function getOrderIdFromLocation(): number | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('orderId')
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export default function CashierPage() {
  const settings = useStore((s) => s.settings)
  const token = useStore((s) => s.token)
  const [order, setOrder] = useState<CashierOrderSnapshot | null>(null)
  const [status, setStatus] = useState<CashierStatus>('loading')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [error, setError] = useState('')

  const orderId = useMemo(() => getOrderIdFromLocation(), [])
  const isCreating = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('creating')

  useEffect(() => {
    if (!orderId) {
      setStatus(isCreating ? 'loading' : 'missing')
      return
    }

    const snapshot = getCashierOrder(orderId)
    if (!snapshot) {
      setStatus('missing')
      return
    }

    setOrder(snapshot)
    setStatus('pending')
  }, [isCreating, orderId])

  useEffect(() => {
    if (!order?.payUrl) return

    let alive = true
    QRCode.toDataURL(order.payUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      scale: 7,
      color: {
        dark: '#18181b',
        light: '#ffffff',
      },
    })
      .then((value) => {
        if (alive) setQrCodeUrl(value)
      })
      .catch(() => {
        if (alive) setError('二维码生成失败，请使用下方按钮打开支付页面。')
      })

    return () => {
      alive = false
    }
  }, [order?.payUrl])

  useEffect(() => {
    if (!orderId || !token || status === 'paid' || status === 'failed' || status === 'expired') return

    let stopped = false
    let timeoutId: number | undefined

    const poll = async () => {
      try {
        const detail = await getRechargeOrder(settings, token, orderId)
        if (stopped) return

        const nextStatus = normalizeStatus(detail.order?.status)
        setStatus(nextStatus)
        setError('')

        if (nextStatus === 'paid') {
          void refreshCurrentUser({ silent: true })
          return
        }

        if (nextStatus === 'failed' || nextStatus === 'expired') return
      } catch (err) {
        if (!stopped) {
          setError(err instanceof Error ? err.message : '查询支付状态失败')
        }
      }

      if (!stopped) {
        timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS)
      }
    }

    void poll()

    return () => {
      stopped = true
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [orderId, settings, status, token])

  const statusLabel =
    status === 'paid'
      ? '支付成功'
      : status === 'failed'
      ? '支付失败'
      : status === 'expired'
      ? '订单已过期'
      : status === 'missing'
      ? '订单信息缺失'
      : status === 'loading'
      ? '正在创建订单'
      : '等待支付'

  return (
    <main className="min-h-screen bg-[#f7f6f2] px-4 py-8 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:px-6">
      <section className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm shadow-gray-900/5 dark:border-white/[0.08] dark:bg-gray-900/80 sm:p-8">
          <p className="text-sm font-semibold tracking-[0.18em] text-[#9b7436] dark:text-[#d8b46a]">ART IMAGE CASHIER</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">收银台</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">请使用微信扫码支付，支付成功后积分会自动到账。</p>

          <div className="mt-8 grid gap-3 text-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-white/[0.08]">
              <span className="text-gray-500 dark:text-gray-400">订单状态</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{statusLabel}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-white/[0.08]">
              <span className="text-gray-500 dark:text-gray-400">订单号</span>
              <span className="font-mono text-xs text-gray-700 dark:text-gray-200">{order?.orderNo ?? '-'}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-white/[0.08]">
              <span className="text-gray-500 dark:text-gray-400">套餐</span>
              <span>{order?.packageName ?? '-'}</span>
            </div>
            {/* <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-white/[0.08]">
              <span className="text-gray-500 dark:text-gray-400">积分</span>
              <span>{order ? `${order.points} 积分` : '-'}</span>
            </div> */}
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">应付金额</span>
              <span className="text-2xl font-bold text-gray-950 dark:text-white">¥{order ? formatAmount(order.amount) : '-'}</span>
            </div>
          </div>

          {error && (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              {error}
            </p>
          )}
        </div>

        <aside className="rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm shadow-gray-900/5 dark:border-white/[0.08] dark:bg-gray-900/80">
          {status === 'paid' ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-3xl text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                ✓
              </div>
              <h2 className="mt-4 text-lg font-semibold">支付成功</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">积分已到账，可以关闭此窗口回到工作台。</p>
            </div>
          ) : status === 'missing' ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center">
              <h2 className="text-lg font-semibold">找不到订单</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">请回到充值页面重新发起购买。</p>
            </div>
          ) : (
            <>
              <div className="hidden sm:block">
                <div className="mx-auto flex h-72 w-72 items-center justify-center rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/[0.08]">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="支付二维码" className="h-full w-full" />
                  ) : (
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-400" aria-hidden="true" />
                  )}
                </div>
                <h2 className="mt-4 text-lg font-semibold">扫码支付</h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">请使用微信扫描二维码完成付款。</p>
              </div>

              <div className="sm:hidden">
                <h2 className="text-lg font-semibold">移动端支付</h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">请点击按钮打开支付页面。</p>
              </div>

              {/* {order?.payUrl && (
                <a
                  href={order.payUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-stone-950 px-4 text-sm font-semibold text-[#f3d9a5] transition-colors hover:bg-stone-800 dark:bg-[#d8b46a]/12 dark:hover:bg-[#d8b46a]/18"
                >
                  打开支付页面
                </a>
              )} */}
            </>
          )}
        </aside>
      </section>
    </main>
  )
}
