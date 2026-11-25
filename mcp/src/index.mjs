#!/usr/bin/env node
/**
 * cesium-dev-kit-mcp —— 让 AI 助手（Claude / Cursor / Copilot…）能查询 cesium_dev_kit 的 API。
 *
 * 数据来源：优先读取环境变量 `CESIUM_DEV_KIT_API_INDEX`（URL 或本地文件路径），
 * 其次用内置快照 `assets/api-index.json`，最后回退到线上
 * https://dengxiaoning.github.io/cesium_dev_kit/api-index.json。
 *
 * 运行：npx cesium-dev-kit-mcp
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const BASE_URL = 'https://dengxiaoning.github.io/cesium_dev_kit'
const INDEX_URL = `${BASE_URL}/api-index.json`
const SNAPSHOT = new URL('./assets/api-index.json', import.meta.url)

let cached = null

function overrideSource() {
  const flagIdx = process.argv.indexOf('--api')
  if (flagIdx >= 0 && process.argv[flagIdx + 1]) return process.argv[flagIdx + 1]
  return process.env.CESIUM_DEV_KIT_API_INDEX
}

async function loadIndex() {
  if (cached) return cached
  const source = overrideSource()
  try {
    if (source) {
      if (/^https?:\/\//.test(source)) {
        const res = await fetch(source)
        cached = await res.json()
      } else {
        cached = JSON.parse(await readFile(source, 'utf8'))
      }
    } else {
      try {
        cached = JSON.parse(await readFile(fileURLToPath(SNAPSHOT), 'utf8'))
      } catch {
        const res = await fetch(INDEX_URL)
        if (!res.ok) throw new Error(`HTTP ${res.status} ${INDEX_URL}`)
        cached = await res.json()
      }
    }
  } catch (err) {
    throw new Error(
      `无法加载 API 索引：${err.message}。可设置 CESIUM_DEV_KIT_API_INDEX 指向本地 api-index.json。`
    )
  }
  return cached
}

function classes(index) {
  return index.classes || []
}
function examples(index) {
  return index.examples || []
}

function tokenize(text) {
  return String(text).toLowerCase().split(/[^a-z0-9\u4e00-\u9fff]+/).filter(Boolean)
}

function score(text, queryTokens) {
  if (!text) return 0
  const lower = text.toLowerCase()
  // 用子串匹配：既支持英文分词，也支持中文（如「雷达」命中「雷达扫描」）
  return queryTokens.reduce((sum, token) => sum + (lower.includes(token) ? 1 : 0), 0)
}

function truncate(text, max = 300) {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function searchIndex(index, query, limit) {
  const queryTokens = tokenize(query)
  const results = []
  for (const cls of classes(index)) {
    let s = score(`${cls.name} ${cls.summary} ${cls.category}`, queryTokens)
    for (const method of cls.methods || []) {
      const ms = score(`${method.name} ${method.signature} ${method.summary}`, queryTokens)
      if (ms > 0 || s > 0) {
        results.push({
          kind: 'method',
          name: `${cls.name}.${method.name}`,
          text: `${method.signature}${method.summary ? ` — ${method.summary}` : ''}`,
          score: Math.max(s, ms * 2),
          class: cls.name,
          method
        })
      }
    }
    if (s > 0) {
      results.push({ kind: 'class', name: cls.name, text: `${cls.name} — ${cls.summary}`, score: s, class: cls.name })
    }
  }
  for (const example of examples(index)) {
    const es = score(`${example.name} ${example.title} ${example.categoryTitle}`, queryTokens)
    if (es > 0) {
      results.push({
        kind: 'example',
        name: example.name,
        text: `${example.title}（${example.categoryTitle}）`,
        score: es * 3,
        example
      })
    }
  }
  return results
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .slice(0, limit || 10)
}

function classDocMarkdown(index, name) {
  const cls = classes(index).find(
    (item) => item.name.toLowerCase() === name.toLowerCase()
  )
  if (!cls) return null
  const lines = [`# ${cls.name}`, '', `> ${cls.summary || ''}`, '', `分类：${cls.category || '-'}`, `文档：${cls.url}`, '']
  lines.push(`## 方法（${cls.methods.length}）`, '')
  for (const method of cls.methods) {
    lines.push(`### ${method.signature}`, '')
    if (method.summary) lines.push(method.summary, '')
    if (method.params && method.params.length) {
      lines.push('| 参数 | 类型 | 说明 |', '| --- | --- | --- |')
      for (const param of method.params) {
        lines.push(
          `| \`${param.name}${param.optional ? '?' : ''}\` | \`${param.type.replace(/\|/g, '\\|')}\` | ${(
            param.desc || '-'
          ).replace(/\|/g, '\\|')} |`
        )
      }
      lines.push('')
    }
    if (method.returns) lines.push(`返回：${method.returns}`, '')
    if (method.example) lines.push('```ts', method.example, '```', '')
  }
  return lines.join('\n')
}

function exampleMarkdown(index, name) {
  const example = examples(index).find((item) => item.name === name)
  if (!example) return null
  return [
    `# ${example.title}`,
    '',
    `- 名称：\`${example.name}\``,
    `- 分类：${example.categoryTitle}`,
    `- 源码：https://github.com/dengxiaoning/cesium_dev_kit/blob/main/src/views/${example.component}.vue`,
    `- 示例页：${example.url}`,
    `- 在线 Demo：${example.demo}`,
    ''
  ].join('\n')
}

const server = new McpServer({ name: 'cesium-dev-kit-mcp', version: '0.1.0' })

server.registerTool(
  'search',
  {
    title: '搜索 API / 示例',
    description:
      '按关键词搜索 cesium_dev_kit 的类、方法和示例。输入如「雷达扫描」「画多边形」「createPolygonGraphics」。',
    inputSchema: {
      query: z.string().describe('搜索关键词'),
      limit: z.number().int().min(1).max(30).optional().describe('返回条数，默认 10')
    }
  },
  async ({ query, limit }) => {
    const index = await loadIndex()
    const results = searchIndex(index, query, limit || 10)
    if (!results.length) {
      return { content: [{ type: 'text', text: `没有匹配「${query}」的结果。试试换个关键词，或直接用 get_class_doc 查看某个类。` }] }
    }
    const text = results
      .map((item) => `- [${item.kind}] ${item.name}\n  ${truncate(item.text)}`)
      .join('\n')
    return { content: [{ type: 'text', text: `搜索「${query}」的结果：\n\n${text}` }] }
  }
)

server.registerTool(
  'get_class_doc',
  {
    title: '获取类文档',
    description:
      '获取某个类的完整文档：方法签名、参数表、返回值和示例。类名如 Graphics、Analysis、TerrainEdit、Material。',
    inputSchema: {
      name: z.string().describe('类名，如 Graphics / Analysis / TerrainEdit')
    }
  },
  async ({ name }) => {
    const index = await loadIndex()
    const markdown = classDocMarkdown(index, name)
    if (!markdown) {
      const available = classes(index).map((item) => item.name).join(', ')
      return { content: [{ type: 'text', text: `找不到类「${name}」。可用的类：${available}` }] }
    }
    return { content: [{ type: 'text', text: markdown }] }
  }
)

server.registerTool(
  'get_example',
  {
    title: '获取示例',
    description: '获取某个在线示例的入口（源码、示例页、在线 Demo 链接）。',
    inputSchema: {
      name: z.string().describe('示例 name，如 radarScan / floatingCone / terrainEdit')
    }
  },
  async ({ name }) => {
    const index = await loadIndex()
    const markdown = exampleMarkdown(index, name)
    if (!markdown) {
      return { content: [{ type: 'text', text: `找不到示例「${name}」。可用 search 工具按关键词查找示例。` }] }
    }
    return { content: [{ type: 'text', text: markdown }] }
  }
)

server.registerTool(
  'get_quickstart',
  {
    title: '获取快速开始',
    description: '返回 cesium_dev_kit 的安装与最小可运行示例。'
  },
  async () => {
    const index = await loadIndex()
    const text = [
      `# cesium_dev_kit v${index.version} 快速开始`,
      '',
      '```bash',
      'npm install cesium_dev_kit cesium',
      '```',
      '',
      '```ts',
      "import * as Cesium from 'cesium'",
      "import { createKit } from 'cesium_dev_kit'",
      '',
      'const kit = createKit({ Cesium, containerId: "cesiumContainer" })',
      'kit.graphics.createPolygonGraphics({',
      '  positions: Cesium.Cartesian3.fromDegreesArray([104.09, 30.65, 104.11, 30.65, 104.10, 30.63]),',
      '  material: Cesium.Color.RED.withAlpha(0.3),',
      '  clampToGround: true',
      '})',
      'kit.dispose()',
      '```',
      '',
      `在线 Demo：${index.demo}`,
      `示例索引：${index.baseUrl}/examples/`
    ].join('\n')
    return { content: [{ type: 'text', text }] }
  }
)

const transport = new StdioServerTransport()
await server.connect(transport)
