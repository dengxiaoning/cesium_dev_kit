/**
 * 地形高度场的数据交换（DEM / GeoTIFF / 量化 / 协同差量）。
 *
 * 定位：把 `TerrainEdit` 编辑出来的高度场导出成标准格式，或在不同端 / 不同人之间
 * 用小载荷同步。所有函数都是纯计算，不依赖 Cesium / Three.js，可在 Node 里单测。
 *
 * 输入统一是「规则格网高度场」，与 `TerrainEdit.getHeightField()` 的返回值
 * （`{ segments, bounds, base, current }`）以及内部的 `TerrainGrid` 结构兼容：
 *
 * - 顶点按**行优先**排列，索引 = row * stride + col，stride = segments + 1；
 * - row 0 在南（minLat）、row `segments` 在北（maxLat）；col 0 在西、col `segments` 在东；
 * - `lng(col) = minLng + col * dLng`，`lat(row) = minLat + row * dLat`。
 *
 * 只依赖 `terrainGrid` 的纯几何类型，不碰渲染层。
 */
import type { TerrainBounds } from './terrainGrid'

/** 规则格网高度场（与 `TerrainEdit.getHeightField()` 结构兼容） */
export interface HeightField {
  /** 每边划分数（顶点数 = segments + 1） */
  segments: number
  /** 格网经纬度范围 */
  bounds: TerrainBounds
  /** 原始地形高度（米） */
  base: Float32Array
  /** 编辑后地形高度（米） */
  current: Float32Array
}

/** GeoTIFF 导出选项 */
export interface GeoTiffOptions {
  /** 波段数据源：`current`（默认，编辑后）/ `base`（原始）/ `delta`（挖填差） */
  source?: 'current' | 'base' | 'delta'
}

/** ASCII 格网导出选项 */
export interface AsciiGridOptions {
  /** 波段数据源，默认 `current` */
  source?: 'current' | 'base' | 'delta'
  /** 高度小数位，默认 3 */
  precision?: number
  /** NODATA 值（仅写入表头），默认 -9999 */
  nodata?: number
}

/** XYZ 导出选项 */
export interface XyzOptions {
  /** 波段数据源，默认 `current` */
  source?: 'current' | 'base' | 'delta'
  /** 高度小数位，默认 3 */
  precision?: number
}

/** Int16 量化选项 */
export interface QuantizeOptions {
  /** 固定缩放（米 / LSB）；不传则按 min~max 自动取最小刻度 */
  scale?: number
  /** 固定偏移（米）；不传则取 min~max 中点 */
  offset?: number
  /** 保留的 NODATA 值，默认 -32768 */
  nodata?: number
}

/** Int16 量化后的高度场 */
export interface QuantizedHeightField {
  /** 每边划分数 */
  segments: number
  /** 格网经纬度范围 */
  bounds: TerrainBounds
  /** 缩放（米 / LSB）：高度 = data[i] * scale + offset */
  scale: number
  /** 偏移（米） */
  offset: number
  /** 保留值（无效格） */
  nodata: number
  /** 量化后的最小高度（米） */
  min: number
  /** 量化后的最大高度（米） */
  max: number
  /** Int16 高度（行优先，长度 = (segments + 1)²） */
  data: Int16Array
}

/** 差量比较选项 */
export interface DiffOptions {
  /** 高差容差（米），低于该值的顶点视为未改，默认 0（逐位比较） */
  tolerance?: number
}

/** 协同差量（`diffHeightField` 的产物，可 JSON.stringify） */
export interface TerrainPatch {
  /** 固定标识：`cesium-dev-kit:terrain-patch` */
  kind: 'cesium-dev-kit:terrain-patch'
  /** 格式版本，当前 1 */
  version: number
  /** 每边划分数（用于核对能否套用） */
  segments: number
  /** 格网经纬度范围（用于核对） */
  bounds: TerrainBounds
  /** 被改动的顶点索引（与 heights 平行） */
  indices: number[]
  /** 改动后的绝对高度（米，last-write-wins） */
  heights: number[]
}

const TERRAIN_PATCH_KIND = 'cesium-dev-kit:terrain-patch'
const TERRAIN_PATCH_VERSION = 1

