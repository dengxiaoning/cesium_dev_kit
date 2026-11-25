#!/usr/bin/env node
/**
 * 生成 docs/ 站点里 TypeDoc 不负责的部分：
 *
 * 1. docs/examples/**            每个在线示例一个可被搜索引擎索引的静态落地页
 * 2. docs/examples/index.html    示例总览（内链枢纽）
 * 3. docs/sitemap.xml            全站 sitemap
 * 4. docs/robots.txt             允许搜索引擎与 AI 爬虫
 * 5. docs/llms.txt + docs/llms/  给 AI 助手读的 Markdown 版 API
 * 6. docs/api-index.json         机器可读的 API / 示例索引
 *
 * 依赖上一步 `typedoc --json docs/_api.json` 的产物；缺失时会跳过 5/6，
 * 其余部分仍然生成，方便单独调试。
 *
 * 用法：node scripts/gen-site-extras.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOCS = path.join(ROOT, 'docs')
const MENU_FILE = path.join(ROOT, 'public/testMenu.json')
const API_JSON = path.join(DOCS, '_api.json')
const BASE_URL = 'https://dengxiaoning.github.io/cesium_dev_kit'
const REPO_URL = 'https://github.com/dengxiaoning/cesium_dev_kit'
const OG_IMAGE = `${BASE_URL}/demo/home_banner.jpg`
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
const TODAY = new Date().toISOString().slice(0, 10)

/** 分类元信息：标题、SEO 描述、关联的 API 类 */
const CATEGORY_META = {
  graphics: {
    title: '实体图形',
    desc: '点、线、面、模型、圆、墙、视频面、GIF 标牌等 Cesium 实体图形',
    classes: ['Graphics']
  },
  material: {
    title: '自定义材质',
    desc: '流光、预警、城市道路、波纹圆、动态墙等自定义材质',
    classes: ['Material']
  },
  primitive: {
    title: '图元与三维可视化',
    desc: '自定义几何图元、光锥、三维热力图、路径漫游与路线规划',
    classes: ['Primitive', 'Plugin']
  },
  scene: {
    title: '场景与天气特效',
    desc: '天空盒、雨雪雾、夜景、后处理、火焰粒子等场景效果',
    classes: ['PassEffect', 'Plugin']
  },
  czm: {
    title: 'CZML 数据加载',
    desc: '用 CZML 驱动时间轴动画与动态对象',
    classes: ['Base']
  },
  layer: {
    title: '图层叠加',
    desc: '百度、腾讯、天地图、ArcGIS、聚合、3D 柱与卷帘对比',
    classes: ['Control']
  },
  infoBox: {
    title: '信息框与气泡',
    desc: '实体信息框、构造信息框与自定义广告牌',
    classes: ['TooltipUtil', 'DomUtil']
  },
  camera: {
    title: '相机控制',
    desc: '绕点旋转、相机位置与视角控制',
    classes: ['Control']
  },
  tools: {
    title: '交互工具',
    desc: '三维标绘、量算、位置拾取、拖拽与模型位置调整',
    classes: ['Draw', 'Analysis']
  },
  sensor: {
    title: '传感器可视化',
    desc: '伞形、半圆、棱形、锥形传感器',
    classes: ['Primitive', 'Plugin']
  },
  radar: {
    title: '雷达与扫描特效',
    desc: '雷达扫描、卫星扫描、圆形/扇形/锥形扫描与矩阵控制',
    classes: ['PassEffect']
  },
  cesiumThreejs: {
    title: 'Cesium + Three.js 融合',
    desc: '光线投射、图形挤压、烟花与骨骼动画，支持单上下文深度融合',
    classes: ['ThreeJs']
  },
  terrain: {
    title: '地形编辑',
    desc: '地形开挖、堆高、整平、台阶、水面与土方统计',
    classes: ['TerrainEdit']
  }
}

