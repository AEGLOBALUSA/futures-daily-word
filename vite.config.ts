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
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunk — React + ReactDOM (rarely changes, cached long-term)
          'vendor-react': ['react', 'react-dom'],
          // Lucide icons — large, rarely changes
          'vendor-icons': ['lucide-react'],
          // Data files — loaded with main app but cached separately
          'data-plans': ['./src/data/plans.ts', './src/data/ashley-jane-plan.ts'],
          'data-content': ['./src/data/commentary.ts', './src/data/quotes.ts', './src/data/devotions.ts', './src/data/sermons.ts'],
        },
      },
    },
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
