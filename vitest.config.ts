import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'test/', '**/*.test.ts', '**/*.config.ts'],
    },
    include: ['test/**/*.test.ts'],
    mockReset: true,
    restoreMocks: true,
  },
});
