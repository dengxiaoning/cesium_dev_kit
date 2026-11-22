#!/usr/bin/env node
/**
 * 从 CHANGELOG.md 提取当前版本的发布说明，供 release.yml 创建 GitHub Release。
 *
 * - 版本号取自 package.json；
 * - 标题同时支持 `## [1.2.1] - 2026-11-22` 与 `## 1.2.1` 两种写法；
 * - 找不到对应小节时写出空文件并正常退出，工作流会退回 --generate-notes。
 *
 * 用法：node scripts/release-notes.mjs [--out .release-notes.md]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outArgIndex = process.argv.indexOf('--out')
const outFile =
  outArgIndex > -1 ? process.argv[outArgIndex + 1] : '.release-notes.md'
const outPath = path.resolve(root, outFile)

const { version } = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8')
)
const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8')
const lines = changelog.split(/\r?\n/)

const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const heading = new RegExp(`^##\\s*\\[?${escaped}(?:\\]|\\s|$)`)
const anyHeading = /^##\s+\[?/

const start = lines.findIndex((line) => heading.test(line))
if (start === -1) {
  fs.writeFileSync(outPath, '')
  console.log(`[release-notes] CHANGELOG 里没有 ${version} 的小节，输出空文件`)
  process.exit(0)
}

let end = lines.length
for (let i = start + 1; i < lines.length; i += 1) {
  if (anyHeading.test(lines[i])) {
    end = i
    break
  }
}

const body = lines
  .slice(start + 1, end)
  .join('\n')
  .trim()
const repository = (
  JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
    .repository?.url ?? ''
)
  .replace(/^git\+/, '')
  .replace(/\.git$/, '')

const footer = [
  '',
  '---',
  '',
  `完整变更记录：[CHANGELOG.md](${repository}/blob/main/CHANGELOG.md) · ` +
    `[npm](https://www.npmjs.com/package/cesium_dev_kit/v/${version})`
].join('\n')

if (!body) {
  fs.writeFileSync(outPath, '')
  console.log(`[release-notes] ${version} 的小节是空的，输出空文件`)
  process.exit(0)
}

fs.writeFileSync(outPath, `${body}\n${footer}\n`)
console.log(`[release-notes] ${version} -> ${outFile}（${body.length} 字符）`)
