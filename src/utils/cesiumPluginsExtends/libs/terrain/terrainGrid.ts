/**
 * 地形编辑的纯几何工具。
 *
 * 这里只做与渲染无关的计算：多边形判定、编辑格网生成、塌陷 / 抬升 / 平整 / 平滑的
 * 高度形变、台阶量化、三角剖分、顶点配色和土方量统计。
 * 不依赖 Cesium / Three.js，可以直接在 Node 里做单元测试。
 */

/** 经纬度点（单位：度） */
export interface TerrainLngLat {
  lng: number
  lat: number
}

/** 带高度的经纬度点（高度单位：米） */
export interface TerrainLngLatHeight extends TerrainLngLat {
  height: number
}

/** 经纬度包围盒 */
export interface TerrainBounds {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

/** 地形编辑模式的字面量类型 */
export type TerrainEditMode = 'sink' | 'raise' | 'flatten' | 'smooth'

/** 生成编辑格网的参数 */
export interface TerrainGridOptions {
  /** 每边划分数（顶点数 = segments + 1），默认 64，范围 8~256 */
  segments?: number
  /** 包围盒外扩比例，默认 0.06 */
  padRatio?: number
  /** 边缘过渡宽度（米），默认取区域短边的 12%，至少 12 米 */
  slopeWidth?: number
}

/** 一次地形编辑用的规则格网 */
export interface TerrainGrid {
  /** 每边划分数 */
  segments: number
  /** 顶点数（segments + 1） */
  stride: number
  /** 格网覆盖的经纬度范围 */
  bounds: TerrainBounds
  /** 经度方向步长（度） */
  dLng: number
  /** 纬度方向步长（度） */
  dLat: number
  /** 顶点总数 */
  vertexCount: number
  /** 顶点是否落在多边形内部（1/0） */
  inside: Uint8Array
  /** 顶点到多边形边界的距离（米，内部为正） */
  distance: Float32Array
  /** 形变权重（0 在边界，1 在影响半径以外完全生效） */
  weight: Float32Array
  /** 原始地形高度（米） */
  base: Float32Array
  /** 当前地形高度（米），编辑后与 base 的差值即土方变化 */
  current: Float32Array
  /** 边缘过渡宽度（米） */
  slopeWidth: number
  /** 单元边长（米，近似值，用于体积积分） */
  cellSize: number
  /** 单元面积（平方米） */
  cellArea: number
}

/** 形变参数 */
export interface TerrainDeformOptions {
  /** 编辑模式，默认 `sink`（塌陷） */
  mode?: TerrainEditMode
  /** 塌陷深度 / 抬升高度 / 平整偏移（米），默认 30 */
  depth?: number
  /** 台阶高度（米），0 表示平滑过渡；矿山台阶常用 4~12 米 */
  stepHeight?: number
  /** 平整目标高度（米），不传时取内圈平均高度 */
  flattenHeight?: number
  /** 平滑迭代次数，默认 2 */
  smoothIterations?: number
}

/** 地形统计信息 */
export interface TerrainStats {
  /** 多边形面积（平方米） */
  area: number
  /** 格网内最低点高度（米） */
  minHeight: number
  /** 格网内最高点高度（米） */
  maxHeight: number
  /** 相对原始地形挖掉的体积（立方米，正值表示挖方） */
  cutVolume: number
  /** 相对原始地形填上的体积（立方米，正值表示填方） */
  fillVolume: number
  /** 参与编辑的顶点数 */
  vertexCount: number
  /** 单元边长（米） */
  cellSize: number
}

/** 每纬度 1 度对应的米数（WGS84 平均值） */
const METERS_PER_DEG_LAT = 111319.49079327358

/**
 * 一笔之内同一位置默认最多叠加的次数。
 *
 * 取 6 是手感与安全的折中：单击只改一次（`maxDelta * strength`），
 * 按住拖动会逐步加深到约 `maxDelta * 6`，两者差异肉眼可辨；
 * 同时又能挡住「一笔刷出几百米竖井」那类重复叠加。
 */
const DEFAULT_STROKE_LIMIT = 6

/**
 * 每经度 1 度对应的米数（随纬度收缩）
 * @param lat - 纬度（度）
 */
export function metersPerDegLng(lat: number): number {
  return METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180)
}

