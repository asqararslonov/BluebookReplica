import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Production CSP (injected at build time only; the dev server needs inline scripts for HMR).
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://www.desmos.com https://*.desmos.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.desmos.com",
  "font-src 'self' data:",
  "connect-src 'self' https: http://localhost:* http://127.0.0.1:*",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
].join('; ')

function cspPlugin() {
  let isBuild = false
  return {
    name: 'bluebook-csp',
    configResolved(config) { isBuild = config.command === 'build' },
    transformIndexHtml(html) {
      if (!isBuild) return html
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`)
    },
  }
}

// Serves the Vercel-style api/ functions during `vite dev` so the mentor chat works locally.
function apiPlugin() {
  return {
    name: 'bluebook-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next()
        const name = req.url.slice(5).split('?')[0].replace(/[^a-z0-9-]/gi, '')
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.js`)
          await mod.default(req, res)
        } catch (err) {
          res.statusCode = err.code === 'ERR_MODULE_NOT_FOUND' ? 404 : 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    },
  }
}

// base './' so the built index.html works when loaded from file:// inside Electron.
export default defineConfig({
  base: './',
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')) },
  plugins: [react(), tailwindcss(), cspPlugin(), apiPlugin()],
  server: { port: 5199, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false, chunkSizeWarningLimit: 900 },
})
