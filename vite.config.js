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
      // Manifest: leeres Objekt = SW + Asset-Caching aktiv, aber noch kein
      // generiertes manifest.webmanifest. Echte Manifest-Werte (name, icons,
      // theme_color) kommen in Task 5-02.
      manifest: false,
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
