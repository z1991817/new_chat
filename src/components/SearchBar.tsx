import { useStore } from '../store'
import Select from './Select'

type SearchBarVariant = 'tasks' | 'prompt-library'
type PromptLibrarySearchField = 'prompt' | 'tag'

interface SearchBarProps {
  variant?: SearchBarVariant
  promptLibrarySearchField?: PromptLibrarySearchField
  onPromptLibrarySearchFieldChange?: (field: PromptLibrarySearchField) => void
}

export default function SearchBar({
  variant = 'tasks',
  promptLibrarySearchField = 'prompt',
  onPromptLibrarySearchFieldChange,
}: SearchBarProps) {
  const searchQuery = useStore((s) => s.searchQuery)
  const setSearchQuery = useStore((s) => s.setSearchQuery)
  const filterFavorite = useStore((s) => s.filterFavorite)
  const setFilterFavorite = useStore((s) => s.setFilterFavorite)
  const isPromptLibrary = variant === 'prompt-library'
  const placeholder = isPromptLibrary
    ? promptLibrarySearchField === 'tag'
      ? '搜索标签...'
      : '搜索提示词...'
    : '搜索提示词、参数...'
  const inputClassName = isPromptLibrary
    ? 'w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#d8b46a]/20 focus:border-[#c8a45d]/60 transition'
    : 'w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition'

  return (
    <div data-no-drag-select className="mt-6 mb-4 flex gap-3">
      <div className="flex gap-2 flex-shrink-0 z-20">
        {!isPromptLibrary && (
          <button
            onClick={() => setFilterFavorite(!filterFavorite)}
            className={`p-2.5 rounded-xl border transition-all ${
              filterFavorite
                ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-500'
                : 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-gray-900 text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.06]'
            }`}
            title={filterFavorite ? '取消只看收藏' : '只看收藏'}
          >
            <svg className="w-5 h-5" fill={filterFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
        )}
        {isPromptLibrary && (
        <div className="relative w-28">
          <Select
            value={promptLibrarySearchField}
            onChange={(val) => {
              if (val === 'prompt' || val === 'tag') {
                onPromptLibrarySearchFieldChange?.(val)
              }
            }}
            options={[
              { label: '提示词', value: 'prompt' },
              { label: '标签', value: 'tag' },
            ]}
            className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-white/[0.06] text-sm focus:outline-none focus:ring-2 focus:ring-[#d8b46a]/20 focus:border-[#c8a45d]/60 transition"
            selectedClassName="bg-[#f7f1e7] text-stone-950 dark:bg-[#d8b46a]/12 dark:text-[#f3d9a5] font-medium"
          />
        </div>
        )}
      </div>
      <div className="relative flex-1 z-10">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          type="text"
          placeholder={placeholder}
          className={inputClassName}
        />
      </div>
    </div>
  )
}