/** 数值裁剪 */
function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

/** 三次平滑插值，让边缘过渡自然（一阶导在两端为 0） */
export function smoothstep(t: number): number {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

/** 计算多边形包围盒 */
export function polygonBounds(polygon: TerrainLngLat[]): TerrainBounds {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity
  for (const point of polygon) {
    if (!point) continue
    if (point.lng < minLng) minLng = point.lng
    if (point.lng > maxLng) maxLng = point.lng
    if (point.lat < minLat) minLat = point.lat
    if (point.lat > maxLat) maxLat = point.lat
  }
  if (!Number.isFinite(minLng)) return { minLng: 0, minLat: 0, maxLng: 0, maxLat: 0 }
  return { minLng, minLat, maxLng, maxLat }
}

/** 多边形中心（包围盒中心，避免自交多边形求质心失败） */
export function polygonCenter(polygon: TerrainLngLat[]): TerrainLngLat {
  const bounds = polygonBounds(polygon)
  return {
    lng: (bounds.minLng + bounds.maxLng) / 2,
    lat: (bounds.minLat + bounds.maxLat) / 2
  }
}

/**
 * 射线法判断点是否在多边形内部。
 * @param lng - 经度（度）
 * @param lat - 纬度（度）
 * @param polygon - 闭合或非闭合的多边形顶点
 */
export function pointInPolygon(lng: number, lat: number, polygon: TerrainLngLat[]): boolean {
  let inside = false
  const count = polygon.length
  for (let i = 0, j = count - 1; i < count; j = i++) {
    const xi = polygon[i].lng
    const yi = polygon[i].lat
    const xj = polygon[j].lng
    const yj = polygon[j].lat
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-12) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * 点到多边形边界的最短距离（米）。
 *
 * 内部点返回正距离，外部点返回负距离，边界附近接近 0。
 * 用查询点所在纬度的米/度换算做局部平面近似，几公里范围内误差可忽略。
 */
export function distanceToPolygon(lng: number, lat: number, polygon: TerrainLngLat[]): number {
  const mx = metersPerDegLng(lat)
  const my = METERS_PER_DEG_LAT
  let min = Infinity
  const count = polygon.length
  for (let i = 0, j = count - 1; i < count; j = i++) {
    const ax = (polygon[j].lng - lng) * mx
    const ay = (polygon[j].lat - lat) * my
    const bx = (polygon[i].lng - lng) * mx
    const by = (polygon[i].lat - lat) * my
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy
    const t = len2 > 0 ? clamp(-(ax * dx + ay * dy) / len2, 0, 1) : 0
    const px = ax + t * dx
    const py = ay + t * dy
    const dist = Math.sqrt(px * px + py * py)
    if (dist < min) min = dist
  }
  if (!Number.isFinite(min)) min = 0
  const signed = pointInPolygon(lng, lat, polygon) ? min : -min
  return signed
}

/** 多边形面积（平方米），用于面板展示 */
export function polygonArea(polygon: TerrainLngLat[]): number {
  if (polygon.length < 3) return 0
  const lat = polygonCenter(polygon).lat
  const mx = metersPerDegLng(lat)
  const my = METERS_PER_DEG_LAT
  let sum = 0
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    sum += (polygon[j].lng * mx) * (polygon[i].lat * my) - (polygon[i].lng * mx) * (polygon[j].lat * my)
  }
  return Math.abs(sum) / 2
}

/**
 * 生成编辑格网（只算几何，不含高度采样）。
 *
 * 顶点按行优先排列，索引 = row * stride + col。
 * @param polygon - 编辑范围
 * @param options - 格网参数
 */
export function buildTerrainGrid(polygon: TerrainLngLat[], options: TerrainGridOptions = {}): TerrainGrid {
  if (!polygon || polygon.length < 3) {
    throw new Error('buildTerrainGrid: 至少需要 3 个顶点')
  }
  const segments = Math.round(clamp(options.segments ?? 64, 8, 256))
  const padRatio = clamp(options.padRatio ?? 0.06, 0, 0.5)
  const stride = segments + 1
  const bounds = polygonBounds(polygon)
  const padLng = (bounds.maxLng - bounds.minLng) * padRatio
  const padLat = (bounds.maxLat - bounds.minLat) * padRatio
  const minLng = bounds.minLng - padLng
  const maxLng = bounds.maxLng + padLng
  const minLat = bounds.minLat - padLat
  const maxLat = bounds.maxLat + padLat
  const dLng = (maxLng - minLng) / segments
  const dLat = (maxLat - minLat) / segments

  const centerLat = (minLat + maxLat) / 2
  const mx = metersPerDegLng(centerLat)
  const cellSize = Math.max(dLng * mx, dLat * METERS_PER_DEG_LAT)
  const widthMeters = (maxLng - minLng) * mx
  const heightMeters = (maxLat - minLat) * METERS_PER_DEG_LAT
  const slopeWidth = clamp(
    options.slopeWidth ?? Math.max(12, Math.min(widthMeters, heightMeters) * 0.12),
    4,
    Math.min(widthMeters, heightMeters) * 0.6
  )

  const vertexCount = stride * stride
  const inside = new Uint8Array(vertexCount)
  const distance = new Float32Array(vertexCount)
  const weight = new Float32Array(vertexCount)
  const base = new Float32Array(vertexCount)
  const current = new Float32Array(vertexCount)

  for (let row = 0; row < stride; row++) {
    const lat = minLat + row * dLat
    for (let col = 0; col < stride; col++) {
      const lng = minLng + col * dLng
      const index = row * stride + col
      if (!pointInPolygon(lng, lat, polygon)) continue
      const dist = distanceToPolygon(lng, lat, polygon)
      inside[index] = 1
      distance[index] = dist
      weight[index] = smoothstep(dist / slopeWidth)
    }
  }

  return {
    segments,
    stride,
    bounds: { minLng, minLat, maxLng, maxLat },
    dLng,
    dLat,
    vertexCount,
    inside,
    distance,
    weight,
    base,
    current,
    slopeWidth,
    cellSize,
    cellArea: cellSize * cellSize
  }
}

/** 取格网某个顶点的经纬度 */
export function gridLngLat(grid: TerrainGrid, index: number): TerrainLngLat {
  const row = Math.floor(index / grid.stride)
  const col = index % grid.stride
  return {
    lng: grid.bounds.minLng + col * grid.dLng,
    lat: grid.bounds.minLat + row * grid.dLat
  }
}

/** 内圈平均高度，作为「平整」的默认目标高度 */
export function innerAverageHeight(grid: TerrainGrid, heights: Float32Array): number {
  let sum = 0
  let count = 0
  for (let i = 0; i < grid.vertexCount; i++) {
    if (grid.weight[i] < 0.85) continue
    sum += heights[i]
    count++
  }
  if (count === 0) {
    for (let i = 0; i < grid.vertexCount; i++) {
      if (!grid.inside[i]) continue
      sum += heights[i]
      count++
    }
  }
  return count ? sum / count : 0
}

/**
 * 内圈（权重 >= 0.85）的高度范围与平均值。
 *
 * 边界一圈仍然贴着原始地形，直接拿全范围的最高/最低点算水位会失真，
 * 所以水位统一按「内圈坑底 + 内圈平均（作业平台）」推算。
 * @param grid - 编辑格网
 * @param heights - 高度数组（默认取当前高度）
 */
export function innerHeightRange(
  grid: TerrainGrid,
  heights: Float32Array = grid.current
): { min: number; max: number; average: number } {
  let min = Infinity
  let max = -Infinity
  let sum = 0
  let count = 0
  for (let i = 0; i < grid.vertexCount; i++) {
    if (grid.weight[i] < 0.85) continue
    const h = heights[i]
    if (h < min) min = h
    if (h > max) max = h
    sum += h
    count++
  }
  if (!count) return { min: 0, max: 0, average: 0 }
  return { min, max, average: sum / count }
}

/** 3x3 均值模糊（只在内部顶点间扩散），用于「平滑」模式 */
function blurHeights(grid: TerrainGrid, heights: Float32Array): Float32Array {
  const { stride } = grid
  const out = new Float32Array(heights)
  for (let row = 1; row < stride - 1; row++) {
    for (let col = 1; col < stride - 1; col++) {
      const index = row * stride + col
      if (!grid.inside[index]) continue
      let sum = 0
      let count = 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nIndex = (row + dr) * stride + (col + dc)
          if (!grid.inside[nIndex]) continue
          sum += heights[nIndex]
          count++
        }
      }
      if (count) out[index] = sum / count
    }
  }
  return out
}

