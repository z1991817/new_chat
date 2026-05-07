import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { loginWithPassword, registerWithPassword, sendRegisterCode, useStore } from '../store'
import { useCloseOnEscape } from '../hooks/useCloseOnEscape'

const inputCls =
  'w-full rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] px-3 py-2 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:ring-2 focus:ring-blue-500/40 transition'

export default function LoginModal() {
  const loginOpen = useStore((s) => s.loginOpen)
  const loginModalTab = useStore((s) => s.loginModalTab)
  const setLoginOpen = useStore((s) => s.setLoginOpen)
  const showToast = useStore((s) => s.showToast)
  const [tab, setTab] = useState(loginModalTab)
  const [loading, setLoading] = useState(false)

  // login fields
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // register fields
  const [regEmail, setRegEmail] = useState('')
  const [regCode, setRegCode] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const handleClose = () => setLoginOpen(false)
  useCloseOnEscape(loginOpen, handleClose)

  useEffect(() => {
    if (loginOpen) setTab(loginModalTab)
  }, [loginModalTab, loginOpen])

  if (!loginOpen) return null

  const startCountdown = () => {
    setCodeSent(true)
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) { clearInterval(timer); return 0 }
        return n - 1
      })
    }, 1000)
  }

  const handleSendCode = async () => {
    if (!regEmail || countdown > 0) return
    try {
      await sendRegisterCode(regEmail.trim())
      startCountdown()
      showToast('验证码已发送', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : '发送验证码失败', 'error')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (tab === 'login') {
        await loginWithPassword(loginEmail.trim(), loginPassword)
        showToast('登录成功', 'success')
      } else {
        await registerWithPassword(regEmail.trim(), regPassword, regEmail.trim(), regCode.trim())
        showToast('注册成功', 'success')
      }
      setLoginOpen(false)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '操作失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-md animate-overlay-in" />
      <div
        className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-white/50 dark:border-white/[0.08] rounded-3xl shadow-[0_8px_40px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgb(0,0,0,0.4)] w-full max-w-sm p-6 z-10 ring-1 ring-black/5 dark:ring-white/10 animate-confirm-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tab 切换 */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl bg-gray-100 dark:bg-white/[0.06]">
          {(['login', 'register'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={[
                'flex-1 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer',
                tab === t
                  ? 'bg-white dark:bg-white/[0.12] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
              ].join(' ')}
            >
              {t === 'login' ? '登录' : '注册'}
            </button>
          ))}
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="login-email" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">账号</label>
              <input id="login-email" type="text" autoComplete="username" required placeholder="用户名或邮箱"
                value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">密码</label>
              <input id="login-password" type="password" autoComplete="current-password" required placeholder="••••••••"
                value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className={inputCls} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={handleClose}
                className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition cursor-pointer">
                取消
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-medium transition cursor-pointer">
                {loading ? '登录中…' : '登录'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="reg-email" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">邮箱</label>
              <input id="reg-email" type="email" autoComplete="email" required placeholder="you@example.com"
                value={regEmail} onChange={(e) => setRegEmail(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="reg-code" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">验证码</label>
              <div className="flex gap-2">
                <input id="reg-code" type="text" inputMode="numeric" required placeholder="6 位验证码"
                  value={regCode} onChange={(e) => setRegCode(e.target.value)} className={inputCls} />
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={!regEmail || countdown > 0}
                  className="shrink-0 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.06] disabled:opacity-50 transition cursor-pointer whitespace-nowrap"
                >
                  {countdown > 0 ? `${countdown}s` : codeSent ? '重新发送' : '发送验证码'}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="reg-password" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">密码</label>
              <input id="reg-password" type="password" autoComplete="new-password" required placeholder="至少 8 位"
                value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className={inputCls} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={handleClose}
                className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-white/[0.08] text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/[0.06] transition cursor-pointer">
                取消
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-medium transition cursor-pointer">
                {loading ? '注册中…' : '注册'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
