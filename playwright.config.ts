import { defineConfig, devices } from '@playwright/test';

// The walk-through spec files live in e2e/ and are named *.e2e.ts precisely so
// vitest's default include (which matches *.test.* / *.spec.*) never picks
// them up (see vitest.config.ts, which we may not edit).
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 30 * 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['line']],
  use: {
    trace: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
