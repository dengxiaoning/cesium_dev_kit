/**
 * 地形表面分析的纯计算部分（无 Cesium 依赖，可在 Node 中单测）。
 *
 * 采样（`globe.getHeight`）在 `Analysis` 里完成，这里只负责：
 * - 由东/西/南/北四点高程计算坡度与坡向；
 * - 方量对比（挖方 / 填方 / 净方量）；
 * - 点是否在多边形内（方量网格采样用）；
 * - 沿路径的视线通视判定（观察者 -> 各采样点，被中间地形遮挡则不可见）。
 */

/** 坡度 / 坡向计算输入：中心点与东西南北四个方向的高程 */
export interface SlopeAspectInput {
  /** 中心点高程（米） */
  center: number
  /** 东侧高程（米） */
  east: number
  /** 西侧高程（米） */
  west: number
  /** 北侧高程（米） */
  north: number
  /** 南侧高程（米） */
  south: number
  /** 东西向采样距离（米） */
  dx: number
  /** 南北向采样距离（米） */
  dy: number
}

export interface SlopeAspectResult {
  /** 坡度（度），0~90 */
  slopeDeg: number
  /** 坡向（度），0=北、90=东、180=南、270=西；平地返回 -1 */
  aspectDeg: number
  /** 下坡方向单位向量（x=东，y=北） */
  downhill: { x: number; y: number }
}

/**
 * 由四点高程计算坡度与坡向（下坡方向）。
 * 采用中心差分求梯度，`dx` / `dy` 为对应的水平采样距离（米）。
 */
export function computeSlopeAspect(input: SlopeAspectInput): SlopeAspectResult {
  const dx = input.dx > 0 ? input.dx : 1
  const dy = input.dy > 0 ? input.dy : 1

  // 梯度 dz/dx、dz/dy
  const gx = (input.east - input.west) / (2 * dx)
  const gy = (input.north - input.south) / (2 * dy)
  const gradMag = Math.hypot(gx, gy)
  const slopeDeg = (Math.atan(gradMag) * 180) / Math.PI

  if (gradMag < 1e-9) {
    return { slopeDeg, aspectDeg: -1, downhill: { x: 0, y: 0 } }
  }

  // 下坡方向 = -梯度
  const x = -gx / gradMag
  const y = -gy / gradMag
  let aspectDeg = (Math.atan2(x, y) * 180) / Math.PI // atan2(东, 北)
  if (aspectDeg < 0) aspectDeg += 360

  return { slopeDeg, aspectDeg, downhill: { x, y } }
}

/** 方量对比的单个采样单元 */
export interface VolumeCell {
  /** 该单元的地面高程（米） */
  height: number
  /** 该单元的面积（平方米） */
  area: number
}

export interface VolumeCompareResult {
  /** 挖方（m³，地面高于设计标高的部分） */
  cut: number
  /** 填方（m³，地面低于设计标高的部分） */
  fill: number
  /** 净方量 = cut - fill */
  net: number
  /** 总变动量 = cut + fill */
  total: number
}

/** 按设计标高统计挖方 / 填方 */
export function computeVolumeCompare(
  cells: VolumeCell[],
  designHeight: number
): VolumeCompareResult {
  let cut = 0
  let fill = 0
  for (const cell of cells) {
    const diff = cell.height - designHeight
    if (diff > 0) cut += diff * cell.area
    else fill += -diff * cell.area
  }
  return { cut, fill, net: cut - fill, total: cut + fill }
}

/** 经纬度点 */
export type LngLat = [number, number]

/**
 * 射线法判断点是否在多边形内（含边界的处理按奇偶规则）。
 * 多边形为 `[lng, lat]` 数组，首尾可不闭合。
 */
export function isPointInPolygon(point: LngLat, polygon: LngLat[]): boolean {
  const x = point[0]
  const y = point[1]
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0]
    const yi = polygon[i][1]
    const xj = polygon[j][0]
    const yj = polygon[j][1]
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/** 沿路径的单个采样点 */
export interface SightSample {
  /** 距观察点的水平距离（米） */
  distance: number
  /** 地面高程（米） */
  groundHeight: number
}

export interface SightlineOptions {
  /** 观察者眼睛离地高度（米），默认 0 */
  observerHeight?: number
  /** 目标点离地高度（米），默认 0 */
  targetHeight?: number
}

export interface SightlineResult {
  /** 每个采样点是否可见（第 0 个点即观察者，恒为可见） */
  visible: boolean[]
  /** 第一个被遮挡的采样点索引，-1 表示全程通视 */
  firstBlockerIndex: number
}

/**
 * 沿路径判断通视：观察者位于第一个采样点上方 `observerHeight`，
 * 目标为各采样点上方 `targetHeight`；若观察者到目标点的视线被中间地形挡住，则该点不可见。
 */
export function computeSightlineVisibility(
  samples: SightSample[],
  options: SightlineOptions = {}
): SightlineResult {
  const n = samples.length
  if (n === 0) return { visible: [], firstBlockerIndex: -1 }

  const observerHeight = options.observerHeight ?? 0
  const targetHeight = options.targetHeight ?? 0
  const visible: boolean[] = new Array(n).fill(true)
  let firstBlockerIndex = -1

  const eyeHeight = samples[0].groundHeight + observerHeight
  const eyeDistance = samples[0].distance

  for (let j = 1; j < n; j++) {
    const target = samples[j]
    const targetHeightAbs = target.groundHeight + targetHeight
    const span = target.distance - eyeDistance
    let blocked = false

    if (span > 0) {
      for (let k = 1; k < j; k++) {
        const t = (samples[k].distance - eyeDistance) / span
        const lineHeight = eyeHeight + (targetHeightAbs - eyeHeight) * t
        if (samples[k].groundHeight > lineHeight) {
          blocked = true
          break
        }
      }
    }

    visible[j] = !blocked
    if (blocked && firstBlockerIndex === -1) firstBlockerIndex = j
  }

  return { visible, firstBlockerIndex }
}

/** 坡向图表数据 */
export interface AspectChartSample {
  distance: number
  aspectDeg: number
  slopeDeg: number
}

export function buildAspectChartData(samples: AspectChartSample[]): {
  distance: number[]
  aspect: Array<number | null>
  slope: number[]
} {
  return {
    distance: samples.map((s) => s.distance),
    aspect: samples.map((s) => (s.aspectDeg >= 0 ? s.aspectDeg : null)),
    slope: samples.map((s) => s.slopeDeg)
  }
}

/** 方量对比图表数据 */
export interface VolumeCompareChartItem {
  designHeight: number
  cut: number
  fill: number
}

export function buildVolumeCompareChartData(items: VolumeCompareChartItem[]): {
  designHeights: number[]
  cut: number[]
  fill: number[]
} {
  return {
    designHeights: items.map((item) => item.designHeight),
    cut: items.map((item) => item.cut),
    fill: items.map((item) => item.fill)
  }
}
