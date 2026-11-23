#!/usr/bin/env node
/**
 * `changeset version` 生成的小节标题是英文（`### Patch Changes` 等），
 * 而本项目的 CHANGELOG 一直是中文分类。这里做一次幂等映射，
 * 让新旧条目读起来一致；重复执行不会产生额外改动。
 *
 * 用法：node scripts/changelog-zh.mjs [--dry]
 */
import fs from 'node:fs'
import path from 'node:path'

const file = path.resolve(process.cwd(), 'CHANGELOG.md')

if (!fs.existsSync(file)) {
  console.log('[changelog-zh] 没有 CHANGELOG.md，跳过')
  process.exit(0)
}

const MAP = [
  ['### Major Changes', '### 破坏性变更（Breaking）'],
  ['### Minor Changes', '### 新增 / 变更（Added / Changed）'],
  ['### Patch Changes', '### 修复（Fixed）']
]

let text = fs.readFileSync(file, 'utf8')
let count = 0

for (const [from, to] of MAP) {
  const parts = text.split(from)
  if (parts.length > 1) {
    count += parts.length - 1
    text = parts.join(to)
  }
}

if (process.argv.includes('--dry')) {
  console.log(
    `[changelog-zh] 将替换 ${count} 个英文小节标题（dry run，未写入）`
  )
  process.exit(0)
}

if (count === 0) {
  console.log('[changelog-zh] 没有需要替换的英文标题')
  process.exit(0)
}

fs.writeFileSync(file, text)
console.log(`[changelog-zh] 替换 ${count} 个英文小节标题`)
