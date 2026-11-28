/**
 * API 文档的英文注释翻译层（仅 `npm run docs:typedoc:en` 使用）。
 *
 * 背景：TypeDoc 的 `lang: "en"` 只翻译框架 UI，`@param` / 属性说明来自源码 JSDoc
 * 的中文原文，所以英文站里会看到 `show (boolean): 是否显示` 这种混排。
 *
 * 这里做的是「确定性术语翻译」，不是机器翻译：
 * 1. BLOCKS —— 连续散文行整段映射（长段落、实现思路这类，逐行切会碎句子）；
 * 2. EXACT —— 整行精确映射（属性、参数、高频方法说明）；
 * 3. RULES —— `是否X` / `X颜色` / `返回X实例` 这类模式化句子；
 * 4. TERMS —— 贪心分词后逐词翻译（`点大小` -> Point size），只在整句被完整
 *    切分且长度有限时才采用，避免把整段中文译成乱码。
 * 四条路都失败时保留中文原文，并写进未翻译清单（.i18n-untranslated.md）。
 * 原则：宁可保留中文，也不输出中英混排。
 */
import fs from 'node:fs'
import path from 'node:path'

const CJK_RE = /[\u4e00-\u9fa5]/

/** 词表放在 scripts/i18n/*.json，方便批量扩充与审阅 */
const readJson = (name) =>
  JSON.parse(fs.readFileSync(new URL(`./i18n/${name}`, import.meta.url), 'utf8'))

/** 整行精确映射：属性 / 参数 / 高频方法说明 */
const EXACT = readJson('exact.json')

/** 段落级映射：连续的散文行整段翻译，避免逐行切碎句子 */
const BLOCKS = readJson('blocks.json')

/** 分词词表：参与组合翻译的名词 / 动词（按最长优先切分） */
const TERMS = readJson('terms.json')

/** 后缀模式：优先于分词，译法更自然（`外边线宽度` -> Outline width） */
const SUFFIX_RULES = [
  ['颜色', ' color'],
  ['宽度', ' width'],
  ['高度', ' height'],
  ['长度', ' length'],
  ['半径', ' radius'],
  ['深度', ' depth'],
  ['间隔', ' interval'],
  ['时长', ' duration'],
  ['范围', ' range'],
  ['方向', ' direction'],
  ['位置', ' position'],
  ['角度', ' angle'],
  ['坐标', ' coordinates'],
  ['数组', ' array'],
  ['列表', ' list'],
  ['名称', ' name'],
  ['编号', ' id'],
  ['数量', ' count'],
  ['大小', ' size'],
  ['参数', ' parameters'],
  ['结果', ' result'],
  ['实例', ' instance'],
  ['对象', ' object']
]

/** `X（单位）` 的括号单位 */
const UNIT_RULES = [
  ['米', 'm'],
  ['度', 'degrees'],
  ['弧度', 'radians'],
  ['像素', 'px'],
  ['秒', 's'],
  ['毫秒', 'ms']
]

/** 设置当前正在处理的源模块名（用于按模块统计覆盖率） */
export function setI18nContext(name) {
  stats.currentFile = name
}

/** 未翻译统计：行 -> 出现次数 / 来源文件；用于按模块定位缺口 */
const stats = {
  total: 0,
  translated: 0,
  kept: new Map(),
  keptByFile: new Map(),
  blocks: new Map(),
  currentFile: ''
}

function noteKept(line) {
  const hit = stats.kept.get(line)
  if (hit) hit.count += 1
  else stats.kept.set(line, { count: 1, files: new Set([stats.currentFile]) })
  hit?.files.add(stats.currentFile)

  const per = stats.keptByFile.get(stats.currentFile) ?? { total: 0, kept: 0 }
  per.kept += 1
  stats.keptByFile.set(stats.currentFile, per)
}

function noteTotal() {
  const per = stats.keptByFile.get(stats.currentFile) ?? { total: 0, kept: 0 }
  per.total += 1
  stats.keptByFile.set(stats.currentFile, per)
}

const TERM_KEYS = Object.keys(TERMS).sort((a, b) => b.length - a.length)

/** 贪心分词：整句都被词表覆盖才算成功 */
function segment(text) {
  const words = []
  let i = 0
  while (i < text.length) {
    let matched = null
    for (const key of TERM_KEYS) {
      if (text.startsWith(key, i)) {
        matched = key
        break
      }
    }
    if (!matched) return null
    words.push(TERMS[matched])
    i += matched.length
  }
  return words
}