/* ============================ 通用工具 ============================ */

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function jsonLd(data) {
  return JSON.stringify(data, null, 2).replace(/</g, '\\u003c')
}

function relPrefix(depth) {
  return '../'.repeat(depth)
}

function urlPath(...parts) {
  return parts
    .map((part) => String(part).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/')
}

function flattenExamples(menu) {
  const result = []
  for (const category of menu) {
    if (category.name === 'sysManage') continue
    const meta = CATEGORY_META[category.name] || {
      title: category.meta?.title || category.name,
      desc: category.meta?.title || category.name,
      classes: []
    }
    for (const child of category.children || []) {
      if (child.meta?.isHide) continue
      if (!child.name || !child.path) continue
      result.push({
        category: category.name,
        categoryTitle: meta.title,
        categoryDesc: meta.desc,
        classes: meta.classes,
        name: child.name,
        title: child.meta?.title || child.name,
        component: child.component,
        demoPath: `#${category.path}/${child.path}`
      })
    }
  }
  return result
}

function readExampleCode(component) {
  if (!component || component === 'Layout') return ''
  const file = path.join(ROOT, 'src/views', `${component}.vue`)
  if (!fs.existsSync(file)) return ''
  const source = fs.readFileSync(file, 'utf8')
  const match = source.match(/<script[^>]*>([\s\S]*?)<\/script>/i)
  if (!match) return ''
  const lines = match[1].trim().split(/\r?\n/)
  const MAX = 260
  if (lines.length <= MAX) return lines.join('\n')
  return `${lines.slice(0, MAX).join('\n')}\n// ... 完整源码见 ${REPO_URL}/blob/main/src/views/${component}.vue`
}

/* ============================ TypeDoc JSON ============================ */

function partsToText(parts) {
  if (!Array.isArray(parts)) return ''
  return parts
    .map((part) => {
      if (!part) return ''
      if (part.kind === 'relative-link') return part.text || part.target?.name || ''
      if (part.kind === 'inline-tag') return part.text || ''
      return part.text || ''
    })
    .join('')
}

function typeToString(type) {
  if (!type) return 'any'
  switch (type.type) {
    case 'intrinsic':
      return type.name
    case 'reference':
      return type.name
    case 'array':
      return `${typeToString(type.elementType)}[]`
    case 'union':
      return type.types.map(typeToString).join(' | ')
    case 'intersection':
      return type.types.map(typeToString).join(' & ')
    case 'tuple':
      return `[${(type.elements || []).map(typeToString).join(', ')}]`
    case 'literal':
      if (type.value === null) return 'null'
      if (typeof type.value === 'string') return JSON.stringify(type.value)
      return String(type.value)
    case 'reflection':
      return 'object'
    case 'typeOperator':
      return `${type.operator} ${typeToString(type.target)}`
    case 'indexedAccess':
      return `${typeToString(type.objectType)}[${typeToString(type.indexType)}]`
    case 'query':
      return `typeof ${typeToString(type.queryType)}`
    case 'predicate':
      return `${type.name} ${type.asserts ? 'is' : 'returns'} ${typeToString(type.targetType)}`
    case 'optional':
      return `${typeToString(type.elementType)}?`
    case 'rest':
      return `...${typeToString(type.elementType)}`
    case 'unknown':
      return 'unknown'
    default:
      return type.name || 'any'
  }
}

function commentSummary(comment) {
  return partsToText(comment?.summary).replace(/\s+/g, ' ').trim()
}

function blockTag(comment, tag) {
  const found = (comment?.blockTags || []).find((item) => item.tag === tag)
  return found ? partsToText(found.content).trim() : ''
}

function renderMethod(method) {
  const signature = method.signatures?.[0]
  if (!signature) return null
  const params = (signature.parameters || []).map((param) => ({
    name: param.name,
    optional: Boolean(param.flags?.isOptional),
    type: typeToString(param.type),
    desc: commentSummary(param.comment)
  }))
  const paramText = params
    .map((param) => `${param.name}${param.optional ? '?' : ''}: ${param.type}`)
    .join(', ')
  const returnType = typeToString(signature.type)
  const returns = blockTag(signature.comment, '@returns')
  return {
    name: method.name,
    signature: `${method.name}(${paramText})${returnType && returnType !== 'any' ? `: ${returnType}` : ''}`,
    summary: commentSummary(signature.comment),
    params,
    returns,
    example: blockTag(signature.comment, '@example'),
    see: blockTag(signature.comment, '@see')
  }
}

function readApiModel() {
  if (!fs.existsSync(API_JSON)) {
    console.warn('[gen-site-extras] 未找到 docs/_api.json，跳过 llms.txt / api-index.json')
    return null
  }
  const raw = JSON.parse(fs.readFileSync(API_JSON, 'utf8'))
  const classes = []
  for (const node of raw.children || []) {
    if (node.kind !== 128 || !node.name || node.name.startsWith('$')) continue
    const methods = []
    for (const member of node.children || []) {
      if (member.kind !== 2048 || !member.name || member.name.startsWith('$')) continue
      const method = renderMethod(member)
      if (method) methods.push(method)
    }
    const category = blockTag(node.comment, '@category') || '其他'
    classes.push({
      name: node.name,
      summary: commentSummary(node.comment) || `${node.name} API`,
      category,
      url: `${BASE_URL}/classes/${node.name}.html`,
      markdown: `${BASE_URL}/llms/${node.name}.md`,
      methods
    })
  }
  return { classes }
}

/* ============================ 示例落地页 ============================ */

function examplePage(example, code) {
  const slug = urlPath(example.category, example.name)
  const depth = 2
  const prefix = relPrefix(depth)
  const canonical = `${BASE_URL}/examples/${slug}.html`
  const demoUrl = `${prefix}demo/?auto=1${example.demoPath}`
  const apiLinks = example.classes.map((name) => ({
    name,
    href: `${prefix}classes/${name}.html`
  }))
  const description = `${example.title}：${example.categoryDesc}。cesium_dev_kit 提供可直接运行的 ${example.title} 示例，包含完整 TypeScript/JavaScript 源码、在线 Demo 与 TypeDoc API 文档，适用于 Cesium、三维 GIS 与数字孪生项目。`
  const keywords = [
    example.title,
    example.categoryTitle,
    'Cesium',
    'CesiumJS',
    '三维GIS',
    'WebGL',
    '示例',
    '源码',
    ...example.classes
  ].join(', ')

  const codeBlock = code
    ? `<pre class="code"><code>${escapeHtml(code)}</code></pre>`
    : `<p class="muted">该示例没有独立的 script 片段，请直接查看在线 Demo 或仓库源码。</p>`

  const apiList = apiLinks.length
    ? `<ul class="links">${apiLinks
        .map((item) => `<li><a href="${item.href}">${escapeHtml(item.name)} API 文档</a></li>`)
        .join('')}</ul>`
    : ''

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(example.title)} - Cesium 示例与源码 | cesium_dev_kit</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="keywords" content="${escapeHtml(keywords)}">
<meta name="author" content="dengxiaoning">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="cesium_dev_kit">
<meta property="og:title" content="${escapeHtml(example.title)} - Cesium 示例 | cesium_dev_kit">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${OG_IMAGE}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(example.title)} - Cesium 示例">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${OG_IMAGE}">
<style>
:root{--bg:#0b1220;--panel:#111b2e;--text:#e6edf7;--muted:#9fb0c9;--accent:#38bdf8;--border:#24324a}
*{box-sizing:border-box}
body{margin:0;background:linear-gradient(180deg,#0b1220,#0e1626 40%,#0b1220);color:var(--text);font:16px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
a{color:var(--accent)}
.wrap{max-width:960px;margin:0 auto;padding:32px 20px 72px}
nav.crumb{font-size:13px;color:var(--muted);margin-bottom:18px}
nav.crumb a{color:var(--muted);text-decoration:none}
nav.crumb a:hover{color:var(--accent)}
h1{font-size:34px;line-height:1.25;margin:0 0 12px}
.lead{color:var(--muted);font-size:17px;margin:0 0 24px}
.cta{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0 32px}
.btn{display:inline-block;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;border:1px solid var(--border)}
.btn.primary{background:var(--accent);color:#062033;border-color:var(--accent)}
.btn.ghost{color:var(--text);background:var(--panel)}
section{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:20px 22px;margin:22px 0}
h2{font-size:20px;margin:0 0 12px}
pre.code{overflow:auto;background:#08101d;border:1px solid var(--border);border-radius:10px;padding:16px;font:13px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace}
code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
ul.links{padding-left:20px;margin:0}
.muted{color:var(--muted)}
footer{border-top:1px solid var(--border);margin-top:40px;padding-top:18px;color:var(--muted);font-size:14px}
</style>
<script type="application/ld+json">${jsonLd({
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: `${example.title} - cesium_dev_kit Cesium 示例`,
    description,
    url: canonical,
    image: OG_IMAGE,
    inLanguage: 'zh-CN',
    author: { '@type': 'Person', name: 'dengxiaoning' },
    publisher: { '@type': 'Organization', name: 'cesium_dev_kit' },
    programmingLanguage: ['TypeScript', 'JavaScript'],
    isPartOf: {
      '@type': 'SoftwareApplication',
      name: 'cesium_dev_kit',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      codeRepository: REPO_URL
    }
  })}</script>
<script type="application/ld+json">${jsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'cesium_dev_kit', item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: '示例', item: `${BASE_URL}/examples/` },
      {
        '@type': 'ListItem',
        position: 3,
        name: example.categoryTitle,
        item: `${BASE_URL}/examples/${example.category}/`
      },
      { '@type': 'ListItem', position: 4, name: example.title, item: canonical }
    ]
  })}</script>
</head>
<body>
<div class="wrap">
  <nav class="crumb"><a href="${prefix}index.html">API 文档</a> / <a href="${prefix}examples/index.html">示例</a> / ${escapeHtml(
    example.categoryTitle
  )} / ${escapeHtml(example.title)}</nav>
  <h1>${escapeHtml(example.title)}</h1>
  <p class="lead">${escapeHtml(example.categoryDesc)}。下面是该示例的核心 script 片段，供参考学习；完整可运行代码请进入在线 Demo 或查看仓库源码。</p>
  <div class="cta">
    <a class="btn primary" href="${demoUrl}">在线运行 Demo</a>
    <a class="btn ghost" href="${prefix}examples/index.html">全部示例</a>
    <a class="btn ghost" href="${REPO_URL}/blob/main/src/views/${example.component}.vue">查看完整源码</a>
  </div>
  <section>
    <h2>示例代码</h2>
    ${codeBlock}
  </section>
  <section>
    <h2>相关 API</h2>
    ${apiList || '<p class="muted">暂无关联类，请从左侧 API 文档浏览。</p>'}
    <p class="muted">安装：<code>npm install cesium_dev_kit cesium</code></p>
  </section>
  <footer>
    <p>cesium_dev_kit v${pkg.version} · <a href="${prefix}index.html">API 文档</a> · <a href="${prefix}demo/?auto=1">在线 Demo</a> · <a href="${REPO_URL}">GitHub</a></p>
    <p>关键词：${escapeHtml(keywords)}</p>
  </footer>
</div>
</body>
</html>
`
}

function examplesIndexPage(examples) {
  const groups = new Map()
  for (const example of examples) {
    if (!groups.has(example.category)) groups.set(example.category, [])
    groups.get(example.category).push(example)
  }
  const sections = [...groups.entries()]
    .map(([category, items]) => {
      const meta = CATEGORY_META[category] || { title: category, desc: '' }
      const cards = items
        .map(
          (item) =>
            `<li><a href="./${category}/${item.name}.html">${escapeHtml(item.title)}</a><span>${escapeHtml(
              item.name
            )}</span></li>`
        )
        .join('\n')
      return `<section><h2>${escapeHtml(meta.title)}</h2><p class="muted">${escapeHtml(
        meta.desc
      )}</p><ul class="cards">${cards}</ul></section>`
    })
    .join('\n')

  const description = `cesium_dev_kit 全部 ${examples.length} 个在线示例：标绘、量算、空间分析、材质、传感器、雷达扫描、地形编辑与 Cesium + Three.js 融合，每个示例都提供完整源码与在线 Demo。`
  const canonical = `${BASE_URL}/examples/`

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cesium 示例大全（${examples.length} 个） | cesium_dev_kit</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="keywords" content="Cesium 示例, CesiumJS 示例, 三维GIS, 标绘, 量算, 空间分析, 地形编辑, Three.js, cesium_dev_kit">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="Cesium 示例大全 | cesium_dev_kit">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${OG_IMAGE}">
<style>
:root{--bg:#0b1220;--panel:#111b2e;--text:#e6edf7;--muted:#9fb0c9;--accent:#38bdf8;--border:#24324a}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:1080px;margin:0 auto;padding:32px 20px 72px}
h1{font-size:34px;margin:0 0 10px}
.lead{color:var(--muted);margin:0 0 28px}
section{background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:20px 22px;margin:18px 0}
h2{font-size:20px;margin:0 0 6px}
ul.cards{list-style:none;padding:0;margin:12px 0 0;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
ul.cards li{border:1px solid var(--border);border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:2px}
ul.cards li span{color:var(--muted);font-size:12px}
footer{border-top:1px solid var(--border);margin-top:36px;padding-top:18px;color:var(--muted);font-size:14px}
</style>
<script type="application/ld+json">${jsonLd({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'cesium_dev_kit Cesium 示例大全',
    description,
    url: canonical,
    inLanguage: 'zh-CN',
    isPartOf: {
      '@type': 'SoftwareApplication',
      name: 'cesium_dev_kit',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      codeRepository: REPO_URL
    }
  })}</script>
</head>
<body>
<div class="wrap">
  <nav><a href="../index.html">API 文档</a> · <a href="../demo/?auto=1">在线 Demo</a> · <a href="${REPO_URL}">GitHub</a></nav>
  <h1>Cesium 示例大全</h1>
  <p class="lead">${escapeHtml(description)}</p>
  ${sections}
  <footer>cesium_dev_kit v${pkg.version} · 共 ${examples.length} 个示例 · 更新于 ${TODAY}</footer>
</div>
</body>
</html>
`
}

