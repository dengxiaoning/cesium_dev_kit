/**
 * 本地预览 docs/ 的极简静态服务器（无额外依赖）。
 *
 * 用法：
 *   npm run docs        # 先生成文档
 *   npm run docs:serve  # 再启动预览 http://localhost:5174
 *
 * 之所以自己写而不引入 http-server：GitHub Pages 已经能托管静态文件，
 * 这里只需要验证相对路径、搜索索引和 .nojekyll 是否正常。
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs')
const port = Number(process.env.PORT || 5174)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
}

if (!fs.existsSync(root)) {
  console.error('docs/ 不存在，请先运行 `npm run docs`。')
  process.exit(1)
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
  let filePath = path.join(root, urlPath)

  // 目录请求回落到 index.html；同时禁止越界访问
  if (!filePath.startsWith(root)) {
    res.writeHead(403).end('Forbidden')
    return
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html')
  }
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404 Not Found')
    return
  }

  res.writeHead(200, {
    'content-type': MIME[path.extname(filePath)] || 'application/octet-stream',
    'cache-control': 'no-cache'
  })
  fs.createReadStream(filePath).pipe(res)
})

server.listen(port, () => {
  console.log(`docs 预览: http://localhost:${port}/`)
})
