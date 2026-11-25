import assert from 'node:assert'
import { Math2d } from '../src/utils/cesiumPluginsExtends/libs/Math2d'

/** 严格相等 */
function eq(actual: unknown, expected: unknown, msg: string) {
  assert.deepStrictEqual(actual, expected, msg)
}

/** 浮点近似相等 */
function close(actual: number, expected: number, msg: string) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${msg}: expected ${expected}, got ${actual}`)
}

// 纯计算函数无需真实 viewer/cesiumGlobal，传入占位对象即可
const m = new Math2d({} as never, {} as never)

// mathDistance2d
eq(m.mathDistance2d([0, 0], [3, 4]), 5, 'mathDistance2d 3-4-5')

// mid2d
eq(m.mid2d([0, 0], [2, 4]), [1, 2], 'mid2d')

// wholeDistance2d
eq(m.wholeDistance2d([[0, 0], [3, 4], [6, 8]]), 10, 'wholeDistance2d')

// getBaseLength2d
close(m.getBaseLength2d([[0, 0], [3, 4], [6, 8]]), Math.pow(10, 0.99), 'getBaseLength2d')

// getPointOnLine2d
eq(m.getPointOnLine2d(0.5, [0, 0], [10, 10]), [5, 5], 'getPointOnLine2d')

// isClockWise2d
eq(m.isClockWise2d([0, 0], [1, 0], [0, 1]), true, 'isClockWise2d')

// getAzimuth2d：指向正东为 PI
close(m.getAzimuth2d([0, 0], [1, 0]), Math.PI, 'getAzimuth2d east = PI')

// getFactorial2d
eq(m.getFactorial2d(0), 1, '0!')
eq(m.getFactorial2d(5), 120, '5!')

// getBinomialFactor2d
eq(m.getBinomialFactor2d(5, 2), 10, 'C(5,2)')

// getQuadricBSplineFactor2d
close(m.getQuadricBSplineFactor2d(0, 0.5), 0.125, 'qf(0, 0.5)')
close(m.getQuadricBSplineFactor2d(1, 0.5), 0.75, 'qf(1, 0.5)')

// getCirclePoints2d：圆周等分点数量
const circle = m.getCirclePoints2d(1, 0, 0, 4)
eq(circle.length, 4, 'getCirclePoints2d 4 等分')
circle.forEach((p) => {
  assert.equal(typeof p.x, 'number', 'point.x 是数字')
  assert.equal(typeof p.y, 'number', 'point.y 是数字')
})

console.log('✓ Math2d 全部测试通过')
