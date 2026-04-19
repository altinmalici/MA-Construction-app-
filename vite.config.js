/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

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
        // Pre-Cache der Build-Assets; differenzierte Strategien in Task 5-05.
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
})
