// @ts-nocheck
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/*',
  'apps/*',
  {
    test: {
      name: 'root',
      include: ['examples/**/*.test.ts'],
      globals: true,
      environment: 'node',
      fileParallelism: false,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'dist/', '**/*.test.ts'],
      },
    },
  },
]);
