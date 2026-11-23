#!/usr/bin/env node
/**
 * `changeset version` 生成的 CHANGELOG 与本项目手写条目的格式有两处差异，
 * 这里做一次幂等归一，让新旧条目读起来一致；重复执行不会产生额外改动。
 *
 * 1. 小节标题是英文（`### Patch Changes` 等）→ 中文分类
 * 2. 条目开头带 `<commit>: ` 前缀 → 去掉（对读者没有价值，1.2.x 也没有）
 * 3. 最新版本标题缺日期（`## 1.3.0`）→ 补当天日期（历史版本不动，1.1.23 原本就没有）
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
const before = text
let titleCount = 0

for (const [from, to] of MAP) {
  const parts = text.split(from)
  if (parts.length > 1) {
    titleCount += parts.length - 1
    text = parts.join(to)
  }
}

// changesets 会在每条摘要前插入「包含该 changeset 的 commit」的短 hash，
// 但一个版本往往由多个提交组成，标出来的那一个容易让人误读，统一去掉。
const hashMatches = text.match(/^- [0-9a-f]{7,40}: /gm)
const hashCount = hashMatches ? hashMatches.length : 0
if (hashCount > 0) {
  text = text.replace(/^- [0-9a-f]{7,40}: /gm, '- ')
}

// 只处理第一个（最新）版本标题：历史里 1.1.23 本来就没有日期，不应被补成今天
const now = new Date()
const ymd = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, '0'),
  String(now.getDate()).padStart(2, '0')
].join('-')
let dateAdded = false
{
  // 只看第一个版本标题：历史里 1.1.23 本来就没有日期，不能被补成今天
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const bare = lines[i].match(/^## (\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?)$/)
    if (bare) {
      lines[i] = `## ${bare[1]} - ${ymd}`
      dateAdded = true
      text = lines.join('\n')
      break
    }
    if (/^## \d+\.\d+\.\d+/.test(lines[i])) break
  }
}

const changed = text !== before

if (process.argv.includes('--dry')) {
  console.log(
    `[changelog-zh] 将替换 ${titleCount} 个英文标题、去掉 ${hashCount} 个 commit 前缀` +
      `${dateAdded ? '、补 1 个版本日期' : ''}（dry run，未写入）`
  )
  process.exit(0)
}

if (!changed) {
  console.log('[changelog-zh] 已经是最新格式，无需改动')
  process.exit(0)
}

fs.writeFileSync(file, text)
console.log(
  `[changelog-zh] 替换 ${titleCount} 个英文标题、去掉 ${hashCount} 个 commit 前缀` +
    `${dateAdded ? '、补 1 个版本日期' : ''}`
)
