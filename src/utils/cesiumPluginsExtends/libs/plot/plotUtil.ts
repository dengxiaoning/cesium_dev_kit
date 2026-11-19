/** 二维坐标点 */
type Point = number[]

/* 原实现依赖的运行时全局变量（未赋值，历史遗留），补充声明以通过类型检查 */
declare var t: number

/** 常量 */
const Constants = {
  TWO_PI: 2 * Math.PI,
  HALF_PI: Math.PI / 2,
  FITTING_COUNT: 100,
  ZERO_TOLERANCE: 1e-4
}

/** PlotUtils 工具集 */
interface PlotUtilsType {
  distance(t: Point, o: Point): number
  wholeDistance(t: Point[]): number
  getBaseLength(t: Point[]): number
  mid(t: Point, o: Point): Point
  getCircleCenterOfThreePoints(t: Point, o: Point, e: Point): Point
  getIntersectPoint(t: Point, o: Point, e: Point, r: Point): Point
  getAzimuth(t: Point, o: Point): number
  getAngleOfThreePoints(t: Point, o: Point, e: Point): number
  isClockWise(t: Point, o: Point, e: Point): boolean
  getPointOnLine(t: number, o: Point, e: Point): Point
  getCubicValue(t: number, o: Point, e: Point, r: Point, n: Point): Point
  getThirdPoint(t: Point, o: Point, e: number, r: number, n: boolean): Point
  getArcPoints(t: Point, o: number, e: number, r: number): Point[]
  getBisectorNormals(t: number, o: Point, e: Point, r: Point): Point[]
  getNormal(t: Point, o: Point, e: Point): Point
  getCurvePoints(t: number, o: Point[]): Point[]
  getLeftMostControlPoint(o: Point[]): Point
  getRightMostControlPoint(o: Point[]): Point
  getBezierPoints(t: Point[]): Point[]
  getBinomialFactor(t: number, o: number): number
  getFactorial(t: number): number
  getQBSplinePoints(t: Point[]): Point[]
  getQuadricBSplineFactor(t: number, o: number): number
}

const PlotUtils = {} as PlotUtilsType

const P: {
  version: string
  PlotUtils: PlotUtilsType
  Constants: typeof Constants
} = {
  version: '1.0.0',
  PlotUtils,
  Constants
}

