import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // autoUpdate, not 'prompt'. 'prompt' needs a component calling
      // registerSW() to offer the reload, and for an early-warning app
      // "a new version is available, click here" is the wrong interaction
      // anyway — a stale build showing yesterday's warnings is the failure
      // mode that matters, so it updates itself on the next load.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'WeatherGPT — weather warnings for India',
        short_name: 'WeatherGPT',
        description:
          'Conversational weather intelligence and early warning for India. Official IMD and NDMA warnings, risk, and honest forecast confidence.',
        lang: 'en-IN',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        // Matches --c-ground in both themes; the browser chrome should not be
        // the one bright thing on a dark screen.
        background_color: '#fcfbf6',
        theme_color: '#fcfbf6',
        categories: ['weather', 'utilities'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // The assessment — forecast, warnings, risk. Served from cache
            // immediately and refreshed in the background, so opening the app
            // on a dead connection shows the last known state rather than an
            // error. The UI stamps it with an age; see DataContext.
            urlPattern: /\/api\/(assess|weather|warnings)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'wg-data',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 6 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Map tiles. Cache-first with a long life: tiles for a district do
            // not change, and re-fetching them on every pan is the single
            // largest data cost in the app on a metered connection.
            urlPattern: /^https:\/\/[a-c]\.tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wg-tiles',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // A chat answer is never cached: it is grounded in a forecast that
        // goes stale in minutes, and a cached one would be a wrong answer
        // presented as a current one.
        navigateFallbackDenylist: [/\/api\//],
      },
      devOptions: { enabled: false },
    }),
  ],
  base: './',
  resolve: {
    alias: { '@': path.resolve(process.cwd(), 'src') },
  },
  server: { port: 5173, open: true },
  build: {
    // Leaflet is the only large dependency and it is already route-split.
    chunkSizeWarningLimit: 700,
  },
})
