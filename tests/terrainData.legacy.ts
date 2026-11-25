import assert from 'node:assert'
import {
  applyBrush,
  buildTerrainGrid,
  terrainStats
} from '../src/utils/cesiumPluginsExtends/libs/terrain/terrainGrid'
import {
  decodeFloat32,
  encodeFloat32,
  packHeights,
  unpackHeights
} from '../src/utils/cesiumPluginsExtends/libs/terrain/terrainData'

/** 以 (117.10, 36.25) 为中心、边长约 1km 的方形范围 */
const POLYGON = [
  { lng: 117.095, lat: 36.245 },
  { lng: 117.105, lat: 36.245 },
  { lng: 117.105, lat: 36.255 },
  { lng: 117.095, lat: 36.255 }
]

/** 逐位比较两个 Float32Array（区分 -0 与 0，正好能验证「无损」而不是「近似」） */
function assertSameFloat32(a: Float32Array, b: Float32Array, label: string) {
  assert.strictEqual(a.length, b.length, `${label}: 长度不一致`)
  for (let i = 0; i < a.length; i++) {
    assert.ok(
      Object.is(a[i], b[i]),
      `${label}: 第 ${i} 个值不一致（${a[i]} vs ${b[i]}）—— 编解码必须逐位无损`
    )
  }
}

/* ---------- Float32 ↔ base64 ---------- */

{
  // 一边重算一边比：整数、负数、小数、极大极小、-0 都要原样回来
  const values = new Float32Array([
    0, 1, -1, 0.1, -0.1, 1234.5678, -98765.4321, 1e-30, -1e-30, 3.4e38, -3.4e38, -0
  ])
  const text = encodeFloat32(values)
  assert.ok(typeof text === 'string' && text.length > 0, '应编码成非空字符串')
  assert.ok(/^[A-Za-z0-9+/=]+$/.test(text), '只应包含 base64 字符')
  const back = decodeFloat32(text, values.length)
  assertSameFloat32(values, back, '小数组往返')
}

{
  // 真实规模：160 段格网 25921 个顶点，编码后应能完整还原
  const count = 161 * 161
  const values = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    // 造一段带正负、带小数的地形高度
    values[i] = Math.sin(i * 0.0137) * 420.5 + Math.cos(i * 0.00031) * 37.25
  }
  const text = encodeFloat32(values)
  const back = decodeFloat32(text, count)
  assertSameFloat32(values, back, '大数组往返')
  // 4 字节 / 顶点 × 4/3 的 base64 膨胀；给一点余量，顺便把这个体量钉在测试里
  assert.strictEqual(text.length, Math.ceil((count * 4) / 3) * 4, 'base64 长度应为 4/3 字节数')
  assert.ok(text.length > 130000 && text.length < 140000, `161×161 单份高度约 138KB，实际 ${text.length}`)
}

{
  // 解码时必须拦住损坏数据，不能把垃圾当高度渲染出去
  const values = new Float32Array([10, 20, 30, 40])
  const text = encodeFloat32(values)

  assert.throws(
    () => decodeFloat32(text.slice(0, text.length - 8), values.length),
    /长度不匹配/,
    '被截断的数据应报长度不匹配'
  )
  assert.throws(() => decodeFloat32('', values.length), /缺失/, '空串应报缺失')
  assert.throws(() => decodeFloat32(text, values.length + 1), /长度不匹配/, '点数不符应报错')

  // NaN / Infinity 一旦混进高度场，后面的法线、包围球都会变成 NaN，必须在入口拦住
  const bad = encodeFloat32(new Float32Array([1, Number.NaN, 3, 4]))
  assert.throws(() => decodeFloat32(bad, 4), /非法值/, 'NaN 高度应被拒绝')
  const inf = encodeFloat32(new Float32Array([1, 2, 3, Number.POSITIVE_INFINITY]))
  assert.throws(() => decodeFloat32(inf, 4), /非法值/, 'Infinity 高度应被拒绝')
}

/* ---------- 整份高度场打包 / 还原 ---------- */

/** 造一块带起伏、并且已经刷过的地形 */
function makeEditedGrid(segments = 96) {
  const grid = buildTerrainGrid(POLYGON, { segments, slopeWidth: 60 })
  for (let i = 0; i < grid.vertexCount; i++) {
    const row = Math.floor(i / grid.stride)
    const col = i % grid.stride
    const h = 880 + col * 1.5 + Math.sin(row * 0.4) * 26
    grid.base[i] = h
    grid.current[i] = h
  }
  // 真的挖两笔：确保 current 与 base 不同，往返才测得出「有没有把两份都存下来」
  const lng = 117.1
  const lat = 36.25
  applyBrush(grid, { mode: 'lower', lng, lat, radius: 180, maxDelta: 12, strength: 1 })
  applyBrush(grid, { mode: 'raise', lng: lng - 0.002, lat, radius: 120, maxDelta: 8, strength: 1 })
  return grid
}

