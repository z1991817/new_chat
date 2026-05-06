import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { logout, useStore } from '../store'

const navItems: Array<{ label: string; key: string; path: '/' | '/prompts' | '/consumption' | '/recharge' }> = [
  { label: '首页', key: 'home', path: '/' },
  { label: '提示词库', key: 'prompts', path: '/prompts' },
  { label: '我的消费', key: 'consumption', path: '/consumption' },
]

const primaryButtonClass =
  'rounded-lg border border-blue-500/20 bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/15 transition-colors hover:bg-blue-700 dark:border-blue-400/30 dark:bg-blue-500 dark:hover:bg-blue-400'
const accountButtonClass =
  'inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-white/[0.08] dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.06]'
const accountMenuClass =
  'absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1.5 shadow-lg shadow-gray-900/10 dark:border-white/[0.08] dark:bg-gray-900 dark:shadow-black/40'
const accountMenuItemClass =
  'block w-full px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/[0.06]'

interface HeaderProps {
  currentPath: string
  onNavigate: (path: '/' | '/prompts' | '/consumption' | '/recharge') => void
}

export default function Header({ currentPath, onNavigate }: HeaderProps) {
  const setLoginOpen = useStore((s) => s.setLoginOpen)
  const token = useStore((s) => s.token)
  const user = useStore((s) => s.user)
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [hoveredNav, setHoveredNav] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const desktopAccountRef = useRef<HTMLDivElement>(null)
  const mobileAccountRef = useRef<HTMLDivElement>(null)
  const isLoggedIn = Boolean(token)
  const userName = user?.nickname || user?.username || '用户'
  const userPoints = typeof user?.points === 'number' ? user.points : null

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const targetElement = target instanceof Element ? target : null
      if (menuRef.current && !menuRef.current.contains(target)) {
        if (targetElement?.closest('[data-mobile-menu-portal]')) return
        setMenuOpen(false)
      }
      const clickedAccountMenu =
        desktopAccountRef.current?.contains(target) ||
        mobileAccountRef.current?.contains(target)
      if (!clickedAccountMenu) {
        setAccountMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setAccountMenuOpen(false)
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [])

  const handleRecharge = () => {
    onNavigate('/recharge')
    setAccountMenuOpen(false)
    setMenuOpen(false)
  }

  const handleLogout = () => {
    setAccountMenuOpen(false)
    setMenuOpen(false)
    logout()
  }

  return (
    <header data-no-drag-select className="safe-area-top sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur border-b border-gray-200 dark:border-white/[0.08]">
      <div className="safe-area-x safe-header-inner max-w-7xl mx-auto hidden sm:flex items-center justify-between">
        <div className="flex items-center gap-5">
          <h1 className="text-lg font-bold tracking-tight">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="text-gray-800 dark:text-gray-100 cursor-pointer"
              aria-label="返回首页"
            >
              Art Image
            </button>
          </h1>
          <nav aria-label="主菜单" className="flex items-center gap-1 text-sm">
            {navItems.map((item) => {
              const isActive = currentPath === item.path
              const isHovered = hoveredNav === item.key
              const showLine = isActive || isHovered
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onNavigate(item.path)}
                  onMouseEnter={() => setHoveredNav(item.key)}
                  onMouseLeave={() => setHoveredNav(null)}
                  aria-current={isActive ? 'page' : undefined}
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
              <button
                type="button"
                onClick={handleRecharge}
                className={primaryButtonClass}
                title="进入充值页面"
              >
                充值
              </button>
              <div ref={desktopAccountRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((value) => !value)}
                  className={accountButtonClass}
                  aria-haspopup="menu"
                  aria-expanded={accountMenuOpen}
                >
                  <span>{userName}</span>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {accountMenuOpen && (
                  <div className={accountMenuClass}>
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      剩余积分
                      <span className="ml-2 font-semibold text-amber-700 dark:text-amber-300">
                        {userPoints ?? '--'}
                      </span>
                    </div>
                    <div className="my-1 h-px bg-gray-100 dark:bg-white/[0.08]" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className={accountMenuItemClass}
                    >
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className={primaryButtonClass}
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
          <div ref={mobileAccountRef} className="relative">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((value) => !value)}
              className={accountButtonClass}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
            >
              <span>{userName}</span>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {accountMenuOpen && (
              <div className={accountMenuClass}>
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  剩余积分
                  <span className="ml-2 font-semibold text-amber-700 dark:text-amber-300">
                    {userPoints ?? '--'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRecharge}
                  className={accountMenuItemClass}
                >
                  充值
                </button>
                <div className="my-1 h-px bg-gray-100 dark:bg-white/[0.08]" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className={accountMenuItemClass}
                >
                  退出登录
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className={primaryButtonClass}
            title="登录"
          >
            登录
          </button>
        )}

        {menuOpen && createPortal(
          <div data-mobile-menu-portal className="fixed inset-0 z-[200] sm:hidden">
            {/* 蒙层 */}
            <button
              type="button"
              aria-label="关闭菜单"
              className="absolute inset-0 bg-black/60 animate-overlay-in motion-reduce:animate-none"
              onClick={() => setMenuOpen(false)}
            />
            {/* 抽屉面板 */}
            <div className="absolute inset-y-0 left-0 w-[78%] max-w-[300px] flex flex-col border-r border-gray-200 bg-white shadow-2xl animate-mobile-drawer-in dark:border-white/[0.08] dark:bg-gray-950 motion-reduce:animate-none">
              <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-white/[0.08]">
                <span className="text-sm font-semibold tracking-wide text-gray-900 dark:text-gray-100">菜单</span>
                <button
                  type="button"
                  aria-label="关闭菜单"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/[0.06] dark:hover:text-gray-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav aria-label="移动端菜单" className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
                <button
                  type="button"
                  className={[
                    'w-full min-h-[44px] rounded-lg px-3 py-2 text-left text-base font-medium transition-colors active:bg-gray-100 dark:active:bg-white/[0.08]',
                    currentPath === '/'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/[0.06]',
                  ].join(' ')}
                  onClick={() => {
                    onNavigate('/')
                    setMenuOpen(false)
                  }}
                >
                  首页
                </button>
                <button
                  type="button"
                  className={[
                    'w-full min-h-[44px] rounded-lg px-3 py-2 text-left text-base font-medium transition-colors active:bg-gray-100 dark:active:bg-white/[0.08]',
                    currentPath === '/prompts'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/[0.06]',
                  ].join(' ')}
                  onClick={() => {
                    onNavigate('/prompts')
                    setMenuOpen(false)
                  }}
                >
                  提示词库
                </button>
                <button
                  type="button"
                  className={[
                    'w-full min-h-[44px] rounded-lg px-3 py-2 text-left text-base font-medium transition-colors active:bg-gray-100 dark:active:bg-white/[0.08]',
                    currentPath === '/consumption'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/[0.06]',
                  ].join(' ')}
                  onClick={() => {
                    onNavigate('/consumption')
                    setMenuOpen(false)
                  }}
                >
                  我的消费
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
