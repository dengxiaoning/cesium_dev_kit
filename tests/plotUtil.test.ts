import assert from 'node:assert'
import { P } from '../src/utils/cesiumPluginsExtends/libs/plot/plotUtil'

const U = P.PlotUtils

/** 严格相等（数值/数组均可用） */
function eq(actual: unknown, expected: unknown, msg: string) {
  assert.deepStrictEqual(actual, expected, msg)
}

/** 浮点近似相等 */
function close(actual: number, expected: number, msg: string) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${msg}: expected ${expected}, got ${actual}`)
}

// distance：3-4-5 直角三角形
eq(U.distance([0, 0], [3, 4]), 5, 'distance 3-4-5')
eq(U.distance([1, 1], [4, 5]), 5, 'distance 3-4-5 (offset)')

// mid：中点
eq(U.mid([0, 0], [2, 4]), [1, 2], 'mid')

// wholeDistance：折线总长
eq(U.wholeDistance([[0, 0], [3, 4], [6, 8]]), 10, 'wholeDistance')

// getBaseLength：总长的 0.99 次方
close(U.getBaseLength([[0, 0], [3, 4], [6, 8]]), Math.pow(10, 0.99), 'getBaseLength')

// getFactorial：阶乘
eq(U.getFactorial(0), 1, '0!')
eq(U.getFactorial(1), 1, '1!')
eq(U.getFactorial(2), 2, '2!')
eq(U.getFactorial(3), 6, '3!')
eq(U.getFactorial(5), 120, '5!')

// getBinomialFactor：组合数 C(5,2) = 10
eq(U.getBinomialFactor(5, 2), 10, 'C(5,2)')

// getQuadricBSplineFactor：二次 B 样条基函数
close(U.getQuadricBSplineFactor(0, 0.5), 0.125, 'qf(0, 0.5)')
close(U.getQuadricBSplineFactor(1, 0.5), 0.75, 'qf(1, 0.5)')
close(U.getQuadricBSplineFactor(2, 0.5), 0.125, 'qf(2, 0.5)')

// getPointOnLine：线段中点
eq(U.getPointOnLine(0.5, [0, 0], [10, 10]), [5, 5], 'getPointOnLine')

// isClockWise：逆时针点序为 true
eq(U.isClockWise([0, 0], [1, 0], [0, 1]), true, 'isClockWise')

// getNormal：三个点内切角方向
eq(U.getNormal([1, 0], [0, 0], [0, 1]), [1, 1], 'getNormal')

// getCubicValue：三次插值端点
eq(U.getCubicValue(0, [0, 0], [1, 0], [0, 1], [1, 1]), [0, 0], 'cubic t=0 -> start')
eq(U.getCubicValue(1, [0, 0], [1, 0], [0, 1], [1, 1]), [1, 1], 'cubic t=1 -> end')

// getBezierPoints：仅两个点时应原样返回
eq(U.getBezierPoints([[0, 0], [1, 1]]), [[0, 0], [1, 1]], 'bezier passthrough')

console.log('✓ plotUtil 全部测试通过')