/**
 * 按编辑参数计算新的高度场（不修改传入的格网）。
 *
 * 台阶（`stepHeight`）的实现方式是把「相对当前地面的高差」按台阶高度量化：
 * 距离边界越远权重越大，量化后的高差呈阶梯状，于是坑壁出现一圈圈台阶，
 * 与露天矿的台阶开采效果一致。
 *
 * @param grid - 编辑格网
 * @param options - 形变参数
 * @returns 新的高度数组（长度 = grid.vertexCount）
 */
export function deformTerrain(grid: TerrainGrid, options: TerrainDeformOptions = {}): Float32Array {
  const mode = options.mode ?? 'sink'
  const depth = Math.abs(options.depth ?? 30)
  const flattenOffset = options.depth ?? 0
  const stepHeight = Math.max(0, options.stepHeight ?? 0)
  const next = new Float32Array(grid.current)

  if (mode === 'smooth') {
    const iterations = Math.max(1, Math.round(options.smoothIterations ?? 2))
    let working = new Float32Array(grid.current)
    for (let k = 0; k < iterations; k++) {
      const blurred = blurHeights(grid, working)
      for (let i = 0; i < grid.vertexCount; i++) {
        const w = grid.weight[i]
        if (w <= 0) continue
        working[i] = working[i] * (1 - w * 0.85) + blurred[i] * (w * 0.85)
      }
    }
    return working
  }

  const flattenHeight =
    options.flattenHeight ?? innerAverageHeight(grid, grid.current)

  for (let i = 0; i < grid.vertexCount; i++) {
    const w = grid.weight[i]
    if (w <= 0) continue
    const origin = grid.current[i]
    let target = origin

    if (mode === 'raise') {
      target = origin + depth * w
    } else if (mode === 'flatten') {
      // 平整到统一标高，depth 作为额外的整体偏移量（正数抬高、负数下沉）
      target = origin + (flattenHeight + flattenOffset - origin) * w
    } else {
      target = origin - depth * w
    }

    if (stepHeight > 0) {
      const diff = target - origin
      const quantized = Math.round(diff / stepHeight) * stepHeight
      // 边界附近不足半级台阶的位置保持原地面，避免出现悬空的薄边
      target = origin + quantized
    }

    next[i] = target
  }

  return next
}

