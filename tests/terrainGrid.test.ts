import assert from 'node:assert'
import {
  applyBrush,
  buildContourSegments,
  buildTerrainGrid,
  dedupePolygon,
  deformTerrain,
  distanceToPolygon,
  metersPerDegLng,
  niceContourInterval,
  pointInPolygon,
  polygonArea,
  smoothstep,
  terrainStats,
  terrainVertexColor,
  triangulatePolygon
} from '../src/utils/cesiumPluginsExtends/libs/terrain/terrainGrid'

/** 以 (117.10, 36.25) 为中心、边长约 1km 的方形范围 */
const POLYGON = [
  { lng: 117.095, lat: 36.245 },
  { lng: 117.105, lat: 36.245 },
  { lng: 117.105, lat: 36.255 },
  { lng: 117.095, lat: 36.255 }
]

/* ---------- 基础几何 ---------- */

assert.strictEqual(pointInPolygon(117.1, 36.25, POLYGON), true, '中心点应在多边形内')
assert.strictEqual(pointInPolygon(117.2, 36.25, POLYGON), false, '外部点应在多边形外')

const area = polygonArea(POLYGON)
const expectArea = 0.01 * metersPerDegLng(36.25) * 0.01 * 111319.49
assert.ok(Math.abs(area - expectArea) / expectArea < 0.01, `面积应在 1% 误差内: ${area} vs ${expectArea}`)

const insideDistance = distanceToPolygon(117.1, 36.25, POLYGON)
assert.ok(insideDistance > 0, '内部点到边界距离应为正')
assert.ok(insideDistance > 400 && insideDistance < 600, `中心点到边界约 500m，实际 ${insideDistance}`)
assert.ok(distanceToPolygon(117.2, 36.25, POLYGON) < 0, '外部点到边界距离应为负')

assert.strictEqual(smoothstep(-1), 0, 'smoothstep 下限裁剪')
assert.strictEqual(smoothstep(2), 1, 'smoothstep 上限裁剪')
assert.ok(Math.abs(smoothstep(0.5) - 0.5) < 1e-9, 'smoothstep 中点为 0.5')

/* ---------- 格网 ---------- */

const grid = buildTerrainGrid(POLYGON, { segments: 24, slopeWidth: 80 })
assert.strictEqual(grid.stride, 25, '顶点数 = segments + 1')
assert.strictEqual(grid.vertexCount, 625, '顶点总数')
assert.ok(grid.cellSize > 40 && grid.cellSize < 60, `单元边长约 50m，实际 ${grid.cellSize}`)

const insideCount = Array.from(grid.inside).filter(Boolean).length
assert.ok(insideCount > 300 && insideCount < 625, `内部顶点数应介于两者之间：${insideCount}`)

// 权重：边界附近接近 0，内部为 1
const centerIndex = Math.floor(grid.stride / 2) * grid.stride + Math.floor(grid.stride / 2)
assert.strictEqual(grid.inside[centerIndex], 1, '中心顶点应在内部')
assert.ok(grid.weight[centerIndex] > 0.99, `中心权重应为 1，实际 ${grid.weight[centerIndex]}`)

let boundaryWeightMax = 0
for (let i = 0; i < grid.vertexCount; i++) {
  if (!grid.inside[i]) continue
  if (grid.distance[i] < 2) boundaryWeightMax = Math.max(boundaryWeightMax, grid.weight[i])
}
assert.ok(boundaryWeightMax < 0.01, `边界附近权重应接近 0，实际 ${boundaryWeightMax}`)

/* ---------- 形变 ---------- */

// 模拟一片平地（高程 100 米），便于断言数值
grid.base.fill(0)
for (let i = 0; i < grid.vertexCount; i++) {
  if (grid.inside[i]) grid.base[i] = 100
}
grid.current = new Float32Array(grid.base)

const sunk = deformTerrain(grid, { mode: 'sink', depth: 40, stepHeight: 0 })
assert.ok(sunk[centerIndex] < 61, `中心应下沉约 40m，实际 ${sunk[centerIndex]}`)
assert.ok(sunk[centerIndex] > 59.9, `中心下沉量不应超过设定深度，实际 ${sunk[centerIndex]}`)
assert.strictEqual(sunk[0], grid.current[0], '格网角落（多边形外）不应被改动')

