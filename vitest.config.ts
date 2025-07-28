import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*-tests.ts'],
    exclude: ['node_modules/**', 'dist/**', 'client/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        'dist/**',
        '**/*.d.ts',
        'client/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './server'),
      '@client': path.resolve(__dirname, './client/src')
    }
  }
});