/**
 * 统计当前地形：面积、最高最低点、挖填方量。
 * @param grid - 编辑格网
 * @param polygon - 编辑范围（用于面积）
 * @param heights - 当前高度（默认取 grid.current）
 */
export function terrainStats(
  grid: TerrainGrid,
  polygon: TerrainLngLat[],
  heights: Float32Array = grid.current
): TerrainStats {
  let minHeight = Infinity
  let maxHeight = -Infinity
  let cutVolume = 0
  let fillVolume = 0
  let vertexCount = 0

  for (let i = 0; i < grid.vertexCount; i++) {
    if (!grid.inside[i]) continue
    vertexCount++
    const h = heights[i]
    if (h < minHeight) minHeight = h
    if (h > maxHeight) maxHeight = h
    const delta = h - grid.base[i]
    if (delta < 0) cutVolume -= delta * grid.cellArea
    else fillVolume += delta * grid.cellArea
  }

  if (!Number.isFinite(minHeight)) minHeight = 0
  if (!Number.isFinite(maxHeight)) maxHeight = 0

  return {
    area: polygonArea(polygon),
    minHeight,
    maxHeight,
    cutVolume,
    fillVolume,
    vertexCount,
    cellSize: grid.cellSize
  }
}

/** 顶点颜色调色板：坑口偏草绿/土色，向下逐渐转为裸岩与阴冷的坑底 */
const PALETTE: Array<{ stop: number; color: [number, number, number] }> = [
  { stop: 0, color: [0.4, 0.42, 0.3] },
  { stop: 0.35, color: [0.46, 0.38, 0.28] },
  { stop: 0.7, color: [0.32, 0.3, 0.27] },
  { stop: 1, color: [0.17, 0.19, 0.22] }
]

