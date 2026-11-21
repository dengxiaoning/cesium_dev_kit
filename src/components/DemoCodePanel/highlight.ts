/**
 * 示例代码高亮
 *
 * 不引 highlight.js / prism：这里的源码是「Vue 单文件 + TS + CSS」混合文本，
 * 现成高亮器要么得注册一堆 language、要么整包体积偏大。这里用一个词法扫描器
 * 按优先级切 token（注释 → 字符串 → 标签 → 数字 → 标识符 → 标点），
 * 再把标识符按上下文分成 关键字 / 类名 / 方法名 / 变量名，层次够了。
 *
 * 输出是「每行一段 HTML」的数组：v-html 一次渲染一行，
 * 既能加行号，又不会因为块注释跨行把整行染色搞乱。
 */

/** token 的类型，对应样式里的 .tk-xxx */
export type TokenType =
  | 'kw' // 关键字：const / function / import …
  | 'ctrl' // 控制流：if / for / return …
  | 'str' // 字符串
  | 'num' // 数字
  | 'com' // 注释
  | 'fn' // 方法 / 函数名
  | 'cls' // 类名 / 构造器
  | 'var' // 变量 / 属性
  | 'tag' // 模板标签
  | 'punct' // 标点
  | 'plain' // 其它

interface Token {
  /** ident 是扫描阶段的临时类型，第二轮会细分成 kw/fn/cls/var */
  type: TokenType | 'ident'
  text: string
}

/** 控制流，与声明类关键字分色 */
const CTRL = new Set([
  'if',
  'else',
  'for',
  'while',
  'do',
  'switch',
  'case',
  'break',
  'continue',
  'return',
  'throw',
  'try',
  'catch',
  'finally',
  'await',
  'yield'
])

/** 声明 / 引用类关键字 */
const DECL = new Set([
  'const',
  'let',
  'var',
  'function',
  'class',
  'extends',
  'implements',
  'interface',
  'type',
  'enum',
  'import',
  'export',
  'from',
  'as',
  'default',
  'new',
  'delete',
  'typeof',
  'instanceof',
  'in',
  'of',
  'void',
  'async',
  'static',
  'get',
  'set',
  'public',
  'private',
  'protected',
  'readonly',
  'declare',
  'namespace',
  'abstract',
  'override',
  'this',
  'super',
  'keyof',
  'infer',
  'satisfies',
  'true',
  'false',
  'null',
  'undefined',
  'NaN',
  'Infinity'
])

/** 后面紧跟这些词时，标识符是类名 */
const CLASS_LEAD = new Set(['class', 'new', 'extends', 'implements'])

const MASTER = new RegExp(
  [
    '(\\/\\*[\\s\\S]*?\\*\\/)', // 1 块注释
    '(\\/\\/[^\\n]*)', // 2 行注释
    '(<!--[\\s\\S]*?-->)', // 3 模板注释
    '(`(?:\\\\[\\s\\S]|[^`\\\\])*`)', // 4 模板字符串
    "('(?:\\\\[\\s\\S]|[^'\\\\\\n])*')", // 5 单引号
    '("(?:\\\\[\\s\\S]|[^"\\\\\\n])*")', // 6 双引号
    '(</?[A-Za-z][\\w.:-]*)', // 7 标签名
    '(\\b0[xX][0-9a-fA-F]+\\b|\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b)', // 8 数字
    '([A-Za-z_$][\\w$]*)', // 9 标识符
    '([{}()\\[\\];,.:=+\\-*/%<>!&|?~^@#]+)' // 10 标点
  ].join('|'),
  'g'
)

const ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

/** HTML 转义，防止源码里的尖括号被当成标签 */
function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESC[c])
}

/** 扫描成 token 序列 */
function scan(src: string): Token[] {
  const out: Token[] = []
  let last = 0
  let m: RegExpExecArray | null
  MASTER.lastIndex = 0
  while ((m = MASTER.exec(src))) {
    if (m.index > last) {
      out.push({ type: 'plain', text: src.slice(last, m.index) })
    }
    let type: Token['type'] = 'punct'
    if (m[1] || m[2] || m[3]) type = 'com'
    else if (m[4] || m[5] || m[6]) type = 'str'
    else if (m[7]) type = 'tag'
    else if (m[8]) type = 'num'
    else if (m[9]) type = 'ident'
    out.push({ type, text: m[0] })
    last = m.index + m[0].length
    // 防御：零宽匹配会让 lastIndex 卡住
    if (m[0].length === 0) MASTER.lastIndex++
  }
  if (last < src.length) out.push({ type: 'plain', text: src.slice(last) })
  return out
}

/** 往后找第一个「有内容」的 token，遇到非空白 plain 就停下 */
function nextToken(tokens: Token[], from: number): Token | null {
  for (let i = from; i < tokens.length; i++) {
    const t = tokens[i]
    if (t.type === 'plain') {
      if (t.text.trim()) return null
      continue
    }
    return t
  }
  return null
}

/** 往前找第一个「有内容」的 token */
function prevToken(tokens: Token[], from: number): Token | null {
  for (let i = from; i >= 0; i--) {
    const t = tokens[i]
    if (t.type === 'plain') {
      if (t.text.trim()) return null
      continue
    }
    return t
  }
  return null
}

/** 把一个标识符按上下文归类 */
function classify(tokens: Token[], index: number, word: string): TokenType {
  if (CTRL.has(word)) return 'ctrl'
  if (DECL.has(word)) return 'kw'
  const prev = prevToken(tokens, index - 1)
  if (prev && CLASS_LEAD.has(prev.text)) return 'cls'
  const next = nextToken(tokens, index + 1)
  if (next && next.type === 'punct' && next.text.startsWith('(')) return 'fn'
  // 大驼峰当类名（Cesium.Math 这类也算，读起来更像类型）
  if (/^[A-Z][A-Za-z0-9_$]*$/.test(word) && !/^[A-Z0-9_]+$/.test(word)) return 'cls'
  return 'var'
}

/**
 * 把源码转成「每行一段 HTML」
 *
 * @param code - 原始源码
 * @returns 每行的 HTML 字符串（已转义、已包 span）
 */
export function highlightLines(code: string): string[] {
  const src = code.replace(/\r\n?/g, '\n')
  const tokens = scan(src)
  for (let i = 0; i < tokens.length; i++) {
    if ((tokens[i].type as string) === 'ident') {
      tokens[i].type = classify(tokens, i, tokens[i].text)
    }
  }

  const lines: string[] = []
  let cur = ''
  for (const tk of tokens) {
    if (tk.type === 'plain') {
      const parts = tk.text.split('\n')
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) {
          lines.push(cur)
          cur = ''
        }
        cur += esc(parts[i])
      }
      continue
    }
    const parts = tk.text.split('\n')
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        lines.push(cur)
        cur = ''
      }
      const piece = parts[i]
      if (!piece) continue
      if (tk.type === 'punct') cur += esc(piece)
      else cur += `<span class="tk-${tk.type}">${esc(piece)}</span>`
    }
  }
  lines.push(cur)
  return lines
}

/** 从路径里猜语言，用于顶部标签 */
export function guessLanguage(path: string): string {
  const ext = (path.split('.').pop() || '').toLowerCase()
  if (ext === 'vue') return 'Vue SFC'
  if (ext === 'ts') return 'TypeScript'
  if (ext === 'js' || ext === 'mjs' || ext === 'cjs') return 'JavaScript'
  if (ext === 'json') return 'JSON'
  if (ext === 'css') return 'CSS'
  if (ext === 'scss') return 'SCSS'
  return 'Text'
}
