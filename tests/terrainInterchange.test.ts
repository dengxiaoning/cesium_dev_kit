import { describe, it, expect } from 'vitest'
import {
  heightFieldToGeoTIFF,
  heightFieldToAsciiGrid,
  asciiGridToHeightField,
  heightFieldToXyz,
  quantizeHeightField,
  dequantizeHeightField,
  diffHeightField,
  applyHeightPatch
} from '../src/utils/cesiumPluginsExtends/libs/terrain/terrainInterchange'
import type { HeightField } from '../src/utils/cesiumPluginsExtends/libs/terrain/terrainInterchange'

/** 造一个小格网：segments=2 → stride=3，9 个顶点 */
function makeField(): HeightField {
  // 顶点高度做成「每点不同」便于核对方向
  const base = new Float32Array([100, 101, 102, 110, 111, 112, 120, 121, 122])
  const current = new Float32Array([100, 101, 102, 110, 95, 112, 120, 121, 122]) // 中间点挖了 16
  return {
    segments: 2,
    bounds: { minLng: 104, minLat: 30, maxLng: 104.02, maxLat: 30.02 },
    base,
    current
  }
}

/** 最小 TIFF 字段读取器，用来回读我们写的 GeoTIFF */
function readTiff(bytes: Uint8Array): {
  width: number
  height: number
  sampleFormat: number
  pixelScale: number[]
  tiepoint: number[]
  pixels: Float32Array
} {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  expect(bytes[0]).toBe(0x49)
  expect(bytes[1]).toBe(0x49)
  expect(view.getUint16(2, true)).toBe(42)
  const ifd = view.getUint32(4, true)
  const count = view.getUint16(ifd, true)

  const tags: Record<number, { type: number; count: number; value: number }> = {}
  for (let i = 0; i < count; i++) {
    const off = ifd + 2 + i * 12
    const tag = view.getUint16(off, true)
    const type = view.getUint16(off + 2, true)
    const n = view.getUint32(off + 4, true)
    const value = view.getUint32(off + 8, true)
    tags[tag] = { type, count: n, value }
  }

  const width = tags[256].value
  const height = tags[257].value
  const sampleFormat = tags[339].value
  const stripOffset = tags[273].value

  const pixelScale = [
    view.getFloat64(tags[33550].value, true),
    view.getFloat64(tags[33550].value + 8, true)
  ]
  const tiepoint = [
    view.getFloat64(tags[33922].value + 24, true),
    view.getFloat64(tags[33922].value + 32, true)
  ]

  const pixels = new Float32Array(width * height)
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = view.getFloat32(stripOffset + i * 4, true)
  }
  return { width, height, sampleFormat, pixelScale, tiepoint, pixels }
}

describe('地形高度场数据交换', () => {
  it('GeoTIFF：能写出合法文件头与正确的像素（北→南行序）', () => {
    const field = makeField()
    const tiff = heightFieldToGeoTIFF(field)
    const read = readTiff(tiff)

    expect(read.width).toBe(3)
    expect(read.height).toBe(3)
    expect(read.sampleFormat).toBe(3) // IEEE float

    // 内部行序南→北（row0=minLat=100,101,102…），TIFF 北→南，故首行应是 120,121,122
    expect(Array.from(read.pixels)).toEqual([120, 121, 122, 110, 95, 112, 100, 101, 102])
  })

  it('GeoTIFF：地理配准（pixelScale / tiepoint）指向格网范围', () => {
    const field = makeField()
    const read = readTiff(heightFieldToGeoTIFF(field))

    expect(read.pixelScale[0]).toBeCloseTo(0.01, 6) // dLng
    expect(read.pixelScale[1]).toBeCloseTo(0.01, 6) // dLat
    expect(read.tiepoint[0]).toBeCloseTo(104, 6) // minLng
    expect(read.tiepoint[1]).toBeCloseTo(30.02, 6) // maxLat（北）
  })

  it('GeoTIFF：source=delta 输出挖填差', () => {
    const field = makeField()
    const read = readTiff(heightFieldToGeoTIFF(field, { source: 'delta' }))
    // delta = current - base，只有中间点 -16
    expect(read.pixels[4]).toBeCloseTo(-16, 3)
    expect(read.pixels[0]).toBeCloseTo(0, 3)
  })

  it('ASCII 格网：表头 + 北→南行序 + 可回读', () => {
    const field = makeField()
    const text = heightFieldToAsciiGrid(field)
    const lines = text.split('\n')

    expect(lines[0]).toBe('ncols 3')
    expect(lines[1]).toBe('nrows 3')
    expect(lines[2]).toBe('xllcorner 104')
    expect(lines[3]).toBe('yllcorner 30')
    expect(lines[5]).toBe('NODATA_value -9999')
    // 首数据行应是北边（maxLat）那行：120,121,122
    expect(lines[6]).toBe('120.000 121.000 122.000')

    // 回读（base = current，因为 ASCII 没有原始高度）
    const round = asciiGridToHeightField(text)
    expect(round.segments).toBe(2)
    expect(round.current[4]).toBeCloseTo(95, 3)
    expect(round.bounds.minLng).toBeCloseTo(104, 6)
    expect(round.bounds.maxLat).toBeCloseTo(30.02, 6)
  })

  it('XYZ：逐顶点输出，行数与坐标正确', () => {
    const field = makeField()
    const lines = heightFieldToXyz(field).split('\n')
    expect(lines.length).toBe(9)
    expect(lines[0]).toBe('104.000000 30.000000 100.000') // 西南角
    expect(lines[8]).toBe('104.020000 30.020000 122.000') // 东北角
  })

  it('Int16 量化：往返误差在半个刻度以内', () => {
    const field = makeField()
    const q = quantizeHeightField(field)
    expect(q.data).toBeInstanceOf(Int16Array)
    expect(q.scale).toBeGreaterThan(0)
    const restored = dequantizeHeightField(q)
    for (let i = 0; i < restored.length; i++) {
      expect(Math.abs(restored[i] - field.current[i])).toBeLessThanOrEqual(q.scale / 2 + 1e-6)
    }
  })

  it('协同差量：只记录被改动的顶点，套用后可还原', () => {
    const field = makeField()
    const patch = diffHeightField(field)
    expect(patch.kind).toBe('cesium-dev-kit:terrain-patch')
    expect(patch.indices).toEqual([4])
    expect(patch.heights).toEqual([95])

    // 在「原始」基础上套用，得到编辑后高度
    const baseOnly: HeightField = { ...field, current: new Float32Array(field.base) }
    const applied = applyHeightPatch(baseOnly, patch)
    expect(Array.from(applied)).toEqual(Array.from(field.current))
  })

  it('协同差量：tolerance 过滤掉微小改动', () => {
    const field = makeField()
    const patch = diffHeightField(field, { tolerance: 1 })
    expect(patch.indices.length).toBe(1)
  })

  it('协同差量：范围/分段不匹配时抛错', () => {
    const field = makeField()
    const patch = diffHeightField(field)
    const mismatched: HeightField = {
      ...field,
      segments: 3,
      base: new Float32Array(16),
      current: new Float32Array(16)
    }
    expect(() => applyHeightPatch(mismatched, patch)).toThrow(/不匹配/)
  })

  it('ASCII 回读：非方形格网抛错', () => {
    const text = 'ncols 3\nnrows 4\nxllcorner 0\nyllcorner 0\ncellsize 1\nNODATA_value -9999\n' + '1 '.repeat(12)
    expect(() => asciiGridToHeightField(text)).toThrow(/方形/)
  })
})