/* ============================ sitemap / robots ============================ */

function walkHtml(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    const rel = path.relative(base, full).split(path.sep).join('/')
    if (entry.isDirectory()) {
      if (rel === 'demo' || rel.startsWith('demo/')) continue
      if (rel === 'assets' || rel.startsWith('assets/')) continue
      walkHtml(full, base, out)
    } else if (entry.name.endsWith('.html')) {
      out.push(rel)
    }
  }
  return out
}

function priorityOf(rel) {
  if (rel === 'index.html') return '1.0'
  if (rel === 'examples/index.html') return '0.9'
  if (rel === 'modules.html' || rel === 'hierarchy.html') return '0.6'
  if (rel.startsWith('classes/')) return '0.8'
  if (rel.startsWith('examples/')) return '0.7'
  return '0.5'
}

function writeSitemap() {
  const files = walkHtml(DOCS).sort()
  const urls = files.map((rel) => {
    const loc = rel === 'index.html' ? `${BASE_URL}/` : `${BASE_URL}/${rel}`
    return `  <url><loc>${loc}</loc><lastmod>${TODAY}</lastmod><priority>${priorityOf(
      rel
    )}</priority></url>`
  })
  urls.push(`  <url><loc>${BASE_URL}/demo/</loc><lastmod>${TODAY}</lastmod><priority>0.9</priority></url>`)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join(
    '\n'
  )}\n</urlset>\n`
  fs.writeFileSync(path.join(DOCS, 'sitemap.xml'), xml, 'utf8')
  return urls.length
}

function writeRobots() {
  const content = `# https://dengxiaoning.github.io/cesium_dev_kit/
