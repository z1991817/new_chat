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
  gradient: string
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
  { key: 'google',   name: 'Google',   gradient: 'linear-gradient(135deg,#4285F4,#60a5fa)', iconText: 'G', dotColor: '#4285F4', svgSrc: '/google.svg' },
  { key: 'seedream', name: 'Seedream', gradient: 'linear-gradient(135deg,#6366f1,#818cf8)', iconText: 'S', dotColor: '#6366f1', svgSrc: '/seedream.svg' },
  { key: 'openai',   name: 'OpenAI',   gradient: 'linear-gradient(135deg,#3b82f6,#2563eb)', iconText: 'O', dotColor: '#3b82f6', svgSrc: '/openai.svg' },
  { key: 'flux',     name: 'Flux AI',  gradient: 'linear-gradient(135deg,#0ea5e9,#38bdf8)', iconText: 'F', dotColor: '#0ea5e9' },
  { key: 'qwen',     name: 'Qwen',     gradient: 'linear-gradient(135deg,#7c3aed,#a855f7)', iconText: 'Q', dotColor: '#7c3aed' },
  { key: 'other',    name: '其他',      gradient: 'linear-gradient(135deg,#475569,#64748b)', iconText: '·', dotColor: '#64748b' },
]

function getProviderByKey(key: ProviderKey): ProviderMeta {
  return PROVIDERS.find((p) => p.key === key) ?? PROVIDERS[PROVIDERS.length - 1]
}