P.PlotUtils.distance = function (t: Point, o: Point): number {
  return Math.sqrt(Math.pow(t[0] - o[0], 2) + Math.pow(t[1] - o[1], 2))
}
P.PlotUtils.wholeDistance = function (t: Point[]): number {
  let o = 0
  for (let e = 0; e < t.length - 1; e++) o += P.PlotUtils.distance(t[e], t[e + 1]) as number
  return o
}
P.PlotUtils.getBaseLength = function (t: Point[]): number {
  return Math.pow(P.PlotUtils.wholeDistance(t) as number, 0.99)
}
P.PlotUtils.mid = function (t: Point, o: Point): Point {
  return [(t[0] + o[0]) / 2, (t[1] + o[1]) / 2]
}
P.PlotUtils.getCircleCenterOfThreePoints = function (t: Point, o: Point, e: Point): Point {
  const r: Point = [(t[0] + o[0]) / 2, (t[1] + o[1]) / 2]
  const n: Point = [r[0] - t[1] + o[1], r[1] + t[0] - o[0]]
  const g: Point = [(t[0] + e[0]) / 2, (t[1] + e[1]) / 2]
  const i: Point = [g[0] - t[1] + e[1], g[1] + t[0] - e[0]]
  return P.PlotUtils.getIntersectPoint(r, n, g, i) as Point
}
P.PlotUtils.getIntersectPoint = function (t: Point, o: Point, e: Point, r: Point): Point {
  let g: number
  let i: number
  let s: number
  let n: number
  if (t[1] == o[1]) {
    n = (r[0] - e[0]) / (r[1] - e[1])
    g = n * (t[1] - e[1]) + e[0]
    i = t[1]
    return [g, i]
  }
  if (e[1] == r[1]) {
    s = (o[0] - t[0]) / (o[1] - t[1])
    g = s * (e[1] - t[1]) + t[0]
    i = e[1]
    return [g, i]
  }
  s = (o[0] - t[0]) / (o[1] - t[1])
  n = (r[0] - e[0]) / (r[1] - e[1])
  i = (s * t[1] - t[0] - n * e[1] + e[0]) / (s - n)
  g = s * i - s * t[1] + t[0]
  return [g, i]
}
P.PlotUtils.getAzimuth = function (t: Point, o: Point): number {
  let e = 0
  const r = Math.asin(Math.abs(o[1] - t[1]) / (P.PlotUtils.distance(t, o) as number))
  if (o[1] >= t[1] && o[0] >= t[0]) e = r + Math.PI
  else if (o[1] >= t[1] && o[0] < t[0]) e = Constants.TWO_PI - r
  else if (o[1] < t[1] && o[0] < t[0]) e = r
  else if (o[1] < t[1] && o[0] >= t[0]) e = Math.PI - r
  return e
}
P.PlotUtils.getAngleOfThreePoints = function (t: Point, o: Point, e: Point): number {
  const r = (P.PlotUtils.getAzimuth(o, t) as number) - (P.PlotUtils.getAzimuth(o, e) as number)
  return 0 > r ? r + Constants.TWO_PI : r
}
P.PlotUtils.isClockWise = function (t: Point, o: Point, e: Point): boolean {
  return (e[1] - t[1]) * (o[0] - t[0]) > (o[1] - t[1]) * (e[0] - t[0])
}
P.PlotUtils.getPointOnLine = function (t: number, o: Point, e: Point): Point {
  const r = o[0] + t * (e[0] - o[0])
  const n = o[1] + t * (e[1] - o[1])
  return [r, n]
}
P.PlotUtils.getCubicValue = function (t: number, o: Point, e: Point, r: Point, n: Point): Point {
  t = Math.max(Math.min(t, 1), 0)
  const g = 1 - t
  const i = t * t
  const s = i * t
  const a = g * g
  const l = a * g
  const u = l * o[0] + 3 * a * t * e[0] + 3 * g * i * r[0] + s * n[0]
  const c = l * o[1] + 3 * a * t * e[1] + 3 * g * i * r[1] + s * n[1]
  return [u, c]
}
P.PlotUtils.getThirdPoint = function (t: Point, o: Point, e: number, r: number, n: boolean): Point {
  const g = P.PlotUtils.getAzimuth(t, o) as number
  const i = n ? g + e : g - e
  const s = r * Math.cos(i)
  const a = r * Math.sin(i)
  return [o[0] + s, o[1] + a]
}
P.PlotUtils.getArcPoints = function (t: Point, o: number, e: number, r: number): Point[] {
  let n: number
  let g: number
  const i: Point[] = []
  let s = r - e
  s = 0 > s ? s + Constants.TWO_PI : s
  for (let a = 0; a <= Constants.FITTING_COUNT; a++) {
    const l = e + (s * a) / Constants.FITTING_COUNT
    n = t[0] + o * Math.cos(l)
    g = t[1] + o * Math.sin(l)
    i.push([n, g])
  }
  return i
}
P.PlotUtils.getBisectorNormals = function (t: number, o: Point, e: Point, r: Point): Point[] {
  let h: Point
  let d: Point
  const n = P.PlotUtils.getNormal(o, e, r) as Point
  const g = Math.sqrt(n[0] * n[0] + n[1] * n[1])
  const i = n[0] / g
  const s = n[1] / g
  const a = P.PlotUtils.distance(o, e) as number
  const l = P.PlotUtils.distance(e, r) as number
  let u: number
  let c: number
  let p: number
  if (g > Constants.ZERO_TOLERANCE) {
    if (P.PlotUtils.isClockWise(o, e, r) as boolean) {
      u = t * a
      c = e[0] - u * s
      p = e[1] + u * i
      h = [c, p]
      u = t * l
      c = e[0] + u * s
      p = e[1] - u * i
      d = [c, p]
    } else {
      u = t * a
      c = e[0] + u * s
      p = e[1] - u * i
      h = [c, p]
      u = t * l
      c = e[0] - u * s
      p = e[1] + u * i
      d = [c, p]
    }
  } else {
    c = e[0] + t * (o[0] - e[0])
    p = e[1] + t * (o[1] - e[1])
    h = [c, p]
    c = e[0] + t * (r[0] - e[0])
    p = e[1] + t * (r[1] - e[1])
    d = [c, p]
  }
  return [h, d]
}
P.PlotUtils.getNormal = function (t: Point, o: Point, e: Point): Point {
  let r = t[0] - o[0]
  let n = t[1] - o[1]
  const g = Math.sqrt(r * r + n * n)
  r /= g
  n /= g
  let i = e[0] - o[0]
  let s = e[1] - o[1]
  const a = Math.sqrt(i * i + s * s)
  i /= a
  s /= a
  const l = r + i
  const u = n + s
  return [l, u]
}
P.PlotUtils.getCurvePoints = function (t: number, o: Point[]): Point[] {
  let g: Point
  let i: Point
  let s: Point
  let a: Point[]
  const e = P.PlotUtils.getLeftMostControlPoint(o) as Point
  let r: Point[] = [e]
  let n = 0
  for (n = 0; n < o.length - 2; n++) {
    g = o[n]
    i = o[n + 1]
    s = o[n + 2]
    a = P.PlotUtils.getBisectorNormals(t, g, i, s) as Point[]
    r = r.concat(a)
  }
  const l = P.PlotUtils.getRightMostControlPoint(o) as Point
  r.push(l)
  const u: Point[] = []
  for (n = 0; n < o.length - 1; n++) {
    g = o[n]
    i = o[n + 1]
    u.push(g)
    for (let t = 0; t < Constants.FITTING_COUNT; t++) {
      const c = P.PlotUtils.getCubicValue(t / Constants.FITTING_COUNT, g, r[2 * n], r[2 * n + 1], i) as Point
      u.push(c)
    }
    u.push(i)
  }
  return u
}
P.PlotUtils.getLeftMostControlPoint = function (o: Point[]): Point {
  const e = o[0]
  const r = o[1]
  const n = o[2]
  const g = P.PlotUtils.getBisectorNormals(0, e, r, n) as Point[]
  const i = g[0]
  const s = P.PlotUtils.getNormal(e, r, n) as Point
  const a = Math.sqrt(s[0] * s[0] + s[1] * s[1])
  let m: number
  let O: number
  if (a > Constants.ZERO_TOLERANCE) {
    const l = P.PlotUtils.mid(e, r) as Point
    const u = e[0] - l[0]
    const c = e[1] - l[1]
    const p = P.PlotUtils.distance(e, r) as number
    const h = 2 / p
    const d = -h * c
    const f = h * u
    const E = d * d - f * f
    const v = 2 * d * f
    const A = f * f - d * d
    const _ = i[0] - l[0]
    const y = i[1] - l[1]
    m = l[0] + E * _ + v * y
    O = l[1] + v * _ + A * y
  } else {
    m = e[0] + t * (r[0] - e[0])
    O = e[1] + t * (r[1] - e[1])
  }
  return [m, O]
}
P.PlotUtils.getRightMostControlPoint = function (o: Point[]): Point {
  const e = o.length
  const r = o[e - 3]
  const n = o[e - 2]
  const g = o[e - 1]
  const i = P.PlotUtils.getBisectorNormals(0, r, n, g) as Point[]
  const s = i[1]
  const a = P.PlotUtils.getNormal(r, n, g) as Point
  const l = Math.sqrt(a[0] * a[0] + a[1] * a[1])
  let O: number
  let T: number
  if (l > Constants.ZERO_TOLERANCE) {
    const u = P.PlotUtils.mid(n, g) as Point
    const c = g[0] - u[0]
    const p = g[1] - u[1]
    const h = P.PlotUtils.distance(n, g) as number
    const d = 2 / h
    const f = -d * p
    const E = d * c
    const v = f * f - E * E
    const A = 2 * f * E
    const _ = E * E - f * f
    const y = s[0] - u[0]
    const m = s[1] - u[1]
    O = u[0] + v * y + A * m
    T = u[1] + A * y + _ * m
  } else {
    O = g[0] + t * (n[0] - g[0])
    T = g[1] + t * (n[1] - g[1])
  }
  return [O, T]
}
P.PlotUtils.getBezierPoints = function (t: Point[]): Point[] {
  if (t.length <= 2) return t
  const o: Point[] = []
  const e = t.length - 1
  for (let r = 0; 1 >= r; r += 0.01) {
    let n = 0
    let y = 0
    for (let g = 0; e >= g; g++) {
      const i = P.PlotUtils.getBinomialFactor(e, g) as number
      const s = Math.pow(r, g)
      const a = Math.pow(1 - r, e - g)
      n += i * s * a * t[g][0]
      y += i * s * a * t[g][1]
    }
    o.push([n, y])
  }
  o.push(t[e])
  return o
}
P.PlotUtils.getBinomialFactor = function (t: number, o: number): number {
  return (P.PlotUtils.getFactorial(t) as number) / ((P.PlotUtils.getFactorial(o) as number) * (P.PlotUtils.getFactorial(t - o) as number))
}
P.PlotUtils.getFactorial = function (t: number): number {
  if (1 >= t) return 1
  if (2 == t) return 2
  if (3 == t) return 6
  if (4 == t) return 24
  if (5 == t) return 120
  let o = 1
  for (let e = 1; t >= e; e++) o *= e
  return o
}
P.PlotUtils.getQBSplinePoints = function (t: Point[]): Point[] {
  if (t.length <= 2) return t
  const o = 2
  const e: Point[] = []
  const r = t.length - o - 1
  e.push(t[0])
  for (let n = 0; r >= n; n++)
    for (let g = 0; 1 >= g; g += 0.05) {
      let i = 0
      let y = 0
      for (let s = 0; o >= s; s++) {
        const a = P.PlotUtils.getQuadricBSplineFactor(s, g) as number
        i += a * t[n + s][0]
        y += a * t[n + s][1]
      }
      e.push([i, y])
    }
  e.push(t[t.length - 1])
  return e
}
P.PlotUtils.getQuadricBSplineFactor = function (t: number, o: number): number {
  return 0 == t ? Math.pow(o - 1, 2) / 2 : 1 == t ? (-2 * Math.pow(o, 2) + 2 * o + 1) / 2 : 2 == t ? Math.pow(o, 2) / 2 : 0
}

export {
  P
}
