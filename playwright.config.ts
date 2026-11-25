import { defineConfig, devices } from '@playwright/test'

/**
 * E2E 冒烟测试：验证文档站（docs/）的关键页面与 SEO 资产可访问。
 *
 * 前置条件：先 `npm run docs:all` 生成 docs/，webServer 只是把它 serve 起来
 * （复用 scripts/serve-docs.mjs，端口 5174）。
 *
 * 本套件不跑 WebGL（Cesium 渲染在无头环境易抖），聚焦静态页的正确性：
 * 标题、lang、description、canonical、示例落地页、sitemap/llms 等。
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/serve-docs.mjs',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
})