/** 水下颜色（与岩层颜色混合） */
const WATER_TINT: [number, number, number] = [0.1, 0.34, 0.5]

/**
 * 按「相对深度」取顶点颜色。
 * @param depthRatio - 0 表示坑口，1 表示最深点
 * @param hash - 0~1 的稳定随机值，用于打散色块，避免颜色过于纯净
 * @param underwater - 是否位于水面以下
 * @returns `[r, g, b]`（0~1）
 */
export function terrainVertexColor(
  depthRatio: number,
  hash = 0.5,
  underwater = false
): [number, number, number] {
  const k = clamp(depthRatio, 0, 1)
  let from = PALETTE[0]
  let to = PALETTE[PALETTE.length - 1]
  for (let i = 0; i < PALETTE.length - 1; i++) {
    if (k >= PALETTE[i].stop && k <= PALETTE[i + 1].stop) {
      from = PALETTE[i]
      to = PALETTE[i + 1]
      break
    }
  }
  const span = to.stop - from.stop || 1
  const t = clamp((k - from.stop) / span, 0, 1)
  let r = from.color[0] + (to.color[0] - from.color[0]) * t
  let g = from.color[1] + (to.color[1] - from.color[1]) * t
  let b = from.color[2] + (to.color[2] - from.color[2]) * t

  if (underwater) {
    r = r * 0.45 + WATER_TINT[0] * 0.55
    g = g * 0.45 + WATER_TINT[1] * 0.55
    b = b * 0.45 + WATER_TINT[2] * 0.55
  }

  // 轻微明暗扰动，避免整片纯色
  const noise = 0.92 + (hash - 0.5) * 0.16
  return [clamp(r * noise, 0, 1), clamp(g * noise, 0, 1), clamp(b * noise, 0, 1)]
}

