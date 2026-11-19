/**
 * 校验 package.json 中 main/module/types/exports 指向的文件是否真实存在。
 *
 * 目的：在 CI 里拦住「改了构建产物路径但忘了同步 package.json」这类低级错误。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

const missing = []
let checked = 0

function check(target, field) {
  if (typeof target !== 'string' || !target.startsWith('./')) return
  checked++
  if (!fs.existsSync(path.resolve(root, target))) {
    missing.push(`${field} -> ${target}`)
  }
}

function walkExports(value, field) {
  if (typeof value === 'string') {
    check(value, field)
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      walkExports(child, `${field}.${key}`)
    }
  }
}

for (const field of ['main', 'module', 'types']) {
  check(pkg[field], field)
}
walkExports(pkg.exports, 'exports')

if (missing.length) {
  console.error('Missing files referenced by package.json:')
  missing.forEach((item) => console.error(`  - ${item}`))
  console.error('\nRun `npm run build:lib` first.')
  process.exit(1)
}

console.log(`✔ ${checked} package entry files exist`)
