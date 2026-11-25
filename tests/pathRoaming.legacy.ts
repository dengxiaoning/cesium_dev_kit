import assert from 'node:assert'
import { toCartesian3, toCartesianPath, type Cartesian3Like } from '../src/utils/cesiumPluginsExtends/libs/pathUtils'

/**
 * 回归测试：路径漫游传 Cartesian3[] 时曾抛
 * `DeveloperError: normalized result is not a number`。
 *
 * 这里用一个最小的 Cesium.Cartesian3 stub 覆盖转换逻辑，
 * 不依赖真实 Cesium / DOM。
 */
const stubCesium = {
  Cartesian3: {
    clone(c: Cartesian3Like): Cartesian3Like {
      return { x: c.x, y: c.y, z: c.z }
    },
    fromDegrees(lng: number, lat: number, alt: number): Cartesian3Like {
      // 只要能真实反映 NaN 传播即可
      return { x: lng * 1, y: lat * 1, z: alt * 1 }
    },
    distance(a: Cartesian3Like, b: Cartesian3Like): number {
      const dx = a.x - b.x
      const dy = a.y - b.y
      const dz = a.z - b.z
      return Math.sqrt(dx * dx + dy * dy + dz * dz)
    }
  }
}

const isFinitePoint = (p: Cartesian3Like) =>
  Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)

// 1. Cartesian3[] 原样保留（这是 draw.drawLineGraphics 回调返回的格式）
{
  const input = [
    { x: -1337132.0, y: 5330611.4, z: 3228680.0 },
    { x: -1337100.0, y: 5330650.0, z: 3228700.0 }
  ]
  const out = toCartesianPath(stubCesium, input)
  assert.equal(out.length, 2)
  assert.ok(out.every(isFinitePoint), '转换结果不应出现 NaN')
  assert.deepEqual(out[0], input[0])
  // 必须是拷贝，避免调用方后续修改污染原始实体
  assert.notEqual(out[0], input[0])
}

// 2. { lng, lat } 缺少 alt 时按 0 处理，而不是 NaN
{
  const out = toCartesianPath(stubCesium, [
    { lng: 110.16, lat: 31.03 },
    { lng: 110.17, lat: 31.04 }
  ])
  assert.equal(out.length, 2)
  assert.equal(out[0].z, 0)
  assert.ok(out.every(isFinitePoint))
}

// 3. 数组写法与 lon/longitude、height 别名
{
  const out = toCartesianPath(stubCesium, [
    [110.1, 31.1, 20],
    { lon: 110.2, latitude: 31.2, height: 30 },
    { longitude: 110.3, lat: 31.3, alt: 40 }
  ])
  assert.equal(out.length, 3)
  assert.deepEqual(out[0], { x: 110.1, y: 31.1, z: 20 })
  assert.deepEqual(out[1], { x: 110.2, y: 31.2, z: 30 })
  assert.deepEqual(out[2], { x: 110.3, y: 31.3, z: 40 })
}

// 4. 非法坐标（NaN / 缺字段 / 非对象）应被过滤，避免 NaN 流入 Cesium
{
  assert.equal(toCartesian3(stubCesium, undefined), undefined)
  assert.equal(toCartesian3(stubCesium, null), undefined)
  assert.equal(toCartesian3(stubCesium, {}), undefined)
  assert.equal(toCartesian3(stubCesium, { lng: 'abc', lat: 31 }), undefined)
  assert.equal(toCartesian3(stubCesium, [NaN, 31]), undefined)
  assert.equal(toCartesian3(stubCesium, { x: NaN, y: 1, z: 2 }), undefined)

  const out = toCartesianPath(stubCesium, [
    { lng: 110.1, lat: 31.1, alt: 0 },
    {},
    { lng: 110.2, lat: 31.2, alt: 0 }
  ])
  assert.equal(out.length, 2, '非法点应被跳过')
  assert.ok(out.every(isFinitePoint))
}

// 5. 相邻重合点去重（重合点会让方向向量长度为 0，归一化即报错）
{
  const out = toCartesianPath(stubCesium, [
    { lng: 110.1, lat: 31.1, alt: 0 },
    { lng: 110.1, lat: 31.1, alt: 0 },
    { lng: 110.1, lat: 31.1, alt: 0 },
    { lng: 110.2, lat: 31.2, alt: 0 }
  ])
  assert.equal(out.length, 2, '相邻重合点应被合并')

  // 首尾相同不算「相邻重合」，闭环路径要保留
  const loop = toCartesianPath(stubCesium, [
    { lng: 110.1, lat: 31.1, alt: 0 },
    { lng: 110.2, lat: 31.2, alt: 0 },
    { lng: 110.1, lat: 31.1, alt: 0 }
  ])
  assert.equal(loop.length, 3)
}

// 6. 非数组 / 空数组：返回空（调用方据此报 INVALID_ARGUMENT，而不是崩溃）
{
  assert.deepEqual(toCartesianPath(stubCesium, undefined), [])
  assert.deepEqual(toCartesianPath(stubCesium, null), [])
  assert.deepEqual(toCartesianPath(stubCesium, []), [])
  assert.deepEqual(toCartesianPath(stubCesium, [{ lng: 1, lat: 2 }]), [
    // 单点无法构成路径，但转换本身仍是合法的
    { x: 1, y: 2, z: 0 }
  ])
}

console.log('pathRoaming tests passed')
