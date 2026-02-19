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
      workbox: {
        // New service worker takes over immediately without waiting for all
        // tabs to close, so users always run the latest JS after a deploy.
        skipWaiting: true,
        clientsClaim: true,
      },
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