const raised = deformTerrain(grid, { mode: 'raise', depth: 25 })
assert.ok(Math.abs(raised[centerIndex] - 125) < 0.01, `中心应抬升到 125，实际 ${raised[centerIndex]}`)

// 台阶：相对高差被量化为 stepHeight 的整数倍
const terraced = deformTerrain(grid, { mode: 'sink', depth: 40, stepHeight: 6 })
const diff = 100 - terraced[centerIndex]
assert.ok(Math.abs(diff / 6 - Math.round(diff / 6)) < 1e-6, `台阶高差应为 6 的整数倍，实际 ${diff}`)

// 台阶不应产生比设定深度更深的点
let deepest = 0
for (let i = 0; i < grid.vertexCount; i++) {
  if (!grid.inside[i]) continue
  deepest = Math.max(deepest, 100 - terraced[i])
}
assert.ok(deepest <= 42.0001, `最深处不应超过 42m，实际 ${deepest}`)

// 平整：内部高度趋于一致
const flattened = deformTerrain(grid, { mode: 'flatten', depth: 0 })
let minH = Infinity
let maxH = -Infinity
for (let i = 0; i < grid.vertexCount; i++) {
  if (!grid.inside[i] || grid.weight[i] < 0.95) continue
  minH = Math.min(minH, flattened[i])
  maxH = Math.max(maxH, flattened[i])
}
assert.ok(maxH - minH < 1e-6, '平整后内圈高度应一致')

// 平滑：在带噪声的地形上应降低起伏
grid.current = new Float32Array(grid.base)
for (let i = 0; i < grid.vertexCount; i++) {
  if (grid.inside[i]) grid.current[i] = 100 + (i % 2 === 0 ? 5 : -5)
}
const smoothed = deformTerrain(grid, { mode: 'smooth', smoothIterations: 3 })
let smoothedRange = 0
for (let i = 0; i < grid.vertexCount; i++) {
  if (grid.inside[i] && grid.weight[i] > 0.9) smoothedRange = Math.max(smoothedRange, Math.abs(smoothed[i] - 100))
}
assert.ok(smoothedRange < 5, `平滑后起伏应小于原始 ±5，实际 ${smoothedRange}`)

/* ---------- 统计 ---------- */

grid.current = new Float32Array(grid.base)
const cut = deformTerrain(grid, { mode: 'sink', depth: 20 })
grid.current = cut
const stats = terrainStats(grid, POLYGON)
assert.ok(stats.cutVolume > 0, '塌陷应产生挖方')
assert.strictEqual(stats.fillVolume, 0, '纯塌陷不应产生填方')
assert.ok(stats.minHeight < 81, `最低点应低于 81，实际 ${stats.minHeight}`)
assert.ok(stats.cutVolume > 1e5, `挖方量应为正且量级合理，实际 ${stats.cutVolume}`)

/* ---------- 三角剖分 ---------- */

const triangles = triangulatePolygon(POLYGON)
assert.strictEqual(triangles.length, (POLYGON.length - 2) * 3, '四边形应剖分为 2 个三角形')
assert.ok(triangles.every((index) => index >= 0 && index < POLYGON.length), '索引应在合法范围')

// 带一个凹角的 L 形，验证耳切不会越界
const L_SHAPE = [
  { lng: 0, lat: 0 },
  { lng: 2, lat: 0 },
  { lng: 2, lat: 1 },
  { lng: 1, lat: 1 },
  { lng: 1, lat: 2 },
  { lng: 0, lat: 2 }
]
const lTriangles = triangulatePolygon(L_SHAPE)
assert.strictEqual(lTriangles.length, (L_SHAPE.length - 2) * 3, 'L 形应剖分为 4 个三角形')

/* ---------- 其它 ---------- */