/** 校验并返回 stride（segments + 1） */
function validateField(field: HeightField): number {
  if (!field || typeof field !== 'object') throw new Error('缺少高度场')
  const segments = Math.round(field.segments)
  if (!Number.isFinite(segments) || segments < 1 || segments > 256) {
    throw new Error(`格网分段非法：${field.segments}`)
  }
  const stride = segments + 1
  const expected = stride * stride
  if (!field.current || field.current.length !== expected) {
    throw new Error(`高度场长度不匹配：期望 ${expected}，实际 ${field.current ? field.current.length : 0}`)
  }
  if (field.base && field.base.length !== expected) {
    throw new Error(`原始高度场长度不匹配：期望 ${expected}，实际 ${field.base.length}`)
  }
  return stride
}

/** 取指定波段的数值数组（返回新数组，delta 按 current - base 计算） */
function pickSource(field: HeightField, source?: 'current' | 'base' | 'delta'): Float32Array {
  if (source === 'base') return new Float32Array(field.base)
  if (source === 'delta') {
    if (!field.base) throw new Error('导出 delta 需要 base 高度场')
    const out = new Float32Array(field.current.length)
    for (let i = 0; i < out.length; i++) out[i] = field.current[i] - field.base[i]
    return out
  }
  return new Float32Array(field.current)
}

/* ============================ GeoTIFF ============================ */

// TIFF 数据类型（小端）
const TIFF_BYTE = 1
const TIFF_SHORT = 3
const TIFF_LONG = 4
const TIFF_DOUBLE = 12

/**
 * 编码单波段 Float32 GeoTIFF（小端，带地理配准）。
 *
 * 地理配准采用「顶点即像素点」：
 * - ncols = nrows = segments + 1（每个顶点一个像素）；
 * - `ModelPixelScale = (dLng, dLat)`，`ModelTiepoint = (minLng, maxLat)`；
 * - `GTRasterType = PixelIsPoint`，即像素中心正好落在格网顶点上。
 *
 * TIFF 行序为北→南，而内部高度场是南→北，这里写入时反转行。
 * @param width - ncols
 * @param height - nrows
 * @param scaleX - 像素在经度方向的跨度（度）
 * @param scaleY - 像素在纬度方向的跨度（度）
 * @param tieX - 左上像素（0,0）的经度
 * @param tieY - 左上像素（0,0）的纬度
 * @param pixels - 北→南、行优先的像素值
 */
