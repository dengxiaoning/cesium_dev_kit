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
  /**
   * 是否填平「被包住」的内部空洞，默认 `true`。
   *
   * 手绘多边形一旦折返/自交，射线法的奇偶规则会把交点附近的一小块判成外部，
   * 那一小块既没有网格面、笔刷也刷不到，沉下去之后就像原地面从坑底顶了出来。
   * 编辑区本身是连续的，内部镂空只会是误判，所以默认补成实心。
   */
  fillHoles?: boolean
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
 * 取 0 表示**不限制**：调用方（`TerrainEdit`）在按住左键期间会按节拍持续施加，
 * 深度由「按住多久」决定，松开即停，与地形软件一致。
 * 需要「一刀最多挖多深」的保护时再显式传正数。
 */
const DEFAULT_STROKE_LIMIT = 0

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
 * 填平「被包住」的内部空洞（就地改 `inside`）。
 *
 * 画多边形时手一抖折返一下，就有两段边相交；射线法的奇偶规则会把交点旁边
 * 的一小块判成「外部」。这一小块在格网里没有面、笔刷也刷不到，位置又在编辑区中间，
 * 于是下沉之后它原地不动，看起来就像**原地面从坑底顶穿了叠加层**。
 *
 * 编辑区是连续的，内部镂空只可能是误判，所以做法很直接：从格网四条边上的外部顶点
 * 做 4 邻域洪水填充，凡是灌不到的非 inside 顶点，就是被包住的洞，一律补成 inside。
 *
 * @param inside - 掩膜（1 = 在编辑区内），会被就地修改
 * @param stride - 每边顶点数
 * @returns 本次补上的顶点掩膜（1 = 新补的），供调用方补距离/权重
 * @example
 * const filled = fillEnclosedHoles(grid.inside, grid.stride)
 * filled.forEach((v, i) => { if (v) grid.weight[i] = 1 })
 */
