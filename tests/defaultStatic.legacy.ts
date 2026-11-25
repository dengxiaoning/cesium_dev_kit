import assert from 'node:assert'
import {
  DEFAULT_STATIC_BASE,
  createDefaultStatic,
  defaultStatic,
  joinStaticUrl
} from '../src/utils/cesiumPluginsExtends/defaultStatic'

// 默认实例指向内置 CDN，并包含关键资源分组
assert.equal(defaultStatic.baseService, DEFAULT_STATIC_BASE)
assert.ok(defaultStatic.skyBox && defaultStatic.skyBox.one)
assert.ok(defaultStatic.graphic)
assert.ok(defaultStatic.primitive)

// 自定义 CDN
const custom = createDefaultStatic('https://cdn.example.com/')
assert.equal(custom.baseService, 'https://cdn.example.com/')
assert.equal(custom.drawPointGraphics, 'static/data/images/file/location4.png')

// 相对路径拼接：自动处理两侧斜杠，避免 // 或 undefined
assert.equal(
  joinStaticUrl('https://cdn.example.com/', 'static/a.png'),
  'https://cdn.example.com/static/a.png'
)
assert.equal(
  joinStaticUrl('https://cdn.example.com///', 'static/a.png'),
  'https://cdn.example.com/static/a.png'
)
assert.equal(joinStaticUrl('', 'static/a.png'), 'static/a.png')
assert.equal(joinStaticUrl(undefined, 'static/a.png'), 'static/a.png')

// 绝对地址 / data URI / 站点根路径原样返回
assert.equal(
  joinStaticUrl('https://cdn.example.com/', 'https://other.example.com/a.png'),
  'https://other.example.com/a.png'
)
assert.equal(joinStaticUrl('https://cdn.example.com/', '//other.example.com/a.png'), '//other.example.com/a.png')
assert.equal(joinStaticUrl('https://cdn.example.com/', 'data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA')
assert.equal(joinStaticUrl('https://cdn.example.com/', '/static/a.png'), '/static/a.png')

// 空路径不产生 baseService 前缀（修复旧的 baseServiceundefined）
assert.equal(joinStaticUrl('https://cdn.example.com/', ''), '')

console.log('✔ defaultStatic 全部测试通过')