User-agent: *
Allow: /

# 明确欢迎主流 AI 爬虫，方便 AI 助手引用文档
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`
  fs.writeFileSync(path.join(DOCS, 'robots.txt'), content, 'utf8')
}

/**
 * versions.json：文档站版本切换器的数据源。
 *
 * 自动把 docs/ 下符合 `v<semver>` 命名的目录当作归档版本，
 * 因此部署新版本时只要把旧站点放进 `docs/vX.Y.Z/` 就能被识别。
 */
function writeVersions() {
  const current = pkg.version
  const versions = [{ version: current, path: '/' }]
  if (fs.existsSync(DOCS)) {
    for (const entry of fs.readdirSync(DOCS, { withFileTypes: true })) {
      if (entry.isDirectory() && /^v\d+\.\d+\.\d+/.test(entry.name)) {
        const version = entry.name.replace(/^v/, '')
        if (version !== current) versions.push({ version, path: `/${entry.name}/` })
      }
    }
  }
  versions.sort((a, b) => (a.path === '/' ? -1 : b.path === '/' ? 1 : b.version.localeCompare(a.version, undefined, { numeric: true })))
  fs.writeFileSync(
    path.join(DOCS, 'versions.json'),
    JSON.stringify({ current, generatedAt: new Date().toISOString(), versions }, null, 2),
    'utf8'
  )
}

/* ============================ llms.txt / api-index.json ============================ */

function methodMarkdown(method) {
  const lines = [`### ${method.signature}`, '']
  if (method.summary) lines.push(method.summary, '')
  if (method.params.length) {
    lines.push('| 参数 | 类型 | 说明 |', '| --- | --- | --- |')
    for (const param of method.params) {
      lines.push(
        `| \`${param.name}${param.optional ? '?' : ''}\` | \`${param.type.replace(/\|/g, '\\|')}\` | ${
          param.desc.replace(/\|/g, '\\|') || '-'
        } |`
      )
    }
    lines.push('')
  }
  if (method.returns) lines.push(`**返回**：${method.returns}`, '')
  if (method.example) lines.push('**示例**', '', method.example, '')
  if (method.see) lines.push(`**另见**：${method.see}`, '')
  return lines.join('\n')
}

