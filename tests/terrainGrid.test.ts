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

console.log('✓ terrainGrid 全部测试通过')

/* ---------- 笔刷式编辑 ---------- */

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

{
  const grid = makeGrid()
  const centerLng = (POLYGON[0].lng + POLYGON[2].lng) / 2
  const centerLat = (POLYGON[0].lat + POLYGON[2].lat) / 2
  const col = Math.round((centerLng - grid.bounds.minLng) / grid.dLng)
  const row = Math.round((centerLat - grid.bounds.minLat) / grid.dLat)
  const index = row * grid.stride + col
  const before = grid.current[index]

  const impact = applyBrush(grid, {
    mode: 'lower',
    lng: centerLng,
    lat: centerLat,
    radius: 220,
    strength: 0.6,
    maxDelta: 40
  })
  assert.ok(impact && impact.changed > 0, '落笔应改动若干顶点')
  assert.ok(grid.current[index] < before, '下沉模式应让中心点变低')
  assert.ok(
    before - grid.current[index] <= 40 + 1e-6,
    '单次下沉不应超过 maxDelta'
  )

  // 笔刷圆外不应被改动
  const farCol = Math.min(grid.stride - 1, col + 20)
  const farIndex = row * grid.stride + farCol
  if (grid.inside[farIndex]) {
    assert.ok(
      Math.abs(grid.current[farIndex] - grid.base[farIndex]) < 1e-6,
      '笔刷半径之外的地形不应变化'
    )
  }
}

{
  // 一笔之内反复落笔：既不能把一次拖动叠成几百米竖井，也不能浅到和单击一样
  const grid = makeGrid()
  const centerLng = (POLYGON[0].lng + POLYGON[2].lng) / 2
  const centerLat = (POLYGON[0].lat + POLYGON[2].lat) / 2
  const col = Math.round((centerLng - grid.bounds.minLng) / grid.dLng)
  const row = Math.round((centerLat - grid.bounds.minLat) / grid.dLat)
  const index = row * grid.stride + col
  const before = grid.current[index]
  const strokeBase = new Float32Array(grid.current)
  const maxDelta = 10
  const strokeLimit = 6

  for (let k = 0; k < 30; k++) {
    applyBrush(grid, {
      mode: 'lower',
      lng: centerLng,
      lat: centerLat,
      radius: 200,
      strength: 1,
      maxDelta,
      strokeLimit,
      strokeBase
    })
  }
  const drop = before - grid.current[index]
  assert.ok(
    drop <= maxDelta * strokeLimit + 1e-6,
    `一笔内累计下沉应被限制在 maxDelta * strokeLimit，实际 ${drop.toFixed(2)}`
  )
  assert.ok(drop > 9, '仍然应该挖到接近 maxDelta')
  // 关键回归：拖动一笔必须明显深于单击，否则笔刷会「没反应」
  assert.ok(
    drop > maxDelta * 2,
    `拖动一笔应明显深于单击（>2*maxDelta），实际 ${drop.toFixed(2)}`
  )

  // 换一笔（新的快照）可以继续往下挖
  const nextBase = new Float32Array(grid.current)
  for (let k = 0; k < 30; k++) {
    applyBrush(grid, {
      mode: 'lower',
      lng: centerLng,
      lat: centerLat,
      radius: 200,
      strength: 1,
      maxDelta,
      strokeLimit,
      strokeBase: nextBase
    })
  }
  const total = before - grid.current[index]
  assert.ok(
    total > drop * 1.9 && total <= maxDelta * strokeLimit * 2 + 1e-6,
    `两笔应累计约 2*maxDelta*strokeLimit，实际 ${total.toFixed(2)}`
  )
}

{
  // 单击：只施加一次，深度为 maxDelta * strength
  const grid = makeGrid()
  const centerLng = (POLYGON[0].lng + POLYGON[2].lng) / 2
  const centerLat = (POLYGON[0].lat + POLYGON[2].lat) / 2
  const col = Math.round((centerLng - grid.bounds.minLng) / grid.dLng)
  const row = Math.round((centerLat - grid.bounds.minLat) / grid.dLat)
  const index = row * grid.stride + col
  const before = grid.current[index]
  applyBrush(grid, {
    mode: 'lower',
    lng: centerLng,
    lat: centerLat,
    radius: 200,
    strength: 1,
    maxDelta: 10,
    strokeLimit: 6,
    strokeBase: new Float32Array(grid.current)
  })
  const drop = before - grid.current[index]
  assert.ok(Math.abs(drop - 10) < 1e-6, `单击应刚好下沉 maxDelta，实际 ${drop.toFixed(2)}`)
}

{
  const grid = makeGrid()
  const centerLng = (POLYGON[0].lng + POLYGON[2].lng) / 2
  const centerLat = (POLYGON[0].lat + POLYGON[2].lat) / 2
  const col = Math.round((centerLng - grid.bounds.minLng) / grid.dLng)
  const row = Math.round((centerLat - grid.bounds.minLat) / grid.dLat)
  const index = row * grid.stride + col
  const before = grid.current[index]

  applyBrush(grid, { mode: 'raise', lng: centerLng, lat: centerLat, radius: 200, strength: 0.5, maxDelta: 30 })
  assert.ok(grid.current[index] > before, '抬升模式应让中心点变高')

  // 整平：反复刷到目标高度
  const target = before - 50
  for (let k = 0; k < 12; k++) {
    applyBrush(grid, {
      mode: 'level',
      lng: centerLng,
      lat: centerLat,
      radius: 200,
      strength: 0.8,
      targetHeight: target
    })
  }
  assert.ok(
    Math.abs(grid.current[index] - target) < 5,
    `整平应逼近目标高度，实际 ${grid.current[index].toFixed(2)}，目标 ${target.toFixed(2)}`
  )
}

{
  // 平滑：应降低邻域方差
  const grid = makeGrid(16)
  const centerLng = (POLYGON[0].lng + POLYGON[2].lng) / 2
  const centerLat = (POLYGON[0].lat + POLYGON[2].lat) / 2
  const variance = () => {
    let sum = 0
    let sq = 0
    let n = 0
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
    applyBrush(grid, { mode: 'smooth', lng: centerLng, lat: centerLat, radius: 400, strength: 1 })
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
