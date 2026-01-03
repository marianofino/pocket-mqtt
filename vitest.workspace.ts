import { defineWorkspace } from 'vitest/config';

/**
 * Vitest workspace configuration for PocketMQTT monorepo.
 * This file defines shared test settings that all packages and apps inherit.
 */
export default defineWorkspace([
  // Include all packages and apps
  'packages/*',
  'apps/*',
  // Root-level tests (e.g., examples)
  {
    test: {
      name: 'root',
      include: ['examples/**/*.test.ts'],
      globals: true,
      environment: 'node',
      // Run test files sequentially to avoid database conflicts
      fileParallelism: false,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'dist/', '**/*.test.ts'],
      },
    },
  },
]);