/** 稳定的整数散列，用来生成顶点明暗扰动 */
export function hash2d(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

/** 判断三角形是否为逆时针（叉积 > 0） */
function cross(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
}

/** 判断点是否落在三角形内 */
function pointInTriangle(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number
): boolean {
  const c1 = cross(ax, ay, bx, by, px, py)
  const c2 = cross(bx, by, cx, cy, px, py)
  const c3 = cross(cx, cy, ax, ay, px, py)
  return c1 >= 0 && c2 >= 0 && c3 >= 0
}

/**
 * 多边形三角剖分（耳切法），返回顶点索引三元组。
 *
 * 只用于水面这种「整块平面」的网格；地形本身走规则格网，不需要三角剖分。
 * @param points - 多边形顶点（任意旋转方向）
 */
export function triangulatePolygon(points: TerrainLngLat[]): number[] {
  const count = points.length
  if (count < 3) return []
  const indices: number[] = []
  for (let i = 0; i < count; i++) indices.push(i)

  // 统一成逆时针，保证 ear 判定的叉积符号一致
  let signed = 0
  for (let i = 0, j = count - 1; i < count; j = i++) {
    signed += points[j].lng * points[i].lat - points[i].lng * points[j].lat
  }
  if (signed < 0) indices.reverse()

  const result: number[] = []
  let guard = 0
  while (indices.length > 3 && guard++ < count * count) {
    let clipped = false
    for (let i = 0; i < indices.length; i++) {
      const prev = indices[(i + indices.length - 1) % indices.length]
      const curr = indices[i]
      const next = indices[(i + 1) % indices.length]
      const a = points[prev]
      const b = points[curr]
      const c = points[next]
      if (cross(a.lng, a.lat, b.lng, b.lat, c.lng, c.lat) <= 0) continue

      let hasPoint = false
      for (const index of indices) {
        if (index === prev || index === curr || index === next) continue
        const p = points[index]
        if (pointInTriangle(p.lng, p.lat, a.lng, a.lat, b.lng, b.lat, c.lng, c.lat)) {
          hasPoint = true
          break
        }
      }
      if (hasPoint) continue

      result.push(prev, curr, next)
      indices.splice(i, 1)
      clipped = true
      break
    }
    // 自交等退化情况：退化为扇形，保证仍有可见的水面
    if (!clipped) break
  }

  if (indices.length === 3) {
    result.push(indices[0], indices[1], indices[2])
  } else if (indices.length > 3) {
    for (let i = 1; i < indices.length - 1; i++) {
      result.push(indices[0], indices[i], indices[i + 1])
    }
  }
  return result
}

/** 去掉相邻重复点（绘制时双击容易连点两次） */
export function dedupePolygon<T extends TerrainLngLat>(points: T[], tolerance = 1e-9): T[] {
  const out: T[] = []
  for (const point of points) {
    const last = out[out.length - 1]
    if (last && Math.abs(last.lng - point.lng) < tolerance && Math.abs(last.lat - point.lat) < tolerance) {
      continue
    }
    out.push(point)
  }
  if (out.length > 1) {
    const first = out[0]
    const last = out[out.length - 1]
    if (Math.abs(first.lng - last.lng) < tolerance && Math.abs(first.lat - last.lat) < tolerance) {
      out.pop()
    }
  }
  return out
}

/* ===== 笔刷式编辑（对应「按住拖动连续刷」的交互） ===== */

/** 笔刷模式：抬升 / 下沉 / 整平到目标高度 / 平滑 */
export type TerrainBrushMode = 'raise' | 'lower' | 'level' | 'smooth'

export interface TerrainBrushOptions {
  mode: TerrainBrushMode
  /** 笔刷中心经度 */
  lng: number
  /** 笔刷中心纬度 */
  lat: number
  /** 笔刷半径（米） */
  radius: number
  /** 强度 0~1，默认 0.5；连续刷时会按此比例逐次逼近 */
  strength?: number
  /** `level` 模式的目标高度（米） */
  targetHeight?: number
  /** 硬边比例 0~1：0 为整圆软衰减，0.7 表示内 70% 半径几乎满强度 */
  hardness?: number
  /** 单次施加的最大高度变化（米），默认 60，避免一次刷出断崖 */
  maxDelta?: number
  /**
   * 本笔开始时的格网高度快照。
   *
   * 按住拖动时 `strokeAt` 会被调用几十上百次，同一顶点仍落在笔刷范围内就会被
   * 反复叠加——一笔下来能挖出几百米深的竖井（坑壁垂直、贴图被拉成布条）。
   * 传入快照后，单点在本笔内的累计改动被夹在 `±maxDelta * strokeLimit` 以内：
   * 一笔最多改多少，要更深就抬笔再刷，和地形软件的手感一致。
   */
  strokeBase?: Float32Array | null
  /**
   * 一笔之内同一位置最多叠加几次，默认 6。
   *
   * 注意不能把它当成「总限幅」直接压到 1：那样拖一整笔和点一下一样深，
   * 笔刷会完全没有手感。默认 6 时一笔最深刻度约为 `maxDelta * 6`，
   * 单击则只改一次 `maxDelta * strength`，两者差异明显。
   */
  strokeLimit?: number
}

export interface TerrainBrushImpact {
  minRow: number
  maxRow: number
  minCol: number
  maxCol: number
  /** 实际被改动的顶点数 */
  changed: number
}

/**
 * 在格网上落一笔笔刷，就地修改 `grid.current`。
 *
 * 与 `deformTerrain`（整块一次性形变）不同，这里只影响圆形范围，
 * 并按「到笔刷中心的距离」加权，边缘权重为 0，所以连续拖动时能刷出自然的坡面。
 *
 * @param grid - 目标格网
 * @param options - 笔刷参数
 * @returns 受影响的格网范围；完全没落在格网内时返回 `null`
 */
export function applyBrush(grid: TerrainGrid, options: TerrainBrushOptions): TerrainBrushImpact | null {
  const radius = Math.max(0.5, options.radius)
  const strength = clamp(options.strength ?? 0.5, 0, 1)
  const hardness = clamp(options.hardness ?? 0, 0, 0.95)
  const maxDelta = Math.max(0.01, options.maxDelta ?? 60)
  // 一笔内允许叠加几次：下限 1 保证行为可预期，上限 20 防止真刷出断崖
  const strokeLimit = Math.max(1, Math.min(20, options.strokeLimit ?? DEFAULT_STROKE_LIMIT))
  const mode = options.mode

  const mLng = metersPerDegLng(options.lat)
  const radiusDegLng = radius / mLng
  const radiusDegLat = radius / METERS_PER_DEG_LAT
  const b = grid.bounds
  if (
    options.lng < b.minLng - radiusDegLng ||
    options.lng > b.maxLng + radiusDegLng ||
    options.lat < b.minLat - radiusDegLat ||
    options.lat > b.maxLat + radiusDegLat
  ) {
    return null
  }

  const col0 = Math.max(0, Math.floor((options.lng - radiusDegLng - b.minLng) / grid.dLng))
  const col1 = Math.min(grid.stride - 1, Math.ceil((options.lng + radiusDegLng - b.minLng) / grid.dLng))
  const row0 = Math.max(0, Math.floor((options.lat - radiusDegLat - b.minLat) / grid.dLat))
  const row1 = Math.min(grid.stride - 1, Math.ceil((options.lat + radiusDegLat - b.minLat) / grid.dLat))

  const inner = 1 - hardness
  let changed = 0

  for (let row = row0; row <= row1; row++) {
    const lat = b.minLat + row * grid.dLat
    const dz = (lat - options.lat) * METERS_PER_DEG_LAT
    for (let col = col0; col <= col1; col++) {
      const index = row * grid.stride + col
      if (!grid.inside[index]) continue
      const lng = b.minLng + col * grid.dLng
      const dx = (lng - options.lng) * mLng
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist > radius) continue

      const falloff = clamp((1 - dist / radius) / inner, 0, 1)
      const w = smoothstep(falloff) * strength
      if (w <= 0) continue

      const h = grid.current[index]
      let next = h
      if (mode === 'raise') {
        next = h + maxDelta * w
      } else if (mode === 'lower') {
        next = h - maxDelta * w
      } else if (mode === 'level') {
        const target = options.targetHeight ?? grid.base[index]
        next = h + (target - h) * clamp(w * 1.6, 0, 1)
      } else {
        // 平滑：向 3x3 邻域均值靠拢，权重太大会直接把细节抹平，这里额外压一下
        const avg = neighborAverage(grid, row, col)
        next = h + (avg - h) * clamp(w * 1.4, 0, 1)
      }
      // 本笔累计上限：一笔之内单点最多偏离 strokeBase ±（单次幅度 × 允许叠加次数）。
      // 这个上限必须明显大于单次幅度，否则拖一整笔和点一下一样深，笔刷会「没反应」。
      const sb = options.strokeBase
      if (sb) {
        const span = maxDelta * strokeLimit
        if (next > sb[index] + span) next = sb[index] + span
        else if (next < sb[index] - span) next = sb[index] - span
      }
      if (next !== h) {
        grid.current[index] = next
        changed++
      }
    }
  }

  return { minRow: row0, maxRow: row1, minCol: col0, maxCol: col1, changed }
}

