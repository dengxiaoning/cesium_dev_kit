import { test, expect } from '@playwright/test'

/**
 * 文档站静态页冒烟测试。
 * 需要先 `npm run docs:all`（或 CI 里先构建 docs/）。
 */

test('文档首页：标题、语言、版本切换器', async ({ page }) => {
  const res = await page.goto('/')
  expect(res?.status()).toBe(200)
  await expect(page).toHaveTitle(/cesium_dev_kit/)
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh')
  // 版本切换下拉框由 scripts/docs-custom.js 注入
  await expect(page.locator('.cdk-version select')).toHaveCount(1)
})

test('英文文档：lang=en 且可访问', async ({ page }) => {
  const res = await page.goto('/en/')
  expect(res?.status()).toBe(200)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('示例总览页：列出大量示例', async ({ page }) => {
  await page.goto('/examples/')
  await expect(page).toHaveTitle(/示例/)
  const links = page.locator('ul.cards a')
  expect(await links.count()).toBeGreaterThan(50)
})

test('示例详情页：标题 / description / canonical / 代码块', async ({ page }) => {
  await page.goto('/examples/radar/radarScan.html')
  await expect(page).toHaveTitle(/雷达扫描/)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /examples\/radar\/radarScan\.html$/
  )
  await expect(page.locator('pre.code code')).not.toBeEmpty()
})

test('API 类页可访问', async ({ page }) => {
  const res = await page.goto('/classes/Graphics.html')
  expect(res?.status()).toBe(200)
  await expect(page.locator('h1')).toContainText(/Graphics/)
})

test('SEO / AI 资产均可访问', async ({ request }) => {
  for (const path of ['/sitemap.xml', '/robots.txt', '/llms.txt', '/versions.json', '/api-index.json']) {
    const res = await request.get(path)
    expect(res.status(), `${path} 应返回 200`).toBe(200)
  }
})
