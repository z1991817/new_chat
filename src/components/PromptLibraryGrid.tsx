import { useCallback, useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { getPromptLibraries, resolveAssetUrl, type PromptLibraryRecord } from '../lib/backendApi'
import PromptLibraryDetailModal from './PromptLibraryDetailModal'

const PAGE_SIZE = 15
type PromptLibrarySearchField = 'prompt' | 'tag'

interface PromptLibraryGridProps {
  searchField: PromptLibrarySearchField
}

function mergeById(current: PromptLibraryRecord[], incoming: PromptLibraryRecord[]) {
  if (!current.length) return incoming
  const seen = new Set(current.map((item) => item.id))
  const append = incoming.filter((item) => !seen.has(item.id))
  return append.length ? [...current, ...append] : current
}

function PromptLibraryThumbnail({ imageUrl, alt }: { imageUrl: string; alt: string }) {
  const [loaded, setLoaded] = useState(false)

  return (
    <img
      src={imageUrl}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={`h-full w-full object-contain transition-[opacity,transform] duration-200 group-hover:scale-[1.02] ${
        loaded ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    />
  )
}

export default function PromptLibraryGrid({ searchField }: PromptLibraryGridProps) {
  const settings = useStore((s) => s.settings)
  const token = useStore((s) => s.token)
  const searchQuery = useStore((s) => s.searchQuery)
  const showToast = useStore((s) => s.showToast)

  const [list, setList] = useState<PromptLibraryRecord[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<PromptLibraryRecord | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const requestSeqRef = useRef(0)

  const query = searchQuery.trim()
  const hasKnownTotal = total > 0
  const hasMore = hasKnownTotal ? list.length < total : list.length > 0 && list.length % PAGE_SIZE === 0

  const loadPage = useCallback(async (targetPage: number, append: boolean) => {
    const currentRequestSeq = ++requestSeqRef.current
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setError(null)
    }

    try {
      const result = await getPromptLibraries(settings, token || undefined, {
        page: targetPage,
        pageSize: PAGE_SIZE,
        prompt: searchField === 'prompt' ? query || undefined : undefined,
        tag: searchField === 'tag' ? query || undefined : undefined,
      })

      if (requestSeqRef.current !== currentRequestSeq) return

      setTotal(result.total)
      setPage(result.page)
      setList((prev) => (append ? mergeById(prev, result.list) : result.list))
      setError(null)
    } catch (err) {
      if (requestSeqRef.current !== currentRequestSeq) return
      const message = err instanceof Error ? err.message : '加载提示词库失败'
      setError(message)
      if (!append) {
        setList([])
      }
      showToast(message, 'error')
    } finally {
      if (requestSeqRef.current !== currentRequestSeq) return
      setLoading(false)
      setLoadingMore(false)
    }
  }, [query, searchField, settings, showToast, token])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPage(1, false)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [loadPage])

  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (hasMore && !loading && !loadingMore && entries.some((entry) => entry.isIntersecting)) {
          void loadPage(page + 1, true)
        }
      },
      { rootMargin: '600px 0px', threshold: 0 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadPage, loading, loadingMore, page])

  if (loading && list.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-gray-500">
        <p className="text-sm">提示词库加载中...</p>
      </div>
    )
  }

  if (error && list.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-gray-500">
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  if (!list.length) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-gray-500">
        <p className="text-sm">没有匹配的提示词</p>
      </div>
    )
  }

  const itemsWithUrl = list.map((item) => ({
    item,
    imageUrl: resolveAssetUrl(settings, item.image_url),
  }))
  const lightboxImageList = itemsWithUrl
    .map((entry) => entry.imageUrl)
    .filter((url): url is string => Boolean(url))
  const selectedImageUrl = selectedItem
    ? resolveAssetUrl(settings, selectedItem.image_url)
    : ''

  return (
    <div className="relative min-h-[50vh]">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
        {itemsWithUrl.map(({ item, imageUrl }) => {
          const imageAlt = item.prompt ? `提示词示例：${item.prompt}` : '提示词示例图'

          return (
            <article
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-white/[0.08] overflow-hidden cursor-pointer transition-[box-shadow,border-color,background-color,transform] duration-200 hover:shadow-lg hover:border-gray-300 dark:hover:bg-gray-800/80 dark:hover:border-white/[0.18]"
            >
              <div
                className="w-full aspect-[4/3] bg-gray-100 dark:bg-black/20 overflow-hidden relative"
                style={{ aspectRatio: '4 / 3' }}
              >
                {imageUrl ? (
                  <div className="group block w-full h-full" style={{ width: '100%', height: '100%' }}>
                    <PromptLibraryThumbnail imageUrl={imageUrl} alt={imageAlt} />
                    <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center rounded-md bg-black/55 px-2 py-1 text-[11px] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      查看详情
                    </span>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
              </div>

              <div className="p-3">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">
                  {item.prompt || '(无提示词)'}
                </p>
                {item.tag && (
                  <p className="mt-2 text-xs text-[#9b7436] dark:text-[#d8b46a] line-clamp-1">
                    {item.tag}
                  </p>
                )}
              </div>
            </article>
          )
        })}
      </div>

      <PromptLibraryDetailModal
        item={selectedItem}
        imageUrl={selectedImageUrl}
        imageList={lightboxImageList}
        onClose={() => setSelectedItem(null)}
      />

      <div ref={loadMoreRef} className="pb-8 flex justify-center">
        {hasMore && (
          <button
            type="button"
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-200 transition disabled:opacity-60"
            onClick={() => {
              if (loadingMore) return
              void loadPage(page + 1, true)
            }}
            disabled={loadingMore}
          >
            {loadingMore ? '加载中...' : '加载更多'}
          </button>
        )}
      </div>
    </div>
  )
}