/** 3x3 邻域均值（越界或掩膜外的邻点忽略） */
function neighborAverage(grid: TerrainGrid, row: number, col: number): number {
  const stride = grid.stride
  let sum = 0
  let count = 0
  for (let dr = -1; dr <= 1; dr++) {
    const r = row + dr
    if (r < 0 || r >= stride) continue
    for (let dc = -1; dc <= 1; dc++) {
      const c = col + dc
      if (c < 0 || c >= stride) continue
      const i = r * stride + c
      if (!grid.inside[i]) continue
      sum += grid.current[i]
      count++
    }
  }
  return count ? sum / count : grid.current[row * stride + col]
}

/* ===== 等高线 ===== */

/**
 * 取一个「顺眼」的等高距（1 / 2 / 5 / 10 / 20 / 25 / 50 / 100 …），
 * 让可见范围内大约出现 `targetLines` 条线。
 * @param span - 高差（米）
 * @param targetLines - 期望线条数量，默认 12
 */
export function niceContourInterval(span: number, targetLines = 12): number {
  const raw = Math.max(0.2, span / Math.max(1, targetLines))
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / pow
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  return step * pow
}

/**
 * 用 marching squares 生成等高线段。
 *
 * 返回的是**格网分数坐标**：每条线段 4 个数 `[row1, col1, row2, col2]`，
 * 高度即该条等高线的高程（由调用方按层高换算成三维坐标），
 * 这样算法层不需要知道三维坐标系，也方便单测。
 *
 * @param grid - 格网
 * @param interval - 等高距（米）
 * @param heights - 高度数组，默认 `grid.current`
 * @returns 扁平的线段数组，每 4 个数一条线段
 */
