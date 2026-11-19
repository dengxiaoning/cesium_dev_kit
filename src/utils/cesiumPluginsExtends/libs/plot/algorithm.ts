import {
  P
} from './plotUtil'
import type { CesiumGlobal } from '../Base'

/* 原实现依赖的运行时全局变量（threeArrow 未通过参数传入 Cesium），补充声明以通过类型检查 */
declare var Cesium: CesiumGlobal

/** 二维坐标点 [lon, lat] */
type Pt = number[]

/** 箭头计算结果 */
interface ArrowResult {
  controlPoint: Pt[] | null
  polygonalPoint: any[] | Pt[] | null
}

/** 默认参数 */
interface ArrowDefaultParam {
  type?: string
  headHeightFactor: number
  headWidthFactor: number
  neckHeightFactor: number
  neckWidthFactor: number
  fixPointCount?: number
  tailWidthFactor?: number
  headTailFactor?: number
  swallowTailFactor?: number
  swallowTailPnt?: Pt | null
}

/** 箭头算法对象 */
export interface XpAlgorithm {
  doubleArrow(inputPoint: Pt[], Cesium: CesiumGlobal): ArrowResult | Pt[]
  threeArrow(inputPoint: Pt[]): ArrowResult | Pt[]
  array2Dto1D(array: Pt[]): number[]
  getArrowPoints(t: Pt, o: Pt, e: Pt, r: boolean): Pt[]
  getArrowHeadPoints(t: Pt[], o: number, e: number, neckHeightFactor: number, neckWidthFactor: number): Pt[]
  getArrowBodyPoints(t: Pt[], o: Pt, e: Pt, r: number): Pt[]
  getTempPoint4(t: Pt, o: Pt, e: Pt): Pt
  tailedAttackArrow(inputPoint: Pt[], Cesium: CesiumGlobal): ArrowResult
  getAttackArrowHeadPoints(t: Pt[], o: Pt, e: Pt, defaultParam: ArrowDefaultParam): Pt[]
  getAttackArrowBodyPoints(t: Pt[], o: Pt, e: Pt, r: number): Pt[]
  dereplication(array: Pt[]): Pt[]
  fineArrow(tailPoint: Pt, headerPoint: Pt, Cesium: CesiumGlobal): any[] | string | undefined
}

const xp: {
  version: string
  createTime: string
  author: string
  algorithm: XpAlgorithm
} = {
  version: '1.0.0',
  createTime: '2018.6.19',
  author: 'xupinhui',
  algorithm: {} as XpAlgorithm
}

const doubleArrowDefualParam: ArrowDefaultParam = {
  type: 'doublearrow',
  headHeightFactor: 0.25,
  headWidthFactor: 0.3,
  neckHeightFactor: 0.85,
  fixPointCount: 4,
  neckWidthFactor: 0.15
}
const tailedAttackArrowDefualParam: ArrowDefaultParam = {
  headHeightFactor: 0.18,
  headWidthFactor: 0.3,
  neckHeightFactor: 0.85,
  neckWidthFactor: 0.15,
  tailWidthFactor: 0.1,
  headTailFactor: 0.8,
  swallowTailFactor: 1
}
const fineArrowDefualParam: {
  tailWidthFactor: number
  neckWidthFactor: number
  headWidthFactor: number
  headAngle: number
  neckAngle: number
} = {
  tailWidthFactor: 0.15,
  neckWidthFactor: 0.20,
  headWidthFactor: 0.25,
  headAngle: Math.PI / 8.5,
  neckAngle: Math.PI / 13
}

