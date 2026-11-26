import { describe, it, expect } from 'vitest'
import {
  computeSlopeAspect,
  computeVolumeCompare,
  isPointInPolygon,
  computeSightlineVisibility,
  buildAspectChartData,
  buildVolumeCompareChartData
} from '../src/utils/cesiumPluginsExtends/libs/analysis/terrainSurface'

describe('computeSlopeAspect', () => {
  const base = { center: 100, dx: 10, dy: 10 }

  it('平地：坡度 0，坡向 -1', () => {
    const r = computeSlopeAspect({ ...base, east: 100, west: 100, north: 100, south: 100 })
    expect(r.slopeDeg).toBe(0)
    expect(r.aspectDeg).toBe(-1)
  })

  it('向东下坡：坡向 90°，坡度 45°', () => {
    const r = computeSlopeAspect({ ...base, east: 90, west: 110, north: 100, south: 100 })
    expect(r.slopeDeg).toBeCloseTo(45, 5)
    expect(r.aspectDeg).toBeCloseTo(90, 5)
  })

  it('向北下坡：坡向 0°', () => {
    const r = computeSlopeAspect({ ...base, east: 100, west: 100, north: 90, south: 110 })
    expect(r.aspectDeg).toBeCloseTo(0, 5)
  })

  it('向南下坡：坡向 180°', () => {
    const r = computeSlopeAspect({ ...base, east: 100, west: 100, north: 110, south: 90 })
    expect(r.aspectDeg).toBeCloseTo(180, 5)
  })

  it('向西下坡：坡向 270°', () => {
    const r = computeSlopeAspect({ ...base, east: 110, west: 90, north: 100, south: 100 })
    expect(r.aspectDeg).toBeCloseTo(270, 5)
  })
})

describe('computeVolumeCompare', () => {
  it('挖填相等时净方量为 0', () => {
    const r = computeVolumeCompare(
      [
        { height: 110, area: 10 },
        { height: 90, area: 10 }
      ],
      100
    )
    expect(r.cut).toBe(100)
    expect(r.fill).toBe(100)
    expect(r.net).toBe(0)
    expect(r.total).toBe(200)
  })

  it('全部高于设计标高：只有挖方', () => {
    const r = computeVolumeCompare([{ height: 120, area: 5 }], 100)
    expect(r.cut).toBe(100)
    expect(r.fill).toBe(0)
    expect(r.net).toBe(100)
  })

  it('空数组返回全 0', () => {
    expect(computeVolumeCompare([], 100)).toEqual({ cut: 0, fill: 0, net: 0, total: 0 })
  })
})

describe('isPointInPolygon', () => {
  const square: Array<[number, number]> = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10]
  ]

  it('内部点为 true', () => {
    expect(isPointInPolygon([5, 5], square)).toBe(true)
    expect(isPointInPolygon([0.5, 0.5], square)).toBe(true)
  })

  it('外部点为 false', () => {
    expect(isPointInPolygon([15, 5], square)).toBe(false)
    expect(isPointInPolygon([-1, 5], square)).toBe(false)
  })
})

describe('computeSightlineVisibility', () => {
  it('平坦路径全程通视', () => {
    const r = computeSightlineVisibility([
      { distance: 0, groundHeight: 0 },
      { distance: 10, groundHeight: 0 },
      { distance: 20, groundHeight: 0 }
    ])
    expect(r.visible).toEqual([true, true, true])
    expect(r.firstBlockerIndex).toBe(-1)
  })

  it('中间地形凸起会遮挡后续点', () => {
    const r = computeSightlineVisibility([
      { distance: 0, groundHeight: 0 },
      { distance: 10, groundHeight: 100 },
      { distance: 20, groundHeight: 0 }
    ])
    expect(r.visible[2]).toBe(false)
    expect(r.firstBlockerIndex).toBe(2)
  })

  it('抬高观察者眼睛高度可越过遮挡', () => {
    const samples = [
      { distance: 0, groundHeight: 0 },
      { distance: 10, groundHeight: 6 },
      { distance: 20, groundHeight: 0 }
    ]
    // 视线从 (0,10) 到 (20,0)，在 x=10 处高度为 5，地形 6 > 5 -> 被挡
    const blocked = computeSightlineVisibility(samples, { observerHeight: 10 })
    expect(blocked.visible[2]).toBe(false)

    // 再抬高观察者，视线在 x=10 处高度 12，地形 6 < 12 -> 可见
    const visible = computeSightlineVisibility(samples, { observerHeight: 24 })
    expect(visible.visible[2]).toBe(true)
  })

  it('空数组返回空结果', () => {
    expect(computeSightlineVisibility([])).toEqual({ visible: [], firstBlockerIndex: -1 })
  })
})

describe('图表数据整理', () => {
  it('buildAspectChartData 平地坡向为 null', () => {
    const data = buildAspectChartData([
      { distance: 0, aspectDeg: -1, slopeDeg: 0 },
      { distance: 10, aspectDeg: 90, slopeDeg: 12 }
    ])
    expect(data.distance).toEqual([0, 10])
    expect(data.aspect).toEqual([null, 90])
    expect(data.slope).toEqual([0, 12])
  })

  it('buildVolumeCompareChartData 拆分挖填方', () => {
    const data = buildVolumeCompareChartData([
      { designHeight: 100, cut: 10, fill: 5 },
      { designHeight: 110, cut: 3, fill: 8 }
    ])
    expect(data.designHeights).toEqual([100, 110])
    expect(data.cut).toEqual([10, 3])
    expect(data.fill).toEqual([5, 8])
  })
})
