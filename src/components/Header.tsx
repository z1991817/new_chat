import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { logout, useStore } from '../store'

const navItems = [
  { label: '提示词库', key: 'prompts' },
  { label: '我的创作', key: 'creations' },
]

export default function Header() {
  const setLoginOpen = useStore((s) => s.setLoginOpen)
  const token = useStore((s) => s.token)
  const user = useStore((s) => s.user)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeNav, setActiveNav] = useState<string | null>(null)
  const [hoveredNav, setHoveredNav] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const isLoggedIn = Boolean(token)
  const userName = user?.nickname || user?.username || '用户'
  const userPoints = typeof user?.points === 'number' ? user.points : null

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [])

  return (
    <header data-no-drag-select className="safe-area-top sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-white/[0.08]">
      <div className="safe-area-x safe-header-inner max-w-7xl mx-auto hidden sm:flex items-center justify-between">
        <div className="flex items-center gap-5">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-gray-800 dark:text-gray-100">Art Image</span>
          </h1>
          <nav aria-label="主菜单" className="flex items-center gap-1 text-sm">
            {navItems.map((item) => {
              const isActive = activeNav === item.key
              const isHovered = hoveredNav === item.key
              const showLine = isActive || isHovered
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveNav(item.key)}
                  onMouseEnter={() => setHoveredNav(item.key)}
                  onMouseLeave={() => setHoveredNav(null)}
                  className={[
                    'relative px-3 py-1.5 rounded-md font-medium transition-colors duration-150 cursor-pointer',
                    isActive
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
                  ].join(' ')}
                >
                  {item.label}
                  <span
                    className={[
                      'absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] rounded-full',
                      isActive ? 'bg-gray-900 dark:bg-white' : 'bg-gray-400 dark:bg-gray-500',
                      'transition-all duration-200 ease-out',
                      showLine ? 'w-4 opacity-100' : 'w-0 opacity-0',
                    ].join(' ')}
                  />
                </button>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              {userPoints != null && (
                <span className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 dark:border-amber-600/50 dark:bg-amber-900/30 dark:text-amber-300">
                  积分 {userPoints}
                </span>
              )}
              <span className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                {userName}
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                title="退出登录"
              >
                退出
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              title="登录"
            >
              登录
            </button>
          )}
        </div>
      </div>

      <div ref={menuRef} className="safe-area-x safe-header-inner mx-auto flex items-center justify-between sm:hidden relative">
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
          aria-label="打开菜单"
          aria-expanded={menuOpen}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {isLoggedIn ? (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{userName}</span>
        ) : (
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            title="登录"
          >
            登录
          </button>
        )}

        {menuOpen && createPortal(
          <div className="fixed inset-0 z-[200] sm:hidden">
            {/* 蒙层 */}
            <button
              type="button"
              aria-label="关闭菜单"
              className="absolute inset-0 bg-black/60 animate-overlay-in motion-reduce:animate-none"
              onClick={() => setMenuOpen(false)}
            />
            {/* 抽屉面板 */}
            <div className="absolute inset-y-0 left-0 w-[78%] max-w-[300px] flex flex-col border-r border-white/10 bg-[#171717] shadow-2xl animate-mobile-drawer-in motion-reduce:animate-none">
              <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
                <span className="text-sm font-semibold tracking-wide text-white/90">菜单</span>
                <button
                  type="button"
                  aria-label="关闭菜单"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav aria-label="移动端菜单" className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
                <button
                  type="button"
                  className="w-full min-h-[44px] rounded-lg px-3 py-2 text-left text-base font-medium text-white/90 transition-colors hover:bg-white/10 active:bg-white/20"
                  onClick={() => setMenuOpen(false)}
                >
                  提示词
                </button>
                <button
                  type="button"
                  className="w-full min-h-[44px] rounded-lg px-3 py-2 text-left text-base font-medium text-white/90 transition-colors hover:bg-white/10 active:bg-white/20"
                  onClick={() => setMenuOpen(false)}
                >
                  我的创作
                </button>
              </nav>
            </div>
          </div>,
          document.body
        )}
      </div>
    </header>
  )
}
