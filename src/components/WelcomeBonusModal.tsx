import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Gift, Sparkles, X } from 'lucide-react'
import { useCloseOnEscape } from '../hooks/useCloseOnEscape'
import { useStore } from '../store'

interface WelcomeBonusModalProps {
  open: boolean
}

export default function WelcomeBonusModal({ open }: WelcomeBonusModalProps) {
  const setLoginOpen = useStore((s) => s.setLoginOpen)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!open) {
      setVisible(false)
      return
    }

    const timer = window.setTimeout(() => setVisible(true), 300)
    return () => window.clearTimeout(timer)
  }, [open])

  const handleClose = () => {
    setVisible(false)
  }
  const handleRegister = () => {
    setVisible(false)
    setLoginOpen(true, 'register')
  }

  useCloseOnEscape(visible, handleClose)

  if (!visible) return null

  return createPortal(
    <div
      data-no-drag-select
      className="fixed inset-0 z-[130] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-gray-950/20 backdrop-blur-md animate-overlay-in dark:bg-black/50" />
      <section
        className="relative z-10 w-full max-w-[26rem] overflow-hidden rounded-3xl border border-white/70 bg-white/95 p-6 text-gray-900 shadow-[0_24px_70px_rgba(24,24,27,0.22)] ring-1 ring-black/5 animate-confirm-in dark:border-white/[0.10] dark:bg-gray-950/95 dark:text-gray-100 dark:shadow-[0_24px_70px_rgba(0,0,0,0.48)] dark:ring-white/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-bonus-title"
        aria-describedby="welcome-bonus-description"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="关闭弹窗"
          onClick={handleClose}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/35 dark:text-gray-500 dark:hover:bg-white/[0.08] dark:hover:text-gray-200"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 shadow-sm dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200">
            <Gift className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
              开业福利
            </p>
            <h2 id="welcome-bonus-title" className="mt-1 text-xl font-bold tracking-tight text-gray-950 dark:text-white">
              新站开业
            </h2>
          </div>
        </div>

        <p id="welcome-bonus-description" className="text-3xl font-bold leading-tight tracking-tight text-gray-950 dark:text-white">
          注册就送
          <span className="mx-2 text-amber-600 dark:text-amber-300">200</span>
          积分
        </p>
        <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
          用积分直接体验 AI 图片生成，海报、封面、电商图都可以先从第一张开始。
        </p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={handleRegister}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 py-2.5 text-sm font-semibold text-[#f3d9a5] shadow-sm shadow-stone-900/10 transition-colors hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/35 dark:border dark:border-[#d8b46a]/30 dark:bg-[#d8b46a]/12 dark:hover:bg-[#d8b46a]/18"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            立即注册
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="min-h-[44px] rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300 dark:hover:bg-white/[0.08]"
          >
            稍后
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
