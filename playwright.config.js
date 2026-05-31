import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.GHOSTFLEET_E2E_PORT || 4187);
const baseURL = `http://127.0.0.1:${port}`;
const startCommand = process.platform === 'win32'
  ? `cmd /c "set PORT=${port}&& set GHOSTFLEET_FREE_ONLY=true&& npm.cmd start"`
  : `PORT=${port} GHOSTFLEET_FREE_ONLY=true npm start`;

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  webServer: {
    command: startCommand,
    url: `${baseURL}/healthz`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome']
      }
    }
  ]
});
