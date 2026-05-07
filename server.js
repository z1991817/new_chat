import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import express from 'express'
import { createServer as createViteServer } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const isProd = process.argv.includes('--prod') || process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT || 5173)

async function startServer() {
  const app = express()

  let vite
  let template
  let render

  if (!isProd) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    })

    app.use(vite.middlewares)
  } else {
    const clientDist = path.resolve(__dirname, 'dist/client')
    const serverEntryPath = path.resolve(__dirname, 'dist/server/entry-server.js')

    app.use('/assets', express.static(path.join(clientDist, 'assets'), { immutable: true, maxAge: '1y' }))
    app.use('/fonts', express.static(path.join(clientDist, 'fonts'), { immutable: true, maxAge: '1y' }))
    app.use(express.static(clientDist, { index: false }))

    template = await fs.readFile(path.join(clientDist, 'index.html'), 'utf-8')
    ;({ render } = await import(pathToFileURL(serverEntryPath).href))
  }

  app.use('*', async (req, res) => {
    try {
      const url = req.originalUrl
      let pageTemplate
      let rendered

      if (!isProd) {
        pageTemplate = await fs.readFile(path.resolve(__dirname, 'index.html'), 'utf-8')
        pageTemplate = await vite.transformIndexHtml(url, pageTemplate)
        if (!pageTemplate.includes('/src/index.css')) {
          pageTemplate = pageTemplate.replace(
            '</head>',
            '  <link rel="stylesheet" href="/src/index.css" />\n  </head>',
          )
        }
        ;({ render } = await vite.ssrLoadModule('/src/entry-server.tsx'))
      } else {
        pageTemplate = template
      }

      rendered = await render(url)
      const html = pageTemplate.replace('<!--ssr-outlet-->', rendered.html)

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (error) {
      if (!isProd) {
        vite.ssrFixStacktrace(error)
      }

      console.error(error)
      res.status(500).end('Internal Server Error')
    }
  })

  app.listen(port, () => {
    console.log(`SSR server running at http://localhost:${port}`)
  })
}

startServer()
