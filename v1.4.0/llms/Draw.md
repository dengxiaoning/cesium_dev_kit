# Draw

> 画笔模块

- 分类：交互绘制
- API 页面：https://dengxiaoning.github.io/cesium_dev_kit/classes/Draw.html
- 源码：https://github.com/dengxiaoning/cesium_dev_kit

## 方法

### destroy(): void

释放当前模块持有的监听器 / DataSource（幂等）

### drawCircleGraphics(options?: DrawOptions): void

画圆

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DrawOptions` | `style`（`PolylineStyleType`）：图形样式（Cesium 实体属性子集：width / material / clampToGround / granularity / arcType 等）；不传时各方法自带默认样式 - `callback`（`(...args: any[]) => void`）：绘制完成回调。回调参数随方法不同：画线/画矩形为 `(positions, entity)`，画圆为 `({ center, radius }, entity)` - `measure`（`boolean`）：是否开启量算：画线时实时测距、画面时实时测面积 - `width`（`number`）：宽度（米）：画走廊时的走廊宽度，默认 100 - `height`（`number`）：高度（米）：画矩形的挤出高度、画走廊时的走廊高度，默认 1 - `material`：材质，覆盖 `style.material` - `clampToGround`（`boolean`）：是否贴地 - `clampToS3M`（`boolean`）：是否贴合 S3M 倾斜模型表面 - `granularity`（`number`）：采样粒度（弧度），默认 `Cesium.Math.RADIANS_PER_DEGREE` - `arcType`：线类型，默认 `Cesium.ArcType.GEODESIC` - `type`（`string`）：绘制子类型，如 `straightLine` 表示三点直线量测 - `topRadius`（`number`）：圆柱 / 圆锥顶面半径（米） - `bottomRadius`（`number`）：圆柱 / 圆锥底面半径（米） - `length`（`number`）：圆柱 / 圆锥长度（米），不传时按绘制圆量出的半径推算 - `extrudedHeight`（`number`）：挤出高度（米） - `color`：材质颜色，如画管道，默认 `Cesium.Color.RED` - `rOuter`（`number`）：星形截面外半径（像素），默认 150 - `rInner`（`number`）：星形截面内半径（像素），默认 75 - `arms`（`number`）：星形截面角数，默认 7 - `circleRadius`（`number`）：圆形截面半径（像素），默认 20 - `shape`（`string`）：管道截面形状：`fivePoint` 为五角星，其余为圆形 |

**示例**

```ts
const drawObj = new Draw({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
drawObj.drawCircleGraphics({
  callback: ({ center, radius }, entity) => {
    // center 为圆心（Cartesian3），radius 为半径（米）
    console.log(center, radius, entity)
  }
})
```

### drawCorridorGraphics(options?: DrawOptions): void

绘制走廊 - `style`（`PolylineStyleType`）：图形样式（Cesium 实体属性子集：width / material / clampToGround / granularity / arcType 等）；不传时各方法自带默认样式 - `callback`（`(...args: any[]) => void`）：绘制完成回调。回调参数随方法不同：画线/画矩形为 `(positions, entity)`，画圆为 `({ center, radius }, entity)` - `measure`（`boolean`）：是否开启量算：画线时实时测距、画面时实时测面积 - `width`（`number`）：宽度（米）：画走廊时的走廊宽度，默认 100 - `height`（`number`）：高度（米）：画矩形的挤出高度、画走廊时的走廊高度，默认 1 - `material`：材质，覆盖 `style.material` - `clampToGround`（`boolean`）：是否贴地 - `clampToS3M`（`boolean`）：是否贴合 S3M 倾斜模型表面 - `granularity`（`number`）：采样粒度（弧度），默认 `Cesium.Math.RADIANS_PER_DEGREE` - `arcType`：线类型，默认 `Cesium.ArcType.GEODESIC` - `type`（`string`）：绘制子类型，如 `straightLine` 表示三点直线量测 - `topRadius`（`number`）：圆柱 / 圆锥顶面半径（米） - `bottomRadius`（`number`）：圆柱 / 圆锥底面半径（米） - `length`（`number`）：圆柱 / 圆锥长度（米），不传时按绘制圆量出的半径推算 - `extrudedHeight`（`number`）：挤出高度（米） - `color`：材质颜色，如画管道，默认 `Cesium.Color.RED` - `rOuter`（`number`）：星形截面外半径（像素），默认 150 - `rInner`（`number`）：星形截面内半径（像素），默认 75 - `arms`（`number`）：星形截面角数，默认 7 - `circleRadius`（`number`）：圆形截面半径（像素），默认 20 - `shape`（`string`）：管道截面形状：`fivePoint` 为五角星，其余为圆形

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DrawOptions` | - |

### drawCylinderGraphics(options?: DrawOptions): void

绘制圆柱体 or 圆锥 - `style`（`PolylineStyleType`）：图形样式（Cesium 实体属性子集：width / material / clampToGround / granularity / arcType 等）；不传时各方法自带默认样式 - `callback`（`(...args: any[]) => void`）：绘制完成回调。回调参数随方法不同：画线/画矩形为 `(positions, entity)`，画圆为 `({ center, radius }, entity)` - `measure`（`boolean`）：是否开启量算：画线时实时测距、画面时实时测面积 - `width`（`number`）：宽度（米）：画走廊时的走廊宽度，默认 100 - `height`（`number`）：高度（米）：画矩形的挤出高度、画走廊时的走廊高度，默认 1 - `material`：材质，覆盖 `style.material` - `clampToGround`（`boolean`）：是否贴地 - `clampToS3M`（`boolean`）：是否贴合 S3M 倾斜模型表面 - `granularity`（`number`）：采样粒度（弧度），默认 `Cesium.Math.RADIANS_PER_DEGREE` - `arcType`：线类型，默认 `Cesium.ArcType.GEODESIC` - `type`（`string`）：绘制子类型，如 `straightLine` 表示三点直线量测 - `topRadius`（`number`）：圆柱 / 圆锥顶面半径（米） - `bottomRadius`（`number`）：圆柱 / 圆锥底面半径（米） - `length`（`number`）：圆柱 / 圆锥长度（米），不传时按绘制圆量出的半径推算 - `extrudedHeight`（`number`）：挤出高度（米） - `color`：材质颜色，如画管道，默认 `Cesium.Color.RED` - `rOuter`（`number`）：星形截面外半径（像素），默认 150 - `rInner`（`number`）：星形截面内半径（像素），默认 75 - `arms`（`number`）：星形截面角数，默认 7 - `circleRadius`（`number`）：圆形截面半径（像素），默认 20 - `shape`（`string`）：管道截面形状：`fivePoint` 为五角星，其余为圆形

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DrawOptions` | - |

### drawEllipsoidGraphics(options?: DrawOptions): void

绘制球体 - `style`（`PolylineStyleType`）：图形样式（Cesium 实体属性子集：width / material / clampToGround / granularity / arcType 等）；不传时各方法自带默认样式 - `callback`（`(...args: any[]) => void`）：绘制完成回调。回调参数随方法不同：画线/画矩形为 `(positions, entity)`，画圆为 `({ center, radius }, entity)` - `measure`（`boolean`）：是否开启量算：画线时实时测距、画面时实时测面积 - `width`（`number`）：宽度（米）：画走廊时的走廊宽度，默认 100 - `height`（`number`）：高度（米）：画矩形的挤出高度、画走廊时的走廊高度，默认 1 - `material`：材质，覆盖 `style.material` - `clampToGround`（`boolean`）：是否贴地 - `clampToS3M`（`boolean`）：是否贴合 S3M 倾斜模型表面 - `granularity`（`number`）：采样粒度（弧度），默认 `Cesium.Math.RADIANS_PER_DEGREE` - `arcType`：线类型，默认 `Cesium.ArcType.GEODESIC` - `type`（`string`）：绘制子类型，如 `straightLine` 表示三点直线量测 - `topRadius`（`number`）：圆柱 / 圆锥顶面半径（米） - `bottomRadius`（`number`）：圆柱 / 圆锥底面半径（米） - `length`（`number`）：圆柱 / 圆锥长度（米），不传时按绘制圆量出的半径推算 - `extrudedHeight`（`number`）：挤出高度（米） - `color`：材质颜色，如画管道，默认 `Cesium.Color.RED` - `rOuter`（`number`）：星形截面外半径（像素），默认 150 - `rInner`（`number`）：星形截面内半径（像素），默认 75 - `arms`（`number`）：星形截面角数，默认 7 - `circleRadius`（`number`）：圆形截面半径（像素），默认 20 - `shape`（`string`）：管道截面形状：`fivePoint` 为五角星，其余为圆形

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DrawOptions` | - |

### drawLineGraphics(options?: DrawOptions): void

画线 or 测距

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DrawOptions` | `style`（`PolylineStyleType`）：图形样式（Cesium 实体属性子集：width / material / clampToGround / granularity / arcType 等）；不传时各方法自带默认样式 - `callback`（`(...args: any[]) => void`）：绘制完成回调。回调参数随方法不同：画线/画矩形为 `(positions, entity)`，画圆为 `({ center, radius }, entity)` - `measure`（`boolean`）：是否开启量算：画线时实时测距、画面时实时测面积 - `width`（`number`）：宽度（米）：画走廊时的走廊宽度，默认 100 - `height`（`number`）：高度（米）：画矩形的挤出高度、画走廊时的走廊高度，默认 1 - `material`：材质，覆盖 `style.material` - `clampToGround`（`boolean`）：是否贴地 - `clampToS3M`（`boolean`）：是否贴合 S3M 倾斜模型表面 - `granularity`（`number`）：采样粒度（弧度），默认 `Cesium.Math.RADIANS_PER_DEGREE` - `arcType`：线类型，默认 `Cesium.ArcType.GEODESIC` - `type`（`string`）：绘制子类型，如 `straightLine` 表示三点直线量测 - `topRadius`（`number`）：圆柱 / 圆锥顶面半径（米） - `bottomRadius`（`number`）：圆柱 / 圆锥底面半径（米） - `length`（`number`）：圆柱 / 圆锥长度（米），不传时按绘制圆量出的半径推算 - `extrudedHeight`（`number`）：挤出高度（米） - `color`：材质颜色，如画管道，默认 `Cesium.Color.RED` - `rOuter`（`number`）：星形截面外半径（像素），默认 150 - `rInner`（`number`）：星形截面内半径（像素），默认 75 - `arms`（`number`）：星形截面角数，默认 7 - `circleRadius`（`number`）：圆形截面半径（像素），默认 20 - `shape`（`string`）：管道截面形状：`fivePoint` 为五角星，其余为圆形 |

**示例**

```ts
const drawObj = new Draw({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
drawObj.drawLineGraphics({
  width: 8,
  material: Cesium.Color.MEDIUMBLUE,
  clampToGround: true,
  callback: (positions, entity) => {
    // positions: [{ lng, lat, alt }]，可直接交给 buildPathRoaming 等能力继续使用
    console.log(positions, entity)
  }
})
```

### drawPointGraphics(options?: DrawOptions): void

画点

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DrawOptions` | `style`（`PolylineStyleType`）：图形样式（Cesium 实体属性子集：width / material / clampToGround / granularity / arcType 等）；不传时各方法自带默认样式 - `callback`（`(...args: any[]) => void`）：绘制完成回调。回调参数随方法不同：画线/画矩形为 `(positions, entity)`，画圆为 `({ center, radius }, entity)` - `measure`（`boolean`）：是否开启量算：画线时实时测距、画面时实时测面积 - `width`（`number`）：宽度（米）：画走廊时的走廊宽度，默认 100 - `height`（`number`）：高度（米）：画矩形的挤出高度、画走廊时的走廊高度，默认 1 - `material`：材质，覆盖 `style.material` - `clampToGround`（`boolean`）：是否贴地 - `clampToS3M`（`boolean`）：是否贴合 S3M 倾斜模型表面 - `granularity`（`number`）：采样粒度（弧度），默认 `Cesium.Math.RADIANS_PER_DEGREE` - `arcType`：线类型，默认 `Cesium.ArcType.GEODESIC` - `type`（`string`）：绘制子类型，如 `straightLine` 表示三点直线量测 - `topRadius`（`number`）：圆柱 / 圆锥顶面半径（米） - `bottomRadius`（`number`）：圆柱 / 圆锥底面半径（米） - `length`（`number`）：圆柱 / 圆锥长度（米），不传时按绘制圆量出的半径推算 - `extrudedHeight`（`number`）：挤出高度（米） - `color`：材质颜色，如画管道，默认 `Cesium.Color.RED` - `rOuter`（`number`）：星形截面外半径（像素），默认 150 - `rInner`（`number`）：星形截面内半径（像素），默认 75 - `arms`（`number`）：星形截面角数，默认 7 - `circleRadius`（`number`）：圆形截面半径（像素），默认 20 - `shape`（`string`）：管道截面形状：`fivePoint` 为五角星，其余为圆形 |

**示例**

```ts
const drawObj = new Draw({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
drawObj.drawPointGraphics({
  style: { image: 'static/data/images/file/location4.png', width: 35, height: 40, clampToGround: true },
  callback: (positions, entity) => {
    // positions: [{ lng, lat, alt }]；entity: 本次绘制出的实体
    console.log(positions, entity)
  }
})
```

### drawPolygonGraphics(options?: DrawOptions): void

画面 or 测面积

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DrawOptions` | `style`（`PolylineStyleType`）：图形样式（Cesium 实体属性子集：width / material / clampToGround / granularity / arcType 等）；不传时各方法自带默认样式 - `callback`（`(...args: any[]) => void`）：绘制完成回调。回调参数随方法不同：画线/画矩形为 `(positions, entity)`，画圆为 `({ center, radius }, entity)` - `measure`（`boolean`）：是否开启量算：画线时实时测距、画面时实时测面积 - `width`（`number`）：宽度（米）：画走廊时的走廊宽度，默认 100 - `height`（`number`）：高度（米）：画矩形的挤出高度、画走廊时的走廊高度，默认 1 - `material`：材质，覆盖 `style.material` - `clampToGround`（`boolean`）：是否贴地 - `clampToS3M`（`boolean`）：是否贴合 S3M 倾斜模型表面 - `granularity`（`number`）：采样粒度（弧度），默认 `Cesium.Math.RADIANS_PER_DEGREE` - `arcType`：线类型，默认 `Cesium.ArcType.GEODESIC` - `type`（`string`）：绘制子类型，如 `straightLine` 表示三点直线量测 - `topRadius`（`number`）：圆柱 / 圆锥顶面半径（米） - `bottomRadius`（`number`）：圆柱 / 圆锥底面半径（米） - `length`（`number`）：圆柱 / 圆锥长度（米），不传时按绘制圆量出的半径推算 - `extrudedHeight`（`number`）：挤出高度（米） - `color`：材质颜色，如画管道，默认 `Cesium.Color.RED` - `rOuter`（`number`）：星形截面外半径（像素），默认 150 - `rInner`（`number`）：星形截面内半径（像素），默认 75 - `arms`（`number`）：星形截面角数，默认 7 - `circleRadius`（`number`）：圆形截面半径（像素），默认 20 - `shape`（`string`）：管道截面形状：`fivePoint` 为五角星，其余为圆形 |

**示例**

```ts
const drawObj = new Draw({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
drawObj.drawPolygonGraphics({
  style: { material: Cesium.Color.RED.withAlpha(0.3), clampToGround: true },
  callback: (positions, entity) => {
    // 绘制过程中会实时显示面积，positions 为 [{ lng, lat, alt }]
    console.log(positions, entity)
  }
})
```

### drawPolylineVolumeGraphics(options?: DrawOptions): void

绘制管道 - `style`（`PolylineStyleType`）：图形样式（Cesium 实体属性子集：width / material / clampToGround / granularity / arcType 等）；不传时各方法自带默认样式 - `callback`（`(...args: any[]) => void`）：绘制完成回调。回调参数随方法不同：画线/画矩形为 `(positions, entity)`，画圆为 `({ center, radius }, entity)` - `measure`（`boolean`）：是否开启量算：画线时实时测距、画面时实时测面积 - `width`（`number`）：宽度（米）：画走廊时的走廊宽度，默认 100 - `height`（`number`）：高度（米）：画矩形的挤出高度、画走廊时的走廊高度，默认 1 - `material`：材质，覆盖 `style.material` - `clampToGround`（`boolean`）：是否贴地 - `clampToS3M`（`boolean`）：是否贴合 S3M 倾斜模型表面 - `granularity`（`number`）：采样粒度（弧度），默认 `Cesium.Math.RADIANS_PER_DEGREE` - `arcType`：线类型，默认 `Cesium.ArcType.GEODESIC` - `type`（`string`）：绘制子类型，如 `straightLine` 表示三点直线量测 - `topRadius`（`number`）：圆柱 / 圆锥顶面半径（米） - `bottomRadius`（`number`）：圆柱 / 圆锥底面半径（米） - `length`（`number`）：圆柱 / 圆锥长度（米），不传时按绘制圆量出的半径推算 - `extrudedHeight`（`number`）：挤出高度（米） - `color`：材质颜色，如画管道，默认 `Cesium.Color.RED` - `rOuter`（`number`）：星形截面外半径（像素），默认 150 - `rInner`（`number`）：星形截面内半径（像素），默认 75 - `arms`（`number`）：星形截面角数，默认 7 - `circleRadius`（`number`）：圆形截面半径（像素），默认 20 - `shape`（`string`）：管道截面形状：`fivePoint` 为五角星，其余为圆形

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DrawOptions` | - |

### drawRectangleGraphics(options?: DrawOptions): void

画矩形

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DrawOptions` | `style`（`PolylineStyleType`）：图形样式（Cesium 实体属性子集：width / material / clampToGround / granularity / arcType 等）；不传时各方法自带默认样式 - `callback`（`(...args: any[]) => void`）：绘制完成回调。回调参数随方法不同：画线/画矩形为 `(positions, entity)`，画圆为 `({ center, radius }, entity)` - `measure`（`boolean`）：是否开启量算：画线时实时测距、画面时实时测面积 - `width`（`number`）：宽度（米）：画走廊时的走廊宽度，默认 100 - `height`（`number`）：高度（米）：画矩形的挤出高度、画走廊时的走廊高度，默认 1 - `material`：材质，覆盖 `style.material` - `clampToGround`（`boolean`）：是否贴地 - `clampToS3M`（`boolean`）：是否贴合 S3M 倾斜模型表面 - `granularity`（`number`）：采样粒度（弧度），默认 `Cesium.Math.RADIANS_PER_DEGREE` - `arcType`：线类型，默认 `Cesium.ArcType.GEODESIC` - `type`（`string`）：绘制子类型，如 `straightLine` 表示三点直线量测 - `topRadius`（`number`）：圆柱 / 圆锥顶面半径（米） - `bottomRadius`（`number`）：圆柱 / 圆锥底面半径（米） - `length`（`number`）：圆柱 / 圆锥长度（米），不传时按绘制圆量出的半径推算 - `extrudedHeight`（`number`）：挤出高度（米） - `color`：材质颜色，如画管道，默认 `Cesium.Color.RED` - `rOuter`（`number`）：星形截面外半径（像素），默认 150 - `rInner`（`number`）：星形截面内半径（像素），默认 75 - `arms`（`number`）：星形截面角数，默认 7 - `circleRadius`（`number`）：圆形截面半径（像素），默认 20 - `shape`（`string`）：管道截面形状：`fivePoint` 为五角星，其余为圆形 |

**示例**

```ts
const drawObj = new Draw({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
drawObj.drawRectangleGraphics({
  style: { material: Cesium.Color.GREEN.withAlpha(0.3) },
  callback: (positions, entity) => console.log(positions, entity)
})
```

### drawTrianglesGraphics(options?: DrawOptions): void

画三角量测 - `style`（`PolylineStyleType`）：图形样式（Cesium 实体属性子集：width / material / clampToGround / granularity / arcType 等）；不传时各方法自带默认样式 - `callback`（`(...args: any[]) => void`）：绘制完成回调。回调参数随方法不同：画线/画矩形为 `(positions, entity)`，画圆为 `({ center, radius }, entity)` - `measure`（`boolean`）：是否开启量算：画线时实时测距、画面时实时测面积 - `width`（`number`）：宽度（米）：画走廊时的走廊宽度，默认 100 - `height`（`number`）：高度（米）：画矩形的挤出高度、画走廊时的走廊高度，默认 1 - `material`：材质，覆盖 `style.material` - `clampToGround`（`boolean`）：是否贴地 - `clampToS3M`（`boolean`）：是否贴合 S3M 倾斜模型表面 - `granularity`（`number`）：采样粒度（弧度），默认 `Cesium.Math.RADIANS_PER_DEGREE` - `arcType`：线类型，默认 `Cesium.ArcType.GEODESIC` - `type`（`string`）：绘制子类型，如 `straightLine` 表示三点直线量测 - `topRadius`（`number`）：圆柱 / 圆锥顶面半径（米） - `bottomRadius`（`number`）：圆柱 / 圆锥底面半径（米） - `length`（`number`）：圆柱 / 圆锥长度（米），不传时按绘制圆量出的半径推算 - `extrudedHeight`（`number`）：挤出高度（米） - `color`：材质颜色，如画管道，默认 `Cesium.Color.RED` - `rOuter`（`number`）：星形截面外半径（像素），默认 150 - `rInner`（`number`）：星形截面内半径（像素），默认 75 - `arms`（`number`）：星形截面角数，默认 7 - `circleRadius`（`number`）：圆形截面半径（像素），默认 20 - `shape`（`string`）：管道截面形状：`fivePoint` 为五角星，其余为圆形

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DrawOptions` | - |

### drawWallGraphics(options?: DrawOptions): void

画围栏 - `style`（`PolylineStyleType`）：图形样式（Cesium 实体属性子集：width / material / clampToGround / granularity / arcType 等）；不传时各方法自带默认样式 - `callback`（`(...args: any[]) => void`）：绘制完成回调。回调参数随方法不同：画线/画矩形为 `(positions, entity)`，画圆为 `({ center, radius }, entity)` - `measure`（`boolean`）：是否开启量算：画线时实时测距、画面时实时测面积 - `width`（`number`）：宽度（米）：画走廊时的走廊宽度，默认 100 - `height`（`number`）：高度（米）：画矩形的挤出高度、画走廊时的走廊高度，默认 1 - `material`：材质，覆盖 `style.material` - `clampToGround`（`boolean`）：是否贴地 - `clampToS3M`（`boolean`）：是否贴合 S3M 倾斜模型表面 - `granularity`（`number`）：采样粒度（弧度），默认 `Cesium.Math.RADIANS_PER_DEGREE` - `arcType`：线类型，默认 `Cesium.ArcType.GEODESIC` - `type`（`string`）：绘制子类型，如 `straightLine` 表示三点直线量测 - `topRadius`（`number`）：圆柱 / 圆锥顶面半径（米） - `bottomRadius`（`number`）：圆柱 / 圆锥底面半径（米） - `length`（`number`）：圆柱 / 圆锥长度（米），不传时按绘制圆量出的半径推算 - `extrudedHeight`（`number`）：挤出高度（米） - `color`：材质颜色，如画管道，默认 `Cesium.Color.RED` - `rOuter`（`number`）：星形截面外半径（像素），默认 150 - `rInner`（`number`）：星形截面内半径（像素），默认 75 - `arms`（`number`）：星形截面角数，默认 7 - `circleRadius`（`number`）：圆形截面半径（像素），默认 20 - `shape`（`string`）：管道截面形状：`fivePoint` 为五角星，其余为圆形

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DrawOptions` | - |

### removeAll(): void

移除所有实体

### removeEventHandler(): void

移除所以handler 监听
