import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../config/vitest/base';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      name: '@pocket-mqtt/core',
    },
  })
);