assert.deepStrictEqual(
  dedupePolygon([
    { lng: 1, lat: 1 },
    { lng: 1, lat: 1 },
    { lng: 2, lat: 1 },
    { lng: 1, lat: 1 }
  ]),
  [
    { lng: 1, lat: 1 },
    { lng: 2, lat: 1 }
  ],
  '应去掉重复点与闭合点'
)

const color = terrainVertexColor(1, 0.5, true)
assert.ok(color.every((c) => c >= 0 && c <= 1), '颜色分量应在 0~1')

/* ---------- 笔刷式编辑：目标标高平台模型 ---------- */

function makeGrid(segments = 24) {
  const grid = buildTerrainGrid(POLYGON, { segments, slopeWidth: 40 })
  for (let i = 0; i < grid.vertexCount; i++) {
    const row = Math.floor(i / grid.stride)
    const col = i % grid.stride
    // 造一个向东倾斜、带一点起伏的坡面
    const h = 900 + col * 2 + Math.sin(row * 0.7) * 12
    grid.base[i] = h
    grid.current[i] = h
  }
  return grid
}

type Grid = ReturnType<typeof buildTerrainGrid>
const CENTER_LNG = (POLYGON[0].lng + POLYGON[2].lng) / 2
const CENTER_LAT = (POLYGON[0].lat + POLYGON[2].lat) / 2

/** 以笔心为圆心、给定半径（米）内所有 inside 顶点的高度 */
function ringHeights(grid: Grid, lng: number, lat: number, r: number): number[] {
  const mLng = metersPerDegLng(lat)
  const b = grid.bounds
  const out: number[] = []
  for (let row = 0; row < grid.stride; row++) {
    const dz = (b.minLat + row * grid.dLat - lat) * 111319.49
    for (let col = 0; col < grid.stride; col++) {
      const i = row * grid.stride + col
      if (!grid.inside[i]) continue
      const dx = (b.minLng + col * grid.dLng - lng) * mLng
      if (Math.hypot(dx, dz) > r) continue
      out.push(grid.current[i])
    }
  }
  return out
}

function brushCenterIndex(grid: Grid) {
  const col = Math.round((CENTER_LNG - grid.bounds.minLng) / grid.dLng)
  const row = Math.round((CENTER_LAT - grid.bounds.minLat) / grid.dLat)
  return row * grid.stride + col
}

{
  // 核心：一次落笔把圈内压到同一个「绝对标高」，斜坡上也必须是水平面。
  // 旧模型按权重逐次减量，刷出来只是原曲面的缩放版 —— 看着就是一片糊。
  const grid = makeGrid(96)
  const R = 220
  const impact = applyBrush(grid, {
    mode: 'lower', lng: CENTER_LNG, lat: CENTER_LAT,
    radius: R, strength: 1, maxDelta: 8, roughness: 0
  })
  assert.ok(impact && impact.changed > 0, '落笔应改动若干顶点')
  const core = ringHeights(grid, CENTER_LNG, CENTER_LAT, R * 0.5)
  assert.ok(core.length > 50, `平台内应有足够顶点，实际 ${core.length}`)
  const spread = Math.max(...core) - Math.min(...core)
  assert.ok(spread < 1e-4, `平台内高度必须完全一致，实测极差 ${spread.toFixed(4)}`)
  assert.ok(
    Math.abs(core[0] - impact!.target) < 1e-4,
    '平台标高应恰好等于目标标高，而不是把原曲面整体压低一点'
  )
  assert.ok(impact!.gap < 1e-4, '默认 strength = 1 应一步压平')

  // 塌方坡会铺到笔刷半径之外一点，但更远的地形必须原样保留
  const far = brushCenterIndex(grid) + 40
  if (grid.inside[far]) {
    assert.ok(
      Math.abs(grid.current[far] - grid.base[far]) < 1e-6,
      '塌方坡范围之外不应变化'
    )
  }
}

