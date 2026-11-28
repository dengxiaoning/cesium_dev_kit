/**
 * 文档站中英文一致性检查（CI 与本地都能跑）。
 *
 * 检查四件事：
 * 1. 注释翻译覆盖率 —— 读 `.i18n-stats.json`（由 `gen-api-stubs.mjs --en` 写出）；
 * 2. 英文页面纯净度 —— `docs/en/**` 里不应再出现中文（语言切换链接「中文」除外）；
 * 3. 插件页面同步 —— 中文站有的每个类页，英文站必须有同名页；
 * 4. 成员同步 —— 同名页面里 `tsd-member` 数量必须一致（漏翻/漏渲染都会让它变化）。
 *
 * 用法：`npm run docs:check`（需先构建 docs/，即 npm run docs:all）
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOCS = path.join(ROOT, 'docs')
const EN = path.join(DOCS, 'en')

/** 覆盖率下限：低于这个值直接判失败 */
const MIN_COVERAGE = 0.9

const problems = []
const warnings = []

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

function htmlFiles(dir) {
  if (!fs.existsSync(dir)) return []
  const out = []
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name)
      if (entry.isDirectory()) walk(p)
      else if (entry.name.endsWith('.html')) out.push(p)
    }
  }
  walk(dir)
  return out
}

/** 去掉脚本/样式/标签后的正文，排除语言切换链接里的「中文」 */
function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/中文/g, ' ')
}

function checkCoverage() {
  const file = path.join(ROOT, '.i18n-stats.json')
  if (!fs.existsSync(file)) {
    warnings.push('缺少 .i18n-stats.json，跳过覆盖率检查（先跑 npm run docs:typedoc:en）')
    return null
  }
  const stats = readJson(file)
  const pct = (stats.rate * 100).toFixed(1)
  if (stats.rate < MIN_COVERAGE) {
    const worst = (stats.perModule || [])
      .filter((r) => r.kept > 0)
      .slice(0, 5)
      .map((r) => `${r.file}:${r.kept}`)
      .join(', ')
    problems.push(
      `注释翻译覆盖率 ${pct}% 低于下限 ${(MIN_COVERAGE * 100).toFixed(0)}%（未翻译 ${stats.total - stats.translated} 行；${worst}）`
    )
  }
  return stats
}

function checkEnglishPurity(stats) {
  const files = htmlFiles(EN)
  if (!files.length) {
    problems.push('docs/en 不存在或没有页面，英文站没有构建')
    return
  }
  const leaked = []
  for (const file of files) {
    const text = textOf(fs.readFileSync(file, 'utf8'))
    const hits = text.match(/[\u4e00-\u9fa5]+/g)
    if (hits) {
      const sample = [...new Set(hits)].slice(0, 5).join(' / ')
      leaked.push(`${path.relative(EN, file)}: ${sample}`)
    }
  }
  if (leaked.length) {
    problems.push(
      `英文站有 ${leaked.length} 个页面仍含中文：\n    ` + leaked.slice(0, 8).join('\n    ')
    )
  }
  return { pages: files.length, leaked: leaked.length }
}

/**
 * 页面同步：中文站 classes/*.html 必须都能在英文站找到同名文件，
 * 且页面里的成员锚点数量一致。
 */
function checkParity() {
  const zhDir = path.join(DOCS, 'classes')
  if (!fs.existsSync(zhDir)) {
    problems.push('docs/classes 不存在，中文站没有构建')
    return null
  }
  const zhPages = fs.readdirSync(zhDir).filter((f) => f.endsWith('.html')).sort()
  const enPages = new Set(fs.existsSync(path.join(EN, 'classes')) ? fs.readdirSync(path.join(EN, 'classes')) : [])

  const missing = []
  const mismatched = []
  for (const page of zhPages) {
    if (!enPages.has(page)) {
      missing.push(page)
      continue
    }
    const zh = fs.readFileSync(path.join(zhDir, page), 'utf8')
    const en = fs.readFileSync(path.join(EN, 'classes', page), 'utf8')
    const zhCount = (zh.match(/class="tsd-member/g) || []).length
    const enCount = (en.match(/class="tsd-member/g) || []).length
    if (zhCount !== enCount) mismatched.push(`${page} (zh ${zhCount} / en ${enCount})`)
  }

  if (missing.length) problems.push(`英文站缺少 ${missing.length} 个类页：${missing.join(', ')}`)
  if (mismatched.length) problems.push(`中英文成员数不一致：${mismatched.join('; ')}`)
  return { pages: zhPages.length, missing: missing.length, mismatched: mismatched.length }
}

function main() {
  const stats = checkCoverage()
  const purity = checkEnglishPurity(stats)
  const parity = checkParity()

  const lines = []
  if (stats) {
    lines.push(
      `覆盖率      ${(stats.rate * 100).toFixed(1)}%  (${stats.translated}/${stats.total} 行)`
    )
  }
  if (purity) lines.push(`英文页面    ${purity.pages} 个，含中文 ${purity.leaked} 个`)
  if (parity) {
    lines.push(
      `类页同步    ${parity.pages} 个类，缺页 ${parity.missing} 个，成员数不一致 ${parity.mismatched} 个`
    )
  }

  console.log('[docs:check] ' + lines.join('\n             '))

  for (const w of warnings) console.log(`  ! ${w}`)
  if (problems.length) {
    console.error('\n[docs:check] 未通过：')
    for (const p of problems) console.error('  ✗ ' + p)
    process.exit(1)
  }
  console.log('[docs:check] 通过：中英文文档同步，英文站无中文残留')
}

main()
