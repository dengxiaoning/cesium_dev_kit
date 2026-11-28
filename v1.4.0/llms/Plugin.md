# Plugin

> 外部插件模块

- 分类：场景插件
- API 页面：https://dengxiaoning.github.io/cesium_dev_kit/classes/Plugin.html
- 源码：https://github.com/dengxiaoning/cesium_dev_kit

## 方法

### buildLightScanGraphics(data?: Record): unknown

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `data?` | `Record` | - |

### buildPathRoaming(options: PathRoamingOptions)

路径漫游

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options` | `PathRoamingOptions` | `name`：名称 - `paths`：路径点，支持 `Cesium.Cartesian3[]`、`[lng, lat, alt][]` - `polyline`（`PolylineGraphics`）：see `getLineGraphics` - `model`（`ModelGraphics`）：see `getModelGraphics` - `label`（`LabelGraphics`）：see `getLabelGraphics` - `billboard`（`LabelGraphics`）：see `getBillboardGraphics` - `cameraOffset`：每一帧运行时回调 以及 `{ lng, lat, alt }[]`；相邻重合点会被自动忽略（至少需要 2 个有效点） |

**示例**

```ts
import { initCesium } from 'cesium_dev_kit'
const {plugin,material} = new initCesium({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
 plugin.buildPathRoaming({
name: '一品大街',
paths: [{lng:110.16018735617934, lat:31.036076859828338, lat:0 },{lng:110.16018735617934, lat:31.036076859828338, lat:0 }],
polyline: { // 配置漫游路径（不配置则不绘制）
width: 40,
material: material.getCustomMaterialWall({
image: 'static/data/images/Textures/jsx4.png',
freely: 'cross',
direction: '-',  // 顺时针
count: 12,
color: Cesium.Color.RED,
duration: 5000,
}),
clampToGround: true,
},
model: { // 配置漫游模型（不配置则不绘制）
url: 'static/data/model/man/walk.gltf',
scale: 10
},
cameraOffset: () => {
// 配置漫游时相机偏移位置
return new Cesium.HeadingPitchRange(
Cesium.Math.toRadians(this.headingNum),
Cesium.Math.toRadians(this.pitchNum),
Number(this.rangeNum))
}
})
```

### destroy(): void

释放当前模块持有的监听器 / DataSource（幂等）

### gcj2wgs(arrdata?: number[]): number[]

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `arrdata?` | `number[]` | - |

### queryPathPlan(type?: string, options?: queryOptionsType, successCB?: Function, errorCB?: Function): void

驾车/步行/骑行路线查询

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `type?` | `string` | 类型[drive:驾车，walk:步行，cycle:骑行] `routeQueryType` |
| `options?` | `queryOptionsType` | - |
| `successCB?` | `Function` | 成功回调 |
| `errorCB?` | `Function` | 失败回调 |

**示例**

```ts
import { initCesium } from 'cesium_dev_kit'
const {plugin,material} = new initCesium({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})

const queryParams = {
   url: "https://restapi.amap.com/v5/direction/driving",
   key: '8dc49b1fa65a79d306ef12dae4229842',
    origin: [102.736485445,29.87345],
   destination:[110.160187, 31.036076],
 }
plugin.queryPathPlan('drive', queryParams, restArr => {
    // 拿到结果转换后调用绘制路线
   this.createPath(restArr)
 }, err => { console.error(err) })
```

### transformData(start?: number[], end?: number[], route?: unknown): unknown

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `start?` | `number[]` | - |
| `end?` | `number[]` | - |
| `route?` | `unknown` | - |

### transformJD(lng?: number, lat?: number): number

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `lng?` | `number` | - |
| `lat?` | `number` | - |

### transformWD(lng?: number, lat?: number): number

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `lng?` | `number` | - |
| `lat?` | `number` | - |

### wgs2gcj(arrdata?: number[]): number[]

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `arrdata?` | `number[]` | - |
