// MCP server 冒烟测试：通过 stdio 走一遍 initialize + tools/call。
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const server = spawn(process.execPath, [fileURLToPath(new URL('../src/index.mjs', import.meta.url))], {
  env: {
    ...process.env,
    // 用本地生成的 api-index.json，避免依赖外网
    CESIUM_DEV_KIT_API_INDEX: fileURLToPath(new URL('../../docs/api-index.json', import.meta.url))
  },
  stdio: ['pipe', 'pipe', 'pipe']
})

let buffer = ''
server.stdout.on('data', (chunk) => {
  buffer += chunk.toString()
  let idx
  while ((idx = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, idx).trim()
    buffer = buffer.slice(idx + 1)
    if (!line) continue
    let msg
    try {
      msg = JSON.parse(line)
    } catch {
      continue
    }
    handle(msg)
  }
})

server.stderr.on('data', (chunk) => process.stderr.write(chunk))

let initialized = false
let pending = []

function send(obj) {
  server.stdin.write(JSON.stringify(obj) + '\n')
}

function handle(msg) {
  if (msg.id === 1) {
    send({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} })
    send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'get_quickstart', arguments: {} } })
  } else if (msg.id === 2) {
    const text = msg.result?.content?.map((item) => item.text).join('\n') || ''
    console.log('=== get_quickstart 结果（截断）===')
    console.log(text.slice(0, 400))
    send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'search', arguments: { query: '雷达' } } })
  } else if (msg.id === 3) {
    const text = msg.result?.content?.map((item) => item.text).join('\n') || ''
    console.log('=== search「雷达」结果（截断）===')
    console.log(text.slice(0, 600))
    server.kill()
    process.exit(0)
  } else if (msg.id && msg.error) {
    console.error('ERROR', JSON.stringify(msg.error))
    server.kill()
    process.exit(1)
  }
}

send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } } })

setTimeout(() => {
  console.error('超时：未收到预期响应')
  server.kill()
  process.exit(1)
}, 15000)
