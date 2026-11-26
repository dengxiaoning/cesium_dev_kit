import { describe, it, expect } from 'vitest'
import {
  applyTerrainTemplate
} from '../src/utils/cesiumPluginsExtends/libs/terrain/terrainTemplates'
import { buildGridFromHeightField } from '../src/utils/cesiumPluginsExtends/libs/terrain/terrainGrid'

/** 造一个 9×9（segments=8）、全部内部、权重 1 的平地格网 */
function makeGrid(height = 500) {
  const segments = 8
  const count = (segments + 1) * (segments + 1)
  const base = new Float32Array(count).fill(height)
  const current = new Float32Array(count).fill(height)
  const grid = buildGridFromHeightField(
    segments,
    { minLng: 0, minLat: 0, maxLng: 0.08, maxLat: 0.08 },
    base,
    current
  )
  return grid
}

describe('地形模板', () => {
  it('pit：整体下沉到 基准 - depth', () => {
    const grid = makeGrid(500)
    const next = applyTerrainTemplate(grid, { type: 'pit', depth: 30 })
    expect(next[0]).toBeCloseTo(470, 6)
    expect(next[next.length - 1]).toBeCloseTo(470, 6)
  })

  it('mound：整体抬升到 基准 + depth', () => {
    const grid = makeGrid(500)
    const next = applyTerrainTemplate(grid, { type: 'mound', depth: 30 })
    expect(next[0]).toBeCloseTo(530, 6)
  })

  it('platform：整平到目标标高', () => {
    const grid = makeGrid(500)
    const next = applyTerrainTemplate(grid, { type: 'platform', targetHeight: 480 })
    expect(next[0]).toBeCloseTo(480, 6)
    expect(next[next.length - 1]).toBeCloseTo(480, 6)
  })

  it('ramp：沿东向从 startHeight 线性升到 endHeight', () => {
    const grid = makeGrid(500)
    const next = applyTerrainTemplate(grid, {
      type: 'ramp',
      direction: 90,
      startHeight: 500,
      endHeight: 540
    })
    const stride = grid.segments + 1
    // 西端（col 0）= 起点，东端（col 8）= 终点
    expect(next[0 * stride + 0]).toBeCloseTo(500, 4)
    expect(next[0 * stride + 8]).toBeCloseTo(540, 4)
    // 中点约 520
    expect(next[0 * stride + 4]).toBeCloseTo(520, 4)
  })

  it('不修改传入的格网（返回新数组）', () => {
    const grid = makeGrid(500)
    const before = new Float32Array(grid.current)
    applyTerrainTemplate(grid, { type: 'pit', depth: 50 })
    expect(Array.from(grid.current)).toEqual(Array.from(before))
  })

  it('未知类型抛错', () => {
    const grid = makeGrid(500)
    // @ts-expect-error 故意传非法类型
    expect(() => applyTerrainTemplate(grid, { type: 'volcano' })).toThrow(/未知/)
  })
})
