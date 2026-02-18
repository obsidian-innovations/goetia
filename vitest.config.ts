import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@engine': '/src/engine',
      '@canvas': '/src/canvas',
      '@stores': '/src/stores',
      '@services': '/src/services',
      '@db': '/src/db',
    },
  },
  test: {
    globals: true,
  },
});