xp.algorithm.doubleArrow = function (inputPoint: Pt[], Cesium: CesiumGlobal): ArrowResult | Pt[] {
  const points = inputPoint
  const result: ArrowResult = {
    controlPoint: null,
    polygonalPoint: null
  }
  const t = inputPoint.length
  if (!(2 > t)) {
    if (2 == t) return inputPoint
    const o = points[0]
    const e = points[1]
    const r = points[2]
    let tempPoint4: Pt | null
    if (3 == t) {
      tempPoint4 = xp.algorithm.getTempPoint4(o, e, r)
    } else {
      tempPoint4 = points[3]
    }
    let connPoint: Pt | null
    if (3 == t || 4 == t) {
      connPoint = P.PlotUtils.mid(o, e)
    } else {
      connPoint = points[4]
    }
    let n: Pt[]
    let g: Pt[]
    if (P.PlotUtils.isClockWise(o, e, r)) {
      n = xp.algorithm.getArrowPoints(o, connPoint, tempPoint4, false)
      g = xp.algorithm.getArrowPoints(connPoint, e, r, true)
    } else {
      n = xp.algorithm.getArrowPoints(e, connPoint, r, false)
      g = xp.algorithm.getArrowPoints(connPoint, o, tempPoint4, true)
    }
    const i = n.length
    const s = (i - 5) / 2
    let a = n.slice(0, s)
    const l = n.slice(s, s + 5)
    let u = n.slice(s + 5, i)
    let c = g.slice(0, s)
    const p = g.slice(s, s + 5)
    const h = g.slice(s + 5, i)
    c = P.PlotUtils.getBezierPoints(c)
    const d = P.PlotUtils.getBezierPoints(h.concat(a.slice(1)))
    u = P.PlotUtils.getBezierPoints(u)
    const f = c.concat(p, d, l, u)
    const newArray = xp.algorithm.array2Dto1D(f)
    result.controlPoint = [o, e, r, tempPoint4, connPoint]
    result.polygonalPoint = Cesium.Cartesian3.fromDegreesArray(newArray)
  }
  return result
}

xp.algorithm.threeArrow = function (inputPoint: Pt[]): ArrowResult | Pt[] {
  const points = inputPoint
  const result: ArrowResult = {
    controlPoint: null,
    polygonalPoint: null
  }
  const t = inputPoint.length
  if (t >= 2) {
    if (t == 2) {
      return inputPoint
    }
    const o = points[0]
    const e = points[1]
    const r = points[2]
    let tempPoint4: Pt | null
    let tempPoint5: Pt | null
    if (t == 3) {
      tempPoint4 = xp.algorithm.getTempPoint4(o, e, r)
      tempPoint5 = P.PlotUtils.mid(r, tempPoint4)
    } else {
      tempPoint4 = points[3]
      tempPoint5 = points[4]
    }
    let connPoint: Pt | null
    if (t < 6) {
      connPoint = P.PlotUtils.mid(o, e)
    } else {
      connPoint = points[5]
    }
    let n: Pt[]
    let g: Pt[]
    if (P.PlotUtils.isClockWise(o, e, r)) {
      n = xp.algorithm.getArrowPoints(o, connPoint, tempPoint4, false)
      g = xp.algorithm.getArrowPoints(connPoint, e, r, true)
    } else {
      n = xp.algorithm.getArrowPoints(e, connPoint, r, false)
      g = xp.algorithm.getArrowPoints(connPoint, o, tempPoint4, true)
    }
    const i = n.length
    const s = (i - 5) / 2
    let a = n.slice(0, s)
    const l = n.slice(s, s + 5)
    let u = n.slice(s + 5, i)
    let c = g.slice(0, s)
    const p = g.slice(s, s + 5)
    const h = g.slice(s + 5, i)
    c = P.PlotUtils.getBezierPoints(c)
    const d = P.PlotUtils.getBezierPoints(h.concat(a.slice(1)))
    u = P.PlotUtils.getBezierPoints(u)
    const f = c.concat(p, d, l, u)
    const newArray = xp.algorithm.array2Dto1D(f)
    result.controlPoint = [o, e, r, tempPoint4, tempPoint5, connPoint]
    result.polygonalPoint = Cesium.Cartesian3.fromDegreesArray(newArray)
  }
  return result
}

xp.algorithm.array2Dto1D = function (array: Pt[]): number[] {
  const newArray: number[] = []
  array.forEach(function (elt: Pt) {
    newArray.push(elt[0])
    newArray.push(elt[1])
  })
  return newArray
}

