import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['vitest-browser-react', 'wouter'],
  },
  test: {
    include: ['src/**/*.screenshot.test.ts?(x)'],
    setupFiles: ['src/test/browser-setup.ts'],
    browser: {
      api: {
        host: '127.0.0.1',
        port: 63316,
      },
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [
        {
          browser: 'chromium',
          viewport: { width: 900, height: 700 },
        },
      ],
      expect: {
        toMatchScreenshot: {
          comparatorName: 'pixelmatch',
          comparatorOptions: {
            allowedMismatchedPixelRatio: 0.01,
            threshold: 0.2,
          },
        },
      },
    },
  },
});
