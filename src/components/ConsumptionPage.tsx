import { useEffect, useState } from 'react'
import { useStore } from '../store'
import {
  type PointsLogRecord,
  type RechargeOrderRecord,
  getPointsLogs,
  getRechargeOrders,
} from '../lib/backendApi'

type ConsumptionTab = 'recharge' | 'points'

interface PaginationState {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const DEFAULT_PAGINATION: PaginationState = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
}

function formatMoney(amount: number | null | undefined): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '-'
  return `¥${amount.toFixed(2)}`
}

function formatPoints(points: number | null | undefined): string {
  if (typeof points !== 'number' || Number.isNaN(points)) return '-'
  return `${points} 积分`
}

function formatStatus(status: string | null | undefined): string {
  const normalized = (status ?? '').toLowerCase()
  if (normalized === 'paid') return '已支付'
  if (normalized === 'pending') return '待支付'
  if (normalized === 'failed') return '支付失败'
  if (normalized === 'cancelled') return '已取消'
  return status || '-'
}

function statusClassName(status: string | null | undefined): string {
  const normalized = (status ?? '').toLowerCase()
  if (normalized === 'paid') {
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'
  }
  if (normalized === 'pending') {
    return 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30'
  }
  if (normalized === 'failed' || normalized === 'cancelled') {
    return 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30'
  }
  return 'bg-gray-100 text-gray-700 border border-gray-200 dark:bg-white/[0.06] dark:text-gray-300 dark:border-white/[0.08]'
}

function formatChangeType(value: string | null | undefined): string {
  const normalized = (value ?? '').toLowerCase()
  if (normalized === 'recharge') return '充值'
  if (normalized === 'consume') return '消费'
  if (normalized === 'refund') return '退款'
  if (normalized === 'gift') return '赠送'
  return value || '-'
}

function Pagination({
  pagination,
  loading,
  onPageChange,
}: {
  pagination: PaginationState
  loading: boolean
  onPageChange: (page: number) => void
}) {
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
      <span>共 {pagination.total} 条</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={loading || pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.08] dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.06]"
        >
          上一页
        </button>
        <span>
          {pagination.page} / {Math.max(1, pagination.totalPages)}
        </span>
        <button
          type="button"
          disabled={loading || pagination.page >= Math.max(1, pagination.totalPages)}
          onClick={() => onPageChange(pagination.page + 1)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[0.08] dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.06]"
        >
          下一页
        </button>
      </div>
    </div>
  )
}

