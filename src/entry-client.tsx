import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { retireServiceWorkers } from './lib/serviceWorkerCleanup'
import { installMobileViewportGuards } from './lib/viewport'

installMobileViewportGuards()

const loadHarmonyOsFont = () => {
  const href = `${import.meta.env.BASE_URL}fonts/harmonyos-sans-sc/regular.css`

  if (document.querySelector(`link[href="${href}"]`)) {
    return
  }

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.onload = () => {
    document.documentElement.classList.add('harmonyos-font-ready')
  }
  document.head.append(link)
}

if (typeof window.requestIdleCallback === 'function') {
  window.requestIdleCallback(loadHarmonyOsFont, { timeout: 5000 })
} else {
  globalThis.setTimeout(loadHarmonyOsFont, 3000)
}

function renderApp() {
  const rootElement = document.getElementById('root')

  if (!rootElement) {
    throw new Error('Root element #root was not found')
  }

  const app = (
    <StrictMode>
      <App initialPath={window.location.pathname} />
    </StrictMode>
  )

  if (rootElement.hasChildNodes()) {
    hydrateRoot(rootElement, app)
  } else {
    createRoot(rootElement).render(app)
  }
}

retireServiceWorkers().then((shouldReload) => {
  if (shouldReload) {
    window.location.reload()
    return
  }

  renderApp()
})
