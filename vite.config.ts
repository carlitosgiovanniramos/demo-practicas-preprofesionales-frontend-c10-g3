import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Las fuentes (@fontsource) se empaquetan como assets con extensión
      // woff/woff2: si no entran al precache, la app arranca sin red pero sin tipografía.
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      },
      manifest: {
        name: 'Prácticas preprofesionales',
        short_name: 'Prácticas',
        description: 'Cliente offline-first para gestión de prácticas preprofesionales.',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        theme_color: '#0E3A6B',
        background_color: '#EEF3F8',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
