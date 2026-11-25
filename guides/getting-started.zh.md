# cesium_dev_kit 快速上手：10 分钟画出你的第一个三维场景

> 适合人群：会用 Cesium 画基本图形、想少写样板代码的前端 / GIS 开发者。
> 前置：Node 18+、一个能跑 Vite 的项目、Cesium Ion token。

## 为什么需要这个工具包

原生 Cesium 写一个「会动的高亮多边形 + 一条流动线」要手搓几十行材质、回调、销毁逻辑。
`cesium_dev_kit` 把这些封装成开箱即用的模块，还解决了两个原生 Cesium 很痛的问题：

1. **按需引入**：`import { Graphics } from 'cesium_dev_kit/graphics'` 不会把 echarts / dat.gui 一起打进来；
2. **生命周期清晰**：`createKit()` 返回一个显式上下文，`dispose()` 幂等，不会泄漏监听器 / DataSource。

## 安装

```bash
npm install cesium_dev_kit cesium
```

可选（用到对应能力时再装）：`three`、`echarts`、`dat.gui`、`libgif`。

## 第一步：初始化

```ts
import * as Cesium from 'cesium'
import { createKit } from 'cesium_dev_kit'

// 你自己的 Ion token（库不再内置）
Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN

const kit = createKit({
  Cesium,
  containerId: 'cesiumContainer'
})
```

容器需要明确高度，否则画布是 0 高度：

```css
#cesiumContainer { width: 100%; height: 100%; }
```

## 第二步：画第一个多边形

```ts
const entity = kit.graphics.createPolygonGraphics({
  positions: Cesium.Cartesian3.fromDegreesArray([
    104.09, 30.65,
    104.12, 30.65,
    104.11, 30.62
  ]),
  material: Cesium.Color.DEEPSKYBLUE.withAlpha(0.4),
  clampToGround: true
})

kit.context.viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(104.10, 30.635, 9000)
})
```

`kit.graphics` 下面还有一整套图形方法：`createLineGraphics`、`createBoxGraphics`、
`createModelGraphics`、`createDynamicPolyLineGraphics`（动态流动线）、`createVideoPlaneGraphics`（视频投放）……
完整清单见 [API 文档](https://dengxiaoning.github.io/cesium_dev_kit/classes/Graphics.html)。

## 第三步：加一点分析

空间分析同样是一行：

```ts
kit.analysis.createVisibilityAnalysis({
  position: Cesium.Cartesian3.fromDegrees(104.08, 30.62, 2),
  targetPositions: [
    Cesium.Cartesian3.fromDegrees(104.12, 30.66, 0),
    Cesium.Cartesian3.fromDegrees(104.10, 30.58, 0)
  ]
})
```

## 第四步：卸载时释放（关键）

```ts
// Vue：onUnmounted(() => kit.dispose())
// React：useEffect(() => () => kit.dispose(), [])
kit.dispose() // 幂等；只会销毁 kit 自己创建的 viewer
```

传入了外部 `viewer` 时，`dispose()` 只清理 kit 添加的 DataSource / 监听，不动你的 viewer。

## 进阶：用子路径按需引入

只画图形、不碰分析/材质时：

```ts
import { Graphics } from 'cesium_dev_kit/graphics'

const graphics = new Graphics({ Cesium, viewer })
graphics.createLineGraphics({ positions: [[104.09, 30.65], [104.11, 30.68]], width: 3 })
```

每个子路径只打包自己的依赖图，能明显压缩业务包体积。

## 下一步

- [在线示例（70+）](https://dengxiaoning.github.io/cesium_dev_kit/examples/)
- [API 文档](https://dengxiaoning.github.io/cesium_dev_kit/)
- [地形编辑实战](./terrain-editing.zh.md)
- [Cesium + Three.js 单上下文融合](./cesium-three-fusion.zh.md)
