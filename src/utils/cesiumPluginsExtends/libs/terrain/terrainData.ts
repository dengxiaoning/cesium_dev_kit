/**
 * 地形编辑数据的序列化 / 反序列化。
 *
 * 编辑结果**不能只存当前高度**：土方统计、坡面明暗、二次编辑都要拿「原始地形」当参照，
 * 所以这里打包的是 base + current 两份高度场；重建格网还需要多边形与 `segments` /
 * `slopeWidth` / `fillHoles`，这些也一并写进载荷。
 *
 * 高度按 Float32 原样走 base64（显式小端），往返**逐位相等**，不做量化：
 * 反复「保存 → 载入」不会一点点磨掉精度。编码自己实现，不依赖 `Buffer` / `atob`，
 * 浏览器与 Node 都能跑（便于单测）。
 *
 * 只依赖 `terrainGrid`，不碰 Cesium / Three。
 */
import { buildTerrainGrid } from './terrainGrid'
import type { TerrainBounds, TerrainGrid, TerrainLngLat } from './terrainGrid'

/**
 * 一份地形高度场载荷（可直接 `JSON.stringify`）。
 *
 * `base` / `current` 是 base64 编码的 Float32 小端字节流，长度必须是
 * `(segments + 1)² × 4` 字节；解码时会校验，损坏或被截断会直接报错，
 * 而不是悄悄渲染出一块乱七八糟的地形。
 */
export interface TerrainHeightsPayload {
  /** 每边划分数（顶点数 = segments + 1） */
  segments: number
  /** 边缘过渡宽度（米） */
  slopeWidth: number
  /** 是否填平多边形内部空洞（与导出时一致，决定 inside 掩膜） */
  fillHoles: boolean
  /** 格网经纬度范围，载入时用来核对多边形是否配错 */
  bounds: TerrainBounds
  /** 原始地形高度，base64(Float32 小端) */
  base: string
  /** 编辑后地形高度，base64(Float32 小端) */
  current: string
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** 字符 -> 6 bit 值的反查表；只覆盖 ASCII，非法字符返回 -1 */
const BASE64_LOOKUP = (() => {
  const table = new Int16Array(128).fill(-1)
  for (let i = 0; i < BASE64_CHARS.length; i++) table[BASE64_CHARS.charCodeAt(i)] = i
  return table
})()

function bytesToBase64(bytes: Uint8Array): string {
  const len = bytes.length
  const parts: string[] = []
  let i = 0
  for (; i + 2 < len; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
    parts.push(
      BASE64_CHARS[(n >>> 18) & 63] +
        BASE64_CHARS[(n >>> 12) & 63] +
        BASE64_CHARS[(n >>> 6) & 63] +
        BASE64_CHARS[n & 63]
    )
  }
  const rest = len - i
  if (rest === 1) {
    const n = bytes[i] << 16
    parts.push(BASE64_CHARS[(n >>> 18) & 63] + BASE64_CHARS[(n >>> 12) & 63] + '==')
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8)
    parts.push(
      BASE64_CHARS[(n >>> 18) & 63] + BASE64_CHARS[(n >>> 12) & 63] + BASE64_CHARS[(n >>> 6) & 63] + '='
    )
  }
  return parts.join('')
}

function base64ToBytes(text: string): Uint8Array {
  // 容忍换行 / 空格（有些后端会把长字符串按行折断），'=' 也一并忽略
  const clean = text.replace(/[^A-Za-z0-9+/]/g, '')
  if (!clean.length) throw new Error('高度数据为空')
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4))
  let acc = 0
  let bits = 0
  let p = 0
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i)
    const value = code < 128 ? BASE64_LOOKUP[code] : -1
    if (value < 0) throw new Error('高度数据不是合法的 base64')
    acc = (acc << 6) | value
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out[p++] = (acc >>> bits) & 0xff
      // 丢掉已经写出的高位，避免累加器溢出 32 位
      acc &= (1 << bits) - 1
    }
  }
  return p === out.length ? out : out.subarray(0, p)
}

/**
 * 把 Float32 数组编码成 base64 字符串（小端，逐位无损）。
 * @param values - 高度数组
 */
