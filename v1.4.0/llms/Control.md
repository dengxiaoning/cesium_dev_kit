# Control

> 控件模块

- 分类：图层与控制
- API 页面：https://dengxiaoning.github.io/cesium_dev_kit/classes/Control.html
- 源码：https://github.com/dengxiaoning/cesium_dev_kit

## 方法

### definedMouseEvent(options?: DefinedMouseEventOptions): void

定义事件（拖拽 / 旋转 / 缩放）

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DefinedMouseEventOptions` | `targetEntity`（`Entity`）：操作的目标实体 - `ctrlFlag`（`ctrlManualFlag`）：操作状态标识，如 `{ selected: false, leftDown: false }` |

**示例**

```ts
import { Control } from 'cesium_dev_kit/control'
const {control} = new Control({
   cesiumGlobal: Cesium,
containerId: 'cesiumContainer'
})
let ctrlManualFlag = {
selected: false,
leftDown: false
}
// 调用base 的createGraphics创建一个实体
const entity = control.createGraphics()
control.definedMouseEvent({ targetEntity: entity, ctrlFlag: ctrlManualFlag })
```

### defLeftDown(movement?: unknown): void

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `movement?` | `unknown` | - |

### defLeftUp(movement?: unknown): void

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `movement?` | `unknown` | - |

### defMouseMove(movement?: unknown): unknown

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `movement?` | `unknown` | - |

### defMouseWheel(movement?: unknown): unknown

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `movement?` | `unknown` | - |

### manualMoveModel(modifyMode: string): void

平移模型

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `modifyMode` | `string` | 移动标识，可选['move','rotate','scale'] |

**示例**

```ts
import { Control } from 'cesium_dev_kit/control'
const {control} = new Control({
   cesiumGlobal: Cesium,
containerId: 'cesiumContainer'
})
control.manualMoveModel('move')
```

### manualRotateModel(modifyMode: string): void

旋转模型

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `modifyMode` | `string` | 移动标识，可选['move','rotate','scale'] |

**示例**

```ts
import { Control } from 'cesium_dev_kit/control'
const {control} = new Control({
   cesiumGlobal: Cesium,
containerId: 'cesiumContainer'
})
control.manualRotateModel('rotate')
```

### manualScaleModel(modifyMode: string): void

缩放模型

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `modifyMode` | `string` | 移动标识，可选['move','rotate','scale'] |

**示例**

```ts
import { Control } from 'cesium_dev_kit/control'
const {control} = new Control({
   cesiumGlobal: Cesium,
containerId: 'cesiumContainer'
})
control.manualScaleModel('scale')
```

### showEntityOrientationEditPanel(param?: Record): Promise

实体位置、角度编辑面板

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `param?` | `Record` | `entity`（`Entity`）：控制的目标实体 - `elementId`（`string`）：gui 绑定的dom id - `cb`：回调函数 |

**示例**

```ts
import { Control } from 'cesium_dev_kit/control'
const {control} = new Control({
   cesiumGlobal: Cesium,
containerId: 'cesiumContainer'
})
// 调用base 的createGraphics创建一个实体
const crEnt = control.createGraphics()
control.showEntityOrientationEditPanel({
elementId: 'cust-gui-box', 
entity:crEnt, 
cb: orientationRes => {
console.log(orientationRes)
}
});
```

### showLayerParamPanel(layer: ImageryLayer, param?: Record): Promise

图层参数调整

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `layer` | `ImageryLayer` | ImageryLayer对象 |
| `param?` | `Record` | - |

**示例**

```ts
import { Control } from 'cesium_dev_kit/control'
const {viewer,control} = new Control({
   cesiumGlobal: Cesium,
containerId: 'cesiumContainer'
})
let layer = viewer.imageryLayers.addImageryProvider(new Cesium.Scene.GoogleImageryProvider({}));
control.showLayerParamPanel(layer, { elementId: 'cust-gui-box' });
```

### showLayerSwitchPanel(layers?: ImageryLayer[], param?: Record, cb?: object): Promise

图层切换

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `layers?` | `ImageryLayer[]` | - |
| `param?` | `Record` | - |
| `cb?` | `object` | - |

### showLoadDataToScenePanel(param?: Record): Promise

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `param?` | `Record` | - |

### showPostProcessStagesPanel(param?: Record): Promise

后处理面板

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `param?` | `Record` | `elementId`（`string`）：gui 组件绑定的dom - `silhouetteColor`：轮廓颜色 |

**示例**

```ts
import { Control } from 'cesium_dev_kit/control'
const {control} = new Control({
   cesiumGlobal: Cesium,
containerId: 'cesiumContainer'
})
control.showPostProcessStagesPanel({ elementId: 'cust-gui-box' });
```

### showPrimitiveMatrixPanel(param?: Record): Promise

模型，3ditiles等实体位置调整面板， 获取调整后的模型矩阵与平移矩阵

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `param?` | `Record` | `primitives`（`Primitive`）：操作的目标图元 - `elementId`（`string`）：gui对象绑定的dom id - `cb`：回调函数，返回{modelTransformMatrix: [1,0,0,0,1],modelMatrix:[ -1.1639525282088383,-0.2919152481050832,0]} |

**示例**

```ts
import { Control } from 'cesium_dev_kit/control'
const {control,viewer} = new Control({
   cesiumGlobal: Cesium,
containerId: 'cesiumContainer'
})
let tileset =  viewer.scene.primitives.add(new Cesium.Cesium3DTileset({url: 'static/data/3DTiles/building/tileset.json'}));
control.showPrimitiveMatrixPanel({
elementId: 'cust-gui-box',
primitives: tileset, 
cb: resModelMatrix => {
console.log(resModelMatrix);
}
});
```

### showSceneBloomPanel(param?: Record): Promise

环境控制

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `param?` | `Record` | `elementId`（`string`）：gui 组件绑定的dom |

**示例**

```ts
import { Control } from 'cesium_dev_kit/control'
const {control} = new Control({
   cesiumGlobal: Cesium,
containerId: 'cesiumContainer'
})
control.showSceneBloomPanel({ elementId: 'cust-gui-box' });
```

### showSceneEffectEditPanel(options?: Record): Promise

场景效果调整面板

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `Record` | `colorCorrection`（`boolean`）：开启颜色校正 - `bloomEffect`（`boolean`）：泛光开关 - `threshold`（`number`）：泛光阈值 - `bloomIntensity`（`number`）：泛光强度 - `ambientLightColor`（`number`）：环境光 - `hdrEnabled`（`boolean`）：HDR开关 - `saturation`（`number`）：饱和度 - `brightness`（`number`）：亮度 - `contrast`（`number`）：对比度 - `hue`（`number`）：色调 |

**示例**

```ts
import { Control } from 'cesium_dev_kit/control'
const {control} = new Control({
   cesiumGlobal: Cesium,
containerId: 'cesiumContainer'
})
control.showSceneEffectEditPanel({
colorCorrection:false,
saturation :3.1,
brightness : 1.8,
contrast :1.2,
hue :0,
bloomEffect: false,
hdrEnabled : true,
threshold :1,
bloomIntensity : 2,
ambientLightColor: new Cesium.Color(0.3, 0.3, 0.3, 1)
});
```
