import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cpSync, existsSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'copy-static-dirs',
      closeBundle() {
        for (const dir of ['books', 'essays', 'data', 'bible']) {
          const src = resolve(dir)
          if (existsSync(src)) {
            cpSync(src, resolve('dist', dir), { recursive: true })
          }
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://futuresdailyword.com',
        changeOrigin: true,
      },
    },
  },
})
