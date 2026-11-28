# Base

> 基本构造方法base

- 分类：基础设施
- API 页面：https://dengxiaoning.github.io/cesium_dev_kit/classes/Base.html
- 源码：https://github.com/dengxiaoning/cesium_dev_kit

## 方法

### bindHandleEvent(options: BindHandleEventOptions)

鼠标事件注册

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options` | `BindHandleEventOptions` | `leftClick`：左键点击，回调签名 `(event, handlers)` - `mouseMove`：鼠标移动 - `doubleClick`：左键双击 - `leftDown`：左键按下 - `mouseWheel`：鼠标滚动 - `leftUp`：左键弹起 |

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const { base } = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
 base.bindHandleEvent({
leftClick: function click(event, _handlers) {
todo something...
},
mouseMove: function move(event) {
todo something...
},
});
```

### createGraphics()

创建一个Graphics实体

**返回**：Entity

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
 const entity = kit.base.createGraphics()
```

### flyTo(options?: CameraSetOptions)

相机飞行

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `CameraSetOptions` | `position`（`Cartesian3`）：目标位置数组 - `distance`（`number`）：距离 - `duration`（`number`）：过度时长(秒为单位) - `orientation`：方位，包含[朝向\|倾斜角\|翻滚角] - `easingFunction`：飞行中在duration时间内插值方式 - `callback`：操作完成后的回调 |

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
kit.base.flyTo({
position: { x: -1337132.0092982147, y: 5330611.474631115, z: 3228680.029449292 },
orientation: {
heading: Cesium.Math.toRadians(1.0114629015290062),
pitch: Cesium.Math.toRadians(-23.53661660731824),
roll: Cesium.Math.toRadians(0.00324596311071617)
},,
distance：300,
duration:3
})
```

### getCameraPosition()

获取相机位置

**返回**：相机位置信息

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const { base } = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})

  base.bindHandleEvent({
     leftClick: function click (event, _handlers) {
       const pos = base.getCameraPosition();
       console.log(pos);
     }
    })
```

### getCatesian3FromPX(px: Cartesian2)

拾取位置点

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `px` | `Cartesian2` | 屏幕二维坐标 |

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const { viewer, base } = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
 const _handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
_handler.setInputAction(function (movement: any) {
var cartesian = base.getCatesian3FromPX(movement.endPosition);
console.log(cartesian)
}, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
```

**另见**：- transformWGS84ToCartesian
 - transformCartesianToWGS84

### getDfSt(attrArr: string[])

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `attrArr` | `string[]` | - |

### getHandlePosition(callback: object)

获取鼠标信息

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `callback` | `object` | - |

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const { base } = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
base.getHandlePosition(res=>{console.log(res)})
```

### getHandlerClickPosition(e: ScreenSpaceEventMovement)

获取鼠标点击后的位置信息

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `e` | `ScreenSpaceEventMovement` | 监听的事件对象 - `position`（`Cartesian2`）：事件发生时的屏幕二维坐标（像素） - `endPosition`（`Cartesian2`）：鼠标移动时的结束位置，仅 MOUSE_MOVE 事件有 |

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const { base } = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})

  base.bindHandleEvent({
     leftClick: function click (event, _handlers) {
       const { wgs84Coor, graphicCoor, cameraPosition } = base.getHandlerClickPosition(event);
       console.log(wgs84Coor, graphicCoor, cameraPosition);
     }
    })
```

### lnglatArrayToCartesians(lnglats: number[][])

经纬度坐标数组转笛卡尔积世界坐标数组

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `lnglats` | `number[][]` | 经纬度坐标数组 |

**返回**：cartesians -  笛卡尔积世界坐标数组

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
kit.base.lnglatArrayToCartesians([[117,40],[118.41]])
```

### pickUpPosition(e: ScreenSpaceEventMovement)

通过点击屏幕Cartesian2二维坐标，获取鼠标点击后的xy值； 根据xy判断当前目标对象是3dtiles、地形、模型、地球等通过不同方式获取对应位置信息

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `e` | `ScreenSpaceEventMovement` | 监听的事件对象 - `position`（`Cartesian2`）：事件发生时的屏幕二维坐标（像素） - `endPosition`（`Cartesian2`）：鼠标移动时的结束位置，仅 MOUSE_MOVE 事件有 |

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const { base } = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})

  base.bindHandleEvent({
     leftClick: function click (event, _handlers) {
       const cartesian3 = base.pickUpPosition(event);
       console.log(cartesian3);
     }
    })
```

### removeHandlerByName(eventNameArr: string[])

移除绑定的handler事件

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `eventNameArr` | `string[]` | handler名称数组，如['LEFT_CLICK','MOUSE_MOVE'] |

### removePostProcessStage(stage?: PostProcessStage | PostProcessStage[])

删除后置效果

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `stage?` | `PostProcessStage \| PostProcessStage[]` | 后置场景对象数组 |

### saveSceneImages()

保存当前场景png

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const { base } = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
base.saveSceneImages()
```

### setBloomLightScene()

场景泛光

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
kit.base.setBloomLightScene()
```

### setBlurBloom(options?: BlurBloomOptions)

场景蓝光

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `BlurBloomOptions` | `width`（`number`）：曝光区域宽度 - `height`（`number`）：曝光区域高度 |

**返回**：postProcessStages 实例

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
kit.base.setBlurBloom({width:80,height:97})
```

### setCameraEotateHeading(options: CameraRotateHeadingOptions)

相机绕点旋转

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options` | `CameraRotateHeadingOptions` | `lng`（`number`）：经度 - `lat`（`number`）：纬度 - `height`（`number`）：z轴高度 |

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
   Cesium,