function writeLlms(api) {
  if (!api) return 0
  const llmsDir = path.join(DOCS, 'llms')
  ensureDir(llmsDir)
  const index = []
  for (const cls of api.classes) {
    const markdown = [
      `# ${cls.name}`,
      '',
      `> ${cls.summary}`,
      '',
      `- 分类：${cls.category}`,
      `- API 页面：${cls.url}`,
      `- 源码：${REPO_URL}`,
      '',
      '## 方法',
      '',
      ...cls.methods.map(methodMarkdown)
    ].join('\n')
    fs.writeFileSync(path.join(llmsDir, `${cls.name}.md`), markdown, 'utf8')
    // 索引行只保留第一句，避免超长类说明把 llms.txt 撑爆
    const shortSummary = cls.summary.split(/[。.．]\s*/)[0].trim() || cls.summary
    index.push(`- [${cls.name}](${cls.markdown})：${shortSummary}`)
  }

  const llms = `# cesium_dev_kit

> Cesium 开发工具包：标绘、量算、空间分析、自定义材质 / 图元、传感器、热力图、后处理特效、地形编辑，以及与 Three.js 的单上下文深度融合。按需引入，不绑定任何前端框架。

- 版本：${pkg.version}
- 文档：${BASE_URL}/
- 在线 Demo：${BASE_URL}/demo/?auto=1
- 示例索引：${BASE_URL}/examples/
- 机器可读 API 索引：${BASE_URL}/api-index.json
- GitHub：${REPO_URL}
- English README：${REPO_URL}/blob/main/README.en.US.md

## 快速开始

\`\`\`bash
npm install cesium_dev_kit cesium
\`\`\`

\`\`\`ts
import * as Cesium from 'cesium'
import { createKit } from 'cesium_dev_kit'

const kit = createKit({ Cesium, containerId: 'cesiumContainer' })
kit.graphics.createPolygonGraphics({
  positions: Cesium.Cartesian3.fromDegreesArray([104.09, 30.65, 104.11, 30.65, 104.10, 30.63]),
  material: Cesium.Color.RED.withAlpha(0.3),
  clampToGround: true
})
kit.dispose()
\`\`\`

## 按类 API

${index.join('\n')}

## 说明

- 所有示例都可直接运行：${BASE_URL}/examples/
- 每个类的方法签名、参数、返回值和 \`@example\` 均来自源码 JSDoc。
- 完整 TypeDoc HTML：${BASE_URL}/modules.html
`
  fs.writeFileSync(path.join(DOCS, 'llms.txt'), llms, 'utf8')
  return api.classes.length
}

