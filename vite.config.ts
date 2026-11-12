import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
// @ts-expect-error JS serverless handler
import shareHandler from './api/share.js'

function memoriaShareApiPlugin(): Plugin {
  return {
    name: 'memoria-share-api',
    configureServer(server) {
      server.middlewares.use('/api/share', (req, res) => {
        shareHandler(req, res)
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/share', (req, res) => {
        shareHandler(req, res)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), memoriaShareApiPlugin()],
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