containerId: 'cesiumContainer'
})
kit.base.setCameraEotateHeading({
lng: 117.1423291616,
lat: 39.0645831633,
height: 15.8
})
```

### setDarkEffect(options?: DarkEffectOptions)

黑夜特效

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DarkEffectOptions` | `offset`（`Cartesian3`）：偏移 |

**返回**：postProcessStages 实例

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
kit.base.setDarkEffect({offset:new Cesium.Cartesian3(0.1, 0.2, 0.3)})
```

### setDefSceneConfig()

默认场景配置

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
kit.base.setDefSceneConfig()
```

### setFogEffect()

雾天

**返回**：postProcessStages 实例

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
kit.base.setFogEffect()
```

### setOneGroundSkyBox()

近景天空盒

**返回**：SkyBox

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
kit.base.setOneGroundSkyBox()
```

**另见**：SkyBoxOnGround

### setOneSkyBox()

天空盒

**返回**：SkyBox

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
kit.base.setOneSkyBox()
```

### setRainEffect()

雨天特效

**返回**：postProcessStages 实例

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
kit.base.setRainEffect()
```

### setSnowEffect()

雪天特效

**返回**：postProcessStages 实例

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
kit.base.setSnowEffect()
```

### setThreeGroundSkyBox()

近景天空盒3

**返回**：SkyBox

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
kit.base.setThreeGroundSkyBox()
```

**另见**：SkyBoxOnGround

### setThreeSkyBox()

天空盒3

**返回**：SkyBox

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
kit.base.setThreeSkyBox()
```

### setTwoGroundSkyBox()

近景天空盒2

**返回**：SkyBox

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
kit.base.setTwoGroundSkyBox()
```

**另见**：SkyBoxOnGround

### setTwoSkyBox()

天空盒2

**返回**：SkyBox

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
kit.base.setTwoSkyBox()
```

### setView(options?: CameraSetOptions)

相机定位

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `CameraSetOptions` | `position`（`Cartesian3`）：目标位置数组 - `distance`（`number`）：距离 - `orientation`：方位，包含[朝向\|倾斜角\|翻滚角] |

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
kit.base.setView({
position: new Cesium.Cartesian3(-1337035.7496454942, 5285202.940044943, 3305373.990594733),
orientation: {
heading: 6.108097731064569,
pitch: -0.15254104473396812,
roll: 6.283157460498558,
},
});
```

### transformCartesianArrayToWGS84Array(cartesianArr: Cartesian3[])

笛卡尔积坐标数组转换 84地理坐标

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `cartesianArr` | `Cartesian3[]` | - |

**返回**：转换后的笛卡尔积数组

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
kit.base.transformCartesianArrayToWGS84Array(Cesium.Cartesian3.fromDegreesArray( 110.16018735617934, 31.036076859828338, 110.17845812703679,31.033686527335444))
```

**另见**：transformCartesianToWGS84

### transformCartesianToWGS84(cartesian?: Cartesian3 | WGS84Type)

笛卡尔转坐标WGS84

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `cartesian?` | `Cartesian3 \| WGS84Type` | 笛卡尔积坐标数组 |

**返回**：转换后wgs84坐标对象

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
kit.base.transformCartesianToWGS84(Cesium.Cartesian3.fromDegrees(110.16018735617934, 31.036076859828338))
```

### transformWGS84ArrayToCartesianArray(WSG84Arr: WGS84Type[], alt?: number)

坐标数组转换 笛卡尔转84

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `WSG84Arr` | `WGS84Type[]` | WSG84Arr坐标数组 |
| `alt?` | `number` | z轴高层 |

**返回**：转换后的笛卡尔积数组

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
kit.base.transformWGS84ArrayToCartesianArray([{lng:110.16018735617934, lat:31.036076859828338, alt:0 }])
```

**另见**：transformWGS84ToCartesian

### transformWGS84ToCartesian(position?: WGS84Type, alt?: number)

坐标转换 84转笛卡尔

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `position?` | `WGS84Type` | 坐标数组 - `lng`（`number`）：经度 - `lon`（`number`）：纬度 - `lat`（`number`）：z轴 |
| `alt?` | `number` | 高层 |

**返回**：转换后的笛卡尔积数组

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
kit.base.transformWGS84ToCartesian({lng:110.16018735617934, lat:31.036076859828338, alt:0 },30)
```

### transformWGS84ToCartographic(position: WGS84Type)

wgs84坐标转地图坐标

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `position` | `WGS84Type` | `lng`（`number`）：经度 - `lon`（`number`）：经度 - `lat`（`number`）：纬度 - `alt`（`number`）：z轴 |

**返回**：地理坐标

**示例**

```ts
import { createKit } from 'cesium_dev_kit'
const kit = createKit({
    Cesium,
    containerId: 'cesiumContainer'
})
const wgs84 =  kit.base.transformCartesianToWGS84(Cesium.Cartesian3.fromDegrees(110.16018735617934, 31.036076859828338));
const cartographic = kit.base.transformWGS84ToCartographic(wgs84)
// or
const cartographic2 = kit.base.transformWGS84ToCartographic({lng:110.16018735617934, lat:31.036076859828338, alt:0 });
```

**另见**：transformCartesianToWGS84

### updateCameraState(flag: boolean)

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `flag` | `boolean` | - |