export default function ConsumptionPage() {
  const settings = useStore((s) => s.settings)
  const token = useStore((s) => s.token)
  const setLoginOpen = useStore((s) => s.setLoginOpen)
  const showToast = useStore((s) => s.showToast)
  const [activeTab, setActiveTab] = useState<ConsumptionTab>('recharge')

  const [rechargeLoading, setRechargeLoading] = useState(false)
  const [rechargeError, setRechargeError] = useState<string | null>(null)
  const [rechargeOrders, setRechargeOrders] = useState<RechargeOrderRecord[]>([])
  const [rechargePagination, setRechargePagination] = useState<PaginationState>(DEFAULT_PAGINATION)

  const [pointsLoading, setPointsLoading] = useState(false)
  const [pointsError, setPointsError] = useState<string | null>(null)
  const [pointsLogs, setPointsLogs] = useState<PointsLogRecord[]>([])
  const [pointsPagination, setPointsPagination] = useState<PaginationState>(DEFAULT_PAGINATION)

  useEffect(() => {
    if (!token) return
    if (activeTab === 'recharge') {
      void loadRechargeOrders(1)
      return
    }
    void loadPointsLogs(1)
  }, [activeTab, token])

  const loadRechargeOrders = async (page: number) => {
    if (!token) return
    setRechargeLoading(true)
    setRechargeError(null)
    try {
      const data = await getRechargeOrders(settings, token, page, rechargePagination.pageSize)
      setRechargeOrders(data.list)
      setRechargePagination({
        page: data.page,
        pageSize: data.pageSize,
        total: data.total,
        totalPages: data.totalPages,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载充值记录失败'
      setRechargeError(message)
      showToast(message, 'error')
    } finally {
      setRechargeLoading(false)
    }
  }

  const loadPointsLogs = async (page: number) => {
    if (!token) return
    setPointsLoading(true)
    setPointsError(null)
    try {
      const data = await getPointsLogs(settings, token, page, pointsPagination.pageSize)
      setPointsLogs(data.list)
      setPointsPagination({
        page: data.page,
        pageSize: data.pageSize,
        total: data.total,
        totalPages: data.totalPages,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载积分流水失败'
      setPointsError(message)
      showToast(message, 'error')
    } finally {
      setPointsLoading(false)
    }
  }

  if (!token) {
    return (
      <section className="mt-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-white/[0.08] dark:bg-gray-900/70">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">我的消费</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">登录后可查看充值记录与积分流水</p>
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="mt-4 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            去登录
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-6" data-no-drag-select>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-gray-900/70 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">我的消费</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">查看充值记录与积分变化明细</p>
          </div>
        </div>

        <div className="mb-4 inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-white/[0.08] dark:bg-white/[0.04]">
          <button
            type="button"
            onClick={() => setActiveTab('recharge')}
            className={[
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === 'recharge'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
            ].join(' ')}
          >
            充值记录
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('points')}
            className={[
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === 'points'
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200',
            ].join(' ')}
          >
            积分流水
          </button>
        </div>

        {activeTab === 'recharge' ? (
          <div>
            {rechargeLoading && <p className="py-8 text-sm text-gray-500 dark:text-gray-400">加载充值记录中...</p>}
            {rechargeError && !rechargeLoading && (
              <div className="py-8 text-center">
                <p className="text-sm text-red-500">{rechargeError}</p>
                <button
                  type="button"
                  onClick={() => void loadRechargeOrders(rechargePagination.page)}
                  className="mt-3 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  重试
                </button>
              </div>
            )}
            {!rechargeLoading && !rechargeError && rechargeOrders.length === 0 && (
              <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">暂无充值记录</p>
            )}
            {!rechargeLoading && !rechargeError && rechargeOrders.length > 0 && (
              <div className="space-y-3">
                {rechargeOrders.map((record) => (
                  <article
                    key={record.id}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-white/[0.08] dark:bg-gray-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                          {record.package_name || '充值订单'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          订单号：{record.order_no || '-'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {record.created_at || '-'}
                        </p>
                      </div>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${statusClassName(record.status)}`}>
                        {formatStatus(record.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                      <p className="text-gray-700 dark:text-gray-300">金额：{formatMoney(record.amount)}</p>
                      <p className="text-gray-700 dark:text-gray-300">积分：{formatPoints(record.points)}</p>
                      <p className="text-gray-500 dark:text-gray-400">渠道：{record.payment_channel || '-'}</p>
                    </div>
                  </article>
                ))}
                <Pagination
                  pagination={rechargePagination}
                  loading={rechargeLoading}
                  onPageChange={(page) => void loadRechargeOrders(page)}
                />
              </div>
            )}
          </div>
        ) : (
          <div>
            {pointsLoading && <p className="py-8 text-sm text-gray-500 dark:text-gray-400">加载积分流水中...</p>}
            {pointsError && !pointsLoading && (
              <div className="py-8 text-center">
                <p className="text-sm text-red-500">{pointsError}</p>
                <button
                  type="button"
                  onClick={() => void loadPointsLogs(pointsPagination.page)}
                  className="mt-3 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  重试
                </button>
              </div>
            )}
            {!pointsLoading && !pointsError && pointsLogs.length === 0 && (
              <p className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">暂无积分流水</p>
            )}
            {!pointsLoading && !pointsError && pointsLogs.length > 0 && (
              <div className="space-y-3">
                {pointsLogs.map((record) => (
                  <article
                    key={record.id}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-white/[0.08] dark:bg-gray-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatChangeType(record.change_type)}</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{record.remark || '-'}</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{record.created_at || '-'}</p>
                      </div>
                      <span
                        className={[
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          record.change_amount >= 0
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
                        ].join(' ')}
                      >
                        {record.change_amount >= 0 ? '+' : ''}
                        {record.change_amount}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                      <p className="text-gray-700 dark:text-gray-300">变动后余额：{formatPoints(record.balance_after)}</p>
                    </div>
                  </article>
                ))}
                <Pagination
                  pagination={pointsPagination}
                  loading={pointsLoading}
                  onPageChange={(page) => void loadPointsLogs(page)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