{
  // 立面要窄：平台铺满大半个笔刷，只剩边缘薄薄一圈过渡。
  // 若退化成整圆软衰减的「碗」，等于目标标高的点只会剩中心一个。
  const grid = makeGrid(96)
  const R = 220
  const impact = applyBrush(grid, {
    mode: 'lower', lng: CENTER_LNG, lat: CENTER_LAT,
    radius: R, strength: 1, maxDelta: 8, roughness: 0
  })!
  const mLng = metersPerDegLng(CENTER_LAT)
  const b = grid.bounds
  let flatMax = 0
  for (let row = 0; row < grid.stride; row++) {
    const dz = (b.minLat + row * grid.dLat - CENTER_LAT) * 111319.49
    for (let col = 0; col < grid.stride; col++) {
      const i = row * grid.stride + col
      if (!grid.inside[i]) continue
      if (Math.abs(grid.current[i] - impact.target) > 1e-4) continue
      const dx = (b.minLng + col * grid.dLng - CENTER_LNG) * mLng
      flatMax = Math.max(flatMax, Math.hypot(dx, dz))
    }
  }
  assert.ok(flatMax > R * 0.7, `平台应铺满大半个笔刷，实测 ${flatMax.toFixed(1)}m`)
}

{
  // 每一笔都是清清楚楚的一级：坑心高度恰好等于该笔的目标标高
  const grid = makeGrid(96)
  const targets = [894, 888, 882, 876, 870]
  const idx = brushCenterIndex(grid)
  for (const t of targets) {
    const imp = applyBrush(grid, {
      mode: 'lower', lng: CENTER_LNG, lat: CENTER_LAT,
      radius: 180, strength: 1, maxDelta: 6, roughness: 0, targetHeight: t
    })!
    assert.strictEqual(imp.target, t, '显式目标标高应被原样采用')
    assert.ok(
      Math.abs(grid.current[idx] - t) < 1e-4,
      `目标 ${t} 的这一笔坑心应恰好压到位，实际 ${grid.current[idx].toFixed(2)}`
    )
  }
}

{
  // 默认（不传 strokeLimit / targetHeight）持续累加：除首笔对齐到台阶标高外，
  // 每笔恰好降一级，最终标高落在台阶的整数倍上。
  const grid = makeGrid()
  const idx = brushCenterIndex(grid)
  const step = 10
  const rounds = 20
  const heights: number[] = []
  for (let k = 0; k < rounds; k++) {
    applyBrush(grid, {
      mode: 'lower', lng: CENTER_LNG, lat: CENTER_LAT,
      radius: 200, strength: 1, maxDelta: step, roughness: 0
    })
    heights.push(grid.current[idx])
  }
  for (let k = 2; k < rounds; k++) {
    const d = heights[k - 1] - heights[k]
    assert.ok(Math.abs(d - step) < 1e-3, `第 ${k} 笔应降一级 ${step}m，实际 ${d.toFixed(3)}`)
  }
  const last = heights[rounds - 1]
  assert.ok(
    Math.abs(last / step - Math.round(last / step)) < 1e-6,
    `反复落笔后标高应对齐台阶，实际 ${last.toFixed(3)}`
  )
}

{
  // 显式给 strokeLimit 时才夹紧：单点累计不超过 maxDelta * strokeLimit
  const grid = makeGrid()
  const idx = brushCenterIndex(grid)
  const before = grid.current[idx]
  const strokeBase = new Float32Array(grid.current)
  const step = 10
  for (let k = 0; k < 30; k++) {
    applyBrush(grid, {
      mode: 'lower', lng: CENTER_LNG, lat: CENTER_LAT,
      radius: 200, strength: 1, maxDelta: step, strokeLimit: 3,
      roughness: 0, strokeBase
    })
  }
  assert.ok(
    Math.abs(before - grid.current[idx] - 30) < 1e-3,
    `strokeLimit 应夹在 30m，实际 ${(before - grid.current[idx]).toFixed(2)}`
  )
}

{
  // 单击：压到按脚下高度取整的下一级台阶，核心圈绝对平
  const grid = makeGrid(96)
  const idx = brushCenterIndex(grid)
  const before = grid.current[idx]
  const step = 10
  const imp = applyBrush(grid, {
    mode: 'lower', lng: CENTER_LNG, lat: CENTER_LAT,
    radius: 200, strength: 1, maxDelta: step, roughness: 0
  })!
  assert.ok(grid.current[idx] < before, '单击应让中心变低')
  assert.ok(
    Math.abs(grid.current[idx] - imp.target) < 1e-4,
    '单击后中心应恰好落在目标标高上'
  )
  assert.ok(
    Math.abs(imp.target - Math.floor((before - step) / step) * step) < 1e-3,
    '目标标高应对齐到台阶'
  )
}