export function fillEnclosedHoles(inside: Uint8Array, stride: number): Uint8Array {
  const filledMask = new Uint8Array(inside.length)
  if (stride < 3) return filledMask

  // outside：从边界能灌到的真正外部。用定长队列而不是数组 shift，16 万顶点也不掉速
  const outside = new Uint8Array(inside.length)
  const queue = new Int32Array(inside.length)
  let head = 0
  let tail = 0
  const push = (index: number) => {
    if (inside[index] || outside[index]) return
    outside[index] = 1
    queue[tail++] = index
  }

  for (let col = 0; col < stride; col++) {
    push(col)
    push((stride - 1) * stride + col)
  }
  for (let row = 0; row < stride; row++) {
    push(row * stride)
    push(row * stride + stride - 1)
  }

  while (head < tail) {
    const index = queue[head++]
    const row = (index / stride) | 0
    const col = index - row * stride
    if (row > 0) push(index - stride)
    if (row < stride - 1) push(index + stride)
    if (col > 0) push(index - 1)
    if (col < stride - 1) push(index + 1)
  }

  for (let i = 0; i < inside.length; i++) {
    if (inside[i] || outside[i]) continue
    inside[i] = 1
    filledMask[i] = 1
  }
  return filledMask
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

  // 自交/折返多边形会在内部留下「被包住」的空洞：补成实心，
  // 否则那块地方既没面也刷不动，下沉后就是一块顶着原地面的孤岛。
  if (options.fillHoles !== false) {
    const filled = fillEnclosedHoles(inside, stride)
    for (let i = 0; i < vertexCount; i++) {
      if (!filled[i]) continue
      // 补出来的点属于内圈：给满权重，不再羽化（否则坑底会留一圈台阶）
      distance[i] = slopeWidth
      weight[i] = 1
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

/**
 * 二维值噪声（格点散列 + 平滑插值），返回 0~1。
 *
 * 比 Perlin 便宜、够用，关键是**同一坐标永远返回同一个值**：
 * 笔刷的边角就是靠这个「按世界坐标取样」，才能反复按住加深时图案不抖动、不爬动。
 * @param x - 采样点 x（任意实数，内部按整格取散列）
 * @param y - 采样点 y
 */
export function valueNoise2(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  // 五次平滑会比线性插值少一层「方格感」，这里用三次就够，省一次乘法
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2d(xi, yi)
  const b = hash2d(xi + 1, yi)
  const c = hash2d(xi, yi + 1)
  const d = hash2d(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
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

/**
 * 平整核心占笔刷半径的比例（默认值）。
 *
 * 这是「刷出来是平台还是碗」的分水岭：核心圈内权重恒为 1，一圈刷下去
 * 高度**恰好等于目标标高**，所以坑底是真正的平面；核心到笔刷外沿那一圈
 * 才做过渡，形成一道有坡折的壁。
 *
 * 取 0.9：平台几乎铺满整个笔刷，过渡带只剩边缘薄薄一圈。
 * 早期取 0（整圆软衰减）时，随便一刷就是个碗；取 0.5 也还是宽缓的斜面，
 * 台阶在斜光下根本立不起来。
 */
const DEFAULT_BRUSH_CORE = 0.9

/**
 * 过渡带宽度相对台阶落差的倍数。
 *
 * 壁的宽度跟着「一级多高」走，而不是跟着笔刷半径走：4 米一级的台面，
 * 立面就该只有几米宽，这样斜看才有台阶感；如果按半径比例给宽度，
 * 4 米落差摊到几十米上，就退化成缓坡了。
 */
const BRUSH_WALL_PER_STEP = 0.9

/**
 * 边缘不规则度默认值。
 *
 * 平台的核心圈用噪声轻微掰一下，坑口轮廓才不是「圆规画出来的」。
 * 幅度压得比早期版本小：真正让边缘清楚的是一刀切平的标高，
 * 噪声只是把这条边揉得不那么规整，不需要靠它来「显形」。
 */
const DEFAULT_BRUSH_ROUGHNESS = 0.28

/** 坡面安息角（度）：陡壁靠塌方收成这个角度，再陡就削 */
const DEFAULT_REPOSE_DEG = 34

/**
 * 每次施加向目标标高推进的比例（默认值）。
 *
 * 取 1（一步压到位）是有意的：只要比例小于 1，核心圈内每个顶点推进的绝对量
 * 就依赖它自己原来的高度，一圈刷下来只是把原地形**整体压低一点**，
 * 还是那张曲面的缩放版 —— 看着「糊」的根源就在这儿。压到 1 才有真正的平面。
 */
const DEFAULT_BRUSH_RATE = 1

export interface TerrainBrushOptions {
  mode: TerrainBrushMode
  /** 笔刷中心经度 */
  lng: number
  /** 笔刷中心纬度 */
  lat: number
  /** 笔刷半径（米） */
  radius: number
  /**
   * 向目标标高推进的比例 0~1，默认 1（一步压到位）。
   *
   * 小于 1 时核心圈内每个顶点只推进自己剩余高差的一部分，一圈刷下来
   * 只是把原曲面整体压低一点，坑底永远不是平的 —— 视觉上就是「糊」。
   * 需要软笔触请用 `mode: 'smooth'`，不要靠调低这个值。
   */
  strength?: number
  /**
   * 平整核心占半径的比例 0~1，默认 0.9。
   *
   * 核心圈内高度被压到**同一个标高**，核心外只剩薄薄一圈线性过渡带 ——
   * 于是一次落笔就是「平底 + 直壁 + 两道清楚的坡折」，而不是一个圆碗。
   * 过渡带宽度跟台阶落差走（见 `BRUSH_WALL_PER_STEP`），不跟半径走。
   */
  hardness?: number
  /**
   * 坑口不规则度 0~1，默认 0.28。
   *
   * 用世界坐标的值噪声轻微掰动有效半径，坑沿因此有折角、不是标准圆。
   * 噪声按世界坐标取样，同一处反复按住加深图案固定，不会抖动或跟着指针爬。
   */
  roughness?: number
  /**
   * 一级台阶的落差（米），默认 4。
   *
   * 未显式给 `targetHeight` 时，目标标高按「脚下高度 - 一级」对齐到台阶标高上，
   * 所以反复落笔会落在同一套标高上，台阶能接得上。
   */
  maxDelta?: number
  /**
   * 目标标高（米）。给了就一直往这个标高压（整条笔画可以锁同一个值），
   * 不给则按 `maxDelta` 自动取下一级。
   */
  targetHeight?: number
  /** 坡面安息角（度），默认 34：比这更陡的壁按塌方削成斜坡 */
  reposeDeg?: number
  /**
   * 本笔开始时的格网高度快照。
   *
   * 只在设置了 `strokeLimit > 0` 时用于夹紧单点累计改动；默认不限制，
   * 依靠调用方「指针移动时按路径施加、停住时按节拍施加」来控制手感。
   */
  strokeBase?: Float32Array | null
  /**
   * 一笔之内同一位置最多叠加几次，默认 0（不限制）。
   *
   * 正常笔刷留空即可：按住左键会持续加深，松开才停。
   * 传正数时单点累计改动被夹在 `±maxDelta × strokeLimit` 以内。
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
  /** 本次施加的目标标高（米） */
  target: number
  /**
   * 平整核心内「离目标标高的最大差距」（米）。
   *
   * 默认 `strength = 1` 时恒为 0（一步压平）；只有刻意调低强度才会大于 0，
   * 调用方可据此判断这一级是否压到位、要不要继续推进。
   */
  gap: number
}

/**
 * 把高度对齐到台阶标高上。
 *
 * `dir = -1` 取下一级（下沉）、`1` 取上一级（抬升）。绝对标高对齐的好处是
 * 每一笔都落在同一套标高上，两笔之间的台阶能接得住，不会错半级。
 * @param height - 当前高度（米）
 * @param step - 台阶落差（米）
 * @param dir - 方向：-1 向下一级，1 向上一级
 */
export function benchHeight(height: number, step: number, dir: -1 | 1): number {
  if (!(step > 0)) return height
  return dir < 0 ? Math.floor(height / step) * step : Math.ceil(height / step) * step
}

/**
 * 取格网上任意点的双线性高度。
 *
 * 笔刷的「这一级从哪儿起」必须按**落笔处**的真实地面算，而不是最近顶点：
 * 否则在缓坡上刷，参考高度会一跳一跳，台阶就乱了。
 * @param grid - 格网
 * @param lng - 经度
 * @param lat - 纬度
 */
export function brushCenterHeight(
  grid: TerrainGrid,
  lng: number,
  lat: number,
  heights: Float32Array = grid.current
): number {
  const { bounds, stride, segments } = grid
  const current = heights
  if (segments < 1) return current[0] || 0
  const fx = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * segments
  const fy = ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * segments
  const col = Math.max(0, Math.min(segments - 1, Math.floor(fx)))
  const row = Math.max(0, Math.min(segments - 1, Math.floor(fy)))
  const tx = clamp(fx - col, 0, 1)
  const ty = clamp(fy - row, 0, 1)
  const i00 = row * stride + col
  const a = current[i00] * (1 - tx) + current[i00 + 1] * tx
  const b = current[i00 + stride] * (1 - tx) + current[i00 + stride + 1] * tx
  return a * (1 - ty) + b * ty
}

/**
 * 按安息角把陡壁塌成斜坡（就地改高度，只削不填 / 只填不削）。
 *
 * 为什么要这一步：平台一旦挖深，坑壁迟早会收成一道近乎垂直的面，
 * 从斜角看就像在地面上开的方孔，不像被挖出来的坑。真实土石方会塌到
 * 安息角附近，于是坑沿长出一圈**直的斜面**，斜面和平台交界处留下一道硬坡折 ——
 * 这正是「台阶看得出来」的光学来源（明暗在折点处突变）。
 *
 * 做法是「限坡侵蚀」：相邻两点高差不能超过 `maxDrop`（= 单元边长 × tan(安息角)），
 * 超了就把高的一侧削到只高出 `maxDrop`。只削不填，坑底就不会被塌下来的土抬回去。
 * 从笔刷改动过的点出发，正反两个方向扫几遍，坡就会一格一格往外铺开；
 * 没被碰过的格子不参与 —— 地块里天然的陡崖不会被顺手削平。
 *
 * @param grid - 格网
 * @param rect - 参与计算的格网范围（笔刷外接框 + 塌方坡长度）
 * @param seeds - 本次被笔刷改动的顶点索引（塌方的起点）
 * @param maxDrop - 相邻两点允许的最大高差（米）
 * @param fill - true 表示抬升模式：往低处填，形成土堆的斜坡
 * @param maxDist - 扩散半径上限（米），超过就不再塌
 * @param cx - 笔刷中心经度
 * @param cy - 笔刷中心纬度
 * @param mLng - 每经度米数
 * @param passes - 扫描遍数（一遍 = 正向 + 反向），越大坡铺得越远
 */
function relaxTalus(
  grid: TerrainGrid,
  rect: { minRow: number; maxRow: number; minCol: number; maxCol: number },
  seeds: number[],
  maxDrop: number,
  fill: boolean,
  maxDist: number,
  cx: number,
  cy: number,
  mLng: number,
  passes: number
): { minRow: number; maxRow: number; minCol: number; maxCol: number; changed: number } {
  const stride = grid.stride
  const current = grid.current
  const b = grid.bounds
  const row0 = Math.max(0, rect.minRow)
  const row1 = Math.min(stride - 1, rect.maxRow)
  const col0 = Math.max(0, rect.minCol)
  const col1 = Math.min(stride - 1, rect.maxCol)
  const width = col1 - col0 + 1
  const height = row1 - row0 + 1
  const empty = { minRow: row0, maxRow: row1, minCol: col0, maxCol: col1, changed: 0 }
  if (width < 2 || height < 2) return empty

  // touched：这批坡属于本次笔刷，只有它们之间的高差才需要削。
  // 用外接框大小的掩膜，避免每次落笔都分配一张全格网的数组。
  const touched = new Uint8Array(width * height)
  for (let k = 0; k < seeds.length; k++) {
    const i = seeds[k]
    const row = (i / stride) | 0
    const col = i - row * stride
    if (row < row0 || row > row1 || col < col0 || col > col1) continue
    touched[(row - row0) * width + (col - col0)] = 1
  }

  const dist2 = maxDist * maxDist
  let changed = 0
  let minRow = Infinity
  let maxRow = -Infinity
  let minCol = Infinity
  let maxCol = -Infinity

  /** 用邻点 (r2,c2) 去削 / 填 (r,c) */
  const relax = (r: number, c: number, r2: number, c2: number) => {
    const i = r * stride + c
    const j = r2 * stride + c2
    if (!grid.inside[i]) return
    const ti = (r - row0) * width + (c - col0)
    const tj = (r2 - row0) * width + (c2 - col0)
    if (!touched[ti] && !touched[tj]) return
    const hi = current[i]
    const hj = current[j]
    if (!fill) {
      if (hi - hj <= maxDrop) return
      if (maxDist > 0) {
        const dx = (b.minLng + c * grid.dLng - cx) * mLng
        const dz = (b.minLat + r * grid.dLat - cy) * METERS_PER_DEG_LAT
        if (dx * dx + dz * dz > dist2) return
      }
      current[i] = hj + maxDrop
    } else {
      if (hj - hi <= maxDrop) return
      if (maxDist > 0) {
        const dx = (b.minLng + c * grid.dLng - cx) * mLng
        const dz = (b.minLat + r * grid.dLat - cy) * METERS_PER_DEG_LAT
        if (dx * dx + dz * dz > dist2) return
      }
      current[i] = hj - maxDrop
    }
    touched[ti] = 1
    changed++
    if (r < minRow) minRow = r
    if (r > maxRow) maxRow = r
    if (c < minCol) minCol = c
    if (c > maxCol) maxCol = c
  }

  for (let pass = 0; pass < passes; pass++) {
    // 正向：用「上 / 左」邻居削，坡往下、往右推进
    for (let r = row0; r <= row1; r++) {
      for (let c = col0; c <= col1; c++) {
        if (r > row0) relax(r, c, r - 1, c)
        if (c > col0) relax(r, c, r, c - 1)
      }
    }
    // 反向：用「下 / 右」邻居削，坡往上、往左推进
    for (let r = row1; r >= row0; r--) {
      for (let c = col1; c >= col0; c--) {
        if (r < row1) relax(r, c, r + 1, c)
        if (c < col1) relax(r, c, r, c + 1)
      }
    }
  }

  if (!changed) return empty
  return { minRow, maxRow, minCol, maxCol, changed }
}

/**
 * 在格网上落一笔笔刷，就地修改 `grid.current`。
 *
 * 形变模型是「**目标标高**」而不是「按权重减一个量」：
 * 核心圈内权重恒为 1，一圈刷下去高度恰好等于目标标高 —— 坑底是真正的平面；
 * 核心外一圈带子线性过渡，于是坑壁是直的斜面，坑底与坑壁之间、坑壁与原地表
 * 之间各有一道硬坡折。这就是「该平的平、该陡的陡」的来源；
 * 按 `w × maxDelta` 逐次减量永远只能得到一阶导连续的曲面，也就是光滑的碗。
 *
 * 超过安息角的陡壁会被 `relaxTalus` 塌成斜坡，坑沿因此长出一圈塌方坡。
 *
 * 核心圈内是**绝对标高**而不是「相对高度减一个量」：斜坡上刷出来的也是水平面，
 * 不会顺着原地形留一层起伏；这正是「该平的平」的来源。
 *
 * @param grid - 目标格网
 * @param options - 笔刷参数
 * @returns 受影响的格网范围；完全没落在格网内时返回 `null`
 */
export function applyBrush(grid: TerrainGrid, options: TerrainBrushOptions): TerrainBrushImpact | null {
  const mode = options.mode
  const radius = Math.max(0.5, options.radius)
  const strength = clamp(options.strength ?? DEFAULT_BRUSH_RATE, 0.01, 1)
  const step = Math.max(0.01, options.maxDelta ?? 4)
  const hardness = clamp(options.hardness ?? DEFAULT_BRUSH_CORE, 0, 0.95)
  const poseDeg = clamp(options.reposeDeg ?? DEFAULT_REPOSE_DEG, 5, 80)
  /** 一笔内允许叠加几次：0 表示不限制，上限 500 防止误传天文数字 */
  const strokeLimit = Math.max(0, Math.min(500, options.strokeLimit ?? DEFAULT_STROKE_LIMIT))

  const mLng = metersPerDegLng(options.lat)
  // 边缘棱角：用世界坐标噪声轻微掰动有效半径，坑口才有折角。
  // 幅度比早期版本收敛很多 —— 让边缘「显形」的是标高平台，不是噪声。
  const roughness = mode === 'smooth' ? 0 : clamp(options.roughness ?? DEFAULT_BRUSH_ROUGHNESS, 0, 1)
  const cellM = Math.max(grid.dLat * METERS_PER_DEG_LAT, Math.abs(grid.dLng) * mLng) || 1
  // 波长跟笔刷大小走，但不小于约 2.4 个格网：比格网还细就只剩噪点，看不出「棱角」
  const lobeWave = Math.max(radius * 0.55, cellM * 2.4)
  const grainWave = Math.max(radius * 0.38, cellM * 3.5)
  const rough = roughness > 0

  // 过渡带（立面）宽度：跟着台阶落差走，最少也得有半个格网，不然网格表达不出来
  const skirt = clamp(
    Math.max(step * BRUSH_WALL_PER_STEP, cellM * 0.6),
    cellM * 0.45,
    radius * 0.35
  )
  // 平台半径：硬边比例压出来的核心圈，但必须给过渡带留出位置。
  // 平滑模式没有「平台」，仍是整圆软衰减，只是过渡更缓。
  const isSmooth = mode === 'smooth'
  const coreR = isSmooth ? 0 : Math.min(radius * hardness, radius - skirt)
  const outerR = isSmooth ? radius : coreR + skirt
  const scanRadius = outerR * (1 + roughness * 0.55)

  const radiusDegLng = scanRadius / mLng
  const radiusDegLat = scanRadius / METERS_PER_DEG_LAT
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

  // 目标标高：显式给了就用它（整条笔画锁同一个标高，拖出来才是平底沟槽），
  // 没给就按落笔处高度自动取「下一级 / 上一级」台阶。
  const centerH = brushCenterHeight(grid, options.lng, options.lat)
  let target = options.targetHeight
  if (target == null || !Number.isFinite(target)) {
    if (mode === 'lower') target = benchHeight(centerH - step, step, -1)
    else if (mode === 'raise') target = benchHeight(centerH + step, step, 1)
    else target = centerH
  }
  const targetHeight = target as number

  let changed = 0
  let gap = 0
  const seeds: number[] = []

  for (let row = row0; row <= row1; row++) {
    const lat = b.minLat + row * grid.dLat
    const dz = (lat - options.lat) * METERS_PER_DEG_LAT
    for (let col = col0; col <= col1; col++) {
      const index = row * grid.stride + col
      if (!grid.inside[index]) continue
      const lng = b.minLng + col * grid.dLng
      const dx = (lng - options.lng) * mLng
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist > scanRadius) continue

      let rEff = radius
      if (rough) {
        // 采样用绝对经纬度换算的米，而不是「相对笔心的偏移」：
        // 前者图案固定在地图上，按住不动反复加深也不会抖；后者会跟着指针爬，看着像沸腾。
        const px = lng * mLng
        const pz = lat * METERS_PER_DEG_LAT
        const n1 = valueNoise2(px / lobeWave, pz / lobeWave)
        const lobe = (n1 - 0.5) * 2
        const notch = 1 - Math.abs(lobe)
        const grain = (valueNoise2(px / grainWave + 37.2, pz / grainWave + 11.9) - 0.5) * 2
        rEff = radius * (1 + roughness * (0.3 * lobe - 0.16 * notch * notch + 0.22 * grain))
      }

      if (dist > rEff) continue
      // 核心圈恒 1（压到绝对平），过渡带线性收边（直的立面）：
      // 不用 smoothstep —— 它在两端斜率为 0，坑底和坑沿都会被抹圆，坡折就没了。
      const w = isSmooth ? clamp(1 - dist / rEff, 0, 1) : clamp((outerR - dist) / skirt, 0, 1)
      if (w <= 0) continue

      const h = grid.current[index]
      let next: number
      if (mode === 'smooth') {
        // 平滑：向 3x3 邻域均值靠拢，权重太大会直接把细节抹平，这里额外压一下
        const avg = neighborAverage(grid, row, col)
        next = h + (avg - h) * clamp(w * 1.4, 0, 1)
      } else {
        // 直接压到目标标高，不做「只挖不填」的方向裁剪：
        // 一旦裁剪，斜坡上比目标更低的半边会留着原地面，平台就不再平了。
        // 目标标高本身按「脚下高度 ± 一级」取，所以整笔仍是朝一个方向推进。
        next = h + (targetHeight - h) * w * strength
        // 核心圈的高度差就是「这一级压平了没有」，调用方据此逐级下沉
        if (w >= 1) {
          const d = Math.abs(next - targetHeight)
          if (d > gap) gap = d
        }
      }

      // 本笔累计上限：默认不限制（strokeLimit = 0），按住会一直累加；
      // 只有显式传了正数才夹在 strokeBase ±（单次幅度 × 次数）内。
      const sb = options.strokeBase
      if (sb && strokeLimit > 0) {
        const span = step * strokeLimit
        if (next > sb[index] + span) next = sb[index] + span
        else if (next < sb[index] - span) next = sb[index] - span
      }
      if (next !== h) {
        grid.current[index] = next
        changed++
        seeds.push(index)
      }
    }
  }

  let minRow = row0
  let maxRow = row1
  let minCol = col0
  let maxCol = col1

  // 陡壁塌到安息角：抬升模式是往下填（土堆），其余是往上削（坑壁）
  if (mode !== 'smooth' && seeds.length) {
    const repose = Math.tan((poseDeg * Math.PI) / 180)
    const maxDrop = Math.max(0.05, cellM * repose)
    // 塌方坡要够长：挖得越深，坑沿那一圈塌方坡就越往外铺。
    // 按「落差 ÷ tan(安息角)」估坡长，再给两级格网的余量；上限压到 3 倍半径，
    // 免得某一笔把整个地块都当成坡削平了。
    // 深度按「原地形中心高度」算，而不是按本笔的落差：坑是一层层挖下去的，
    // 塌方坡的长度要跟**总深度**走，否则每一笔都把上一笔的坡当成越界给截断。
    const baseCenter = brushCenterHeight(grid, options.lng, options.lat, grid.base)
    const depth = Math.abs(baseCenter - targetHeight)
    const talusDist = Math.min(radius * 3, radius + depth / repose + cellM * 2)
    const spread = Math.ceil(talusDist / cellM) + 1
    const talus = relaxTalus(
      grid,
      {
        minRow: row0 - spread,
        maxRow: row1 + spread,
        minCol: col0 - spread,
        maxCol: col1 + spread
      },
      seeds,
      maxDrop,
      mode === 'raise',
      talusDist,
      options.lng,
      options.lat,
      mLng,
      // 坡要往上铺到自然地面：一遍推进会有一格，按需要的格数给遍数，封顶 12 遍
      Math.max(2, Math.min(12, Math.ceil(depth / maxDrop) + 1))
    )
    if (talus.changed > 0) {
      changed += talus.changed
      if (talus.minRow < minRow) minRow = talus.minRow
      if (talus.maxRow > maxRow) maxRow = talus.maxRow
      if (talus.minCol < minCol) minCol = talus.minCol
      if (talus.maxCol > maxCol) maxCol = talus.maxCol
    }
  }

  return { minRow, maxRow, minCol, maxCol, changed, target: targetHeight, gap }

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
