import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'
import './index.css'

export async function render(_url: string) {
  const pathname = new URL(_url, 'http://localhost').pathname
  const html = renderToString(
    <StrictMode>
      <App initialPath={pathname} />
    </StrictMode>,
  )

  return { html }
}
