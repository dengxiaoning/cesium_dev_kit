# Material

> Material API

- 分类：材质
- API 页面：https://dengxiaoning.github.io/cesium_dev_kit/classes/Material.html
- 源码：https://github.com/dengxiaoning/cesium_dev_kit

## 方法

### addMaterialLineGraphics(options?: MaterialLineGraphicsOptions)

添加动态炫光线材质

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `MaterialLineGraphicsOptions` | `positions`（`any[]`）：坐标（单个或数组） - `color`：颜色 - `duration`（`number`）：持续时长 - `width`（`number`）：宽度 - `image`（`string`）：图片 url |

**返回**：返回polyline实例

**示例**

```ts
const material = new Material({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
// image 指向流光贴图，positions 传 Cartesian3 数组
material.addMaterialLineGraphics({
  positions: Cesium.Cartesian3.fromDegreesArray([104.06, 30.60, 104.10, 30.66]),
  image: 'static/data/images/material/line.png',
  color: Cesium.Color.CYAN,
  duration: 2000,
  width: 8
})
```

### addMaterialWallGraphics(options?: MaterialLineGraphicsOptions)

添加 动态围栏/炫光墙体 - `positions`（`any[]`）：坐标（单个或数组） - `color`：颜色 - `duration`（`number`）：持续时长 - `width`（`number`）：宽度 - `image`（`string`）：图片 url

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `MaterialLineGraphicsOptions` | - |

**返回**：返回wall实例

**示例**

```ts
const material = new Material({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
// 传入面状坐标（首尾可重复），自动生成带流光效果的围墙
material.addMaterialWallGraphics({
  positions: Cesium.Cartesian3.fromDegreesArray([104.06, 30.60, 104.10, 30.60, 104.10, 30.64]),
  image: 'static/data/images/material/wall.png',
  color: Cesium.Color.ORANGE,
  duration: 3000
})
```

### getCustomMaterialLine(options?: CustomMaterialLineOptions)

获取一个动态线材质

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `CustomMaterialLineOptions` | `color`：颜色 - `image`（`string`）：图片 url - `duration`（`number`）：持续时长 - `time`（`any \| number`）：Julian 时间（或秒数） - `MaterialType`（`string`）：自定义材质类型名 |

### getCustomMaterialWall(options?: CustomMaterialWallOptions)

获取一个材质围栏 - `count`（`number`）：频率 - `freely`（`string`）：方向，可选 ["vertical"|"cross"] - `direction`（`string`）：方向，可选 ["-"|"+"]

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `CustomMaterialWallOptions` | - |