xp.algorithm.getArrowPoints = function (t: Pt, o: Pt, e: Pt, r: boolean): Pt[] {
  const headHeightFactor = doubleArrowDefualParam.headHeightFactor
  const headWidthFactor = doubleArrowDefualParam.headWidthFactor
  const neckHeightFactor = doubleArrowDefualParam.neckHeightFactor
  const neckWidthFactor = doubleArrowDefualParam.neckWidthFactor
  const n = P.PlotUtils.mid(t, o)
  const g = P.PlotUtils.distance(n, e)
  let i = P.PlotUtils.getThirdPoint(e, n, 0, 0.3 * g, true)
  let s = P.PlotUtils.getThirdPoint(e, n, 0, 0.5 * g, true)
  i = P.PlotUtils.getThirdPoint(n, i, P.Constants.HALF_PI, g / 5, r)
  s = P.PlotUtils.getThirdPoint(n, s, P.Constants.HALF_PI, g / 4, r)
  const a = [n, i, s, e]
  const l = xp.algorithm.getArrowHeadPoints(a, headHeightFactor, headWidthFactor, neckHeightFactor, neckWidthFactor)
  const u = l[0]
  const c = l[4]
  const p = P.PlotUtils.distance(t, o) / P.PlotUtils.getBaseLength(a) / 2
  const h = xp.algorithm.getArrowBodyPoints(a, u, c, p)
  const d = h.length
  let f = h.slice(0, d / 2)
  let E = h.slice(d / 2, d)
  f.push(u)
  E.push(c)
  f = f.reverse()
  f.push(o)
  E = E.reverse()
  E.push(t)
  return f.reverse().concat(l, E)
}

xp.algorithm.getArrowHeadPoints = function (t: Pt[], o: number, e: number, neckHeightFactor: number, neckWidthFactor: number): Pt[] {
  const headHeightFactor = doubleArrowDefualParam.headHeightFactor
  const headWidthFactor = doubleArrowDefualParam.headWidthFactor
  const r = P.PlotUtils.getBaseLength(t)
  const n = r * headHeightFactor
  const g = t[t.length - 1]
  const i = n * headWidthFactor
  const s = n * neckWidthFactor
  const a = n * neckHeightFactor
  const l = P.PlotUtils.getThirdPoint(t[t.length - 2], g, 0, n, true)
  const u = P.PlotUtils.getThirdPoint(t[t.length - 2], g, 0, a, true)
  const c = P.PlotUtils.getThirdPoint(g, l, P.Constants.HALF_PI, i, false)
  const p = P.PlotUtils.getThirdPoint(g, l, P.Constants.HALF_PI, i, true)
  const h = P.PlotUtils.getThirdPoint(g, u, P.Constants.HALF_PI, s, false)
  const d = P.PlotUtils.getThirdPoint(g, u, P.Constants.HALF_PI, s, true)
  return [h, c, g, p, d]
}

xp.algorithm.getArrowBodyPoints = function (t: Pt[], o: Pt, e: Pt, r: number): Pt[] {
  const n = P.PlotUtils.wholeDistance(t)
  const g = P.PlotUtils.getBaseLength(t)
  const i = g * r
  const s = P.PlotUtils.distance(o, e)
  const a = (i - s) / 2
  let l = 0
  const u: Pt[] = []
  const c: Pt[] = []
  for (let p = 1; p < t.length - 1; p++) {
    const h = P.PlotUtils.getAngleOfThreePoints(t[p - 1], t[p], t[p + 1]) / 2
    l += P.PlotUtils.distance(t[p - 1], t[p])
    const d = ((i / 2 - (l / n) * a)) / Math.sin(h)
    const f = P.PlotUtils.getThirdPoint(t[p - 1], t[p], Math.PI - h, d, true)
    const E = P.PlotUtils.getThirdPoint(t[p - 1], t[p], h, d, false)
    u.push(f)
    c.push(E)
  }
  return u.concat(c)
}

