import { existsSync } from 'node:fs'
import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test'

const port = Number(process.env.PLAYWRIGHT_PORT || process.env.PORT || 5173)
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${port}`
const chromePathCandidates = [
  process.env.PLAYWRIGHT_CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA
    ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
    : undefined,
].filter((path): path is string => Boolean(path))
const systemChromePath = chromePathCandidates.find((path) => existsSync(path))
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL
const browserUse: PlaywrightTestConfig['use'] = {
  ...devices['Desktop Chrome'],
  ...(browserChannel
    ? { channel: browserChannel }
    : systemChromePath
    ? { launchOptions: { executablePath: systemChromePath } }
    : {}),
}

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: browserUse,
    },
  ],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
