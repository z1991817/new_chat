import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { retireServiceWorkers } from './lib/serviceWorkerCleanup'
import { installMobileViewportGuards } from './lib/viewport'

installMobileViewportGuards()

retireServiceWorkers().then((shouldReload) => {
  if (shouldReload) {
    window.location.reload()
    return
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
