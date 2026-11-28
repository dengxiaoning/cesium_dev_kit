# Math3d

> 数学3d计算模块

- 分类：数学计算
- API 页面：https://dengxiaoning.github.io/cesium_dev_kit/classes/Math3d.html
- 源码：https://github.com/dengxiaoning/cesium_dev_kit

## 方法

### computeCartographicPointsTerrainData(Cartographics: Cartographic[], callback?: object): void

传入Cartographic类型数组（弧度制经纬度），计算位于地形中的高度

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `Cartographics` | `Cartographic[]` | 地理坐标数组 |
| `callback?` | `object` | 回调 |

### computeEllipseEdgePositions(options?: EllipseEdgeOptions): EllipseEdgeResult | undefined

计算范围当前椭圆位置的数组

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `EllipseEdgeOptions` | 参数 - `semiMinorAxis`（`number`）：短半轴 - `semiMajorAxis`（`number`）：长半轴 - `rotation`（`number`）：旋转角度（弧度） - `center`：中心点（笛卡尔坐标） - `granularity`（`number`）：粒度（弧度） - `angle`（`number`）：角度（弧度，仅 computeSectorEdgePositions 使用） |

### computeInterpolate2IndexLineHeightCartographic(start?: CartographicLike, end?: CartographicLike, num?: number, curIndex?: number): any[] | null

线段插值/经纬度高程插值

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `start?` | `CartographicLike` | - |
| `end?` | `CartographicLike` | - |
| `num?` | `number` | - |
| `curIndex?` | `number` | - |

### computeInterpolateIndexLineHeightCartographic(start?: CartographicLike, end?: CartographicLike, num?: number, index?: number)

经纬度高程插值，指定插值位置 index

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `start?` | `CartographicLike` | - |
| `end?` | `CartographicLike` | - |
| `num?` | `number` | - |
| `index?` | `number` | - |

### computeInterpolateLineCartographic(start?: CartographicLike, end?: CartographicLike, _Delta?: number): any[] | null

线段插值（Cartographic 弧度制）

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `start?` | `CartographicLike` | - |
| `end?` | `CartographicLike` | - |
| `_Delta?` | `number` | - |

### computeInterpolateLineHeightCartographic(start?: CartographicLike, end?: CartographicLike): any[] | null

线段插值（经纬度高程插值） - `longitude`（`number`）：经度（弧度） - `latitude`（`number`）：纬度（弧度） - `height`（`number`）：高度

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `start?` | `CartographicLike` | - |
| `end?` | `CartographicLike` | - |

### computeInterpolateLineLonlat(start?: LonLatType, end?: LonLatType): number[][] | null

线段插值（经纬度坐标插值，角度制） - `lon`（`number`）：经度（角度制） - `lat`（`number`）：纬度（角度制）

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `start?` | `LonLatType` | - |
| `end?` | `LonLatType` | - |

### computeLonlatPointsTerrainData(lonlats: lonlatType, callback: Function): void

获取3DTiles高度（传入角度制 lon lat 数组）

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `lonlats` | `lonlatType` | 坐标数组 |
| `callback` | `Function` | 回调 |

### computeSectorEdgePositions(options?: EllipseEdgeOptions): EllipseEdgeResult | undefined

计算某角度下椭圆位置坐标

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `EllipseEdgeOptions` | 参数 - `semiMinorAxis`（`number`）：短半轴 - `semiMajorAxis`（`number`）：长半轴 - `rotation`（`number`）：旋转角度（弧度） - `center`：中心点（笛卡尔坐标） - `granularity`（`number`）：粒度（弧度） - `angle`（`number`）：角度（弧度，仅 computeSectorEdgePositions 使用） |

### getIntersectObj(startPos: Cartesian3, endPos: Cartesian3, excludeArr: unknown[], bDrillPick: boolean): any[] | object[] | undefined

获取相交对象

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `startPos` | `Cartesian3` | 起始点坐标 |
| `endPos` | `Cartesian3` | 终点坐标 |
| `excludeArr` | `unknown[]` | 排除对象数组 |
| `bDrillPick` | `boolean` | 只pick首个物体 |

### getLinkedPointList(startPoint: Cartesian3, endPoint: Cartesian3, angularityFactor: number, numOfSingleLine: number): any[] | undefined

计算两点的点集

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `startPoint` | `Cartesian3` | 开始节点 |
| `endPoint` | `Cartesian3` | 结束节点 |
| `angularityFactor` | `number` | 曲率 |
| `numOfSingleLine` | `number` | 点集数量 |

### getPointDistance(point1: Cartesian3, point2: Cartesian3): number | undefined

获取两点距离

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `point1` | `Cartesian3` | 坐标1 |
| `point2` | `Cartesian3` | 坐标2 |

### getPointOnEllipsoid(theta: number, rotation: number, northVec: Cartesian3, eastVec: Cartesian3, aSqr: number, ab: number, bSqr: number, mag: number, unitPos: Cartesian3, result: Cartesian3)

椭圆计算

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `theta` | `number` | 角度θ |
| `rotation` | `number` | 旋转角度 |
| `northVec` | `Cartesian3` | 东北角 |
| `eastVec` | `Cartesian3` | 西南角 |
| `aSqr` | `number` | 短半轴平方根 |
| `ab` | `number` | 长半轴与短半轴乘积 |
| `bSqr` | `number` | 长半轴平方根 |
| `mag` | `number` | 中心坐标最大长度 |
| `unitPos` | `Cartesian3` | 中心坐标归一化 |
| `result` | `Cartesian3` | 椭圆坐标 |

### getPolygonArea(positions?: WGS84Type[]): number | undefined

计算多边形的面积

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `positions?` | `WGS84Type[]` | 多边形数组 |

### getPositionDistance(positions: WGS84Type[]): string

获取84坐标的距离

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `positions` | `WGS84Type[]` | 84坐标数组 |

### getPositionsAngle(option?: PositionsAngleOptions): number | undefined

计算两点的角度

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `option?` | `PositionsAngleOptions` | 参数 - `position1`：第一个点坐标 - `position2`：第二个点坐标 - `type`（`'pitch' \| 'heading'`）：角度类型：pitch 俯仰角 / heading 偏航角 |

**返回**：角度

### getPositionsArea(positions: WGS84Type[]): string | number

计算一组坐标组成的面的面积

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `positions` | `WGS84Type[]` | 需要计算的84数组 |

### raisePositionsToHeight(positions: number[], options?: RaisePositionsToHeightOptions, extrude?: boolean): Float64Array | undefined

计算坐标数组插值高度

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `positions` | `number[]` | 插值数组[x,y,z,x,y,z,...] |
| `options?` | `RaisePositionsToHeightOptions` | 参数 |
| `extrude?` | `boolean` | 是否拉伸 |

**返回**：Returns the positions raised to the given heights

### splitCartesians3(cartesianArr: number[]): any[]

拆分组合坐标数组

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `cartesianArr` | `number[]` | 坐标数组 |

**返回**：Cartesian3 类型的数组