xp.algorithm.getTempPoint4 = function (t: Pt, o: Pt, e: Pt): Pt {
  let r: Pt
  let n: number
  let g: number
  let i: Pt
  const s = P.PlotUtils.mid(t, o)
  const a = P.PlotUtils.distance(s, e)
  const l = P.PlotUtils.getAngleOfThreePoints(t, s, e)
  if (l < P.Constants.HALF_PI) {
    n = a * Math.sin(l)
    g = a * Math.cos(l)
    i = P.PlotUtils.getThirdPoint(t, s, P.Constants.HALF_PI, n, false)
    r = P.PlotUtils.getThirdPoint(s, i, P.Constants.HALF_PI, g, true)
  } else if (l >= P.Constants.HALF_PI && l < Math.PI) {
    n = a * Math.sin(Math.PI - l)
    g = a * Math.cos(Math.PI - l)
    i = P.PlotUtils.getThirdPoint(t, s, P.Constants.HALF_PI, n, false)
    r = P.PlotUtils.getThirdPoint(s, i, P.Constants.HALF_PI, g, false)
  } else if (l >= Math.PI && l < 1.5 * Math.PI) {
    n = a * Math.sin(l - Math.PI)
    g = a * Math.cos(l - Math.PI)
    i = P.PlotUtils.getThirdPoint(t, s, P.Constants.HALF_PI, n, true)
    r = P.PlotUtils.getThirdPoint(s, i, P.Constants.HALF_PI, g, true)
  } else {
    n = a * Math.sin(2 * Math.PI - l)
    g = a * Math.cos(2 * Math.PI - l)
    i = P.PlotUtils.getThirdPoint(t, s, P.Constants.HALF_PI, n, true)
    r = P.PlotUtils.getThirdPoint(s, i, P.Constants.HALF_PI, g, false)
  }
  return r
}

xp.algorithm.tailedAttackArrow = function (inputPoint: Pt[], Cesium: CesiumGlobal): ArrowResult {
  inputPoint = xp.algorithm.dereplication(inputPoint)
  const tailWidthFactor = tailedAttackArrowDefualParam.tailWidthFactor as number
  const swallowTailFactor = tailedAttackArrowDefualParam.swallowTailFactor as number
  let swallowTailPnt: Pt | null = (tailedAttackArrowDefualParam.swallowTailPnt as Pt | null) || null
  const result: ArrowResult = {
    controlPoint: null,
    polygonalPoint: null
  }
  result.controlPoint = inputPoint
  const t = inputPoint.length
  if (!(2 > t)) {
    if (2 == inputPoint.length) {
      result.polygonalPoint = inputPoint
      return result
    }
    const o = inputPoint
    let e = o[0]
    let r = o[1]
    if (P.PlotUtils.isClockWise(o[0], o[1], o[2])) {
      e = o[1]
      r = o[0]
    }
    const n = P.PlotUtils.mid(e, r)
    const g = [n].concat(o.slice(2))
    const i = xp.algorithm.getAttackArrowHeadPoints(g, e, r, tailedAttackArrowDefualParam)
    const s = i[0]
    const a = i[4]
    const l = P.PlotUtils.distance(e, r)
    const u = P.PlotUtils.getBaseLength(g)
    const c = u * tailWidthFactor * swallowTailFactor
    swallowTailPnt = P.PlotUtils.getThirdPoint(g[1], g[0], 0, c, true)
    const p = l / u
    const h = xp.algorithm.getAttackArrowBodyPoints(g, s, a, p)
    const hLen = h.length
    let d = [e].concat(h.slice(0, hLen / 2))
    d.push(s)
    let f = [r].concat(h.slice(hLen / 2, hLen))
    f.push(a)
    d = P.PlotUtils.getQBSplinePoints(d)
    f = P.PlotUtils.getQBSplinePoints(f)
    const newArray = xp.algorithm.array2Dto1D(d.concat(i, f.reverse(), [swallowTailPnt, d[0]]))
    result.polygonalPoint = Cesium.Cartesian3.fromDegreesArray(newArray)
  }
  return result
}