{
  const grid = makeEditedGrid()
  const payload = packHeights(grid, { fillHoles: true })
  assert.strictEqual(payload.segments, grid.segments, '应记录分段数')
  assert.strictEqual(payload.slopeWidth, grid.slopeWidth, '应记录过渡宽度')
  assert.strictEqual(payload.fillHoles, true, '应记录 fillHoles')
  assert.ok(payload.bounds.maxLng > payload.bounds.minLng, '应记录范围')

  // 真实使用路径：塞进 JSON（后端 / localStorage）再读回来
  const parsed = JSON.parse(JSON.stringify(payload))
  const restored = unpackHeights(POLYGON, parsed)

  assert.strictEqual(restored.segments, grid.segments, '分段数应一致')
  assert.strictEqual(restored.vertexCount, grid.vertexCount, '顶点数应一致')
  assertSameFloat32(grid.base, restored.base, '原始高度')
  assertSameFloat32(grid.current, restored.current, '编辑后高度')

  // inside 掩膜是按多边形重建的，必须和原来逐点一致，否则会出现「多了/少了几个面」
  for (let i = 0; i < grid.vertexCount; i++) {
    assert.strictEqual(restored.inside[i], grid.inside[i], `第 ${i} 个顶点的内外判定应一致`)
  }

  // 土方统计依赖 base，能对上才说明「二次编辑」的参照没丢
  const before = terrainStats(grid, POLYGON)
  const after = terrainStats(restored, POLYGON)
  assert.ok(
    Math.abs(before.cutVolume - after.cutVolume) < 1e-2 &&
      Math.abs(before.fillVolume - after.fillVolume) < 1e-2,
    `挖填方应可复原：挖 ${before.cutVolume} vs ${after.cutVolume}`
  )
  assert.ok(before.cutVolume > 0, '这份测试数据里应确实有挖方')

  // 再打包一次应得到一模一样的字符串：说明还原是幂等的，不会来回漂
  const again = packHeights(restored, { fillHoles: true })
  assert.strictEqual(again.base, payload.base, '二次打包的 base 应完全一致')
  assert.strictEqual(again.current, payload.current, '二次打包的 current 应完全一致')
}

{
  // 多边形给错（改了一个角）必须报错，而不是把高度套到错位的格点上
  const grid = makeEditedGrid(48)
  const payload = packHeights(grid, { fillHoles: true })
  const shifted = POLYGON.map((p) => ({ lng: p.lng + 0.001, lat: p.lat }))
  assert.throws(() => unpackHeights(shifted, payload), /范围与高度场不匹配/, '错位范围应报错')
}

{
  // 长度对不上（换了分辨率却拿旧高度）也要报错
  const grid = makeEditedGrid(48)
  const payload = packHeights(grid, { fillHoles: true })
  const bigger = { ...payload, segments: 96 }
  assert.throws(() => unpackHeights(POLYGON, bigger), /长度不匹配/, '分辨率不符应报错')
}

{
  // fillHoles 要跟着数据走：外框套内圈的多边形会被奇偶规则挖出一个内部空洞，
  // 载入时若按默认 true 重建，勾出来的面就和导出时不一样了
  const cx = 117.1
  const cy = 36.25
  const s = 0.005
  const p = (x: number, y: number) => ({ lng: cx + x * s, lat: cy + y * s })
  const RING = [p(-1, -1), p(1, -1), p(1, 1), p(-1, 1), p(0.3, 0.3), p(0.7, 0.3), p(0.7, 0.7), p(0.3, 0.7)]

  // 40 段时内圈边界正好落在格点上，形成一圈闭合的「实心墙」，洞才留得住；
  // 分辨率再高时边界可能落在格点之间留出 1 格缺口，灌水会漏过去（与本次改动无关）
  const open = buildTerrainGrid(RING, { segments: 40, fillHoles: false })
  const solid = buildTerrainGrid(RING, { segments: 40, fillHoles: true })
  const count = (grid: ReturnType<typeof buildTerrainGrid>) =>
    grid.inside.reduce((sum, v) => sum + v, 0)
  assert.ok(count(solid) > count(open), '填洞后的实心点应更多')

  for (let i = 0; i < open.vertexCount; i++) {
    open.base[i] = 900 + (i % 17)
    open.current[i] = open.base[i] - 5
  }
  const restored = unpackHeights(RING, packHeights(open, { fillHoles: false }))
  assert.strictEqual(count(restored), count(open), '载入后应重建出与导出时一致的空洞')
}

console.log('✓ terrainData 全部测试通过')
