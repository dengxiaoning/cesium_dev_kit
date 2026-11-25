import { describe, it, expect } from 'vitest'
import {
  computeProfileStats,
  buildProfileChartData,
  interpolateLngLat
} from '../src/utils/cesiumPluginsExtends/libs/analysis/profile'

describe('profile 纯计算', () => {
  it('空数组返回全 0', () => {
    expect(computeProfileStats([])).toEqual({
      count: 0,
      minHeight: 0,
      maxHeight: 0,
      avgHeight: 0,
      totalDistance: 0,
      gain: 0,
      loss: 0
    })
  })

  it('统计最高 / 最低 / 平均 / 累计爬升 / 累计下降', () => {
    const samples = [
      { distance: 0, height: 100, lng: 0, lat: 0 },
      { distance: 10, height: 130, lng: 0, lat: 0 },
      { distance: 20, height: 110, lng: 0, lat: 0 },
      { distance: 30, height: 150, lng: 0, lat: 0 }
    ]
    const stats = computeProfileStats(samples)
    expect(stats.count).toBe(4)
    expect(stats.minHeight).toBe(100)
    expect(stats.maxHeight).toBe(150)
    expect(stats.avgHeight).toBe(122.5)
    expect(stats.totalDistance).toBe(30)
    expect(stats.gain).toBe(70) // +30 +40
    expect(stats.loss).toBe(20) // -20
  })

  it('单点：最高=最低=平均，爬升下降为 0', () => {
    const stats = computeProfileStats([{ distance: 0, height: 50, lng: 0, lat: 0 }])
    expect(stats).toMatchObject({
      count: 1,
      minHeight: 50,
      maxHeight: 50,
      avgHeight: 50,
      gain: 0,
      loss: 0
    })
  })

  it('buildProfileChartData 拆成 x / y', () => {
    const data = buildProfileChartData([
      { distance: 0, height: 1, lng: 0, lat: 0 },
      { distance: 5, height: 2, lng: 0, lat: 0 }
    ])
    expect(data).toEqual({ distance: [0, 5], height: [1, 2] })
  })

  it('interpolateLngLat 含端点且等距', () => {
    expect(interpolateLngLat([0, 0], [10, 10], 3)).toEqual([
      [0, 0],
      [5, 5],
      [10, 10]
    ])
  })

  it('interpolateLngLat 至少返回 2 个点', () => {
    expect(interpolateLngLat([0, 0], [10, 10], 1).length).toBe(2)
  })
})
