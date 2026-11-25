/**
 * 剖面分析的纯计算部分（无 Cesium 依赖，可在 Node 中单测）。
 *
 * 采样本身需要 Cesium 地形（在 `Analysis.createProfileAnalysis` 里完成），
 * 这里只负责：统计（最高/最低/平均/累计爬升下降）、图表数据整理、等距插值。
 */

/** 一个剖面采样点 */
export interface ProfileSample {
  /** 距起点的水平距离（米） */
  distance: number
  /** 高程（米） */
  height: number
  /** 经度（度） */
  lng: number
  /** 纬度（度） */
  lat: number
}

/** 剖面统计结果 */
export interface ProfileStats {
  /** 采样点数量 */
  count: number
  /** 最低高程（米） */
  minHeight: number
  /** 最高高程（米） */
  maxHeight: number
  /** 平均高程（米） */
  avgHeight: number
  /** 剖面总长度（米） */
  totalDistance: number
  /** 累计爬升（米，只累加上坡） */
  gain: number
  /** 累计下降（米，正数，只累加下坡） */
  loss: number
}

/** 统计剖面：空数组返回全 0 */
export function computeProfileStats(samples: ProfileSample[]): ProfileStats {
  if (!samples.length) {
    return {
      count: 0,
      minHeight: 0,
      maxHeight: 0,
      avgHeight: 0,
      totalDistance: 0,
      gain: 0,
      loss: 0
    }
  }

  let minHeight = Infinity
  let maxHeight = -Infinity
  let sum = 0
  let gain = 0
  let loss = 0

  for (let i = 0; i < samples.length; i++) {
    const height = samples[i].height
    if (height < minHeight) minHeight = height
    if (height > maxHeight) maxHeight = height
    sum += height
    if (i > 0) {
      const delta = height - samples[i - 1].height
      if (delta > 0) gain += delta
      else loss -= delta
    }
  }

  return {
    count: samples.length,
    minHeight,
    maxHeight,
    avgHeight: sum / samples.length,
    totalDistance: samples[samples.length - 1].distance,
    gain,
    loss
  }
}

/** 整理成图表可直接使用的 { 距离[], 高程[] } */
export function buildProfileChartData(samples: ProfileSample[]): {
  distance: number[]
  height: number[]
} {
  return {
    distance: samples.map((sample) => sample.distance),
    height: samples.map((sample) => sample.height)
  }
}

/**
 * 在起止经纬度之间等距插值出 count 个点（含端点）。
 * 用于「先按直线插值、再逐点采样地形」。
 */
export function interpolateLngLat(
  start: readonly [number, number],
  end: readonly [number, number],
  count: number
): Array<[number, number]> {
  const total = Math.max(2, Math.floor(count))
  const result: Array<[number, number]> = []
  for (let i = 0; i < total; i++) {
    const t = i / (total - 1)
    result.push([start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t])
  }
  return result
}
