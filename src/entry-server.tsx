import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import App from './App'
import './index.css'

export async function render(_url: string) {
  const html = renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  return { html }
}