function encodeGeoTIFF(
  width: number,
  height: number,
  scaleX: number,
  scaleY: number,
  tieX: number,
  tieY: number,
  pixels: Float32Array
): Uint8Array {
  const ENTRY_COUNT = 14
  const headerSize = 8
  const ifdSize = 2 + ENTRY_COUNT * 12 + 4
  const scaleBytes = 3 * 8 // ModelPixelScale: 3 个 double
  const tieBytes = 6 * 8 // ModelTiepoint: 6 个 double
  const geokeyBytes = 20 * 2 // GeoKeyDirectory: 20 个 short

  const ifdOffset = headerSize
  const scaleOffset = ifdOffset + ifdSize
  const tieOffset = scaleOffset + scaleBytes
  const geokeyOffset = tieOffset + tieBytes
  let pixelOffset = geokeyOffset + geokeyBytes
  if (pixelOffset % 4 !== 0) pixelOffset += 4 - (pixelOffset % 4)
  const pixelBytes = pixels.length * 4
  const total = pixelOffset + pixelBytes

  const buffer = new ArrayBuffer(total)
  const view = new DataView(buffer)

  // 文件头：'II' + magic 42 + 首个 IFD 偏移
  view.setUint8(0, 0x49)
  view.setUint8(1, 0x49)
  view.setUint16(2, 42, true)
  view.setUint32(4, ifdOffset, true)

  let p = ifdOffset
  view.setUint16(p, ENTRY_COUNT, true)
  p += 2

  const entry = (tag: number, type: number, count: number, value: number) => {
    view.setUint16(p, tag, true)
    view.setUint16(p + 2, type, true)
    view.setUint32(p + 4, count, true)
    const typeSize = type === TIFF_BYTE ? 1 : type === TIFF_SHORT ? 2 : type === TIFF_LONG ? 4 : 8
    if (typeSize * count <= 4) {
      // 内联：写进低字节
      if (type === TIFF_SHORT) view.setUint16(p + 8, value, true)
      else if (type === TIFF_BYTE) view.setUint8(p + 8, value)
      else view.setUint32(p + 8, value, true)
    } else {
      // 指向外部数组
      view.setUint32(p + 8, value, true)
    }
    p += 12
  }

  entry(256, TIFF_SHORT, 1, width) // ImageWidth
  entry(257, TIFF_SHORT, 1, height) // ImageLength
  entry(258, TIFF_SHORT, 1, 32) // BitsPerSample
  entry(259, TIFF_SHORT, 1, 1) // Compression = none
  entry(262, TIFF_SHORT, 1, 1) // PhotometricInterpretation = BlackIsZero
  entry(273, TIFF_LONG, 1, pixelOffset) // StripOffsets
  entry(277, TIFF_SHORT, 1, 1) // SamplesPerPixel
  entry(278, TIFF_LONG, 1, height) // RowsPerStrip
  entry(279, TIFF_LONG, 1, pixelBytes) // StripByteCounts
  entry(284, TIFF_SHORT, 1, 1) // PlanarConfiguration = chunky
  entry(339, TIFF_SHORT, 1, 3) // SampleFormat = IEEE float
  entry(33550, TIFF_DOUBLE, 3, scaleOffset) // ModelPixelScale
  entry(33922, TIFF_DOUBLE, 6, tieOffset) // ModelTiepoint
  entry(34735, TIFF_SHORT, 20, geokeyOffset) // GeoKeyDirectoryTag
  view.setUint32(p, 0, true) // 下一个 IFD = 无

  // ModelPixelScale：(scaleX, scaleY, 0)
  view.setFloat64(scaleOffset, scaleX, true)
  view.setFloat64(scaleOffset + 8, scaleY, true)
  view.setFloat64(scaleOffset + 16, 0, true)

  // ModelTiepoint：(i=0, j=0, k=0, X=tieX, Y=tieY, Z=0)
  view.setFloat64(tieOffset, 0, true)
  view.setFloat64(tieOffset + 8, 0, true)
  view.setFloat64(tieOffset + 16, 0, true)
  view.setFloat64(tieOffset + 24, tieX, true)
  view.setFloat64(tieOffset + 32, tieY, true)
  view.setFloat64(tieOffset + 40, 0, true)

  // GeoKeyDirectory：header + 4 个 key
  const geoKeys = [
    1, 1, 0, 4, // version=1, revision=1, minor=0, numKeys=4
    1024, 0, 1, 2, // GTModelTypeGeoKey = 2（地理坐标系）
    1025, 0, 1, 2, // GTRasterTypeGeoKey = 2（PixelIsPoint）
    2048, 0, 1, 4326, // GeographicTypeGeoKey = WGS84
    2054, 0, 1, 9102 // GeogAngularUnitsGeoKey = 度
  ]
  for (let i = 0; i < geoKeys.length; i++) {
    view.setUint16(geokeyOffset + i * 2, geoKeys[i], true)
  }

  // 像素数据（北→南）
  for (let i = 0; i < pixels.length; i++) {
    view.setFloat32(pixelOffset + i * 4, pixels[i], true)
  }

  return new Uint8Array(buffer)
}

/**
 * 把高度场导出为单波段 Float32 GeoTIFF（小端、WGS84 地理配准）。
 *
 * 可直接被 QGIS / GDAL / ArcGIS 读取，也可作为 `CesiumTerrainProvider` 的
 * 离线地形源（配合 gdal2tiles 等工具切片）。
 *
 * @param field - 高度场（`TerrainEdit.getHeightField()` 的返回值）
 * @param options - 波段来源等
 * @example
 * const bytes = heightFieldToGeoTIFF(terrainEdit.getHeightField())
 * await fetch('/api/terrain/42.tif', { method: 'POST', body: bytes })
 */
