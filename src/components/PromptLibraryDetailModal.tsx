import { useCallback } from 'react'
import { useCloseOnEscape } from '../hooks/useCloseOnEscape'
import { copyTextToClipboard, getClipboardFailureMessage } from '../lib/clipboard'
import type { PromptLibraryRecord } from '../lib/backendApi'
import { useStore } from '../store'

interface Props {
  item: PromptLibraryRecord | null
  imageUrl: string
  imageList: string[]
  onClose: () => void
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return value
  return new Date(timestamp).toLocaleString('zh-CN')
}

function StatusBadge({ status }: { status: number }) {
  const enabled = status === 1
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
        enabled
          ? 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400'
          : 'bg-gray-100 text-gray-500 dark:bg-white/[0.04] dark:text-gray-400'
      }`}
    >
      {enabled ? '启用' : `状态 ${status}`}
    </span>
  )
}

export default function PromptLibraryDetailModal({ item, imageUrl, imageList, onClose }: Props) {
  const setLightboxImageId = useStore((s) => s.setLightboxImageId)
  const setPrompt = useStore((s) => s.setPrompt)
  const showToast = useStore((s) => s.showToast)

  useCloseOnEscape(Boolean(item), onClose)

  const handleCopyPrompt = useCallback(async () => {
    if (!item?.prompt) return
    try {
      await copyTextToClipboard(item.prompt)
      showToast('提示词已复制', 'success')
    } catch (err) {
      showToast(getClipboardFailureMessage('复制提示词失败', err), 'error')
    }
  }, [item?.prompt, showToast])

  const handleUsePrompt = useCallback(() => {
    if (!item?.prompt) return
    setPrompt(item.prompt)
    showToast('已填入输入框', 'success')
    onClose()
  }, [item?.prompt, onClose, setPrompt, showToast])

  if (!item) return null

  return (
    <div
      data-no-drag-select
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-md animate-overlay-in" />
      <div
        className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-white/50 dark:border-white/[0.08] rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgb(0,0,0,0.4)] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row z-10 ring-1 ring-black/5 dark:ring-white/10 animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-14 items-center justify-end px-4 md:hidden">
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/[0.06] transition text-gray-400"
            aria-label="关闭"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="md:w-1/2 w-full h-64 md:h-auto bg-gray-100 dark:bg-black/20 relative flex items-center justify-center flex-shrink-0 min-h-[16rem]">
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                className="h-[calc(100%-2rem)] w-[calc(100%-2rem)] object-contain cursor-zoom-in"
                style={{ width: 'calc(100% - 2rem)', height: 'calc(100% - 2rem)', objectFit: 'contain' }}
                onClick={() => setLightboxImageId(imageUrl, imageList)}
                alt={item.prompt ? `提示词示例：${item.prompt}` : '提示词示例图'}
              />
              <div className="absolute top-[15px] left-4 flex items-center gap-1.5">
                <span className="bg-black/50 text-white text-xs px-2 py-0.5 rounded backdrop-blur-sm font-medium">
                  提示词库
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-300 dark:text-gray-600">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="text-xs">暂无示例图</span>
            </div>
          )}
        </div>

        <div className="md:w-1/2 w-full p-5 overflow-y-auto flex flex-col">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 hidden p-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/[0.06] transition text-gray-400 z-10 md:block"
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div data-selectable-text className="flex-1">
            <div className="flex items-center gap-1.5 mb-2">
              <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                输入内容
              </h3>
              {item.prompt && (
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="p-1 rounded text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-white/[0.06] transition"
                  title="复制提示词"
                  aria-label="复制提示词"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap mb-4">
              {item.prompt || '(无提示词)'}
            </p>

            <h3 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              参数配置
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs mb-4">
              <div className="bg-gray-50 dark:bg-white/[0.03] rounded-lg px-3 py-2">
                <span className="text-gray-400 dark:text-gray-500">标签</span>
                <br />
                <span className="font-medium text-gray-700 dark:text-gray-300 break-all">{item.tag || '-'}</span>
              </div>
              {/* <div className="bg-gray-50 dark:bg-white/[0.03] rounded-lg px-3 py-2">
                <span className="text-gray-400 dark:text-gray-500">状态</span>
                <br />
                <StatusBadge status={item.status} />
              </div> */}
              {/* <div className="bg-gray-50 dark:bg-white/[0.03] rounded-lg px-3 py-2">
                <span className="text-gray-400 dark:text-gray-500">排序</span>
                <br />
                <span className="font-medium text-gray-700 dark:text-gray-300">{item.sort_order}</span>
              </div>
              <div className="bg-gray-50 dark:bg-white/[0.03] rounded-lg px-3 py-2">
                <span className="text-gray-400 dark:text-gray-500">编号</span>
                <br />
                <span className="font-medium text-gray-700 dark:text-gray-300">ID {item.id}</span>
              </div> */}
            </div>

            {/* <div className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              <span>创建于 {formatDate(item.created_at)}</span>
              <span> · 更新于 {formatDate(item.updated_at)}</span>
            </div> */}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-100 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={handleUsePrompt}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-stone-950 text-[#f3d9a5] hover:bg-stone-800 dark:bg-[#d8b46a]/12 dark:text-[#f3d9a5] dark:hover:bg-[#d8b46a]/18 transition text-sm font-medium whitespace-nowrap"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              使用提示词
            </button>
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.08] transition text-sm font-medium whitespace-nowrap"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              复制提示词
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