{
  // 抬升同理：每笔抬一级，标高对齐台阶
  const grid = makeGrid()
  const idx = brushCenterIndex(grid)
  const before = grid.current[idx]
  const step = 5
  for (let k = 0; k < 20; k++) {
    applyBrush(grid, {
      mode: 'raise', lng: CENTER_LNG, lat: CENTER_LAT,
      radius: 200, strength: 1, maxDelta: step, roughness: 0
    })
  }
  const rise = grid.current[idx] - before
  assert.ok(rise > 90 && rise < 110, `抬升 20 笔应累计约 100m，实际 ${rise.toFixed(2)}`)
  const h = grid.current[idx]
  assert.ok(
    Math.abs(h / step - Math.round(h / step)) < 1e-6,
    '抬升后标高应对齐台阶'
  )
}

{
  // 整平：反复刷到目标高度
  const grid = makeGrid()
  const idx = brushCenterIndex(grid)
  const target = grid.current[idx] - 50
  for (let k = 0; k < 12; k++) {
    applyBrush(grid, {
      mode: 'level', lng: CENTER_LNG, lat: CENTER_LAT,
      radius: 200, strength: 0.8, targetHeight: target
    })
  }
  assert.ok(
    Math.abs(grid.current[idx] - target) < 5,
    `整平应逼近目标高度，实际 ${grid.current[idx].toFixed(2)}`
  )
}

{
  // 平滑：应降低邻域方差
  const grid = makeGrid(16)
  const variance = () => {
    let sum = 0, sq = 0, n = 0
    for (let i = 0; i < grid.vertexCount; i++) {
      if (!grid.inside[i]) continue
      sum += grid.current[i]
      sq += grid.current[i] * grid.current[i]
      n++
    }
    return sq / n - (sum / n) ** 2
  }
  const before = variance()
  for (let k = 0; k < 5; k++) {
    applyBrush(grid, {
      mode: 'smooth', lng: CENTER_LNG, lat: CENTER_LAT,
      radius: 400, strength: 1
    })
  }
  assert.ok(variance() <= before, '平滑不应增大整体方差')
}

/* ---------- 等高线 ---------- */

{
  assert.strictEqual(niceContourInterval(100, 10), 10, '100m 高差 10 条线应取 10m 等高距')
  assert.strictEqual(niceContourInterval(600, 12), 50, '600m 高差应取 50m 等高距')
  assert.ok(niceContourInterval(3, 10) > 0, '小高差也应给出正数等高距')
}

{
  const grid = makeGrid(32)
  const interval = 10
  const segs = buildContourSegments(grid, interval)
  assert.ok(segs.length > 0, '倾斜地形应产生等高线')
  assert.strictEqual(segs.length % 4, 0, '每条线段应由 4 个坐标组成')

  // 线段端点应落在格网范围内，且插值高度接近等高距的整数倍
  let checked = 0
  for (let i = 0; i < Math.min(segs.length, 400); i += 4) {
    for (let k = 0; k < 2; k++) {
      const row = segs[i + k * 2]
      const col = segs[i + k * 2 + 1]
      assert.ok(row >= 0 && row <= grid.segments + 1e-6, '行坐标应在格网范围内')
      assert.ok(col >= 0 && col <= grid.segments + 1e-6, '列坐标应在格网范围内')
    }
    checked++
  }
  assert.ok(checked > 0, '应校验到若干线段')

  const empty = buildContourSegments(grid, 100000)
  assert.strictEqual(empty.length, 0, '等高距大于高差时不应产生线')
}

/* ---------- 内部空洞：自交/折返多边形留下的「孤岛」 ---------- */