function titleCase(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * 结构标点转半角：译文里只剩列表项/参数名这些骨架还带全角符号
 * （`- \`alt\`（\`number\`）：z 轴` -> `- \`alt\` (\`number\`): Height`）。
 */
function normalizePunct(line) {
  return line
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/：/g, ': ')
    .replace(/，/g, ', ')
}

/**
 * 把一行里的全角结构标点收敛成英文标点；含中文的行原样返回
 * （半成品的混排比全角标点更糟，宁可不动）。
 */
export function finishLine(line) {
  return CJK_RE.test(line) ? line : normalizePunct(line)
}

/**
 * 翻译一句说明。返回 null 表示无法确定译法（调用方保留原文）。
 * 翻完仍含中文就当失败，绝不出中英混排。
 */
function translatePhrase(raw) {
  const trimmed = raw.trim()
  if (!trimmed) return raw
  // 先按原文查（词表里可能带句末句号），再按去掉句号的形态查
  if (EXACT[trimmed]) return normalizePunct(EXACT[trimmed])
  const text = trimmed.replace(/[。.]$/, '')
  if (!text) return raw
  if (EXACT[text]) return normalizePunct(EXACT[text])
  if (!CJK_RE.test(text)) return raw

  // 长前缀命中（`已弃用的兼容别名…：` 后面跟一长串名字）；剩余部分必须无中文，否则会中英混排
  for (const [key, en] of Object.entries(EXACT)) {
    if (key.length >= 8 && text.startsWith(key) && !CJK_RE.test(text.slice(key.length))) {
      return normalizePunct(en + text.slice(key.length))
    }
  }

  let m
  // 是否X -> Whether to X
  if ((m = text.match(/^是否(.+)$/))) {
    const rest = translatePhrase(m[1])
    if (rest && !CJK_RE.test(rest)) return `Whether to ${rest.charAt(0).toLowerCase()}${rest.slice(1)}`
  }
  // 默认值后缀：X，默认 Y（Y 必须本身无中文，否则会拼出中英混排）
  if ((m = text.match(/^(.+?)，默认\s*(.+)$/))) {
    const head = translatePhrase(m[1])
    if (head && !CJK_RE.test(head) && !CJK_RE.test(m[2])) return `${head}, default ${m[2]}`
  }
  // 返回X -> Returns X
  if ((m = text.match(/^返回(.+)$/))) {
    const rest = translatePhrase(m[1])
    if (rest && !CJK_RE.test(rest)) {
      const lower = rest.charAt(0).toLowerCase() + rest.slice(1)
      return /实例$|instance$/.test(rest) ? `Returns the ${lower}` : `Returns ${lower}`
    }
  }
  // X的Y -> Y of X
  if ((m = text.match(/^(.+?)的(.+)$/))) {
    const head = translatePhrase(m[1])
    const tail = translatePhrase(m[2])
    if (head && tail && !CJK_RE.test(head + tail)) return `${tail} of ${head.charAt(0).toLowerCase()}${head.slice(1)}`
  }
  // X（单位）
  if ((m = text.match(/^(.+)（([^）]+)）$/))) {
    const head = translatePhrase(m[1])
    const unit = UNIT_RULES.find(([cn]) => cn === m[2])
    if (head && unit && !CJK_RE.test(head)) return `${head} (${unit[1]})`
  }
  // X颜色 / X宽度 / ...
  for (const [suffix, en] of SUFFIX_RULES) {
    if (text.endsWith(suffix) && text.length > suffix.length) {
      const head = translatePhrase(text.slice(0, -suffix.length))
      if (head && !CJK_RE.test(head)) return `${titleCase(head)}${en}`
    }
  }
  // 开始绘制X / 通过数据绘制X / 创建X / 移除X / 获取X
  const verbPrefixes = [
    ['开始绘制', 'Start drawing '],
    ['通过数据 绘制', 'Draw '],
    ['通过数据绘制', 'Draw '],
    ['创建', 'Create '],
    ['移除', 'Remove '],
    ['获取', 'Get '],
    ['绘制', 'Draw '],
    ['画', 'Draw ']
  ]
  for (const [prefix, en] of verbPrefixes) {
    if (text.startsWith(prefix) && text.length > prefix.length) {
      const rest = translatePhrase(text.slice(prefix.length))
      if (rest && !CJK_RE.test(rest)) {
        const lower = rest.charAt(0).toLowerCase() + rest.slice(1)
        return `${en}${prefix === '画' ? 'a ' : ''}${lower}`
      }
    }
  }
  // 纯词根组合（`点大小` -> Point size）
  if (text.length <= 24) {
    const words = segment(text)
    if (words && words.length <= 6) return titleCase(words.join(' '))
  }
  return null
}

