# 地形编辑实战：开挖一个基坑，还能导出 / 载入

> 地形编辑是 `cesium_dev_kit` 的杀手级能力：在 Cesium 地球上实时开挖、堆高、整平，
> 挖开的地表保留原始卫星影像，结果还能序列化保存、二次编辑。
> 适用场景：智慧工地、矿山、水利、土方量算。

## 原理一句话

Cesium 没有「写地形」的接口（`terrainProvider` 只读）。本工具的做法是：
**采样真实地形 + 用 Three.js 局部网格覆盖**——先 `sampleTerrainMostDetailed` 取基准高度，
再用一张带顶点色的网格按「到边界的距离」加权形变，坑口与原地形严丝合缝。

## 依赖

地形编辑依赖 Three.js，安装并传入：

```bash
npm install three
```

## 初始化

```ts
import * as Cesium from 'cesium'
import * as THREE from 'three'
import { createKit } from 'cesium_dev_kit'

const kit = createKit({
  Cesium,
  three: THREE,
  containerId: 'cesiumContainer'
})

// 先初始化 three 场景（地形编辑跑在这张网格上）
const { scene } = kit.threeJs.initThree({ center: [117.1, 36.25] })
kit.threeJs.loop(() => scene.update())
```

## 用法一：笔刷交互（按住左键开挖）

```ts
// 铺一块可编辑区域
await kit.terrainEdit.setArea([117.1, 36.25], { size: 2400, segments: 160 })

// 配好笔刷并开启：按住左键持续开挖，右键转视角，滚轮缩放
kit.terrainEdit
  .setBrush({ mode: 'lower', radius: 110, maxDelta: 3 })
  .enableBrush(true)
```

`mode` 可选 `lower`（下沉）/ `raise`（抬升）/ `flatten`（整平）/ `smooth`（平滑）。
`maxDelta` 是「一级台阶的落差」，单笔就是一个平底平台 + 窄直壁，而不是一个光滑的碗。

## 用法二：多边形一次成型

```ts
await kit.terrainEdit.setPolygon([
  [117.095, 36.245],
  [117.105, 36.245],
  [117.105, 36.255],
  [117.095, 36.255]
])

// sink = 开挖，depth 60 米，6 米一级台阶，waterLevel 0.3 叠一层水面
kit.terrainEdit.apply({ mode: 'sink', depth: 60, stepHeight: 6, waterLevel: 0.3 })

// 土方统计
console.log(kit.terrainEdit.getStats())
```

## 关键：保存与二次编辑

库不替你决定数据存哪，只给一份**完整、可序列化**的结果：

```ts
// 导出：原始 + 编辑后两份高度场、多边形、水面、笔刷设置
const data = kit.terrainEdit.exportData() // 尚未圈定范围时返回 null

await fetch('/api/terrain/42', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data) // 纯 JSON，无 TypedArray / 无类实例
})

// 载入：免采样直接复原（换设备、地形服务变了也一样）
const saved = await (await fetch('/api/terrain/42')).json()
kit.terrainEdit.importData(saved).enableBrush(true)
```

只要数值、不要序列化时用 `getHeightField()`：

```ts
const field = kit.terrainEdit.getHeightField()
const delta = field.current.map((h, i) => h - field.base[i]) // 负数挖、正数填
```

## 体积参考

`segments = 160` 的导出数据约 277KB（两份 161×161 Float32 base64），gzip 约 180KB。
要更小就降 `segments`，或自己把 `grid.current` 量化成 Int16 / GeoTIFF。

## 完整示例

[在线 Demo：地形重建](https://dengxiaoning.github.io/cesium_dev_kit/demo/?auto=1#/terrain/terrainEdit) ·
[TerrainEdit API](https://dengxiaoning.github.io/cesium_dev_kit/classes/TerrainEdit.html)
