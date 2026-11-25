import assert from 'node:assert'
import * as Cesium from 'cesium'
import {
  resolveRoamingOrientation,
  type RoamingMathCesium,
  type PositionSampler
} from '../src/utils/cesiumPluginsExtends/libs/roaming'
import { wgs84ArrayToDegreesArrayHeights } from '../src/utils/cesiumPluginsExtends/libs/pathUtils'

/**
 * 回归测试：漫游到终点（或路径存在重合点）时，
 * 前后两次采样得到同一位置 → 方向向量长度为 0 →
 * `Cesium.Cartesian3.normalize` 抛
 * `DeveloperError: normalized result is not a number`。
 *
 * 这里用真实 Cesium 数学库（不依赖 viewer / WebGL）复现该场景。
 */
const math = Cesium as unknown as RoamingMathCesium

const START = Cesium.JulianDate.now()
const at = (seconds: number) => Cesium.JulianDate.addSeconds(START, seconds, new Cesium.JulianDate())

function buildProperty(points: Cesium.Cartesian3[], stepSeconds = 60) {
  const property = new Cesium.SampledPositionProperty()
  property.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD
  property.backwardExtrapolationType = Cesium.ExtrapolationType.HOLD
  points.forEach((point, index) => {
    property.addSample(at(index * stepSeconds), point)
  })
  return property
}

const p1 = Cesium.Cartesian3.fromDegrees(110.1, 31.1, 0)
const p2 = Cesium.Cartesian3.fromDegrees(110.2, 31.2, 0)
const p3 = Cesium.Cartesian3.fromDegrees(110.3, 31.3, 0)

// 1. 起点：应能算出朝向
{
  const property = buildProperty([p1, p2, p3])
  const q = resolveRoamingOrientation(math, property as unknown as PositionSampler, at(0))
  assert.ok(q, '起点应能算出朝向')
  assert.ok(Number.isFinite((q as Cesium.Quaternion).w))
}

// 2. 终点：旧实现会在这里抛 normalized result is not a number
{
  const property = buildProperty([p1, p2, p3])
  const end = at(120) // 3 个点，间隔 60 秒，终点即 120 秒
  let q: unknown = null
  assert.doesNotThrow(() => {
    q = resolveRoamingOrientation(math, property as unknown as PositionSampler, end)
  }, '终点不应再抛 normalized result is not a number')
  assert.ok(q, '终点应回退到「后退方向」，而不是返回 null')
}

// 3. 相邻重合点：中间两次采样位置相同，也不能抛错
{
  const property = buildProperty([p1, p1, p2])
  assert.doesNotThrow(() => {
    resolveRoamingOrientation(math, property as unknown as PositionSampler, at(60))
  }, '重合点处不应抛错')
}

// 4. 只有一个点（任何时刻都没有位移）：返回 null，交给调用方沿用上一次朝向
{
  const property = buildProperty([p1])
  assert.equal(resolveRoamingOrientation(math, property as unknown as PositionSampler, at(0)), null)

  // 采样器自身返回 undefined 时同样安全
  const empty: PositionSampler = { getValue: () => undefined }
  assert.equal(resolveRoamingOrientation(math, empty, at(0)), null)
}

// 5. 含 NaN 的位置不应让 normalize 抛错（NaN 会一路穿透 magnitudeSquared）
{
  const nanPoint = new Cesium.Cartesian3(NaN, NaN, NaN)
  const property = buildProperty([p1, nanPoint, p3])
  assert.doesNotThrow(() => {
    resolveRoamingOrientation(math, property as unknown as PositionSampler, at(60))
  }, 'NaN 位置应被识别并跳过，而不是抛 normalize 错误')
}

// 6. 绘制回调契约：Cartesian3 → WGS84 → 示例里的 fromDegreesArray 不应出现 undefined 经度
{
  const cartesians = [p1, p2, p3]
  const wgs84 = cartesians.map((cartesian) => {
    const carto = Cesium.Cartographic.fromCartesian(cartesian)
    return {
      lng: Cesium.Math.toDegrees(carto.longitude),
      lat: Cesium.Math.toDegrees(carto.latitude),
      alt: carto.height
    }
  })

  // 示例（waterPath）的写法：pos.push(r.lng); pos.push(r.lat)
  const flat: number[] = []
  wgs84.forEach((p) => {
    flat.push(p.lng, p.lat)
  })
  assert.equal(flat.length, 6)
  assert.ok(flat.every(Number.isFinite), '回调若返回 Cartesian3，这里会是 undefined')
  assert.doesNotThrow(() => Cesium.Cartesian3.fromDegreesArray(flat))

  // 含高度版本（贴合分析、漫游内部使用）
  const flatWithAlt = wgs84ArrayToDegreesArrayHeights(wgs84)
  assert.equal(flatWithAlt.length, 9)
  assert.ok(flatWithAlt.every(Number.isFinite))
  assert.doesNotThrow(() => Cesium.Cartesian3.fromDegreesArrayHeights(flatWithAlt))

  // 非法点被过滤，不会把 NaN 带进 Cesium
  assert.deepEqual(wgs84ArrayToDegreesArrayHeights([{ lng: 110, lat: 31 }, {}, null]), [
    110, 31, 0
  ])
}

console.log('roaming tests passed')