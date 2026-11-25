# Cesium + Three.js 单上下文融合：让贴地物体真正「埋进」地形

> 默认的「双 canvas」方案有三个硬伤：深度不共享（物体埋不进地形）、相机矩阵滞后一帧
> （贴地物随视角上下漂浮）、多一层全屏合成。本文讲怎么用 `fusion: 'single-context'`
> 一次解决，以及它有哪些边界条件。

## 双 canvas 为什么「看起来不对」

很多人把 Three.js 画在独立 canvas 上，再用 CSS 叠到 Cesium 上面。对于空中物体没问题，
但**贴地物体**会露馅：

1. 两张画布各有各的深度缓冲，Three 物体和 Cesium 地形互相不知道对方，遮挡全靠猜；
2. Cesium 每帧更新相机，Three 那一帧用的还是上一帧的矩阵，快速旋转时物体会「飘」；
3. 多一次全屏合成，白花一次带宽和 GPU。

## 单上下文融合

`fusion: 'single-context'` 让 Three.js 复用 Cesium 的 canvas 与 WebGL 上下文，直接画进
Cesium 的帧里，共享同一份深度缓冲：

```ts
import * as Cesium from 'cesium'
import * as THREE from 'three'
import { createKit } from 'cesium_dev_kit'

const kit = createKit({
  Cesium,
  three: THREE,
  containerId: 'cesiumContainer',
  threeContainerId: 'threeContainer',
  viewerConfig: {
    // 融合模式需要 WebGL2
    contextOptions: { requestWebgl2: true }
  }
})

const { scene, camera } = kit.threeJs.initThree({
  center: [104.08, 30.62],
  fusion: 'single-context', // 默认 'overlay'，不传即保持双 canvas
  depth: 'canvas-blit',     // single-context 下的默认值
  precision: 'double'       // 默认值
})

// 每帧只更新模型动画，不用自己调 renderer.render
kit.threeJs.loop(() => {
  mixer && mixer.update(0.016)
})
```

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `fusion` | `'overlay'` | `'single-context'` 复用 Cesium 的 canvas 与 WebGL 上下文 |
| `depth` | `'canvas-blit'`（仅 single-context） | 把 Cesium 的深度 blit 到画布，让物体既能被地形遮挡、也能遮挡地形 |
| `precision` | `'double'` | 在 float64 中合成视图矩阵、只降一次精度；`'legacy'` 还原旧实现 |

## 它自动做了两件事

1. 把 `scene.logarithmicDepthFarToNearRatio` 抬到单视锥——多视锥会在帧中清深度，
   帧末只剩最近一段有深度；
2. 跳过旧方案里用于「伪造遮挡」的 ECEF 模拟球。

## 边界条件（务必读完）

- **需要 WebGL2**。取不到上下文时打印原因并自动回退双 canvas，不会中断渲染；
- `scene.msaaSamples > 1` 时 `blitFramebuffer` 可能失败，连续失败会自动关闭深度共享
  （仍共享上下文）；可在 Cesium 侧设 `scene.msaaSamples = 1` 规避；
- 开启 OIT 后深度不在可搬运的 FBO 上，自动降级为「仅共享上下文」；
- 融合模式**不要**调 `renderer.setSize()`：给 canvas 宽高赋值会清空绘制缓冲
  （连带擦掉 Cesium 的画面），尺寸由 Cesium 画布决定。

## 排查遮挡是否生效

```ts
const status = kit.threeJs.getFusionStatus()
// 返回：视锥数量、对数深度开关、MSAA 采样数、当前深度来源
console.log(status)
```

## 完整示例

[在线 Demo：图形挤压 / 光线投射](https://dengxiaoning.github.io/cesium_dev_kit/demo/?auto=1#/cesiumThreejs/extrude) ·
[ThreeJs API](https://dengxiaoning.github.io/cesium_dev_kit/classes/ThreeJs.html)
