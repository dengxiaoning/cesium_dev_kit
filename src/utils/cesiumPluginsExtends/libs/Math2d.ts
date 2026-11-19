import type { CesiumGlobal } from './Base'
import { createScopedConstructor } from './Base'

/** 模块内部持有的 cesium 全局对象 */

/** 二维坐标点（[x, y]） */
export type Point2d = number[]

/** 圆周等分点 */
export interface CirclePoint2d {
  x: number
  y: number
}

/** 构造函数类型（供 inherits2d 继承工具使用） */
export interface ConstructorLike {
  new (...args: unknown[]): unknown
  prototype: unknown
  superClass_?: unknown
  base?: (me: unknown, methodName: string, ...varArgs: unknown[]) => unknown
  [key: string]: unknown
}

/**
 * 数学2d计算模块
 * @class
 * @param viewer - cesium 实例
 * @param cesiumGlobal - cesium 全局对象
 * @exports Math2d
 */
/**
 * 为每个实例创建独立闭包，避免模块级 Cesium/dfSt 及交互状态在多个 viewer 间共享。
 * 由 createScopedConstructor 在每次 new 时调用。
 */
export function createMath2dModule() {
  let Cesium = {} as CesiumGlobal

class Math2d {
  /** cesium viewer 实例 */
  _viewer!: any

  constructor(viewer?: any, cesiumGlobal?: CesiumGlobal) {
    if (viewer) {
      this._viewer = viewer
      Cesium = cesiumGlobal as CesiumGlobal
    }
  }

  /**
   * 计算两个坐标之间的距离
   * @param pnt1 - 坐标点1
   * @param pnt2 - 坐标点2
   * @returns 计算后距离
   */
  mathDistance2d(pnt1: Point2d, pnt2: Point2d): number {
    return Math.sqrt(Math.pow(pnt1[0] - pnt2[0], 2) + Math.pow(pnt1[1] - pnt2[1], 2))
  }

  /**
   * 求圆周上等分点的坐标
   * @param r - 半径
   * @param ox - 圆心坐标 x
   * @param oy - 圆心坐标 y
   * @param count - 等分个数
   * @returns 等分后的坐标数组
   */
  getCirclePoints2d(r: number, ox: number, oy: number, count: number): CirclePoint2d[] {
    const point: CirclePoint2d[] = []
    const radians = (Math.PI / 180) * Math.round(360 / count)
    for (let i = 0; i < count; i++) {
      const x = ox + r * Math.sin(radians * i)
      const y = oy + r * Math.cos(radians * i)
      point.unshift({ x, y }) // 为保持数据顺时针
    }
    return point
  }

  /**
   * 计算点集合的总距离
   * @param points - 多个点的数组
   * @returns 距离
   */
  wholeDistance2d(points: Point2d[]): number {
    let distance = 0
    if (points && Array.isArray(points) && points.length > 0) {
      points.forEach((item, index) => {
        if (index < points.length - 1) {
          distance += this.mathDistance2d(item, points[index + 1])
        }
      })
    }
    return distance
  }

  /**
   * 获取基础长度
   * @param points - 多个点的数组
   * @returns 长度
   */
  getBaseLength2d(points: Point2d[]): number {
    return Math.pow(this.wholeDistance2d(points), 0.99)
  }

  /**
   * 计算星型
   * @param arms - 角数量
   * @param rOuter - 外圆半径
   * @param rInner - 内圆半径
   * @returns 坐标数组
   */
  computeStar2d(arms: number, rOuter: number, rInner: number): any[] {
    const angle = Math.PI / arms
    const length = 2 * arms
    const positions = new Array(length)
    for (let i = 0; i < length; i++) {
      const r = i % 2 === 0 ? rOuter : rInner
      positions[i] = new Cesium.Cartesian2(Math.cos(i * angle) * r, Math.sin(i * angle) * r)
    }
    return positions
  }

  /**
   * 根据半径获取圆型坐标数据
   * @param radius - 半径
   * @returns 坐标数组
   */
  computeCircleShap(radius: number): any[] {
    const positions: any[] = []
    for (let i = 0; i < 360; i++) {
      const radians = Cesium.Math.toRadians(i)
      positions.push(new Cesium.Cartesian2(radius * Math.cos(radians), radius * Math.sin(radians)))
    }
    return positions
  }

  /**
   * 求取两个坐标的中间值
   * @param point1 - 坐标1
   * @param point2 - 坐标2
   * @returns 中间值坐标数组
   */
  mid2d(point1: Point2d, point2: Point2d): Point2d {
    return [(point1[0] + point2[0]) / 2, (point1[1] + point2[1]) / 2]
  }

  /**
   * 通过三个点确定一个圆的中心点
   * @param point1 - 坐标点1
   * @param point2 - 坐标点2
   * @param point3 - 坐标点3
   * @returns 中心点坐标数组
   */
  getCircleCenterOfThreePoints2d(point1: Point2d, point2: Point2d, point3: Point2d): Point2d {
    const pntA = [(point1[0] + point2[0]) / 2, (point1[1] + point2[1]) / 2]
    const pntB = [pntA[0] - point1[1] + point2[1], pntA[1] + point1[0] - point2[0]]
    const pntC = [(point1[0] + point3[0]) / 2, (point1[1] + point3[1]) / 2]
    const pntD = [pntC[0] - point1[1] + point3[1], pntC[1] + point1[0] - point3[0]]
    return this.getIntersectPoint2d(pntA, pntB, pntC, pntD)
  }

  /**
   * 获取交集的点
   * @param pntA - 坐标点A
   * @param pntB - 坐标点B
   * @param pntC - 坐标点C
   * @param pntD - 坐标点D
   * @returns 相交坐标点数组
   */
  getIntersectPoint2d(pntA: Point2d, pntB: Point2d, pntC: Point2d, pntD: Point2d): Point2d {
    if (pntA[1] === pntB[1]) {
      const f = (pntD[0] - pntC[0]) / (pntD[1] - pntC[1])
      const x = f * (pntA[1] - pntC[1]) + pntC[0]
      const y = pntA[1]
      return [x, y]
    }
    if (pntC[1] === pntD[1]) {
      const e = (pntB[0] - pntA[0]) / (pntB[1] - pntA[1])
      const x = e * (pntC[1] - pntA[1]) + pntA[0]
      const y = pntC[1]
      return [x, y]
    }
    const e = (pntB[0] - pntA[0]) / (pntB[1] - pntA[1])
    const f = (pntD[0] - pntC[0]) / (pntD[1] - pntC[1])
    const y = (e * pntA[1] - pntA[0] - f * pntC[1] + pntC[0]) / (e - f)
    const x = e * y - e * pntA[1] + pntA[0]
    return [x, y]
  }

  /**
   * 根据两个矢量获取方位角（地平经度）
   * @param startPoint - 开始坐标
   * @param endPoint - 结束坐标
   * @returns 方位角度
   */
  getAzimuth2d(startPoint: Point2d, endPoint: Point2d): number {
    let azimuth: number
    const angle = Math.asin(Math.abs(endPoint[1] - startPoint[1]) / this.mathDistance2d(startPoint, endPoint))
    if (endPoint[1] >= startPoint[1] && endPoint[0] >= startPoint[0]) {
      azimuth = angle + Math.PI
    } else if (endPoint[1] >= startPoint[1] && endPoint[0] < startPoint[0]) {
      azimuth = Math.PI * 2 - angle
    } else if (endPoint[1] < startPoint[1] && endPoint[0] < startPoint[0]) {
      azimuth = angle
    } else {
      azimuth = Math.PI - angle
    }
    return azimuth
  }

  /**
   * 通过三个点获取方位角
   * @param pntA - 坐标A
   * @param pntB - 坐标B
   * @param pntC - 坐标C
   * @returns 方位角度
   */
  getAngleOfThreePoints2d(pntA: Point2d, pntB: Point2d, pntC: Point2d): number {
    const angle = this.getAzimuth2d(pntB, pntA) - this.getAzimuth2d(pntB, pntC)
    return angle < 0 ? angle + Math.PI * 2 : angle
  }

  /**
   * 判断是否是顺时针
   * @param pnt1 - 坐标1
   * @param pnt2 - 坐标2
   * @param pnt3 - 坐标3
   * @returns 是否是顺时针
   */
  isClockWise2d(pnt1: Point2d, pnt2: Point2d, pnt3: Point2d): boolean {
    return (pnt3[1] - pnt1[1]) * (pnt2[0] - pnt1[0]) > (pnt2[1] - pnt1[1]) * (pnt3[0] - pnt1[0])
  }

  /** 判断是否是顺时针（别名，与 isClockWise2d 等价） */
  isClockWise(pnt1: Point2d, pnt2: Point2d, pnt3: Point2d): boolean {
    return this.isClockWise2d(pnt1, pnt2, pnt3)
  }

  /**
   * 获取线上的点
   * @param t - 线段总长
   * @param startPnt - 开始坐标
   * @param endPnt - 结束坐标
   * @returns 坐标点数组
   */
  getPointOnLine2d(t: number, startPnt: Point2d, endPnt: Point2d): Point2d {
    const x = startPnt[0] + t * (endPnt[0] - startPnt[0])
    const y = startPnt[1] + t * (endPnt[1] - startPnt[1])
    return [x, y]
  }

  /** 获取立方值 */
  getCubicValue2d(t: number, startPnt: Point2d, cPnt1: Point2d, cPnt2: Point2d, endPnt: Point2d): Point2d {
    t = Math.max(Math.min(t, 1), 0)
    const tp = 1 - t
    const t2 = t * t
    const t3 = t2 * t
    const tp2 = tp * tp
    const tp3 = tp2 * tp
    const x = tp3 * startPnt[0] + 3 * tp2 * t * cPnt1[0] + 3 * tp * t2 * cPnt2[0] + t3 * endPnt[0]
    const y = tp3 * startPnt[1] + 3 * tp2 * t * cPnt1[1] + 3 * tp * t2 * cPnt2[1] + t3 * endPnt[1]
    return [x, y]
  }

  /** 根据起止点和旋转方向求取第三个点 */
  getThirdPoint2d(startPnt: Point2d, endPnt: Point2d, angle: number, distance: number, clockWise: boolean): Point2d {
    const azimuth = this.getAzimuth2d(startPnt, endPnt)
    const alpha = clockWise ? azimuth + angle : azimuth - angle
    const dx = distance * Math.cos(alpha)
    const dy = distance * Math.sin(alpha)
    return [endPnt[0] + dx, endPnt[1] + dy]
  }

  /**
   * 函数继承
   * @param childCtor - 子函数
   * @param parentCtor - 父函数
   */
  inherits2d(childCtor?: ConstructorLike, parentCtor?: ConstructorLike): void {
    function TempCtor() {}
    TempCtor.prototype = parentCtor!.prototype
    childCtor!.superClass_ = parentCtor!.prototype
    childCtor!.prototype = new (TempCtor as unknown as new () => object)()
    ;(childCtor!.prototype as { constructor: unknown }).constructor = childCtor
    childCtor!.base = function (me: unknown, methodName: string, ...varArgs: unknown[]) {
      const args = Array.prototype.slice.call(arguments, 2) as unknown[]
      return (parentCtor!.prototype as Record<string, (this: unknown, ...a: unknown[]) => unknown>)[methodName].apply(me, args)
    }
  }

  /** 插值弓形线段点 */
  getArcPoints2d(center: Point2d, radius: number, startAngle: number, endAngle: number): Point2d[] {
    let x: number
    let y: number
    const pnts: Point2d[] = []
    let angleDiff = endAngle - startAngle
    angleDiff = angleDiff < 0 ? angleDiff + Math.PI * 2 : angleDiff
    for (let i = 0; i <= 100; i++) {
      const angle = startAngle + (angleDiff * i) / 100
      x = center[0] + radius * Math.cos(angle)
      y = center[1] + radius * Math.sin(angle)
      pnts.push([x, y])
    }
    return pnts
  }

  /** getBisectorNormals */
  getBisectorNormals2d(t: number, pnt1: Point2d, pnt2: Point2d, pnt3: Point2d): Point2d[] {
    const normal = this.getNormal2d(pnt1, pnt2, pnt3)
    let bisectorNormalRight: Point2d
    let bisectorNormalLeft: Point2d
    let dt: number
    let x: number
    let y: number
    const dist = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1])
    const uX = normal[0] / dist
    const uY = normal[1] / dist
    const d1 = this.mathDistance2d(pnt1, pnt2)
    const d2 = this.mathDistance2d(pnt2, pnt3)
    if (dist > 0.0001) {
      if (this.isClockWise(pnt1, pnt2, pnt3)) {
        dt = t * d1
        x = pnt2[0] - dt * uY
        y = pnt2[1] + dt * uX
        bisectorNormalRight = [x, y]
        dt = t * d2
        x = pnt2[0] + dt * uY
        y = pnt2[1] - dt * uX
        bisectorNormalLeft = [x, y]
      } else {
        dt = t * d1
        x = pnt2[0] + dt * uY
        y = pnt2[1] - dt * uX
        bisectorNormalRight = [x, y]
        dt = t * d2
        x = pnt2[0] - dt * uY
        y = pnt2[1] + dt * uX
        bisectorNormalLeft = [x, y]
      }
    } else {
      x = pnt2[0] + t * (pnt1[0] - pnt2[0])
      y = pnt2[1] + t * (pnt1[1] - pnt2[1])
      bisectorNormalRight = [x, y]
      x = pnt2[0] + t * (pnt3[0] - pnt2[0])
      y = pnt2[1] + t * (pnt3[1] - pnt2[1])
      bisectorNormalLeft = [x, y]
    }
    return [bisectorNormalRight, bisectorNormalLeft]
  }

  /** 获取默认三点的内切圆 */
  getNormal2d(pnt1: Point2d, pnt2: Point2d, pnt3: Point2d): Point2d {
    let dX1 = pnt1[0] - pnt2[0]
    let dY1 = pnt1[1] - pnt2[1]
    const d1 = Math.sqrt(dX1 * dX1 + dY1 * dY1)
    dX1 /= d1
    dY1 /= d1
    let dX2 = pnt3[0] - pnt2[0]
    let dY2 = pnt3[1] - pnt2[1]
    const d2 = Math.sqrt(dX2 * dX2 + dY2 * dY2)
    dX2 /= d2
    dY2 /= d2
    const uX = dX1 + dX2
    const uY = dY1 + dY2
    return [uX, uY]
  }

  /** 获取左边控制点 */
  getLeftMostControlPoint2d(controlPoints: Point2d[], t: number): Point2d {
    const pnt1 = controlPoints[0]
    const pnt2 = controlPoints[1]
    const pnt3 = controlPoints[2]
    let controlX: number
    let controlY: number
    const pnts = this.getBisectorNormals2d(0, pnt1, pnt2, pnt3)
    const normalRight = pnts[0]
    const normal = this.getNormal2d(pnt1, pnt2, pnt3)
    const dist = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1])
    if (dist > 0.0001) {
      const mid = this.mid2d(pnt1, pnt2)
      const pX = pnt1[0] - mid[0]
      const pY = pnt1[1] - mid[1]
      const d1 = this.mathDistance2d(pnt1, pnt2)
      const n = 2.0 / d1
      const nX = -n * pY
      const nY = n * pX
      const a11 = nX * nX - nY * nY
      const a12 = 2 * nX * nY
      const a22 = nY * nY - nX * nX
      const dX = normalRight[0] - mid[0]
      const dY = normalRight[1] - mid[1]
      controlX = mid[0] + a11 * dX + a12 * dY
      controlY = mid[1] + a12 * dX + a22 * dY
    } else {
      controlX = pnt1[0] + t * (pnt2[0] - pnt1[0])
      controlY = pnt1[1] + t * (pnt2[1] - pnt1[1])
    }
    return [controlX, controlY]
  }

  /** 获取右边控制点 */
  getRightMostControlPoint2d(controlPoints: Point2d[], t: number): Point2d {
    const count = controlPoints.length
    const pnt1 = controlPoints[count - 3]
    const pnt2 = controlPoints[count - 2]
    const pnt3 = controlPoints[count - 1]
    const pnts = this.getBisectorNormals2d(0, pnt1, pnt2, pnt3)
    const normalLeft = pnts[1]
    const normal = this.getNormal2d(pnt1, pnt2, pnt3)
    const dist = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1])
    let controlX: number
    let controlY: number
    if (dist > 0.0001) {
      const mid = this.mid2d(pnt2, pnt3)
      const pX = pnt3[0] - mid[0]
      const pY = pnt3[1] - mid[1]
      const d1 = this.mathDistance2d(pnt2, pnt3)
      const n = 2.0 / d1
      const nX = -n * pY
      const nY = n * pX
      const a11 = nX * nX - nY * nY
      const a12 = 2 * nX * nY
      const a22 = nY * nY - nX * nX
      const dX = normalLeft[0] - mid[0]
      const dY = normalLeft[1] - mid[1]
      controlX = mid[0] + a11 * dX + a12 * dY
      controlY = mid[1] + a12 * dX + a22 * dY
    } else {
      controlX = pnt3[0] + t * (pnt2[0] - pnt3[0])
      controlY = pnt3[1] + t * (pnt2[1] - pnt3[1])
    }
    return [controlX, controlY]
  }

  /** 插值曲线点 */
  getCurvePoints2d(t: number, controlPoints: Point2d[]): Point2d[] {
    const leftControl = this.getLeftMostControlPoint2d(controlPoints, t)
    let pnt1: Point2d
    let pnt2: Point2d
    let pnt3: Point2d
    let normals: Point2d[] = [leftControl]
    const points: Point2d[] = []
    for (let i = 0; i < controlPoints.length - 2; i++) {
      pnt1 = controlPoints[i]
      pnt2 = controlPoints[i + 1]
      pnt3 = controlPoints[i + 2]
      const normalPoints = this.getBisectorNormals2d(t, pnt1, pnt2, pnt3)
      normals = normals.concat(normalPoints)
    }
    const rightControl = this.getRightMostControlPoint2d(controlPoints, t)
    if (rightControl) {
      normals.push(rightControl)
    }
    for (let i = 0; i < controlPoints.length - 1; i++) {
      pnt1 = controlPoints[i]
      pnt2 = controlPoints[i + 1]
      points.push(pnt1)
      for (let tt = 0; tt < 100; tt++) {
        const pnt = this.getCubicValue2d(tt / 100, pnt1, normals[i * 2], normals[i * 2 + 1], pnt2)
        points.push(pnt)
      }
      points.push(pnt2)
    }
    return points
  }

  /**
   * 获取贝塞尔曲线
   * @param points - 坐标数组
   * @returns 贝塞尔曲线数组
   */
  getBezierPoints2d(points: Point2d[]): Point2d[] {
    if (points.length <= 2) {
      return points
    } else {
      const bezierPoints: Point2d[] = []
      const n = points.length - 1
      for (let t = 0; t <= 1; t += 0.01) {
        let x = 0
        let y = 0
        for (let index = 0; index <= n; index++) {
          const factor = this.getBinomialFactor2d(n, index)
          const a = Math.pow(t, index)
          const b = Math.pow(1 - t, n - index)
          x += factor * a * b * points[index][0]
          y += factor * a * b * points[index][1]
        }
        bezierPoints.push([x, y])
      }
      bezierPoints.push(points[n])
      return bezierPoints
    }
  }

  /** 获取阶乘数据 */
  getFactorial2d(n: number): number {
    let result = 1
    for (let i = 1; i <= n; i++) {
      result *= i
    }
    return result
  }

  /** 获取二项分布 */
  getBinomialFactor2d(n: number, index: number): number {
    return this.getFactorial2d(n) / (this.getFactorial2d(index) * this.getFactorial2d(n - index))
  }

  /** 插值线性点 */
  getQBSplinePoints2d(points: Point2d[]): Point2d[] {
    if (points.length <= 2) {
      return points
    } else {
      const n = 2
      const bSplinePoints: Point2d[] = []
      const m = points.length - n - 1
      bSplinePoints.push(points[0])
      for (let i = 0; i <= m; i++) {
        for (let t = 0; t <= 1; t += 0.05) {
          let x = 0
          let y = 0
          for (let k = 0; k <= n; k++) {
            const factor = this.getQuadricBSplineFactor2d(k, t)
            x += factor * points[i + k][0]
            y += factor * points[i + k][1]
          }
          bSplinePoints.push([x, y])
        }
      }
      bSplinePoints.push(points[points.length - 1])
      return bSplinePoints
    }
  }

  /** 得到二次线性因子 */
  getQuadricBSplineFactor2d(k: number, t: number): number {
    let res = 0
    if (k === 0) {
      res = Math.pow(t - 1, 2) / 2
    } else if (k === 1) {
      res = (-2 * Math.pow(t, 2) + 2 * t + 1) / 2
    } else if (k === 2) {
      res = Math.pow(t, 2) / 2
    }
    return res
  }
}

/** Math2d 实例类型（兼容旧导出） */
  return Math2d
}

export const Math2d = createScopedConstructor(createMath2dModule)
export type Math2dInstance = InstanceType<typeof Math2d>

/** Math2d 构造函数类型（兼容旧导出） */
export type Math2dConstructor = typeof Math2d