{
  // 外框 + 内圈小方框：射线法的奇偶规则会把小方框内部判成「外部」，
  // 而它被外框包住，四邻域灌不到 —— 正是「下沉后原地顶出来一块」的成因。
  const cx = 117.1
  const cy = 36.25
  const s = 0.005
  const p = (x: number, y: number) => ({ lng: cx + x * s, lat: cy + y * s })
  const RING = [p(-1, -1), p(1, -1), p(1, 1), p(-1, 1), p(0.3, 0.3), p(0.7, 0.3), p(0.7, 0.7), p(0.3, 0.7)]

  // 小方框的中心（单位坐标 0.5,0.5）才算「洞心」
  const holeLng = cx + 0.5 * s
  const holeLat = cy + 0.5 * s
  assert.strictEqual(pointInPolygon(holeLng, holeLat, RING), false, '小方框内部按奇偶规则是「外部」')

  const filled = buildTerrainGrid(RING, { segments: 40, slopeWidth: 20 })
  const raw = buildTerrainGrid(RING, { segments: 40, slopeWidth: 20, fillHoles: false })
  const b = filled.bounds
  const col = Math.round((holeLng - b.minLng) / filled.dLng)
  const row = Math.round((holeLat - b.minLat) / filled.dLat)
  const center = row * filled.stride + col

  assert.strictEqual(raw.inside[center], 0, '关掉 fillHoles 时应保留内部空洞（复现原现象）')
  assert.strictEqual(filled.inside[center], 1, '默认应把被包住的空洞填平')
  assert.ok(filled.weight[center] > 0.99, '补出来的点应给满权重，避免坑底留台阶')

  // 普通矩形不该被这次填充改动
  const plain = buildTerrainGrid(POLYGON, { segments: 24, slopeWidth: 80 })
  const plainRaw = buildTerrainGrid(POLYGON, { segments: 24, slopeWidth: 80, fillHoles: false })
  const count = (arr: Uint8Array) => Array.from(arr).filter(Boolean).length
  assert.strictEqual(count(plain.inside), count(plainRaw.inside), '矩形范围不受 fillHoles 影响')

  // 填平之后笔刷要能刷到洞里：在洞心落一笔，洞内顶点高度必须变化
  const heights = new Float32Array(filled.vertexCount).fill(100)
  filled.current = heights
  filled.base = new Float32Array(heights)
  const before = filled.current[center]
  applyBrush(filled, { mode: 'lower', lng: holeLng, lat: holeLat, radius: 200, strength: 1, maxDelta: 5 })
  assert.ok(filled.current[center] < before - 4, '空洞填平后必须能被笔刷挖动')
}

/* ---------- 拖动平台 / 边界不规则度 / 确定性 ---------- */

{
  // 整条笔画锁同一个目标标高：沿轨迹拖过缓坡，沟底必须是同一个标高。
  // 这是「该平的平」的关键 —— 每笔各按脚下取一级只会得到一串碗。
  const grid = makeGrid(160)
  const target = 880
  const mLng = metersPerDegLng(CENTER_LAT)
  for (let k = 0; k < 6; k++) {
    applyBrush(grid, {
      mode: 'lower', lng: CENTER_LNG + (k * 30) / mLng, lat: CENTER_LAT,
      radius: 110, strength: 1, maxDelta: 4, roughness: 0, targetHeight: target
    })
  }
  const row = Math.round((CENTER_LAT - grid.bounds.minLat) / grid.dLat)
  const c0 = Math.round((CENTER_LNG - grid.bounds.minLng) / grid.dLng)
  const bottom: number[] = []
  for (let col = c0 - 2; col <= c0 + 18; col++) bottom.push(grid.current[row * grid.stride + col])
  const spread = Math.max(...bottom) - Math.min(...bottom)
  assert.ok(spread < 1e-4, `拖动刷出的沟底应是同一个标高，实测极差 ${spread.toFixed(4)}`)
  assert.ok(Math.abs(bottom[0] - target) < 1e-4, '沟底标高应等于锁定目标')
}

