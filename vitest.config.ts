import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const resolvePath = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@pocket/core': resolvePath('./packages/core/src/index.ts'),
      '@pocket/db': resolvePath('./packages/db/src/index.ts'),
      '@pocket/telemetry-service': resolvePath('./packages/telemetry-service/src/index.ts'),
      '@pocket/mqtt-broker': resolvePath('./packages/mqtt-broker/src/index.ts'),
      '@pocket/api': resolvePath('./packages/api/src/index.ts')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    // Run test files sequentially to avoid database conflicts
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts']
    }
  }
});