xp.algorithm.getAttackArrowHeadPoints = function (t: Pt[], o: Pt, e: Pt, defaultParam: ArrowDefaultParam): Pt[] {
  const headHeightFactor = defaultParam.headHeightFactor
  const headTailFactor = defaultParam.headTailFactor as number
  const headWidthFactor = defaultParam.headWidthFactor
  const neckWidthFactor = defaultParam.neckWidthFactor
  const neckHeightFactor = defaultParam.neckHeightFactor
  let r = P.PlotUtils.getBaseLength(t)
  let n = r * headHeightFactor
  const g = t[t.length - 1]
  r = P.PlotUtils.distance(g, t[t.length - 2])
  const i = P.PlotUtils.distance(o, e)
  if (n > i * headTailFactor) n = i * headTailFactor
  const s = n * headWidthFactor
  const a = n * neckWidthFactor
  if (n > r) n = r
  const l = n * neckHeightFactor
  const u = P.PlotUtils.getThirdPoint(t[t.length - 2], g, 0, n, true)
  const c = P.PlotUtils.getThirdPoint(t[t.length - 2], g, 0, l, true)
  const p = P.PlotUtils.getThirdPoint(g, u, P.Constants.HALF_PI, s, false)
  const h = P.PlotUtils.getThirdPoint(g, u, P.Constants.HALF_PI, s, true)
  const d = P.PlotUtils.getThirdPoint(g, c, P.Constants.HALF_PI, a, false)
  const f = P.PlotUtils.getThirdPoint(g, c, P.Constants.HALF_PI, a, true)
  return [d, p, g, h, f]
}

xp.algorithm.getAttackArrowBodyPoints = function (t: Pt[], o: Pt, e: Pt, r: number): Pt[] {
  const n = P.PlotUtils.wholeDistance(t)
  const g = P.PlotUtils.getBaseLength(t)
  const i = g * r
  const s = P.PlotUtils.distance(o, e)
  const a = (i - s) / 2
  let l = 0
  const u: Pt[] = []
  const c: Pt[] = []
  for (let p = 1; p < t.length - 1; p++) {
    const h = P.PlotUtils.getAngleOfThreePoints(t[p - 1], t[p], t[p + 1]) / 2
    l += P.PlotUtils.distance(t[p - 1], t[p])
    const d = ((i / 2 - (l / n) * a)) / Math.sin(h)
    const f = P.PlotUtils.getThirdPoint(t[p - 1], t[p], Math.PI - h, d, true)
    const E = P.PlotUtils.getThirdPoint(t[p - 1], t[p], h, d, false)
    u.push(f)
    c.push(E)
  }
  return u.concat(c)
}

xp.algorithm.dereplication = function (array: Pt[]): Pt[] {
  const last = array[array.length - 1]
  let change = false
  let newArray: Pt[] = []
  newArray = array.filter(function (i: Pt) {
    if (i[0] != last[0] && i[1] != last[1]) {
      return true
    }
    change = true
    return false
  })
  if (change) newArray.push(last)
  return newArray
}

xp.algorithm.fineArrow = function (tailPoint: Pt, headerPoint: Pt, Cesium: CesiumGlobal): any[] | string | undefined {
  if ((tailPoint.length < 2) || (headerPoint.length < 2)) return

  const tailWidthFactor = fineArrowDefualParam.tailWidthFactor
  const neckWidthFactor = fineArrowDefualParam.neckWidthFactor
  const headWidthFactor = fineArrowDefualParam.headWidthFactor
  const headAngle = fineArrowDefualParam.headAngle
  const neckAngle = fineArrowDefualParam.neckAngle
  const o: Pt[] = []
  o[0] = tailPoint
  o[1] = headerPoint
  const e = o[0]
  const r = o[1]
  const n = P.PlotUtils.getBaseLength(o)
  const g = n * tailWidthFactor
  const i = n * neckWidthFactor
  const s = n * headWidthFactor
  const a = P.PlotUtils.getThirdPoint(r, e, P.Constants.HALF_PI, g, true)
  const l = P.PlotUtils.getThirdPoint(r, e, P.Constants.HALF_PI, g, false)
  const u = P.PlotUtils.getThirdPoint(e, r, headAngle, s, false)
  const c = P.PlotUtils.getThirdPoint(e, r, headAngle, s, true)
  const p = P.PlotUtils.getThirdPoint(e, r, neckAngle, i, false)
  const h = P.PlotUtils.getThirdPoint(e, r, neckAngle, i, true)
  const d: number[] = []
  d.push(a[0], a[1], p[0], p[1], u[0], u[1], r[0], r[1], c[0], c[1], h[0], h[1], l[0], l[1], e[0], e[1])
  const vaildData = d.some((e: number) => isNaN(e))
  return vaildData ? '' : Cesium.Cartesian3.fromDegreesArray(d)
}

export {
  xp
}