export function encodeFloat32(values: Float32Array): string {
  const bytes = new Uint8Array(values.length * 4)
  const view = new DataView(bytes.buffer)
  for (let i = 0; i < values.length; i++) view.setFloat32(i * 4, values[i], true)
  return bytesToBase64(bytes)
}

/**
 * 把 base64 字符串解回 Float32 数组，并校验长度与数值合法性。
 *
 * 校验是必要的：载荷可能被手改、被截断、或经手了会丢精度的存储，
 * 静默渲染一块乱掉的地形比直接报错难排查得多。
 *
 * @param text - base64 字符串
 * @param expected - 期望的点数（`(segments + 1)²`）
 * @param label - 出错信息里用的名字（「原始」/「编辑后」）
 */
export function decodeFloat32(text: string, expected: number, label = '高度'): Float32Array {
  if (typeof text !== 'string' || !text) throw new Error(`${label}高度数据缺失`)
  const bytes = base64ToBytes(text)
  if (bytes.length !== expected * 4) {
    throw new Error(
      `${label}高度数据长度不匹配：期望 ${expected} 个点，实际 ${bytes.length / 4} 个点`
    )
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const out = new Float32Array(expected)
  for (let i = 0; i < expected; i++) {
    const value = view.getFloat32(i * 4, true)
    if (!Number.isFinite(value)) throw new Error(`${label}高度数据包含非法值（第 ${i} 个点）`)
    out[i] = value
  }
  return out
}

/**
 * 把格网打成可序列化的载荷。
 * @param grid - 编辑格网
 * @param options - `fillHoles` 需与建格网时一致，载入时才重建出同一张 inside 掩膜
 */
export function packHeights(
  grid: TerrainGrid,
  options: { fillHoles?: boolean } = {}
): TerrainHeightsPayload {
  return {
    segments: grid.segments,
    slopeWidth: grid.slopeWidth,
    fillHoles: options.fillHoles !== false,
    bounds: { ...grid.bounds },
    base: encodeFloat32(grid.base),
    current: encodeFloat32(grid.current)
  }
}

/**
 * 用载荷 + 多边形重建格网（高度直接来自载荷，不采样地形）。
 *
 * 多边形必须是导出时那一份：范围一旦错位，高度就会套到别的格点上，
 * 因此这里会核对 `bounds`，对不上直接报错而不是硬套。
 *
 * @param polygon - 编辑范围（经纬度）
 * @param payload - `packHeights` 的产物
 */
export function unpackHeights(polygon: TerrainLngLat[], payload: TerrainHeightsPayload): TerrainGrid {
  if (!payload || typeof payload !== 'object') throw new Error('缺少高度场数据')
  const segments = Number(payload.segments)
  if (!Number.isFinite(segments) || segments < 8 || segments > 256) {
    throw new Error(`格网分段非法：${payload.segments}`)
  }
  const grid = buildTerrainGrid(polygon, {
    segments,
    slopeWidth: typeof payload.slopeWidth === 'number' ? payload.slopeWidth : undefined,
    fillHoles: payload.fillHoles !== false
  })

  const bounds = payload.bounds
  if (bounds && typeof bounds.minLng === 'number' && typeof bounds.maxLat === 'number') {
    const span = Math.max(
      1e-9,
      grid.bounds.maxLng - grid.bounds.minLng,
      grid.bounds.maxLat - grid.bounds.minLat
    )
    // 容差按范围取：经纬度是 1e-5 量级的数字，绝对容差太严会误报
    const tolerance = Math.max(1e-9, span * 1e-6)
    const diff = Math.max(
      Math.abs(bounds.minLng - grid.bounds.minLng),
      Math.abs(bounds.minLat - grid.bounds.minLat),
      Math.abs(bounds.maxLng - grid.bounds.maxLng),
      Math.abs(bounds.maxLat - grid.bounds.maxLat)
    )
    if (diff > tolerance) {
      throw new Error('范围与高度场不匹配，请使用导出时的那份 polygon')
    }
  }

  grid.base.set(decodeFloat32(payload.base, grid.vertexCount, '原始'))
  grid.current.set(decodeFloat32(payload.current, grid.vertexCount, '编辑后'))
  return grid
}
