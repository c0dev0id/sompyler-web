import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  base: '/sompyler-web/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    solid(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Sompyler',
        short_name: 'Sompyler',
        description: 'Author instruments and scores, render them client-side, listen.',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone',
        scope: '/sompyler-web/',
        start_url: '/sompyler-web/',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  // Allow Vite/Vitest to read sibling sompyler/ conformance fixtures.
  server: { fs: { allow: ['..'] } },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test-setup.ts'],
    server: { deps: { inline: [/sompyler/] } },
  },
})
