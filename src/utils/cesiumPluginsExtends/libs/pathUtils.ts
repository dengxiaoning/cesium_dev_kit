/**
 * 路径点转换工具。
 *
 * 背景：`draw.drawLineGraphics` 的回调返回的是 `Cartesian3[]`，
 * 而早期 `plugin.buildPathRoaming()` 只按 `{ lng, lat, alt }` 读取，
 * 传入 Cartesian3 时 `Number(undefined)` 会得到 `NaN`，NaN 一路流入
 * `Cesium.Cartesian3.normalize`，最终抛出
 * `DeveloperError: normalized result is not a number`。
 *
 * 这里把「多种输入写法 → Cartesian3[]」的归一化逻辑独立出来，
 * 同时过滤非法坐标与相邻重合点（重合点同样会让方向向量长度为 0）。
 */

/** 仅依赖 Cartesian3 的少量静态方法，便于在单测中用 stub 替换 */
export interface Cartesian3Like {
  x: number
  y: number
  z: number
}

/** 转换所需的最小 Cesium 能力集 */
export interface Cartesian3Capable {
  Cartesian3: {
    clone(cartesian: Cartesian3Like): Cartesian3Like
    fromDegrees(lng: number, lat: number, alt: number): Cartesian3Like
    distance(left: Cartesian3Like, right: Cartesian3Like): number
  }
}

/**
 * 把单个路径点转成 Cartesian3。
 *
 * 支持三种写法：
 * - `Cesium.Cartesian3`（已有 `x/y/z`）
 * - `[lng, lat, alt]`
 * - `{ lng | lon | longitude, lat | latitude, alt | height }`
 *
 * 坐标缺失或非法（`NaN` / `Infinity`）时返回 `undefined`。
 */
export function toCartesian3(Cesium: Cartesian3Capable, item: unknown): Cartesian3Like | undefined {
  if (!item || typeof item !== 'object') return undefined
  const point = item as Record<string, unknown>

  // 已经是 Cartesian3
  if (
    typeof point.x === 'number' &&
    typeof point.y === 'number' &&
    typeof point.z === 'number' &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    Number.isFinite(point.z)
  ) {
    return Cesium.Cartesian3.clone(point as unknown as Cartesian3Like)
  }

  let lng: number
  let lat: number
  let alt: number
  if (Array.isArray(item)) {
    lng = Number(item[0])
    lat = Number(item[1])
    alt = item.length > 2 ? Number(item[2]) : 0
  } else {
    lng = Number(point.lng ?? point.lon ?? point.longitude)
    lat = Number(point.lat ?? point.latitude)
    alt = Number(point.alt ?? point.height ?? 0)
  }

  if (!Number.isFinite(lng) || !Number.isFinite(lat) || !Number.isFinite(alt)) {
    return undefined
  }
  return Cesium.Cartesian3.fromDegrees(lng, lat, alt)
}

/**
 * 把 WGS84 对象数组展平成 `[lng, lat, alt, ...]`，可直接用于
 * `Cesium.Cartesian3.fromDegreesArrayHeights()`。
 *
 * 用于「公开回调返回 WGS84，而内部几何仍需要 Cartesian3」的场景。
 */
export function wgs84ArrayToDegreesArrayHeights(points: unknown): number[] {
  const result: number[] = []
  if (!Array.isArray(points)) return result
  for (const point of points) {
    if (!point || typeof point !== 'object') continue
    const p = point as Record<string, unknown>
    // 已经是 Cartesian3 的直接跳过（调用方不该混用，但不要因此抛错）
    if (typeof p.x === 'number' && typeof p.z === 'number') continue
    const lng = Number(p.lng ?? p.lon ?? p.longitude)
    const lat = Number(p.lat ?? p.latitude)
    const alt = Number(p.alt ?? p.height ?? 0)
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || !Number.isFinite(alt)) continue
    result.push(lng, lat, alt)
  }
  return result
}

/**
 * 批量转换路径点，并过滤非法坐标与相邻重合点。
 *
 * @param Cesium - Cesium 命名空间（或等价的 stub）
 * @param paths - 任意受支持写法的路径点数组
 * @param minDistance - 判定「重合」的距离阈值（米），默认 1 毫米
 */
export function toCartesianPath(
  Cesium: Cartesian3Capable,
  paths: unknown,
  minDistance = 1e-3
): Cartesian3Like[] {
  const result: Cartesian3Like[] = []
  if (!Array.isArray(paths)) return result
  for (let i = 0; i < paths.length; i++) {
    const cartesian = toCartesian3(Cesium, paths[i])
    if (!cartesian) continue
    const prev = result[result.length - 1]
    if (prev && Cesium.Cartesian3.distance(prev, cartesian) < minDistance) continue
    result.push(cartesian)
  }
  return result
}
