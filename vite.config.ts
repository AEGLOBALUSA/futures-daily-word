import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import sri from 'vite-plugin-sri-gen'
import { cpSync, copyFileSync, existsSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    sri({ algorithm: 'sha384' }),
    {
      name: 'copy-static-dirs',
      closeBundle() {
        for (const dir of ['books', 'essays', 'data', 'bible', 'icons']) {
          const src = resolve(dir)
          if (existsSync(src)) {
            cpSync(src, resolve('dist', dir), { recursive: true })
          }
        }
        // Copy root-level static files into dist
        for (const file of ['robots.txt', 'sitemap.xml', 'manifest.json', '_redirects', '404.html', 'apple-touch-icon.png']) {
          const src = resolve(file)
          if (existsSync(src)) {
            copyFileSync(src, resolve('dist', file))
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
