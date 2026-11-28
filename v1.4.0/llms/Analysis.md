# Analysis

> 分析模块

- 分类：空间分析
- API 页面：https://dengxiaoning.github.io/cesium_dev_kit/classes/Analysis.html
- 源码：https://github.com/dengxiaoning/cesium_dev_kit

## 方法

### bindHandleEvent(options?: BindHandleEventOptions): void

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `BindHandleEventOptions` | - |

### computeCartographicPointsTerrainData(Cartographics: Cartographic[], callback?: object): void

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `Cartographics` | `Cartographic[]` | - |
| `callback?` | `object` | - |

### computeEllipseEdgePositions(options?: object): object | undefined

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `object` | - |

### computeInterpolateIndexLineHeightCartographic(start?: object, end?: object, num?: number, index?: number)

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `start?` | `object` | - |
| `end?` | `object` | - |
| `num?` | `number` | - |
| `index?` | `number` | - |

### computeInterpolateLineCartographic(start?: object, end?: object, _Delta?: number): any[] | null

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `start?` | `object` | - |
| `end?` | `object` | - |
| `_Delta?` | `number` | - |

### createClipPlanAnalysis(options?: ClipPlanAnalysisOptions): void

地形开挖分析

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `ClipPlanAnalysisOptions` | `height`（`number`）：高度 - `splitNum`（`number`）：裁剪大小 - `wallImg`（`string`）：四周贴图 - `bottomImg`（`string`）：底部贴图 - `callback`：回调函数 |

**示例**

```ts
const analysis = new Analysis({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
// 调用后在地图上绘制一个多边形，作为开挖区域
analysis.createClipPlanAnalysis({
  height: 300,
  splitNum: 50,
  wallImg: 'static/data/images/clip/wall.png',
  bottomImg: 'static/data/images/clip/bottom.png',
  callback: (terrainClipPlan) => console.log('地形裁剪对象', terrainClipPlan)
})
```

### createCutVolumeAnalysis(options?: CutVolumeAnalysisOptions): void

方量分析

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `CutVolumeAnalysisOptions` | `callback`：回调 |

**示例**

```ts
const analysis = new Analysis({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
// 调用后绘制一个面，再输入开挖深度即可得到挖填方量
analysis.createCutVolumeAnalysis({
  callback: (result) => console.log('方量分析对象', result)
})
```

### createGraphics()

### createLookAroundAnalysis(options?: LookAroundAnalysisOptions): void

创建环视分析

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `LookAroundAnalysisOptions` | `callback`：回调函数 |

**示例**

```ts
const analysis = new Analysis({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
// 调用后在地图上点击圆心并拖拽半径
analysis.createLookAroundAnalysis({
  callback: (result) => console.log('环视分析对象', result)
})
```

### createProfileAnalysis(options?: ProfileAnalysisOptions): void

剖面分析

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `ProfileAnalysisOptions` | `positions`：剖面线坐标（不传则交互绘制） - `samples`（`number`）：采样点数量，默认 100 - `chart`（`boolean`）：是否绘制剖面图，默认 true - `callback`：回调，参数含 samples / stats / chart / remove |

**示例**

```ts
const analysis = new Analysis({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
// 交互：在地图上点两个点，自动生成高程剖面图
analysis.createProfileAnalysis({
  callback: (result) => console.log('剖面统计', result.stats)
})

// 也可以直接给定一条线
analysis.createProfileAnalysis({
  positions: [[104.09, 30.65], [104.11, 30.68]],
  samples: 200
})
```

### createSlopeAnalysis(options?: SlopeAnalysisOptions): boolean | void

创建坡度分析

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `SlopeAnalysisOptions` | `callback`：回调 |

**示例**

```ts
const analysis = new Analysis({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
// 调用后依次点击两点，得到两点间的坡度
analysis.createSlopeAnalysis({
  callback: (result) => console.log('坡度结果', result)
})
```

### createSubmergedAnalysis(options?: SubmergedAnalysisOptions): void

创建淹没分析

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `SubmergedAnalysisOptions` | `maxH`（`number`）：最大高度 - `speed`（`number`）：速度 - `interval`（`number`）：时间间隔 - `matrialUrl`（`string`）：材质 |

**示例**

```ts
const analysis = new Analysis({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
// 调用后绘制面，水面会按 speed 逐步上涨到 maxH
analysis.createSubmergedAnalysis({
  maxH: 120,
  speed: 10,
  interval: 100,
  matrialUrl: 'static/data/images/water.png'
})
```

### createVisibilityAnalysis(options?: VisibilityAnalysisOptions): void

创建通视分析

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `VisibilityAnalysisOptions` | `callback`：回调函数 |

**示例**

```ts
const analysis = new Analysis({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
// 调用后在地图上依次点击两点，即完成一次通视分析
analysis.createVisibilityAnalysis({
  callback: (result) => {
    console.log('通视分析对象', result)
    // result.remove() 移除本次分析
  }
})
```

### createVisualFieldAnalysis(options?: VisualFieldAnalysisOptions): void

创建可视域分析

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `VisualFieldAnalysisOptions` | `callback`：回调函数 |

**示例**

```ts
const analysis = new Analysis({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
// 调用后点击模型位置放置视点，移动鼠标调整方向
analysis.createVisualFieldAnalysis({
  callback: (result) => console.log('可视域分析对象', result)
})
```

### destroy(): void

释放当前模块持有的监听器 / DataSource（幂等）

### drawCircleGraphics(options?: DrawMethodOptions): void

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DrawMethodOptions` | - |

### drawLineGraphics(options?: DrawMethodOptions): void

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DrawMethodOptions` | - |

### drawPolygonGraphics(options?: DrawMethodOptions): void

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DrawMethodOptions` | - |

### drawWallGraphics(options?: DrawMethodOptions): void

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DrawMethodOptions` | - |

### getDfSt(attrArr: string[]): string | undefined

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `attrArr` | `string[]` | - |
