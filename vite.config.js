/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: false,
    // Co-locate unit tests next to source under __tests__/ folders or use the
    // `.test.js`/`.test.jsx` suffix. Keep e2e (if added later) out of vitest.
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
  server: {
    port: 5173,
    // Refuse to fall back to the next free port — if 5173 is occupied,
    // we want a hard error so the conflicting process gets resolved
    // instead of silently drifting to 5174/5175/etc.
    strictPort: true,
  },
  build: {
    // Split heavy vendor libraries into their own chunks so the initial
    // bundle stays light. Each chunk loads only when a page that needs it
    // is visited (combined with React.lazy() routes in App.jsx).
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // Leaflet + cluster + react-leaflet: ~330 KB. Used by /, /map only.
          if (id.includes('leaflet') || id.includes('react-leaflet')) {
            return 'vendor-leaflet'
          }
          // Recharts + d3 deps: ~330 KB. Used by /charts only.
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory-vendor')) {
            return 'vendor-charts'
          }
          // React runtime + router: ~150 KB. Used everywhere — separate chunk
          // is fine because it's stable across builds (better long-term cache).
          if (
            id.includes('/react-dom/') ||
            id.includes('/react-router') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react'
          }
          // date-fns: ~75 KB. Only loaded when locale/formatting is used.
          if (id.includes('date-fns')) {
            return 'vendor-date'
          }
          // lucide-react: only the icons you import are tree-shaken, but
          // the runtime ships with each. Keep in main bundle (icons are
          // touched on every page).
        },
      },
    },
    // We're intentionally splitting — raise the noisy warning threshold.
    chunkSizeWarningLimit: 800,
  },
})
