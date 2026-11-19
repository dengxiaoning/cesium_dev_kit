/**
 * 漫游朝向计算（纯函数，不依赖 viewer / DOM）。
 *
 * 现有实现用「当前帧位置 → 下一帧位置」的位移方向作为朝向，
 * 但在以下两种情况位移为 0，`Cartesian3.normalize` 会抛
 * `DeveloperError: normalized result is not a number`：
 * 1. 时钟走到终点（`clockRange = CLAMPED`），向前采样被钳制在同一个点；
 * 2. 路径本身存在相邻重合点。
 *
 * 这里把兜底策略固化成可单测的函数：向前取不到方向时改为向后采样并取反。
 */

/** 位置采样器（`Cesium.SampledPositionProperty` 等） */
export interface PositionSampler {
  getValue(time: unknown): { x: number; y: number; z: number } | null | undefined
}

/** 计算所需的最小 Cesium 能力集 */
export interface RoamingMathCesium {
  Cartesian3: {
    subtract(left: unknown, right: unknown, result: unknown): { x: number; y: number; z: number }
    magnitudeSquared(cartesian: unknown): number
    normalize(cartesian: unknown, result: unknown): unknown
  }
  Transforms: {
    rotationMatrixFromPositionVelocity(position: unknown, velocity: unknown, ellipsoid: unknown): unknown
  }
  Quaternion: {
    fromRotationMatrix(matrix: unknown): unknown
  }
  Ellipsoid: { WGS84: unknown }
  JulianDate: {
    addSeconds(date: unknown, seconds: number, result: unknown): unknown
    new (): unknown
  }
}

/** 位移长度平方小于该值即视为「没有移动」 */
const MIN_DELTA_SQUARED = 1e-6

/**
 * 由两点计算朝向四元数；两点重合（或含 NaN）时返回 `null`。
 */
export function orientationBetween(Cesium: RoamingMathCesium, from: unknown, to: unknown): unknown | null {
  const delta = Cesium.Cartesian3.subtract(to, from, { x: 0, y: 0, z: 0 })
  if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y) || !Number.isFinite(delta.z)) {
    return null
  }
  if (Cesium.Cartesian3.magnitudeSquared(delta) < MIN_DELTA_SQUARED) {
    return null
  }
  const normal = Cesium.Cartesian3.normalize(delta, { x: 0, y: 0, z: 0 })
  const rotationMatrix3 = Cesium.Transforms.rotationMatrixFromPositionVelocity(
    from,
    normal,
    Cesium.Ellipsoid.WGS84
  )
  return Cesium.Quaternion.fromRotationMatrix(rotationMatrix3)
}

/**
 * 采样某一时刻的漫游朝向。
 *
 * @param Cesium - Cesium 命名空间
 * @param position - 位置采样器
 * @param currentTime - 当前时间
 * @param createTime - 构造空 JulianDate 的工厂（默认 `() => new Cesium.JulianDate()`）
 * @param stepSeconds - 采样步长（秒），默认 1/60
 * @returns 朝向四元数；无法确定方向时返回 `null`（调用方应沿用上一次的朝向）
 */
export function resolveRoamingOrientation(
  Cesium: RoamingMathCesium,
  position: PositionSampler,
  currentTime: unknown,
  createTime: () => unknown = () => new Cesium.JulianDate(),
  stepSeconds = 1 / 60
): unknown | null {
  const from = position.getValue(currentTime)
  if (!from) return null

  // 1) 优先用「前进方向」
  const nextTime = Cesium.JulianDate.addSeconds(currentTime, stepSeconds, createTime())
  const next = position.getValue(nextTime)
  if (next) {
    const forward = orientationBetween(Cesium, from, next)
    if (forward) return forward
  }

  // 2) 终点被钳制或存在重合点：退化为「后退方向」
  const prevTime = Cesium.JulianDate.addSeconds(currentTime, -stepSeconds, createTime())
  const prev = position.getValue(prevTime)
  if (prev) {
    return orientationBetween(Cesium, prev, from)
  }
  return null
}