export function heightFieldToGeoTIFF(field: HeightField, options: GeoTiffOptions = {}): Uint8Array {
  const stride = validateField(field)
  const values = pickSource(field, options.source)
  const spanLng = field.bounds.maxLng - field.bounds.minLng
  const spanLat = field.bounds.maxLat - field.bounds.minLat
  const scaleX = spanLng > 0 ? spanLng / (stride - 1) : 0
  const scaleY = spanLat > 0 ? spanLat / (stride - 1) : 0

  // TIFF 行序：北→南（我们内部是南→北，反转行）
  const pixels = new Float32Array(stride * stride)
  for (let r = 0; r < stride; r++) {
    const srcRow = stride - 1 - r
    for (let c = 0; c < stride; c++) {
      pixels[r * stride + c] = values[srcRow * stride + c]
    }
  }
  return encodeGeoTIFF(stride, stride, scaleX, scaleY, field.bounds.minLng, field.bounds.maxLat, pixels)
}

/* ============================ ASCII 格网 ============================ */

/**
 * 把高度场导出为 ESRI ASCII 格网（`.asc`，纯文本）。
 *
 * 注意：ASCII 格网只支持**等距方格**（单个 `cellsize`）。经纬度下 dLng 与 dLat
 * 通常不等（同一经度差在不同纬度对应不同米数），因此这里按 `cellsize = dLat` 输出、
 * 把每个格网顶点当成一个「格」的中心，横向会有轻微失真。需要精确地理配准请用
 * {@link heightFieldToGeoTIFF}。
 *
 * @param field - 高度场
 * @param options - 波段来源、小数位、NODATA
 */
export function heightFieldToAsciiGrid(field: HeightField, options: AsciiGridOptions = {}): string {
  const stride = validateField(field)
  const values = pickSource(field, options.source)
  const precision = options.precision ?? 3
  const nodata = options.nodata ?? -9999
  const cellsize = (field.bounds.maxLat - field.bounds.minLat) / (stride - 1)

  const lines: string[] = []
  lines.push(`ncols ${stride}`)
  lines.push(`nrows ${stride}`)
  lines.push(`xllcorner ${field.bounds.minLng}`)
  lines.push(`yllcorner ${field.bounds.minLat}`)
  lines.push(`cellsize ${cellsize}`)
  lines.push(`NODATA_value ${nodata}`)
  // ASCII 行序：北→南
  for (let r = 0; r < stride; r++) {
    const srcRow = stride - 1 - r
    const row: string[] = []
    for (let c = 0; c < stride; c++) {
      row.push(values[srcRow * stride + c].toFixed(precision))
    }
    lines.push(row.join(' '))
  }
  return lines.join('\n')
}

/**
 * 解析 ESRI ASCII 格网为高度场。
 *
 * 只能还原出 `current`（原始 `base` 不在 ASCII 里，故 base = current）。
 * 要求 ncols === nrows（本库高度场是方阵），否则抛错。
 * @param text - `.asc` 内容
 */
export function asciiGridToHeightField(text: string): HeightField {
  if (typeof text !== 'string' || !text.trim()) throw new Error('ASCII 格网为空')
  const tokens = text.trim().split(/\s+/)
  let ncols = 0
  let nrows = 0
  let xllcorner = 0
  let yllcorner = 0
  let cellsize = 0
  let nodata = -9999
  let i = 0

  const readHeader = (key: string): number => {
    if (i + 1 >= tokens.length) throw new Error(`ASCII 格网缺少 ${key}`)
    const k = tokens[i].toLowerCase()
    const value = Number(tokens[i + 1])
    i += 2
    if (k !== key.toLowerCase()) throw new Error(`ASCII 格网表头异常：期望 ${key}，实际 ${k}`)
    return value
  }

  ncols = readHeader('ncols')
  nrows = readHeader('nrows')
  xllcorner = readHeader('xllcorner')
  yllcorner = readHeader('yllcorner')
  cellsize = readHeader('cellsize')
  nodata = readHeader('NODATA_value')

  if (!Number.isFinite(ncols) || !Number.isFinite(nrows) || ncols < 2 || nrows < 2) {
    throw new Error('ASCII 格网尺寸非法')
  }
  if (ncols !== nrows) throw new Error(`ASCII 格网需要方形（ncols === nrows），当前 ${ncols}×${nrows}`)
  const stride = ncols
  const segments = stride - 1
  const count = stride * stride
  if (tokens.length - i < count) throw new Error('ASCII 格网数据行不足')

  const current = new Float32Array(count)
  // ASCII 北→南，转成内部南→北
  for (let r = 0; r < stride; r++) {
    const srcRow = stride - 1 - r
    for (let c = 0; c < stride; c++) {
      const value = Number(tokens[i++])
      current[srcRow * stride + c] = value === nodata ? 0 : value
    }
  }

  return {
    segments,
    bounds: {
      minLng: xllcorner,
      minLat: yllcorner,
      maxLng: xllcorner + cellsize * segments,
      maxLat: yllcorner + cellsize * segments
    },
    base: new Float32Array(current),
    current
  }
}

