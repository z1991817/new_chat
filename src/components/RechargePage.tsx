import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import {
  type RechargePackage,
  createRechargeOrder,
  getRechargePackages,
} from '../lib/backendApi'

interface PlanPreset {
  key: string
  title: string
  subtitle: string
  amount: number
  points: number
  imageCount: number
  videoCount: number
  featured?: boolean
  extraFeature?: string
}

const PLAN_PRESETS: PlanPreset[] = [
  {
    key: 'starter',
    title: '尝鲜版',
    subtitle: '适合尝鲜用户的基础套餐',
    amount: 9.9,
    points: 15,
    imageCount: 15,
    videoCount: 5,
  },
  {
    key: 'advanced',
    title: '高级版',
    subtitle: '适合高级用户的进阶套餐',
    amount: 49.9,
    points: 150,
    imageCount: 150,
    videoCount: 50,
  },
  {
    key: 'premium',
    title: '豪华版',
    subtitle: '适合专业需求的全功能套餐',
    amount: 99,
    points: 300,
    imageCount: 300,
    videoCount: 100,
    featured: true,
    extraFeature: '优先技术支持',
  },
]

function formatAmount(value: number): string {
  const hasDecimal = value % 1 !== 0
  return hasDecimal ? value.toFixed(1) : value.toFixed(0)
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-amber-600 dark:text-amber-300" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 10.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function RechargePage() {
  const settings = useStore((s) => s.settings)
  const token = useStore((s) => s.token)
  const setLoginOpen = useStore((s) => s.setLoginOpen)
  const showToast = useStore((s) => s.showToast)
  const [loading, setLoading] = useState(false)
  const [submittingPlanKey, setSubmittingPlanKey] = useState<string | null>(null)
  const [packages, setPackages] = useState<RechargePackage[]>([])

  useEffect(() => {
    if (!token) return
    setLoading(true)
    getRechargePackages(settings, token)
      .then((data) => setPackages(data))
      .catch((error) => {
        const message = error instanceof Error ? error.message : '加载充值套餐失败'
        showToast(message, 'error')
      })
      .finally(() => setLoading(false))
  }, [settings, showToast, token])

  const packageMap = useMemo(() => {
    const map = new Map<string, RechargePackage>()
    for (const plan of PLAN_PRESETS) {
      const exact = packages.find((item) => Number(item.amount) === plan.amount && Number(item.points) === plan.points)
      if (exact) {
        map.set(plan.key, exact)
        continue
      }
      const sameAmount = packages.find((item) => Number(item.amount) === plan.amount)
      if (sameAmount) {
        map.set(plan.key, sameAmount)
      }
    }
    return map
  }, [packages])

  const handlePurchase = async (plan: PlanPreset) => {
    if (!token) {
      setLoginOpen(true)
      return
    }
    const pkg = packageMap.get(plan.key)
    if (!pkg) {
      showToast('当前套餐暂不可购买', 'error')
      return
    }

    setSubmittingPlanKey(plan.key)
    try {
      const order = await createRechargeOrder(settings, token, {
        packageId: pkg.id,
        payType: 2,
      })
      if (order.payUrl) {
        window.open(order.payUrl, '_blank', 'noopener,noreferrer')
      }
      showToast(order.payUrl ? '订单已创建，请完成支付' : `订单已创建：${order.orderNo}`, 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建充值订单失败'
      showToast(message, 'error')
    } finally {
      setSubmittingPlanKey(null)
    }
  }

  if (!token) {
    return (
      <section className="mt-8">
        <div className="rounded-2xl border border-gray-200 bg-white/80 p-6 text-center shadow-sm shadow-gray-900/5 dark:border-white/[0.08] dark:bg-gray-900/70">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">积分充值</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">登录后查看并购买 Art Image 积分套餐</p>
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="mt-4 rounded-lg border border-blue-500/20 bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:border-blue-400/30 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            去登录
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-8 pb-4">
      <div className="rounded-3xl border border-gray-200 bg-white/80 px-5 py-8 text-gray-900 shadow-sm shadow-gray-900/5 ring-1 ring-white/70 dark:border-white/[0.08] dark:bg-gray-900/70 dark:text-gray-100 dark:ring-white/[0.04] sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-blue-600 dark:text-blue-400">ART IMAGE CREDITS</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">积分充值</h2>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              购买积分后即可用于图片生成。这里保持和工作台一致的轻量面板，支付信息只作为辅助操作出现。
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            积分永久有效
          </div>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {PLAN_PRESETS.map((plan) => {
            const pkg = packageMap.get(plan.key)
            const isSubmitting = submittingPlanKey === plan.key
            const isUnavailable = !loading && !pkg

            return (
              <article
                key={plan.key}
                className={[
                  'flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm transition-colors dark:bg-gray-950/40',
                  plan.featured
                    ? 'border-blue-300 ring-1 ring-blue-500/15 dark:border-blue-400/40 dark:ring-blue-400/15'
                    : 'border-gray-200 dark:border-white/[0.08]',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{plan.title}</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{plan.subtitle}</p>
                  </div>
                  {plan.featured && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      推荐
                    </span>
                  )}
                </div>

                <p className="mt-7 flex items-end gap-2">
                  <span className="text-4xl font-bold tracking-tight text-gray-950 dark:text-white">¥{formatAmount(plan.amount)}</span>
                  <span className="pb-1 text-sm font-semibold text-amber-700 dark:text-amber-300">共 {plan.points} 积分</span>
                </p>

                <button
                  type="button"
                  disabled={isSubmitting || isUnavailable}
                  onClick={() => void handlePurchase(plan)}
                  className={[
                    'mt-6 inline-flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition-colors',
                    plan.featured
                      ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400'
                      : 'border border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-100 dark:hover:bg-white/[0.08]',
                    'disabled:cursor-not-allowed disabled:opacity-60',
                  ].join(' ')}
                >
                  {isSubmitting ? '处理中...' : isUnavailable ? '暂不可用' : '购买'}
                </button>

                <ul className="mt-6 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-start gap-3">
                    <CheckIcon />
                    <span>{plan.points} 积分，永久有效</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckIcon />
                    <span>最多可生成 {plan.imageCount} 张图片</span>
                  </li>
                  
                  <li className="flex items-start gap-3">
                    <CheckIcon />
                    <span>支持 Nano Banana Pro、GPT Image 2 等 4 个图片模型</span>
                  </li>
                  
                  <li className="flex items-start gap-3">
                    <CheckIcon />
                    <span>支持文生图、图生图</span>
                  </li>
                 
                  
                  <li className="flex items-start gap-3">
                    <CheckIcon />
                    <span>支持高清图片下载</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckIcon />
                    <span>无水印</span>
                  </li>
                  {plan.extraFeature && (
                    <li className="flex items-start gap-3">
                      <CheckIcon />
                      <span>{plan.extraFeature}</span>
                    </li>
                  )}
                </ul>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