function writeApiIndex(api, examples) {
  if (!api) return
  const data = {
    name: pkg.name,
    version: pkg.version,
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    repository: REPO_URL,
    demo: `${BASE_URL}/demo/?auto=1`,
    classes: api.classes.map((cls) => ({
      name: cls.name,
      summary: cls.summary,
      category: cls.category,
      url: cls.url,
      markdown: cls.markdown,
      methods: cls.methods.map((method) => ({
        name: method.name,
        signature: method.signature,
        summary: method.summary,
        params: method.params,
        returns: method.returns,
        example: method.example || undefined,
        see: method.see || undefined
      }))
    })),
    examples: examples.map((example) => ({
      name: example.name,
      title: example.title,
      category: example.category,
      categoryTitle: example.categoryTitle,
      component: example.component,
      url: `${BASE_URL}/examples/${example.category}/${example.name}.html`,
      demo: `${BASE_URL}/demo/?auto=1${example.demoPath}`
    }))
  }
  fs.writeFileSync(path.join(DOCS, 'api-index.json'), JSON.stringify(data, null, 2), 'utf8')
}

/* ============================ 主流程 ============================ */

function main() {
  if (!fs.existsSync(DOCS)) {
    console.error('[gen-site-extras] docs/ 不存在，请先运行 `npm run docs`。')
    process.exit(1)
  }
  const menu = JSON.parse(fs.readFileSync(MENU_FILE, 'utf8'))
  const examples = flattenExamples(menu)

  for (const example of examples) {
    const code = readExampleCode(example.component)
    const dir = path.join(DOCS, 'examples', example.category)
    ensureDir(dir)
    fs.writeFileSync(path.join(dir, `${example.name}.html`), examplePage(example, code), 'utf8')
  }

  ensureDir(path.join(DOCS, 'examples'))
  fs.writeFileSync(path.join(DOCS, 'examples/index.html'), examplesIndexPage(examples), 'utf8')

  const api = readApiModel()
  writeLlms(api)
  writeApiIndex(api, examples)
  const urlCount = writeSitemap()
  writeRobots()
  writeVersions()

  // 原始 TypeDoc JSON 体积大且不适合直接发布，生成完紧凑索引后删除
  if (fs.existsSync(API_JSON)) fs.rmSync(API_JSON, { force: true })

  console.log(
    `[gen-site-extras] ${examples.length} 个示例页 / ${api ? api.classes.length : 0} 个类 / ${urlCount} 条 sitemap`
  )
}

main()