/* ============================ XYZ ============================ */

/**
 * 把高度场导出为 XYZ 文本（每行 `lng lat height`，逐顶点、无插值）。
 *
 * 这是最忠实于原始格网的文本格式：`segments = 160` 时输出 161×161 = 25921 行。
 * @param field - 高度场
 * @param options - 波段来源、小数位
 */
export function heightFieldToXyz(field: HeightField, options: XyzOptions = {}): string {
  const stride = validateField(field)
  const values = pickSource(field, options.source)
  const precision = options.precision ?? 3
  const { minLng, minLat, maxLng, maxLat } = field.bounds
  const dLng = (maxLng - minLng) / (stride - 1)
  const dLat = (maxLat - minLat) / (stride - 1)

  const lines: string[] = new Array(stride * stride)
  for (let row = 0; row < stride; row++) {
    const lat = minLat + row * dLat
    for (let col = 0; col < stride; col++) {
      const lng = minLng + col * dLng
      lines[row * stride + col] = `${lng.toFixed(6)} ${lat.toFixed(6)} ${values[row * stride + col].toFixed(precision)}`
    }
  }
  return lines.join('\n')
}

/* ============================ Int16 量化 ============================ */

/**
 * 把高度场量化成 Int16，用于缩小载荷（网格数据从 4 字节/点降到 2 字节/点）。
 *
 * 默认按 min~max 自动取刻度：`height ≈ data[i] * scale + offset`。
 * 例如一个 3000 米落差的山地，`scale ≈ 0.046m`，精度仍到亚厘米级。
 * @param field - 高度场（量化 `current`）
 * @param options - 固定 scale / offset / nodata
 */
export function quantizeHeightField(field: HeightField, options: QuantizeOptions = {}): QuantizedHeightField {
  validateField(field)
  const current = field.current
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < current.length; i++) {
    if (current[i] < min) min = current[i]
    if (current[i] > max) max = current[i]
  }
  if (!Number.isFinite(min)) {
    min = 0
    max = 0
  }
  if (max - min < 1e-9) max = min + 1 // 全平也至少给一格量程

  const nodata = options.nodata ?? -32768
  let scale = options.scale
  let offset = options.offset
  if (!Number.isFinite(scale as number)) scale = (max - min) / 65534
  if (!Number.isFinite(offset as number)) offset = (min + max) / 2

  const data = new Int16Array(current.length)
  for (let i = 0; i < current.length; i++) {
    const q = Math.round((current[i] - (offset as number)) / (scale as number))
    data[i] = q < -32767 ? -32767 : q > 32767 ? 32767 : q
  }
  return {
    segments: field.segments,
    bounds: { ...field.bounds },
    scale: scale as number,
    offset: offset as number,
    nodata,
    min,
    max,
    data
  }
}

/**
 * 把量化高度场还原成 Float32 高度数组。
 * @param quantized - `quantizeHeightField` 的产物
 */
export function dequantizeHeightField(quantized: QuantizedHeightField): Float32Array {
  const out = new Float32Array(quantized.data.length)
  for (let i = 0; i < quantized.data.length; i++) {
    out[i] = quantized.data[i] * quantized.scale + quantized.offset
  }
  return out
}