export function buildContourSegments(
  grid: TerrainGrid,
  interval: number,
  heights: Float32Array = grid.current
): Float32Array {
  const step = interval > 0 ? interval : 5
  const stride = grid.stride
  const out: number[] = []

  const pushPoint = (edge: number, row: number, col: number, t: number) => {
    // edge: 0 上, 1 右, 2 下, 3 左
    if (edge === 0) out.push(row, col + t)
    else if (edge === 1) out.push(row + t, col + 1)
    else if (edge === 2) out.push(row + 1, col + t)
    else out.push(row + t, col)
  }

  for (let row = 0; row < grid.segments; row++) {
    for (let col = 0; col < grid.segments; col++) {
      const a = row * stride + col
      const b = a + 1
      const c = a + stride
      const d = c + 1
      if (!(grid.inside[a] && grid.inside[b] && grid.inside[c] && grid.inside[d])) continue

      const ha = heights[a]
      const hb = heights[b]
      const hc = heights[c]
      const hd = heights[d]
      const lo = Math.min(ha, hb, hc, hd)
      const hi = Math.max(ha, hb, hc, hd)
      if (hi - lo < 1e-6) continue

      const first = Math.ceil(lo / step)
      const last = Math.floor(hi / step)
      for (let k = first; k <= last; k++) {
        const level = k * step
        if (level <= lo || level >= hi) continue
        const edges: number[] = []
        const addEdge = (e: number, h1: number, h2: number) => {
          if ((h1 < level && h2 >= level) || (h2 < level && h1 >= level)) {
            const t = (level - h1) / (h2 - h1)
            if (t >= 0 && t <= 1) edges.push(e, t)
          }
        }
        addEdge(0, ha, hb)
        addEdge(1, hb, hd)
        addEdge(2, hc, hd)
        addEdge(3, ha, hc)

        if (edges.length === 4) {
          pushPoint(edges[0], row, col, edges[1])
          pushPoint(edges[2], row, col, edges[3])
        } else if (edges.length >= 8) {
          // 鞍点：两段各自连接
          pushPoint(edges[0], row, col, edges[1])
          pushPoint(edges[2], row, col, edges[3])
          pushPoint(edges[4], row, col, edges[5])
          pushPoint(edges[6], row, col, edges[7])
        }
      }
    }
  }
  return new Float32Array(out)
}
