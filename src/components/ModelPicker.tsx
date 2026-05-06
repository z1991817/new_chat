import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Coins } from 'lucide-react'
import type { BackendModel } from '../lib/backendApi'

interface FallbackOption {
  label: string
  value: string
}

interface ModelPickerProps {
  value: string
  onChange: (value: string) => void
  models: BackendModel[]
  fallbackOptions: FallbackOption[]
  disabled?: boolean
  className?: string
}

type ProviderKey = 'openai' | 'google' | 'seedream' | 'flux' | 'qwen' | 'other'

interface ProviderMeta {
  key: ProviderKey
  name: string
  iconText: string
  dotColor: string
  svgSrc?: string
}

interface ModelEntry {
  value: string
  label: string
  description: string
  points: number | null
  provider: ProviderMeta
  isHot: boolean
  isNew: boolean
}

const PROVIDERS: ProviderMeta[] = [
  { key: 'openai', name: 'OpenAI', iconText: 'O', dotColor: '#2563eb', svgSrc: '/openai.svg' },
  { key: 'google', name: 'Google', iconText: 'G', dotColor: '#4285F4', svgSrc: '/google.svg' },
  { key: 'seedream', name: 'Seedream', iconText: 'S', dotColor: '#6366f1', svgSrc: '/seedream.svg' },
  { key: 'flux', name: 'Flux AI', iconText: 'F', dotColor: '#0ea5e9' },
  { key: 'qwen', name: 'Qwen', iconText: 'Q', dotColor: '#7c3aed' },
  { key: 'other', name: '其他', iconText: '·', dotColor: '#64748b' },
]

function getProviderByKey(key: ProviderKey): ProviderMeta {
  return PROVIDERS.find((provider) => provider.key === key) ?? PROVIDERS[PROVIDERS.length - 1]
}

function inferProvider(name: string, modelKey: string, manufacturer?: string | null): ProviderMeta {
  if (manufacturer) {
    const m = manufacturer.toLowerCase()
    if (m.includes('openai')) return getProviderByKey('openai')
    if (m.includes('google')) return getProviderByKey('google')
    if (m.includes('seedream') || m.includes('bytedance')) return getProviderByKey('seedream')
    if (m.includes('flux') || m.includes('blackforest')) return getProviderByKey('flux')
    if (m.includes('qwen') || m.includes('aliyun')) return getProviderByKey('qwen')
  }

  const text = `${name} ${modelKey}`.toLowerCase()
  if (/(openai|gpt|dall|o1|o3|o4)/.test(text)) return getProviderByKey('openai')
  if (/(google|gemini|imagen|veo)/.test(text)) return getProviderByKey('google')
  if (/(seedream|doubao|jimeng|bytedance)/.test(text)) return getProviderByKey('seedream')
  if (/(flux|blackforest)/.test(text)) return getProviderByKey('flux')
  if (/(qwen|wanx|tongyi|aliyun)/.test(text)) return getProviderByKey('qwen')
  return getProviderByKey('other')
}

function inferBadge(name: string, modelKey: string): { isHot: boolean; isNew: boolean } {
  const text = `${name} ${modelKey}`.toLowerCase()
  return {
    isHot: /(hot|turbo|flash|fast|4o)/.test(text),
    isNew: /(new|latest|2\.5|3\.0|gpt-image-2|image 2)/.test(text),
  }
}

function toModelEntries(models: BackendModel[], fallbackOptions: FallbackOption[]): ModelEntry[] {
  if (models.length > 0) {
    return models.map((item) => {
      const label = item.name?.trim() || item.model_key
      const provider = inferProvider(label, item.model_key, item.manufacturer)
      const { isHot, isNew } = inferBadge(label, item.model_key)
      return {
        value: item.model_key,
        label,
        description: item.description?.trim() || `${provider.name} 官方模型通道`,
        points:
          typeof item.unit_consume_points === 'number'
            ? item.unit_consume_points
            : typeof item.consume_points === 'number'
              ? item.consume_points
              : null,
        provider,
        isHot,
        isNew,
      }
    })
  }

  return fallbackOptions.map((item) => {
    const provider = inferProvider(item.label, item.value)
    const { isHot, isNew } = inferBadge(item.label, item.value)
    return {
      value: item.value,
      label: item.label,
      description: `${provider.name} 模型`,
      points: null,
      provider,
      isHot,
      isNew,
    }
  })
}