/* ============================ 协同差量 ============================ */

/**
 * 计算高度场相对 `base` 的稀疏差量，用于协同编辑的增量同步。
 *
 * 只记录 `|current - base| > tolerance` 的顶点，改动稀疏时载荷远小于整场。
 * 结果可 `JSON.stringify`（不含 TypedArray），拿到另一端 `applyHeightPatch` 套用。
 *
 * @param field - 高度场（需要 base，作为参照）
 * @param options - 容差
 */
export function diffHeightField(field: HeightField, options: DiffOptions = {}): TerrainPatch {
  validateField(field)
  if (!field.base) throw new Error('diffHeightField 需要 base 高度场')
  const tolerance = options.tolerance ?? 0
  const indices: number[] = []
  const heights: number[] = []
  for (let i = 0; i < field.current.length; i++) {
    if (Math.abs(field.current[i] - field.base[i]) > tolerance) {
      indices.push(i)
      heights.push(field.current[i])
    }
  }
  return {
    kind: TERRAIN_PATCH_KIND,
    version: TERRAIN_PATCH_VERSION,
    segments: field.segments,
    bounds: { ...field.bounds },
    indices,
    heights
  }
}

/**
 * 把差量套用到一份基准高度场上，返回新的高度数组（不改入参）。
 *
 * 套用顺序即优先级（后套用的覆盖先套用的），因此协同冲突用「最后写入者胜」即可。
 * @param base - 基准高度场
 * @param patch - `diffHeightField` 的产物（或其 JSON.parse 之后的对象）
 */
export function applyHeightPatch(base: HeightField, patch: TerrainPatch): Float32Array {
  validateField(base)
  if (!patch || typeof patch !== 'object') throw new Error('差量数据为空')
  if (patch.kind !== TERRAIN_PATCH_KIND) throw new Error('不是 diffHeightField() 导出的差量数据')
  if (patch.version !== TERRAIN_PATCH_VERSION) throw new Error(`差量版本不支持：${patch.version}`)
  if (patch.segments !== base.segments) {
    throw new Error(`差量格网分段不匹配：${patch.segments} ≠ ${base.segments}`)
  }
  const b = patch.bounds
  if (b && typeof b.minLng === 'number') {
    const span = Math.max(1e-9, base.bounds.maxLng - base.bounds.minLng, base.bounds.maxLat - base.bounds.minLat)
    const tolerance = Math.max(1e-9, span * 1e-6)
    if (
      Math.abs(b.minLng - base.bounds.minLng) > tolerance ||
      Math.abs(b.minLat - base.bounds.minLat) > tolerance ||
      Math.abs(b.maxLng - base.bounds.maxLng) > tolerance ||
      Math.abs(b.maxLat - base.bounds.maxLat) > tolerance
    ) {
      throw new Error('差量范围与基准高度场不匹配')
    }
  }
  const out = new Float32Array(base.current)
  const count = patch.indices ? patch.indices.length : 0
  for (let k = 0; k < count; k++) {
    const index = patch.indices[k]
    if (index < 0 || index >= out.length) continue
    out[index] = patch.heights[k]
  }
  return out
}

/* ============================ 解码 ============================ */

/**
 * 解析单波段 Float32 GeoTIFF 为高度场。
 *
 * 支持小端 / 大端、单条或多条 strip；只接受 32 位浮点（SampleFormat=3）、单波段、
 * 方形格网（ncols === nrows）。地理配准按「像素中心 = 顶点」读取 `ModelPixelScale` /
 * `ModelTiepoint`（与 {@link heightFieldToGeoTIFF} 一致，PixelIsPoint / PixelIsArea
 * 的中心坐标相同，均可正确还原范围）。
 *
 * @param bytes - `.tif` 文件字节
 * @example
 * const field = geoTIFFToHeightField(await (await fetch('/terrain/42.tif')).arrayBuffer())
 * terrainEdit.importHeightField(field)
 */
