import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, X } from 'lucide-react'
import { useCloseOnEscape } from '../hooks/useCloseOnEscape'

const SUPPORT_QQ = '377584613'

interface ContactModalProps {
  onClose: () => void
}

export default function ContactModal({ onClose }: ContactModalProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  useCloseOnEscape(true, onClose)

  const handleCopyQQ = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      setCopyState('failed')
      window.setTimeout(() => setCopyState('idle'), 1600)
      return
    }

    try {
      await navigator.clipboard.writeText(SUPPORT_QQ)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }

    window.setTimeout(() => setCopyState('idle'), 1600)
  }

  return createPortal(
    <div
      data-no-drag-select
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-overlay-in" />
      <div
        className="relative z-10 max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/50 bg-white/95 p-5 shadow-2xl ring-1 ring-black/5 animate-modal-in custom-scrollbar dark:border-white/[0.08] dark:bg-gray-900/95 dark:ring-white/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        data-testid="contact-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
              Support
            </p>
            <h3 id="contact-modal-title" className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              联系我们
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.06] dark:hover:text-gray-200"
            aria-label="关闭联系我们"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-400/20 dark:bg-blue-500/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300">客服 QQ</p>
              <p className="mt-1 text-2xl font-bold tracking-wide text-blue-950 dark:text-blue-100">
                {SUPPORT_QQ}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyQQ}
              data-testid="copy-support-qq"
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/20"
            >
              {copyState === 'copied' ? (
                <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="mr-1.5 h-4 w-4" aria-hidden="true" />
              )}
              {copyState === 'copied' ? '已复制' : copyState === 'failed' ? '复制失败' : '复制 QQ'}
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 text-blue-800/80 dark:text-blue-200/80">
            添加时建议备注 artImg Pro，并简单写明你遇到的问题，方便我们更快定位。
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ['生成问题', '生成失败、排队异常、图片效果不符合预期。'],
            ['账号与充值', '登录、积分、订单、发票或套餐咨询。'],
            ['使用建议', '提示词写法、参数选择、工作流优化。'],
            ['合作反馈', '功能建议、商务合作、定制需求。'],
          ].map(([title, description]) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/[0.08] dark:bg-white/[0.03]"
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
              <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300">
          <p className="font-medium text-gray-900 dark:text-gray-100">联系前可以准备这些信息</p>
          <p className="mt-1">
            账号、任务时间、提示词、截图或错误提示。客服通常会在 10:00-22:00 期间处理消息。
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
