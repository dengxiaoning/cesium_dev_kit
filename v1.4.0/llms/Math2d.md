# Math2d

> 数学2d计算模块

- 分类：数学计算
- API 页面：https://dengxiaoning.github.io/cesium_dev_kit/classes/Math2d.html
- 源码：https://github.com/dengxiaoning/cesium_dev_kit

## 方法

### computeCircleShap(radius: number): any[]

根据半径获取圆型坐标数据

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `radius` | `number` | 半径 |

**返回**：坐标数组

### computeStar2d(arms: number, rOuter: number, rInner: number): any[]

计算星型

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `arms` | `number` | 角数量 |
| `rOuter` | `number` | 外圆半径 |
| `rInner` | `number` | 内圆半径 |

**返回**：坐标数组

### getAngleOfThreePoints2d(pntA: Point2d, pntB: Point2d, pntC: Point2d): number

通过三个点获取方位角

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `pntA` | `Point2d` | 坐标A |
| `pntB` | `Point2d` | 坐标B |
| `pntC` | `Point2d` | 坐标C |

**返回**：方位角度

### getArcPoints2d(center: Point2d, radius: number, startAngle: number, endAngle: number): Point2d[]

插值弓形线段点

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `center` | `Point2d` | - |
| `radius` | `number` | - |
| `startAngle` | `number` | - |
| `endAngle` | `number` | - |

### getAzimuth2d(startPoint: Point2d, endPoint: Point2d): number

根据两个矢量获取方位角（地平经度）

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `startPoint` | `Point2d` | 开始坐标 |
| `endPoint` | `Point2d` | 结束坐标 |

**返回**：方位角度

### getBaseLength2d(points: Point2d[]): number

获取基础长度

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `points` | `Point2d[]` | 多个点的数组 |

**返回**：长度

### getBezierPoints2d(points: Point2d[]): Point2d[]

获取贝塞尔曲线

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `points` | `Point2d[]` | 坐标数组 |

**返回**：贝塞尔曲线数组

### getBinomialFactor2d(n: number, index: number): number

获取二项分布

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `n` | `number` | - |
| `index` | `number` | - |

### getBisectorNormals2d(t: number, pnt1: Point2d, pnt2: Point2d, pnt3: Point2d): Point2d[]

getBisectorNormals

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `t` | `number` | - |
| `pnt1` | `Point2d` | - |
| `pnt2` | `Point2d` | - |
| `pnt3` | `Point2d` | - |

### getCircleCenterOfThreePoints2d(point1: Point2d, point2: Point2d, point3: Point2d): Point2d

通过三个点确定一个圆的中心点

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `point1` | `Point2d` | 坐标点1 |
| `point2` | `Point2d` | 坐标点2 |
| `point3` | `Point2d` | 坐标点3 |

**返回**：中心点坐标数组

### getCirclePoints2d(r: number, ox: number, oy: number, count: number): CirclePoint2d[]

求圆周上等分点的坐标

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `r` | `number` | 半径 |
| `ox` | `number` | 圆心坐标 x |
| `oy` | `number` | 圆心坐标 y |
| `count` | `number` | 等分个数 |

**返回**：等分后的坐标数组

### getCubicValue2d(t: number, startPnt: Point2d, cPnt1: Point2d, cPnt2: Point2d, endPnt: Point2d): Point2d

获取立方值

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `t` | `number` | - |
| `startPnt` | `Point2d` | - |
| `cPnt1` | `Point2d` | - |
| `cPnt2` | `Point2d` | - |
| `endPnt` | `Point2d` | - |

### getCurvePoints2d(t: number, controlPoints: Point2d[]): Point2d[]

插值曲线点

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `t` | `number` | - |
| `controlPoints` | `Point2d[]` | - |

### getFactorial2d(n: number): number

获取阶乘数据

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `n` | `number` | - |

### getIntersectPoint2d(pntA: Point2d, pntB: Point2d, pntC: Point2d, pntD: Point2d): Point2d

获取交集的点

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `pntA` | `Point2d` | 坐标点A |
| `pntB` | `Point2d` | 坐标点B |
| `pntC` | `Point2d` | 坐标点C |
| `pntD` | `Point2d` | 坐标点D |

**返回**：相交坐标点数组

### getLeftMostControlPoint2d(controlPoints: Point2d[], t: number): Point2d

获取左边控制点

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `controlPoints` | `Point2d[]` | - |
| `t` | `number` | - |

### getNormal2d(pnt1: Point2d, pnt2: Point2d, pnt3: Point2d): Point2d

获取默认三点的内切圆

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `pnt1` | `Point2d` | - |
| `pnt2` | `Point2d` | - |
| `pnt3` | `Point2d` | - |

### getPointOnLine2d(t: number, startPnt: Point2d, endPnt: Point2d): Point2d

获取线上的点

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `t` | `number` | 线段总长 |
| `startPnt` | `Point2d` | 开始坐标 |
| `endPnt` | `Point2d` | 结束坐标 |

**返回**：坐标点数组

### getQBSplinePoints2d(points: Point2d[]): Point2d[]

插值线性点

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `points` | `Point2d[]` | - |

### getQuadricBSplineFactor2d(k: number, t: number): number

得到二次线性因子

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `k` | `number` | - |
| `t` | `number` | - |

### getRightMostControlPoint2d(controlPoints: Point2d[], t: number): Point2d

获取右边控制点

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `controlPoints` | `Point2d[]` | - |
| `t` | `number` | - |

### getThirdPoint2d(startPnt: Point2d, endPnt: Point2d, angle: number, distance: number, clockWise: boolean): Point2d

根据起止点和旋转方向求取第三个点

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `startPnt` | `Point2d` | - |
| `endPnt` | `Point2d` | - |
| `angle` | `number` | - |
| `distance` | `number` | - |
| `clockWise` | `boolean` | - |

### inherits2d(childCtor?: ConstructorLike, parentCtor?: ConstructorLike): void

函数继承

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `childCtor?` | `ConstructorLike` | 子函数 |
| `parentCtor?` | `ConstructorLike` | 父函数 |

### isClockWise(pnt1: Point2d, pnt2: Point2d, pnt3: Point2d): boolean

判断是否是顺时针（别名，与 isClockWise2d 等价）

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `pnt1` | `Point2d` | - |
| `pnt2` | `Point2d` | - |
| `pnt3` | `Point2d` | - |

### isClockWise2d(pnt1: Point2d, pnt2: Point2d, pnt3: Point2d): boolean

判断是否是顺时针

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `pnt1` | `Point2d` | 坐标1 |
| `pnt2` | `Point2d` | 坐标2 |
| `pnt3` | `Point2d` | 坐标3 |

**返回**：是否是顺时针

### mathDistance2d(pnt1: Point2d, pnt2: Point2d): number

计算两个坐标之间的距离

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `pnt1` | `Point2d` | 坐标点1 |
| `pnt2` | `Point2d` | 坐标点2 |

**返回**：计算后距离

### mid2d(point1: Point2d, point2: Point2d): Point2d

求取两个坐标的中间值

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `point1` | `Point2d` | 坐标1 |
| `point2` | `Point2d` | 坐标2 |

**返回**：中间值坐标数组

### wholeDistance2d(points: Point2d[]): number

计算点集合的总距离

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `points` | `Point2d[]` | 多个点的数组 |

**返回**：距离