export function geoTIFFToHeightField(bytes: Uint8Array): HeightField {
  if (!bytes || bytes.length < 8) throw new Error('GeoTIFF 数据为空')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const little = bytes[0] === 0x49
  if ((!little && bytes[0] !== 0x4d) || bytes[1] !== (little ? 0x49 : 0x4d)) {
    throw new Error('不是合法的 TIFF 文件')
  }
  const u16 = (o: number) => view.getUint16(o, little)
  const u32 = (o: number) => view.getUint32(o, little)
  const f32 = (o: number) => view.getFloat32(o, little)
  const f64 = (o: number) => view.getFloat64(o, little)
  if (u16(2) !== 42) throw new Error('不是合法的 TIFF（magic ≠ 42）')

  const ifd = u32(4)
  const count = u16(ifd)
  const typeSize = (t: number) => (t === 3 ? 2 : t === 4 ? 4 : t === 12 ? 8 : 1)

  let width = 0
  let height = 0
  let bitsPerSample = 0
  let sampleFormat = 1
  let samplesPerPixel = 1
  let rowsPerStrip = 0
  const stripOffsets: number[] = []
  const stripByteCounts: number[] = []
  let pixelScale: number[] | null = null
  let tiepoint: number[] | null = null

  for (let k = 0; k < count; k++) {
    const off = ifd + 2 + k * 12
    const tag = u16(off)
    const type = u16(off + 2)
    const n = u32(off + 4)
    const inline = typeSize(type) * n <= 4
    const valueOff = off + 8
    const readNum = (idx: number): number => {
      const base = inline ? valueOff : u32(valueOff)
      if (type === 3) return u16(base + idx * 2)
      if (type === 4) return u32(base + idx * 4)
      if (type === 12) return f64(base + idx * 8)
      return view.getUint8(base + idx)
    }

    if (tag === 256) width = readNum(0)
    else if (tag === 257) height = readNum(0)
    else if (tag === 258) bitsPerSample = readNum(0)
    else if (tag === 277) samplesPerPixel = readNum(0)
    else if (tag === 339) sampleFormat = readNum(0)
    else if (tag === 278) rowsPerStrip = readNum(0)
    else if (tag === 273) {
      if (inline) stripOffsets.push(readNum(0))
      else {
        const base = u32(valueOff)
        for (let i = 0; i < n; i++) stripOffsets.push(u32(base + i * 4))
      }
    } else if (tag === 279) {
      if (inline) stripByteCounts.push(readNum(0))
      else {
        const base = u32(valueOff)
        for (let i = 0; i < n; i++) stripByteCounts.push(u32(base + i * 4))
      }
    } else if (tag === 33550) {
      const base = inline ? valueOff : u32(valueOff)
      pixelScale = [f64(base), f64(base + 8), f64(base + 16)]
    } else if (tag === 33922) {
      const base = inline ? valueOff : u32(valueOff)
      tiepoint = [f64(base), f64(base + 8), f64(base + 16), f64(base + 24), f64(base + 32), f64(base + 40)]
    }
  }

  if (!width || !height) throw new Error('GeoTIFF 缺少尺寸')
  if (width !== height) throw new Error(`GeoTIFF 需要方形格网（ncols === nrows），当前 ${width}×${height}`)
  if (bitsPerSample !== 0 && bitsPerSample !== 32) throw new Error(`GeoTIFF 仅支持 32 位浮点，当前 ${bitsPerSample} 位`)
  if (sampleFormat !== 3) throw new Error(`GeoTIFF 仅支持 IEEE 浮点（SampleFormat=3），当前 ${sampleFormat}`)
  if (samplesPerPixel !== 1) throw new Error(`GeoTIFF 仅支持单波段，当前 ${samplesPerPixel}`)
  if (!stripOffsets.length) throw new Error('GeoTIFF 缺少 StripOffsets')

  // 读取所有 strip（按 RowsPerStrip 分块），像素行序为北→南
  const rowsIn = rowsPerStrip || height
  const pixels = new Float32Array(width * height)
  const bytesPerRow = width * 4
  let row = 0
  for (let s = 0; s < stripOffsets.length && row < height; s++) {
    const rowsHere = Math.min(rowsIn, height - row)
    const expect = rowsHere * bytesPerRow
    if (stripByteCounts[s] && stripByteCounts[s] < expect) throw new Error('GeoTIFF 数据不完整')
    for (let r = 0; r < rowsHere; r++) {
      for (let c = 0; c < width; c++) {
        pixels[(row + r) * width + c] = f32(stripOffsets[s] + (r * width + c) * 4)
      }
    }
    row += rowsHere
  }
  if (row < height) throw new Error('GeoTIFF 数据行数不足')

  const scaleX = pixelScale ? pixelScale[0] : 1
  const scaleY = pixelScale ? pixelScale[1] : 1
  const ti = tiepoint ? tiepoint[0] : 0
  const tj = tiepoint ? tiepoint[1] : 0
  const tx = tiepoint ? tiepoint[3] : 0
  const ty = tiepoint ? tiepoint[4] : 0

  // 顶点即像素中心：pixel(pi,pj) = (tx + (pi-ti)*scaleX, ty - (pj-tj)*scaleY)（北→南）
  const minLng = tx - ti * scaleX
  const maxLng = tx + (width - 1 - ti) * scaleX
  const maxLat = ty + tj * scaleY
  const minLat = ty - (height - 1 - tj) * scaleY
  if (maxLng <= minLng || maxLat <= minLat) throw new Error('GeoTIFF 地理配准非法')

  // 转成内部南→北行序
  const segments = width - 1
  const current = new Float32Array(width * height)
  for (let r = 0; r < height; r++) {
    const srcRow = height - 1 - r
    for (let c = 0; c < width; c++) {
      current[r * width + c] = pixels[srcRow * width + c]
    }
  }
  return {
    segments,
    bounds: { minLng, minLat, maxLng, maxLat },
    base: new Float32Array(current),
    current
  }
}

