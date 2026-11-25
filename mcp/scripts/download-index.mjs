#!/usr/bin/env node
/**
 * prepublishOnly：准备 api-index.json 快照到 assets/，作为 MCP server 的离线兜底。
 *
 * 优先从线上拉最新版；线上还没部署（例如主站改动尚未发布）时，回退到主仓库本地
 * 生成的 docs/api-index.json，保证首次 publish 也能成功。
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const INDEX_URL = 'https://dengxiaoning.github.io/cesium_dev_kit/api-index.json'
const LOCAL = new URL('../../docs/api-index.json', import.meta.url)
const OUT = new URL('../assets/api-index.json', import.meta.url)

let text = null

try {
  const res = await fetch(INDEX_URL)
  if (res.ok) {
    text = await res.text()
    console.log(`已从线上拉取 ${INDEX_URL}`)
  } else {
    console.warn(`线上返回 HTTP ${res.status}，改用本地 docs/api-index.json`)
  }
} catch (err) {
  console.warn(`线上不可达（${err.message}），改用本地 docs/api-index.json`)
}

if (!text) {
  try {
    text = await readFile(fileURLToPath(LOCAL), 'utf8')
    console.log(`已读取本地 ${fileURLToPath(LOCAL)}`)
  } catch {
    console.error('线上与本地都没有 api-index.json。请先在主仓库执行 `npm run docs:all`。')
    process.exit(1)
  }
}

await mkdir(new URL('../assets', import.meta.url), { recursive: true })
await writeFile(fileURLToPath(OUT), text, 'utf8')
console.log(`已写入 ${fileURLToPath(OUT)}`)
