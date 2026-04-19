/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Service Worker registriert sich selbst + zieht Updates automatisch.
      registerType: 'autoUpdate',
      // Dev: SW deaktiviert — Reload-Loops + Stale-Cache stören sonst HMR.
      devOptions: { enabled: false },
      manifest: {
        name: 'MA Construction',
        short_name: 'MA Construction',
        description: 'Baustellen, Stunden, Mängel, Bautagebuch, Regieberichte — App für das MA-Construction-Team.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'de',
        background_color: '#f2f2f7',
        // Single Source of Truth: matched index.html theme-color + index.css --brand-primary
        theme_color: '#7C3AED',
        categories: ['business', 'productivity'],
        // Icon-Dateien folgen in Task 5-03 — Build kann bis dahin warnen.
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Pre-Cache aller Build-Assets (versionsbasiert via Plugin).
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // stats.html aus rollup-plugin-visualizer (~1 MB Dev-Tool) raus.
        globIgnores: ['**/stats.html'],

        // SPA-Routing: Reload auf beliebiger Route → /index.html.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /\.(png|jpg|jpeg|svg|webp|gif)$/,
        ],

        // Runtime-Caching für dynamische Requests.
        runtimeCaching: [
          // 1. Supabase: NIE cachen — Stunden, Kosten, Mängel müssen frisch
          //    sein. Offline → Error (3c-SPINNER zeigt App-Level-Screen).
          {
            urlPattern: /^https:\/\/[a-z0-9]+\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
          // 2. Google-Fonts CSS: SWR (ändert sich praktisch nie).
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          // 3. Google-Fonts woff2: CacheFirst, 1 Jahr.
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // 4. Bilder (spätere Storage-URLs): SWR, 30 Tage.
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],

        // Alte SW-Versionen beim Aktivieren entsorgen.
        cleanupOutdatedCaches: true,
        // Update-UI bewusst nicht implementiert: skipWaiting+clientsClaim
        // übernimmt neue Versionen stillschweigend beim nächsten Load. Falls
        // später ein "App aktualisiert — neu laden?"-Toast gewünscht:
        // registerType: 'prompt' + useRegisterSW-Hook aus virtual:pwa-register/react.
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Vendor-Splitting: React/Supabase/Lucide ändern sich selten
        // → eigene Chunks → langfristiger Browser-Cache, App-Updates
        // invalidieren nur den Main-Chunk. Function-Variante weil das
        // statische Objekt React + jsx-runtime nicht zuverlässig matched.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          )
            return 'vendor-react';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
})
