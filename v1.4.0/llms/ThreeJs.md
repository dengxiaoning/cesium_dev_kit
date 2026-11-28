# ThreeJs

> 接入three的融合模块 【注意】cesium 需要关闭自带的循环渲染（useDefaultRenderLoop: false）

- 分类：Three.js 集成
- API 页面：https://dengxiaoning.github.io/cesium_dev_kit/classes/ThreeJs.html
- 源码：https://github.com/dengxiaoning/cesium_dev_kit

## 方法

### destroyThreeJS(): void

three对象销毁

**示例**

```ts
import { ThreeJs } from 'cesium_dev_kit/three'
const threeObj = new ThreeJs({
     cesiumGlobal: Cesium,
    threeGlobal: THREE,
    containerId: 'cesiumContainer',
    threeContainerId: 'threeContainer',
  })
threeObj.threeJs.destroyThreeJS();
```

### getFusionStatus()

融合运行时状态（诊断用）

### getPosition(object?: ThreeObject3D): number[]

获取 three 对象当前所在的地理位置

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `object?` | `ThreeObject3D` | - |

### initThree(options?: ThreeInitOptions): threeObj

初始化three

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `ThreeInitOptions` | `fov`（`number`）：Camera frustum vertical field of view.（fusion 模式下由 Cesium 投影矩阵接管） 默认 `45` - `aspect`（`number`）：Camera frustum aspect ratio. 默认 `window.innerWidth/window.innerHeight` - `near`（`number`）：Camera frustum near plane.（fusion 模式下每帧跟随 Cesium frustum） 默认 `1` - `far`（`number`）：Camera frustum far plane.（fusion 模式下每帧跟随 Cesium frustum） 默认 `10000000` - `center`：Camera center coordinate. 默认 `[104.081701757991, 30.627042558105988]` - `axesHelper`：Enabled axes Helper. 默认 `false` - `enableLighting`：Enabled light. 默认 `true` - `threeHabit`：Enabled threejs Habit(Left click to modify pitch). 默认 `true` - `fusion`（`'overlay'\|'single-context'`）：融合模式。 默认 `'overlay'` - `depth`（`'none'\|'canvas-blit'\|'shader-copy'`）：深度共享方式，仅 single-context 有效。 - `precision`（`'double'\|'legacy'`）：相机矩阵精度策略。 默认 `'double'` - `overlay`：双 Canvas 叠加（历史行为，零耦合） - `single-context`：three 复用 Cesium 的 canvas 与 WebGL 上下文，绘制挂在 scene.postRender 默认 `canvas-blit`：把 Cesium 离屏 FBO 的深度 blit 到画布深度缓冲，从而实现相互遮挡。 `shader-copy` 为预留值（当前回退到 `canvas-blit`），`none` 表示只共享上下文、不共享深度。 `double` 复制 Cesium 投影矩阵并在 float64 里合成视图矩阵；`legacy` 为历史行为。 |

**示例**

```ts
import { ThreeJs } from 'cesium_dev_kit/three'
const threeObj = new ThreeJs({
    cesiumGlobal: Cesium,
    threeGlobal: THREE,
    containerId: 'cesiumContainer',
    threeContainerId: 'threeContainer',
  })
  const { scene, camera } = threeObj.threeJs.initThree({
    center,
    fusion: 'single-context',
    depth: 'canvas-blit'
  });
```

### loop(callback?: object): void

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `callback?` | `object` | - |

### setPosition(object?: ThreeObject3D, position?: number[])

设置 three 对象(模型/网格等)在地球上显示的位置 【注意】需要先调用 initThree 并且对象已通过 scene.add 添加到场景

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `object?` | `ThreeObject3D` | three 对象（THREE.Object3D） |
| `position?` | `number[]` | [lng, lat, height](经纬度:度,高度:米) 或 Cesium.Cartesian3/Cartographic |

**示例**

```ts
const { scene, camera } = threeObj.threeJs.initThree({ center });
const loader = new GLTFLoader();
loader.load('model.glb', (gltf) => {
  scene.add(gltf.scene);
  threeObj.threeJs.setPosition(gltf.scene, [104.081701757991, 30.627042558105988, 0]);
})
```