export default function ModelPicker({
  value,
  onChange,
  models,
  fallbackOptions,
  disabled,
  className,
}: ModelPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const [activeProvider, setActiveProvider] = useState<ProviderKey>('openai')
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const entries = useMemo(() => toModelEntries(models, fallbackOptions), [models, fallbackOptions])
  const selected = useMemo(() => entries.find((item) => item.value === value) ?? entries[0], [entries, value])

  const groupedProviders = useMemo(() => {
    const groups = new Map<ProviderKey, ModelEntry[]>()
    for (const entry of entries) {
      const key = entry.provider.key
      const list = groups.get(key)
      if (list) list.push(entry)
      else groups.set(key, [entry])
    }
    return PROVIDERS.filter((provider) => groups.has(provider.key)).map((provider) => ({
      provider,
      items: groups.get(provider.key) ?? [],
    }))
  }, [entries])

  const visibleModels = useMemo(() => {
    const target = groupedProviders.find((group) => group.provider.key === activeProvider)
    return target?.items ?? groupedProviders[0]?.items ?? []
  }, [groupedProviders, activeProvider])

  useEffect(() => {
    if (!selected) return
    const hasCurrentProvider = groupedProviders.some((group) => group.provider.key === selected.provider.key)
    if (hasCurrentProvider) {
      setActiveProvider(selected.provider.key)
      return
    }
    if (groupedProviders[0]) setActiveProvider(groupedProviders[0].provider.key)
  }, [selected, groupedProviders])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleToggle = useCallback(
    (event: React.MouseEvent) => {
      if (disabled) return
      event.preventDefault()
      event.stopPropagation()
      if (!isOpen && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        const panelWidth = Math.min(672, window.innerWidth - 24)
        const estimatedHeight = 430
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top
        setOpenUp(spaceAbove > spaceBelow && spaceAbove > estimatedHeight / 2)
        setAlignRight(rect.left + panelWidth > window.innerWidth - 12)
        setMounted(false)
        window.setTimeout(() => setMounted(true), 10)
      }
      setIsOpen((prev) => !prev)
    },
    [disabled, isOpen],
  )

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        ref={triggerRef}
        onClick={handleToggle}
        className={`flex w-full cursor-pointer select-none items-center justify-between gap-2 ${className ?? ''} ${
          disabled ? '!cursor-not-allowed !opacity-40' : ''
        }`}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <svg
          className={`h-3.5 w-3.5 flex-shrink-0 text-gray-400 transition-transform duration-200 dark:text-gray-500 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div
          className={[
            'absolute z-[65] w-[min(42rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-gray-200 bg-white/95 shadow-2xl shadow-gray-900/15 ring-1 ring-black/5 backdrop-blur-xl transition duration-150 dark:border-white/[0.08] dark:bg-gray-900/95 dark:shadow-black/40 dark:ring-white/10',
            alignRight ? 'right-0' : 'left-0',
            openUp ? 'bottom-full mb-2' : 'top-full mt-2',
            mounted ? 'translate-y-0 opacity-100' : openUp ? 'translate-y-1 opacity-0' : '-translate-y-1 opacity-0',
          ].join(' ')}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/[0.08]">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">选择模型</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{entries.length} 个模型可用</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.06] dark:hover:text-gray-200"
              aria-label="关闭"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid max-h-[28rem] sm:grid-cols-[9rem_1fr]">
            <aside className="flex gap-1 overflow-x-auto border-b border-gray-100 p-2 dark:border-white/[0.08] sm:flex-col sm:overflow-x-visible sm:border-b-0 sm:border-r">
              {groupedProviders.map(({ provider, items }) => {
                const active = provider.key === activeProvider
                return (
                  <button
                    key={provider.key}
                    type="button"
                    onClick={() => setActiveProvider(provider.key)}
                    className={[
                      'flex min-w-max items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors sm:min-w-0',
                      active
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                        : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.06]',
                    ].join(' ')}
                  >
                    <span
                      className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white text-xs font-bold text-white dark:border-white/[0.08] dark:bg-white/[0.04]"
                      style={provider.svgSrc ? undefined : { backgroundColor: provider.dotColor, borderColor: 'transparent' }}
                    >
                      {provider.svgSrc ? (
                        <img src={provider.svgSrc} alt={provider.name} className="h-4 w-4 object-contain" />
                      ) : (
                        provider.iconText
                      )}
                    </span>
                    <span className="truncate font-medium">{provider.name}</span>
                    <span className="ml-auto rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">
                      {items.length}
                    </span>
                  </button>
                )
              })}
            </aside>

            <div className="max-h-[22rem] space-y-2 overflow-y-auto p-2">
              {visibleModels.map((item) => {
                const isSelected = item.value === value
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      onChange(item.value)
                      setIsOpen(false)
                    }}
                    className={[
                      'flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left transition-colors',
                      isSelected
                        ? 'border-blue-300 bg-blue-50/80 dark:border-blue-400/40 dark:bg-blue-500/10'
                        : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]',
                    ].join(' ')}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{item.label}</span>
                        {item.isNew && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                            NEW
                          </span>
                        )}
                        {!item.isNew && item.isHot && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                            HOT
                          </span>
                        )}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                        {item.description}
                      </span>
                      {item.points != null && (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
                          <Coins size={12} strokeWidth={1.8} />
                          {item.points}+ 积分
                        </span>
                      )}
                    </span>

                    {isSelected && (
                      <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-white dark:bg-blue-500">
                        <svg className="h-3 w-3" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {selected && (
            <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-2 text-xs text-gray-500 dark:border-white/[0.08] dark:text-gray-400">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: selected.provider.dotColor }} />
              当前：{selected.label}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