/**
 * 解析规则格网 XYZ 文本为高度场（`heightFieldToXyz` 的逆操作）。
 *
 * 要求点严格落在 `cols × rows` 的规则格网上（且方形），否则抛错——散乱点云
 * 需要重采样 / 插值，不在本函数的职责内。
 * @param text - `lng lat height` 逐行的文本
 */
export function xyzToHeightField(text: string): HeightField {
  if (typeof text !== 'string' || !text.trim()) throw new Error('XYZ 数据为空')
  const pts: { lng: number; lat: number; h: number }[] = []
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t) continue
    const parts = t.split(/[\s,]+/)
    if (parts.length < 3) continue
    const lng = Number(parts[0])
    const lat = Number(parts[1])
    const h = Number(parts[2])
    if (Number.isFinite(lng) && Number.isFinite(lat) && Number.isFinite(h)) pts.push({ lng, lat, h })
  }
  if (!pts.length) throw new Error('XYZ 数据为空')

  // 用 6 位小数归并，吸收文本化时的浮点抖动
  const key = (v: number) => Math.round(v * 1e6)
  const lngs = Array.from(new Set(pts.map((p) => key(p.lng)))).sort((a, b) => a - b)
  const lats = Array.from(new Set(pts.map((p) => key(p.lat)))).sort((a, b) => a - b)
  const cols = lngs.length
  const rows = lats.length
  if (cols < 2 || rows < 2) throw new Error('XYZ 无法构成规则格网')
  if (cols !== rows) throw new Error(`XYZ 需要方形格网，当前 ${cols}×${rows}`)
  if (cols * rows !== pts.length) throw new Error(`XYZ 不是规则格网（${cols}×${rows} ≠ ${pts.length} 点）`)

  const lngMap = new Map(lngs.map((v, i) => [v, i]))
  const latMap = new Map(lats.map((v, i) => [v, i]))
  const current = new Float32Array(pts.length)
  for (const p of pts) {
    const row = latMap.get(key(p.lat)) as number
    const col = lngMap.get(key(p.lng)) as number
    current[row * cols + col] = p.h
  }

  const minLng = lngs[0] / 1e6
  const maxLng = lngs[cols - 1] / 1e6
  const minLat = lats[0] / 1e6
  const maxLat = lats[rows - 1] / 1e6

  return {
    segments: cols - 1,
    bounds: { minLng, minLat, maxLng, maxLat },
    base: new Float32Array(current),
    current
  }
}