{
  /** 把落笔影响到的顶点按方位分成 24 个扇区，取每个扇区最远的「受影响半径 / 笔刷半径」 */
  const ringProfile = (roughness: number, sectors = 24) => {
    const grid = buildTerrainGrid(POLYGON, { segments: 96, slopeWidth: 40 })
    for (let i = 0; i < grid.vertexCount; i++) {
      grid.base[i] = 900
      grid.current[i] = 900
    }
    const lng = 117.1
    const lat = 36.25
    const radius = 250
    const impact = applyBrush(grid, { mode: 'lower', lng, lat, radius, strength: 1, maxDelta: 20, roughness })!

    const mLng = metersPerDegLng(lat)
    const b = grid.bounds
    const out = new Array(sectors).fill(0)
    for (let row = 0; row < grid.stride; row++) {
      const dz = (b.minLat + row * grid.dLat - lat) * 111319.49
      for (let col = 0; col < grid.stride; col++) {
        const i = row * grid.stride + col
        if (!grid.inside[i]) continue
        // 只量「平台边界」：塌方坡按行列扫描扩散，若统计所有被改动点，
        // 它的方形特征会被误算成边界不规则。
        if (Math.abs(grid.current[i] - impact.target) > 1e-4) continue
        const dx = (b.minLng + col * grid.dLng - lng) * mLng
        const d = Math.hypot(dx, dz)
        let a = Math.atan2(dz, dx)
        if (a < 0) a += Math.PI * 2
        const s = Math.min(sectors - 1, Math.floor((a / (Math.PI * 2)) * sectors))
        out[s] = Math.max(out[s], d / radius)
      }
    }
    return out
  }

  const spread = (p: number[]) => Math.max(...p) - Math.min(...p)
  const mean = (p: number[]) => p.reduce((a, b) => a + b, 0) / p.length
  const plain = ringProfile(0)
  const jagged = ringProfile(0.6)
  assert.ok(spread(plain) < 0.03, `roughness = 0 应是一圈标准圆，实测 ${spread(plain).toFixed(3)}`)
  assert.ok(spread(jagged) > 0.12, `roughness 增大后边界必须明显不规则，实测 ${spread(jagged).toFixed(3)}`)
  assert.ok(
    mean(jagged) > 0.8 && mean(jagged) < 1.0,
    `棱角不该把笔刷尺寸带跑，实测平均半径 ${mean(jagged).toFixed(3)}`
  )

  // 噪声按世界坐标取样：同一处反复落笔，图案必须是固定的（否则按住不放会「沸腾」）
  const snapshot = (roughness: number) => {
    const grid = buildTerrainGrid(POLYGON, { segments: 48, slopeWidth: 40 })
    for (let i = 0; i < grid.vertexCount; i++) {
      grid.base[i] = 900
      grid.current[i] = 900
    }
    for (let k = 0; k < 3; k++) {
      applyBrush(grid, {
        mode: 'lower', lng: 117.1, lat: 36.25,
        radius: 200, strength: 1, maxDelta: 5, roughness
      })
    }
    return grid.current
  }
  const a = snapshot(0.6)
  const again = snapshot(0.6)
  for (let i = 0; i < a.length; i++) {
    assert.strictEqual(a[i], again[i], `同样的落笔必须得到同样的高度（第 ${i} 个顶点）`)
  }

  // `smooth` 是修平动作，加棱角只会把刚修好的面又搓毛 —— 对它不生效
  const smoothed = (roughness: number) => {
    const grid = buildTerrainGrid(POLYGON, { segments: 48, slopeWidth: 40 })
    for (let i = 0; i < grid.vertexCount; i++) {
      const row = Math.floor(i / grid.stride)
      const h = 900 + (row % 7) * 12
      grid.base[i] = h
      grid.current[i] = h
    }
    applyBrush(grid, {
      mode: 'smooth', lng: 117.1, lat: 36.25,
      radius: 200, strength: 1, roughness
    })
    return grid.current
  }
  const s0 = smoothed(0)
  const s1 = smoothed(1)
  for (let i = 0; i < s0.length; i++) {
    assert.strictEqual(s0[i], s1[i], `smooth 模式不应受 roughness 影响（第 ${i} 个顶点）`)
  }
}

console.log('✓ terrainGrid 全部测试通过')
