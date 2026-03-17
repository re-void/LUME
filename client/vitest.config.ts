import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Default environment is node; hooks tests override to jsdom via @vitest-environment docblock
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    environmentOptions: {
      jsdom: {
        resources: 'usable',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@noble/hashes/hmac': path.resolve(__dirname, 'node_modules/@noble/hashes/hmac.js'),
      '@noble/hashes/sha256': path.resolve(__dirname, 'node_modules/@noble/hashes/sha2.js'),
      '@noble/hashes/hkdf': path.resolve(__dirname, 'node_modules/@noble/hashes/hkdf.js'),
    },
  },
});
