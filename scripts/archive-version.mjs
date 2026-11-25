#!/usr/bin/env node
/**
 * 把当前 docs/ 快照成一份「归档版本」，放进 docs/v<tag>/，供版本切换器识别。
 *
 * 用法（发布旧版本快照时）：
 *   node scripts/archive-version.mjs 1.2.1
 *
 * 结果：docs/ 里出现 docs/v1.2.1/，versions.json 会（在下次构建 extras 时）自动收录它。
 * 注意：这个脚本只负责「归档当前已构建好的 docs/」，一般配合旧 tag 的构建产物一起用：
 *
 *   git worktree add /tmp/v1.2.1 v1.2.1
 *   cd /tmp/v1.2.1 && npm ci && npm run docs:all
 *   node scripts/archive-version.mjs 1.2.1    # 在旧工作树里执行
 *   # 再把 docs/v1.2.1/ 合入主站点的 docs/ 后一起发布
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOCS = path.join(ROOT, 'docs')

const version = (process.argv[2] || '').replace(/^v/, '')
if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.error('用法：node scripts/archive-version.mjs <x.y.z>')
  process.exit(1)
}
if (!fs.existsSync(DOCS)) {
  console.error('docs/ 不存在，请先 `npm run docs:all`。')
  process.exit(1)
}

const target = path.join(DOCS, `v${version}`)
if (fs.existsSync(target)) {
  console.error(`目标已存在：${target}（如需覆盖请先手动删除）`)
  process.exit(1)
}

fs.mkdirSync(target, { recursive: true })
for (const entry of fs.readdirSync(DOCS)) {
  if (entry === `v${version}`) continue
  fs.cpSync(path.join(DOCS, entry), path.join(target, entry), { recursive: true })
}
console.log(`已归档 docs/ -> docs/v${version}/`)
console.log('下次 `npm run docs:all`（或 CI 的 docs:extras）会把它写进 versions.json。')
