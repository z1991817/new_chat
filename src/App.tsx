import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { initStore } from './store'
import { useStore } from './store'
import { normalizeBaseUrl } from './lib/api'
import type { ApiMode } from './types'
import Header from './components/Header'
import SearchBar from './components/SearchBar'
import TaskGrid from './components/TaskGrid'
import HomeSeoContent from './components/HomeSeoContent'
import InputBar from './components/InputBar'
import ConsumptionPage from './components/ConsumptionPage'
import RechargePage from './components/RechargePage'
import DetailModal from './components/DetailModal'
import Lightbox from './components/Lightbox'
import SettingsModal from './components/SettingsModal'
import ConfirmDialog from './components/ConfirmDialog'
import Toast from './components/Toast'
import MaskEditorModal from './components/MaskEditorModal'
import ImageContextMenu from './components/ImageContextMenu'

const LoginModal = lazy(() => import('./components/LoginModal'))

const HOME_PATH = '/'
const PROMPTS_PATH = '/prompts'
const CONSUMPTION_PATH = '/consumption'
const RECHARGE_PATH = '/recharge'

type AppPath = typeof HOME_PATH | typeof PROMPTS_PATH | typeof CONSUMPTION_PATH | typeof RECHARGE_PATH

function resolveAppPath(pathname: string): AppPath {
  if (pathname.startsWith(RECHARGE_PATH)) return RECHARGE_PATH
  if (pathname.startsWith(CONSUMPTION_PATH)) return CONSUMPTION_PATH
  return pathname.startsWith(PROMPTS_PATH) ? PROMPTS_PATH : HOME_PATH
}

interface AppProps {
  initialPath?: string
}

export default function App({ initialPath }: AppProps) {
  const setSettings = useStore((s) => s.setSettings)
  const loginOpen = useStore((s) => s.loginOpen)
  const initializedRef = useRef(false)
  const [currentPath, setCurrentPath] = useState(() =>
    resolveAppPath(initialPath ?? (typeof window !== 'undefined' ? window.location.pathname : HOME_PATH)),
  )

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const searchParams = new URLSearchParams(window.location.search)
    const nextSettings: { baseUrl?: string; apiKey?: string; codexCli?: boolean; apiMode?: ApiMode } = {}

    const apiUrlParam = searchParams.get('apiUrl')
    if (apiUrlParam !== null) {
      nextSettings.baseUrl = normalizeBaseUrl(apiUrlParam.trim())
    }

    const apiKeyParam = searchParams.get('apiKey')
    if (apiKeyParam !== null) {
      nextSettings.apiKey = apiKeyParam.trim()
    }

    const codexCliParam = searchParams.get('codexCli')
    if (codexCliParam !== null) {
      nextSettings.codexCli = codexCliParam.trim().toLowerCase() === 'true'
    }

    const apiModeParam = searchParams.get('apiMode')
    if (apiModeParam === 'images' || apiModeParam === 'responses') {
      nextSettings.apiMode = apiModeParam
    }

    setSettings(nextSettings)

    if (searchParams.has('apiUrl') || searchParams.has('apiKey') || searchParams.has('codexCli') || searchParams.has('apiMode')) {
      searchParams.delete('apiUrl')
      searchParams.delete('apiKey')
      searchParams.delete('codexCli')
      searchParams.delete('apiMode')

      const nextSearch = searchParams.toString()
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`
      window.history.replaceState(null, '', nextUrl)
    }

    initStore()
  }, [setSettings])

  useEffect(() => {
    const preventPageImageDrag = (e: DragEvent) => {
      if ((e.target as HTMLElement | null)?.closest('img')) {
        e.preventDefault()
      }
    }

    document.addEventListener('dragstart', preventPageImageDrag)
    return () => document.removeEventListener('dragstart', preventPageImageDrag)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const syncPath = () => setCurrentPath(resolveAppPath(window.location.pathname))
    syncPath()
    window.addEventListener('popstate', syncPath)
    return () => window.removeEventListener('popstate', syncPath)
  }, [])

  const handleNavigate = useCallback((nextPath: AppPath) => {
    if (typeof window === 'undefined') return
    const normalizedPath = resolveAppPath(nextPath)
    if (normalizedPath === resolveAppPath(window.location.pathname)) return
    window.history.pushState({}, '', normalizedPath)
    setCurrentPath(normalizedPath)
  }, [])

  return (
    <>
      <Header currentPath={currentPath} onNavigate={handleNavigate} />
      <main
        data-home-main
        data-drag-select-surface
        className={currentPath === HOME_PATH ? 'pb-48' : 'pb-8'}
      >
        <div className="safe-area-x max-w-7xl mx-auto">
          {currentPath === CONSUMPTION_PATH ? (
            <ConsumptionPage />
          ) : currentPath === RECHARGE_PATH ? (
            <RechargePage />
          ) : (
            <>
              <SearchBar />
              <TaskGrid />
              {currentPath === HOME_PATH && <HomeSeoContent />}
            </>
          )}
        </div>
      </main>
      {currentPath === HOME_PATH && <InputBar />}
      <DetailModal />
      <Lightbox />
      <SettingsModal />
      <ConfirmDialog />
      <Toast />
      <MaskEditorModal />
      <ImageContextMenu />
      {loginOpen && (
        <Suspense>
          <LoginModal />
        </Suspense>
      )}
    </>
  )
}
