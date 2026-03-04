import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.testforge',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'dev',
      use: {
        browserName: 'chromium',
        baseURL: 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login',
        headless: false,
        slowMo: 500,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
      },
      timeout: 30000,
      retries: 2,
      workers: 4,
    },
    {
      name: 'stage',
      use: {
        browserName: 'chromium',
        baseURL: 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login',
        headless: false,
        slowMo: 500,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
      },
      timeout: 30000,
      retries: 2,
      workers: 4,
    },
    {
      name: 'prod',
      use: {
        browserName: 'chromium',
        baseURL: 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login',
        headless: false,
        slowMo: 500,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
      },
      timeout: 30000,
      retries: 2,
      workers: 4,
    }
  ],
})