/**
 * 带前缀的行：`@param options.show 是否显示`、`- \`show\`（\`boolean\`）：是否显示`。
 * 前缀段翻不出来时返回 false，让调用方再试「整行精确表」。
 */
function translateWithPrefix(line) {
  let m
  if ((m = line.match(/^(@internal\s+)(.+)$/))) {
    const out = translatePhrase(m[2])
    return out ? m[1] + out : false
  }
  if ((m = line.match(/^(@param\s+[^\s]+\s+)(.+)$/))) {
    const out = translatePhrase(m[2])
    return out ? m[1] + out : false
  }
  if ((m = line.match(/^(@returns?\s+)(.+)$/))) {
    const out = translatePhrase(m[2])
    return out ? m[1] + out : false
  }
  if (line.startsWith('@')) return false
  if (line.startsWith('- ')) {
    const idx = line.indexOf('：')
    if (idx > 0) {
      const out = translatePhrase(line.slice(idx + 1))
      if (out) return line.slice(0, idx + 1) + out
    }
    return false
  }
  return false
}

const CODE_LINE_RE =
  /^(```|~~~|\/\/|import\s|const\s|let\s|var\s|function\s|new\s|class\s|export\s|[{}<>]|[a-zA-Z_$][\w$.]*\s*[=(:]|.*<div|.*console\.)/

/**
 * 示例代码里的中文字符串字面量（`console.log('通视分析对象')`）与行尾注释
 * （`radii: 1000000, //单位 米`）。只有词表里明确给出译法的才替换，代码结构一律不动。
 */
function translateCodeStrings(line) {
  const withLiterals = line
    .replace(/'([^'\n]*[\u4e00-\u9fa5][^'\n]*)'/g, (whole, text) =>
      EXACT[text] ? `'${EXACT[text]}'` : whole
    )
    .replace(/"([^"\n]*[\u4e00-\u9fa5][^"\n]*)"/g, (whole, text) =>
      EXACT[text] ? `"${EXACT[text]}"` : whole
    )
  return withLiterals.replace(/(\s\/\/\s*)([^\n]*[\u4e00-\u9fa5][^\n]*)$/, (whole, lead, note) => {
    const noteEn = translatePhrase(note)
    return noteEn && !CJK_RE.test(noteEn) ? lead + noteEn : whole
  })
}

/**
 * 翻译一个 JSDoc 行数组（normalizeDoc 之后的形态）。
 * 先按「段落」整段查表（长散文逐行切会碎句子），再逐行兜底。
 * 代码块（``` 围栏）、示例代码行、URL 行原样保留。
 */
export function translateDocLines(lines, ctx = '') {
  const prevFile = stats.currentFile
  if (ctx) stats.currentFile = ctx

  // ---- 第一遍：找出可整段翻译的连续散文块 ----
  const blockAt = new Map() // 起始下标 -> { size, en }
  for (let i = 0; i < lines.length; i++) {
    if (!isProseLine(lines[i]) || i > 0 && isProseLine(lines[i - 1])) continue
    let j = i
    while (j < lines.length && isProseLine(lines[j])) j++
    const size = j - i
    if (size < 2) continue
    const key = lines.slice(i, j).map((l) => stripQuote(l.trim())).join('\n')
    const en = BLOCKS[key]
    if (en) blockAt.set(i, { size, en })
    else stats.blocks.set(key, (stats.blocks.get(key) ?? 0) + 1)
    i = j - 1
  }

  let inFence = false
  const out = []
  for (let index = 0; index < lines.length; index++) {
    const block = blockAt.get(index)
    if (block) {
      for (let k = 0; k < block.size; k++) {
        stats.total += 1
        noteTotal()
        stats.translated += 1
      }
      out.push(...block.en.split('\n'))
      index += block.size - 1
      continue
    }

    const line = lines[index]
    const trimmed = line.trim()
    if (/^```/.test(trimmed)) {
      inFence = !inFence
      out.push(line)
      continue
    }
    if (inFence || !CJK_RE.test(line)) {
      out.push(line)
      continue
    }
    // 引用块 `> xxx` 先剥掉前缀再判断，否则会当成代码行跳过
    const quote = /^>\s?/.test(trimmed) ? '> ' : ''
    const body = quote ? trimmed.slice(quote.length).trim() : trimmed
    // 示例代码里的中文行注释：代码本身不动，只翻 `//` 后面的说明
    if (body.startsWith('//')) {
      const note = body.replace(/^\/\/\s?/, '')
      stats.total += 1
      noteTotal()
      const noteEn = translatePhrase(note)
      if (noteEn && !CJK_RE.test(noteEn)) {
        stats.translated += 1
        out.push(line.replace(trimmed, quote + '// ' + noteEn))
      } else {
        noteKept(trimmed)
        out.push(line)
      }
      continue
    }
    if (CODE_LINE_RE.test(body) || /https?:\/\//.test(body)) {
      // 示例代码本身不动，但里面作为日志标签的中文字符串字面量照词表替换
      out.push(translateCodeStrings(line))
      continue
    }

    stats.total += 1
    noteTotal()
    const prefixed = translateWithPrefix(body)
    if (prefixed) {
      stats.translated += 1
      out.push(finishLine(line.replace(trimmed, quote + prefixed)))
      continue
    }
    if (prefixed === false) {
      const outLine = translatePhrase(body)
      if (outLine) {
        stats.translated += 1
        out.push(finishLine(line.replace(trimmed, quote + outLine)))
        continue
      }
    }
    noteKept(trimmed)
    out.push(line)
  }

  stats.currentFile = prevFile
  return out
}

function stripQuote(text) {
  return /^>\s?/.test(text) ? text.slice(text.indexOf('>') + 1).trim() : text
}

/** 可参与整段翻译的散文行：非空、含中文、不是标签/列表/标题/表格/代码 */
function isProseLine(line) {
  const t = line.trim()
  if (!t || !CJK_RE.test(t)) return false
  const body = stripQuote(t)
  if (!body) return false
  if (/^(```|~~~|@|[-*+]\s|\d+\.\s|#|\||!\[|<|\/\/)/.test(body)) return false
  return !CODE_LINE_RE.test(body)
}

/** 写出未翻译清单：按出现次数倒序，带来源文件，方便按模块补词表 */
export function writeUntranslatedReport(outFile) {
  const rows = [...stats.kept.entries()]
    .map(([line, meta]) => ({ line, count: meta.count, files: [...meta.files].sort().join(', ') }))
    .sort((a, b) => b.count - a.count || a.line.localeCompare(b.line))

  const perFile = [...stats.keptByFile.entries()]
    .filter(([, v]) => v.total > 0)
    .map(([file, v]) => ({
      file,
      total: v.total,
      kept: v.kept,
      rate: (v.total - v.kept) / v.total
    }))
    .sort((a, b) => b.kept - a.kept)

  const header = [
    '# Untranslated JSDoc lines',
    '',
    `Translated ${stats.translated} / ${stats.total} comment lines ` +
      `(${((stats.translated / (stats.total || 1)) * 100).toFixed(1)}%); ` +
      `${rows.length} distinct lines still Chinese.`,
    'Add them to EXACT / TERMS in `scripts/api-i18n-en.mjs` to translate more.',
    '',
    '## Per-module coverage',
    '',
    '| module | lines | untranslated | coverage |',
    '| --- | --- | --- | --- |',
    ...perFile.map(
      (r) => `| ${r.file || '(unknown)'} | ${r.total} | ${r.kept} | ${(r.rate * 100).toFixed(0)}% |`
    ),
    '',
    '## Lines by frequency',
    ''
  ]
  fs.writeFileSync(outFile, [...header, ...rows.map((r) => `- (×${r.count}) ${r.line}`)].join('\n'), 'utf8')
  return rows.length
}

/** 写出待翻译的段落块（每块一组连续中文散文行），供补 blocks.json */
export function writeBlockReport(outFile) {
  const rows = [...stats.blocks.entries()].sort(
    (a, b) => b[1] - a[1] || b[0].length - a[0].length
  )
  const body = rows.map(([text, count]) => `### ×${count}\n\n${text}\n`).join('\n---\n\n')
  fs.writeFileSync(outFile, `# Untranslated prose blocks\n\n${body}`, 'utf8')
  return rows.length
}

export function i18nCoverage() {
  return {
    total: stats.total,
    translated: stats.translated,
    kept: stats.kept.size,
    rate: stats.total ? stats.translated / stats.total : 0
  }
}

/** 按文件覆盖情况，供 CLI 打印 */
export function coverageByFile() {
  return [...stats.keptByFile.entries()]
    .filter(([, v]) => v.total > 0)
    .map(([file, v]) => ({ file, ...v, rate: (v.total - v.kept) / v.total }))
    .sort((a, b) => b.kept - a.kept)
}

export function reportPath(root) {
  return path.join(root, '.i18n-untranslated.md')
}
