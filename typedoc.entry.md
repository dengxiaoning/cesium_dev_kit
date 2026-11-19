# cesium_dev_kit

Cesium 开发套件：标绘、量算、分析、自定义材质 / 图元、传感器、热力图、后处理特效，以及 Three.js 集成。

A Cesium development kit: plotting, measurement, analysis, custom materials / primitives, sensors,
heatmap, post-processing effects and Three.js integration.

## 安装

```bash
npm install cesium_dev_kit cesium
# 可选：仅 Three.js 集成需要
npm install three
```

> 需要 Cesium `>=1.105`。`three`、`echarts`、`dat.gui`、`libgif` 均为可选 peer 依赖，
> 只在使用对应能力时才需要安装。

## 快速开始

```ts
import * as Cesium from 'cesium'
import { createKit } from 'cesium_dev_kit'

const kit = createKit({
  Cesium,
  containerId: 'cesiumContainer',
  assetsBaseUrl: '/static/'
})

// 点
kit.graphics.getPointGraphics({ color: Cesium.Color.GREEN, pixelSize: 6 })

// 面（坐标直接给 Cartesian3）
kit.graphics.createPolygonGraphics({
  positions: Cesium.Cartesian3.fromDegreesArray([104.09, 30.65, 104.11, 30.65, 104.10, 30.63]),
  material: Cesium.Color.RED.withAlpha(0.3),
  clampToGround: true
})

// 页面卸载时释放（幂等；kit 自己创建的 viewer 才会被 destroy）
kit.dispose()
```

也可以按需单独实例化（每个实例持有自己的 Cesium 闭包，同一页面多个 viewer 互不干扰）：

```ts
import { Graphics } from 'cesium_dev_kit/graphics'

const graphics = new Graphics({ Cesium, viewer })
graphics.createLineGraphics({ positions: [[104.09, 30.65], [104.11, 30.68]], width: 3 })
```

可用子路径：`/graphics`、`/material`、`/primitive`、`/draw`、`/analysis`、`/plugin`、
`/pass-effect`、`/control`、`/three`、`/custom-cesium-plugin`、`/default-static`。

## API 索引（一个类一页）

左侧目录就是全部 19 个类，点进去是该类的完整方法列表：每个方法的参数含义、默认值，
以及源码里写好的 `@example` 都能直接复制运行。

| 分类 | 类 | 能力 |
| --- | --- | --- |
| 实体图形 | [Graphics](./classes/Graphics.html) | 点、线、面、模型、圆、墙、动态特效、视频面、GIF 标牌 |
| 交互绘制 | [Draw](./classes/Draw.html) | 鼠标交互绘制点、线、面、圆、矩形、墙、走廊、直线通视 |
| 标绘箭头 | [AttackArrow](./classes/AttackArrow.html) | 攻击箭头（双击结束，可整体移动 / 修改） |
| 标绘箭头 | [PincerArrow](./classes/PincerArrow.html) | 钳击箭头 |
| 标绘箭头 | [StraightArrow](./classes/StraightArrow.html) | 直箭头 |
| 标绘箭头 | [BasePlot](./classes/BasePlot.html) | 标绘基类：状态机、公共工具 |
| 图元与分析 | [Primitive](./classes/Primitive.html) | 自定义几何图元、三维热力图 |
| 空间分析 | [Analysis](./classes/Analysis.html) | 通视、环视、可视域、剖切、开挖、淹没、坡度、方量 |
| 材质 | [Material](./classes/Material.html) | 流光、预警、城市道路、波纹圆等自定义材质 |
| 场景插件 | [Plugin](./classes/Plugin.html) | 路径漫游、雷达扫描、坐标纠偏、路径规划、聚合、3D 柱 |
| 图层与控制 | [Control](./classes/Control.html) | 图层开关、后处理面板、鼠标事件统一定义 |
| 后处理特效 | [PassEffect](./classes/PassEffect.html) | 雷达扫描、圆形扫描、火焰粒子 |
| 数学计算 | [Math2d](./classes/Math2d.html) | 二维距离、方位角、三点圆心、多边形判断 |
| 数学计算 | [Math3d](./classes/Math3d.html) | 三维距离、面积、方位角、地形插值、射线求交 |
| Three.js 集成 | [ThreeJs](./classes/ThreeJs.html) | Three.js 场景叠加与同步 |
| DOM 与提示 | [DomUtil](./classes/DomUtil.html) | DOM 创建、样式、事件绑定 |
| DOM 与提示 | [TooltipUtil](./classes/TooltipUtil.html) | 地图气泡 / 提示框 |
| 基础设施 | [Base](./classes/Base.html) | 坐标转换、事件绑定、拾取、天空盒、特效 |
| 扩展 | [CustomCesiumPlugin](./classes/CustomCesiumPlugin.html) | 自定义 Cesium 插件基类 |

> 方法签名的参数对象（如 `PointGraphicsOptions`）在方法页里已经展开成字段表，
> 不用再点进类型页；`craeteXxx` 这类旧拼写的别名已从文档隐藏，请改用 `createXxx`。

## 错误处理与生命周期

```ts
import { createKit, isCesiumDevKitError, setErrorHandler } from 'cesium_dev_kit'

// 统一捕获库内抛出的错误（带稳定 code，便于上报与用户提示）
setErrorHandler((err) => {
  if (isCesiumDevKitError(err)) console.warn(err.code, err.message)
})

const kit = createKit({ Cesium, containerId: 'cesiumContainer' })
kit.dispose() // 释放监听器 / DataSource；外部传入的 viewer 不会被销毁
```

## 链接

- [GitHub 仓库](https://github.com/dengxiaoning/cesium_dev_kit)
- [在线示例](https://benpaodehenji.com/cesiumDevKit)
- [English README](https://github.com/dengxiaoning/cesium_dev_kit/blob/main/README.md)
