/**
 * 地形编辑的「模板」：把常见工程造型一键铺到编辑范围上。
 *
 * 与底层的 {@link deformTerrain}（下沉 / 抬升 / 整平 / 平滑）相比，模板是**有语义的预设**：
 * 基坑、土堆、平台、坡道。其中前三个复用已有形变算法，坡道是按方向线性起坡的新算法。
 *
 * 纯计算，不依赖 Cesium / Three.js，可在 Node 里单测。
 */
import { deformTerrain, innerAverageHeight } from './terrainGrid'
import type { TerrainGrid } from './terrainGrid'

/** 地形模板类型 */
export type TerrainTemplateType = 'pit' | 'mound' | 'platform' | 'ramp'

/** 地形模板参数 */
export interface TerrainTemplateOptions {
  /** 模板类型 */
  type: TerrainTemplateType
  /** 基坑深度 / 土堆高度（米），默认 30 */
  depth?: number
  /** 台阶高度（米），0 表示平滑过渡，默认 0 */
  stepHeight?: number
  /** 平台目标标高（米）；`platform` 用，不传取内圈平均高度 */
  targetHeight?: number
  /** 坡道方向（度，0=北、90=东），默认 0 */
  direction?: number
  /** 坡道起点标高（米），不传按该侧地形自动取 */
  startHeight?: number
  /** 坡道终点标高（米），不传按该侧地形自动取 */
  endHeight?: number
}

/**
 * 把模板应用到格网，返回新的高度数组（不修改传入的格网）。
 *
 * @param grid - 编辑格网
 * @param options - 模板类型与参数
 * @returns 新的高度数组（长度 = `grid.vertexCount`）
 * @example
 * terrainEdit.applyTemplate({ type: 'pit', depth: 60, stepHeight: 6 })
 */
export function applyTerrainTemplate(
  grid: TerrainGrid,
  options: TerrainTemplateOptions
): Float32Array {
  if (!grid) throw new Error('applyTerrainTemplate: 缺少格网')
  const type = options && options.type
  if (type === 'pit') {
    return deformTerrain(grid, {
      mode: 'sink',
      depth: options.depth ?? 30,
      stepHeight: options.stepHeight ?? 0
    })
  }
  if (type === 'mound') {
    return deformTerrain(grid, {
      mode: 'raise',
      depth: options.depth ?? 30,
      stepHeight: options.stepHeight ?? 0
    })
  }
  if (type === 'platform') {
    return deformTerrain(grid, {
      mode: 'flatten',
      depth: 0,
      flattenHeight: options.targetHeight
    })
  }
  if (type === 'ramp') {
    return applyRamp(grid, options)
  }
  throw new Error(`未知的地形模板：${String(type)}`)
}

/**
 * 沿指定方向按线性坡度起坡。
 *
 * 用「到中心线方向轴」的归一化投影 `t∈[0,1]` 作为插值因子，两端标高默认取该侧地形均值，
 * 因此坡道天然衔接两侧地面；再用格网权重 `w` 在边界羽化，边缘不会出现断崖。
 */
function applyRamp(grid: TerrainGrid, options: TerrainTemplateOptions): Float32Array {
  const b = grid.bounds
  const dir = ((options.direction ?? 0) * Math.PI) / 180
  const dx = Math.sin(dir) // 东向分量
  const dy = Math.cos(dir) // 北向分量
  const cx = (b.minLng + b.maxLng) / 2
  const cy = (b.minLat + b.maxLat) / 2
  const halfSpan =
    Math.max(
      1e-12,
      (Math.abs(dx) * (b.maxLng - b.minLng) + Math.abs(dy) * (b.maxLat - b.minLat)) / 2
    ) || 1e-12

  const ts = new Float32Array(grid.vertexCount)
  for (let i = 0; i < grid.vertexCount; i++) {
    const row = Math.floor(i / grid.stride)
    const col = i % grid.stride
    const lng = b.minLng + col * grid.dLng
    const lat = b.minLat + row * grid.dLat
    const raw = ((lng - cx) * dx + (lat - cy) * dy) / halfSpan
    ts[i] = Math.max(0, Math.min(1, raw * 0.5 + 0.5))
  }

  const startH =
    options.startHeight ?? averageInRange(grid, ts, 0, 0.12) ?? innerAverageHeight(grid, grid.current)
  const endH =
    options.endHeight ?? averageInRange(grid, ts, 0.88, 1) ?? innerAverageHeight(grid, grid.current)

  const next = new Float32Array(grid.current)
  for (let i = 0; i < grid.vertexCount; i++) {
    const w = grid.weight[i]
    if (w <= 0) continue
    const target = startH + (endH - startH) * ts[i]
    next[i] = grid.current[i] + (target - grid.current[i]) * w
  }
  return next
}

/** 取 `ts` 落在 [lo, hi] 范围内的内部顶点平均高度；无顶点时返回 null */
function averageInRange(
  grid: TerrainGrid,
  ts: Float32Array,
  lo: number,
  hi: number
): number | null {
  let sum = 0
  let count = 0
  for (let i = 0; i < grid.vertexCount; i++) {
    if (!grid.inside[i]) continue
    if (ts[i] < lo || ts[i] > hi) continue
    sum += grid.current[i]
    count++
  }
  return count ? sum / count : null
}
