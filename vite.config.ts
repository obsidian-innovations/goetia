import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@engine': '/src/engine',
      '@canvas': '/src/canvas',
      '@stores': '/src/stores',
      '@services': '/src/services',
      '@db': '/src/db',
    },
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Grimoire',
        short_name: 'Grimoire',
        display: 'fullscreen',
        background_color: '#0a0a0a',
        theme_color: '#0a0a0a',
        orientation: 'portrait',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
});
