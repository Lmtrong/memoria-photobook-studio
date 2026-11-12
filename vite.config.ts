import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import type { IncomingMessage, ServerResponse } from 'http'

function createShareMiddleware() {
  const sharedDir = path.resolve(__dirname, '.memoria-shared')
  if (!fs.existsSync(sharedDir)) {
    fs.mkdirSync(sharedDir, { recursive: true })
  }

  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url || ''
    if (!url.startsWith('/api/shared-albums/')) {
      return next()
    }

    const rawId = decodeURIComponent(url.replace('/api/shared-albums/', '').split('?')[0])
    const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '')
    if (!safeId) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: 'Invalid album id' }))
      return
    }

    const filePath = path.join(sharedDir, `${safeId}.json`)

    if (req.method === 'GET') {
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'application/json')
        fs.createReadStream(filePath).pipe(res)
      } else {
        res.statusCode = 404
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Shared album not found' }))
      }
      return
    }

    if (req.method === 'POST') {
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', () => {
        try {
          const body = Buffer.concat(chunks)
          fs.writeFileSync(filePath, body)
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, id: safeId }))
        } catch (err) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: String(err) }))
        }
      })
      return
    }

    next()
  }
}

function memoriaShareServerPlugin(): Plugin {
  return {
    name: 'memoria-share-server',
    configureServer(server) {
      server.middlewares.use(createShareMiddleware())
    },
    configurePreviewServer(server) {
      server.middlewares.use(createShareMiddleware())
    },
  }
}

export default defineConfig({
  plugins: [react(), memoriaShareServerPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand', 'dexie', 'dexie-react-hooks'],
          pdf: ['jspdf', 'html2canvas'],
          motion: ['framer-motion', 'lucide-react'],
        },
      },
    },
  },
})