function inferProvider(name: string, modelKey: string, manufacturer?: string | null): ProviderMeta {
  if (manufacturer) {
    const m = manufacturer.toLowerCase()
    if (m.includes('openai'))    return getProviderByKey('openai')
    if (m.includes('google'))    return getProviderByKey('google')
    if (m.includes('seedream') || m.includes('bytedance')) return getProviderByKey('seedream')
    if (m.includes('flux') || m.includes('blackforest'))   return getProviderByKey('flux')
    if (m.includes('qwen') || m.includes('aliyun'))        return getProviderByKey('qwen')
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
        points: typeof item.consume_points === 'number' ? item.consume_points : null,
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
    return PROVIDERS.filter((p) => groups.has(p.key)).map((p) => ({
      provider: p,
      items: groups.get(p.key) ?? [],
    }))
  }, [entries])

  const visibleModels = useMemo(() => {
    const target = groupedProviders.find((g) => g.provider.key === activeProvider)
    return target?.items ?? groupedProviders[0]?.items ?? []
  }, [groupedProviders, activeProvider])

  useEffect(() => {
    if (!selected) return
    const hasCurrentProvider = groupedProviders.some((g) => g.provider.key === selected.provider.key)
    if (hasCurrentProvider) {
      setActiveProvider(selected.provider.key)
      return
    }
    if (groupedProviders[0]) setActiveProvider(groupedProviders[0].provider.key)
  }, [selected, groupedProviders])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return
      e.preventDefault()
      e.stopPropagation()
      if (!isOpen && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        const panelWidth = Math.min(860, window.innerWidth - 24)
        const estimatedHeight = 460
        const spaceBelow = window.innerHeight - rect.bottom
        const spaceAbove = rect.top
        setOpenUp(spaceAbove > spaceBelow && spaceAbove > estimatedHeight / 2)
        setAlignRight(rect.left + panelWidth > window.innerWidth - 12)
        setMounted(false)
        setTimeout(() => setMounted(true), 10)
      }
      setIsOpen((prev) => !prev)
    },
    [disabled, isOpen],
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&display=swap');

        .mp-panel {
          font-family: 'DM Sans', system-ui, sans-serif;
          opacity: 0;
          transform: translateY(6px) scale(0.98);
          transition: opacity 180ms ease, transform 180ms ease;
        }
        .mp-panel.mp-open {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .mp-panel-up {
          opacity: 0;
          transform: translateY(-6px) scale(0.98);
          transition: opacity 180ms ease, transform 180ms ease;
        }
        .mp-panel-up.mp-open {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .mp-card {
          transition: background 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
        }
        .mp-card:hover {
          background: rgba(255,255,255,0.055) !important;
        }
        .mp-card.mp-selected {
          background: rgba(59,130,246,0.12) !important;
          border-color: rgba(59,130,246,0.4) !important;
          box-shadow: 0 0 0 1px rgba(59,130,246,0.1) inset;
        }
        .mp-sidebar-btn {
          transition: background 120ms ease, color 120ms ease;
        }
        .mp-sidebar-btn:hover {
          background: rgba(59,130,246,0.08);
        }
        .mp-sidebar-btn.mp-active {
          background: rgba(59,130,246,0.14);
        }
        .mp-scroll::-webkit-scrollbar { width: 4px; }
        .mp-scroll::-webkit-scrollbar-track { background: transparent; }
        .mp-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
        .mp-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.22); }
        .mp-badge-hot {
          background: linear-gradient(90deg, #f97316, #ef4444);
          font-family: 'Outfit', sans-serif;
        }
        .mp-badge-new {
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
          font-family: 'Outfit', sans-serif;
        }
        .mp-points-badge {
          background: rgba(251,191,36,0.1);
          border: 1px solid rgba(251,191,36,0.25);
        }
        .mp-trigger-chevron {
          transition: transform 200ms ease;
        }
        .mp-trigger-chevron.open {
          transform: rotate(180deg);
        }
      `}</style>

      <div ref={containerRef} className="relative w-full">
        {/* Trigger */}
        <div
          ref={triggerRef}
          onClick={handleToggle}
          className={`flex items-center justify-between gap-2 w-full cursor-pointer select-none ${className ?? ''} ${
            disabled ? '!opacity-40 !cursor-not-allowed' : ''
          }`}
        >
          <span className="truncate">{selected?.label ?? value}</span>
          <svg
            className={`mp-trigger-chevron w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500 ${isOpen ? 'open' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Panel */}
        {isOpen && (
          <div
            className={`mp-panel${openUp ? ' mp-panel-up' : ''}${mounted ? ' mp-open' : ''} absolute z-[65] ${alignRight ? 'right-0' : 'left-0'} ${openUp ? 'bottom-full mb-2' : 'top-full mt-2'} w-[min(54rem,calc(100vw-1.5rem))]`}
            style={{
              background: 'rgba(10,12,20,0.97)',
              backdropFilter: 'blur(24px) saturate(160%)',
              WebkitBackdropFilter: 'blur(24px) saturate(160%)',
              border: '1px solid rgba(59,130,246,0.15)',
              borderRadius: '16px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(59,130,246,0.06) inset',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                padding: '14px 18px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    fontSize: '14px',
                    color: '#fff',
                    letterSpacing: '-0.01em',
                  }}
                >
                  选择模型
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '26px',
                  height: '26px',
                  borderRadius: '7px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  color: 'rgba(255,255,255,0.45)',
                  transition: 'background 120ms, color 120ms',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.8)'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)'
                }}
                aria-label="关闭"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div style={{ display: 'grid', gridTemplateColumns: '168px 1fr', minHeight: '340px' }}>
              {/* Sidebar */}
              <aside
                style={{
                  borderRight: '1px solid rgba(255,255,255,0.07)',
                  padding: '10px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                {groupedProviders.map(({ provider, items }) => {
                  const active = provider.key === activeProvider
                  return (
                    <button
                      key={provider.key}
                      type="button"
                      onClick={() => setActiveProvider(provider.key)}
                      className={`mp-sidebar-btn${active ? ' mp-active' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '9px',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        background: active ? 'rgba(59,130,246,0.14)' : 'transparent',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          background: provider.svgSrc ? 'rgba(255,255,255,0.06)' : provider.gradient,
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#fff',
                          fontFamily: "'Outfit', sans-serif",
                          flexShrink: 0,
                          boxShadow: active ? `0 0 12px ${provider.dotColor}55` : 'none',
                          transition: 'box-shadow 200ms',
                          overflow: 'hidden',
                        }}
                      >
                        {provider.svgSrc ? (
                          <img src={provider.svgSrc} alt={provider.name} width={18} height={18} style={{ objectFit: 'contain' }} />
                        ) : (
                          provider.iconText
                        )}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span
                          style={{
                            display: 'block',
                            fontFamily: "'Outfit', sans-serif",
                            fontWeight: active ? 600 : 500,
                            fontSize: '13px',
                            color: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)',
                            letterSpacing: '-0.01em',
                            transition: 'color 120ms',
                          }}
                        >
                          {provider.name}
                        </span>
                      </span>
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: '11px',
                          fontWeight: 500,
                          color: active ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)',
                          flexShrink: 0,
                          transition: 'color 120ms',
                        }}
                      >
                        {items.length}
                      </span>
                    </button>
                  )
                })}
              </aside>

              {/* Model list */}
              <div
                className="mp-scroll"
                style={{
                  maxHeight: '420px',
                  overflowY: 'auto',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
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
                      className={`mp-card${isSelected ? ' mp-selected' : ''}`}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '11px',
                        border: `1px solid ${isSelected ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        background: isSelected ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.025)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Name row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontFamily: "'Outfit', sans-serif",
                              fontWeight: 600,
                              fontSize: '14px',
                              color: isSelected ? 'rgba(255,255,255,0.97)' : 'rgba(255,255,255,0.82)',
                              letterSpacing: '-0.01em',
                              lineHeight: 1.3,
                            }}
                          >
                            {item.label}
                          </span>
                          {item.isNew && (
                            <span
                              className="mp-badge-new"
                              style={{
                                padding: '1px 6px',
                                borderRadius: '5px',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#fff',
                                letterSpacing: '0.02em',
                                lineHeight: '18px',
                              }}
                            >
                              NEW
                            </span>
                          )}
                          {!item.isNew && item.isHot && (
                            <span
                              className="mp-badge-hot"
                              style={{
                                padding: '1px 6px',
                                borderRadius: '5px',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#fff',
                                letterSpacing: '0.02em',
                                lineHeight: '18px',
                              }}
                            >
                              HOT
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <p
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: '12px',
                            color: 'rgba(255,255,255,0.65)',
                            marginTop: '4px',
                            lineHeight: 1.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {item.description}
                        </p>

                        {/* Points */}
                        {item.points != null && (
                          <div style={{ marginTop: '8px' }}>
                            <span
                              className="mp-points-badge"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: '11px',
                                fontWeight: 500,
                                color: 'rgba(251,191,36,0.9)',
                              }}
                            >
                              {/* amber coin icon matching Header's 积分 style */}
                              <Coins size={11} strokeWidth={1.8} />
                              {item.points}+ 积分
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Check */}
                      {isSelected && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: item.provider.gradient,
                            flexShrink: 0,
                            marginTop: '1px',
                            boxShadow: `0 0 10px ${item.provider.dotColor}66`,
                          }}
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                padding: '9px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '11px',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                {entries.length} 个模型可用
              </span>
              {selected && (
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: selected.provider.dotColor,
                      boxShadow: `0 0 6px ${selected.provider.dotColor}`,
                    }}
                  />
                  当前: {selected.label}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
