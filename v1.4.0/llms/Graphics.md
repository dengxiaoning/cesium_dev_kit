# Graphics

> 图形模块 用于向地图加载各种实体对象

- 分类：实体图形
- API 页面：https://dengxiaoning.github.io/cesium_dev_kit/classes/Graphics.html
- 源码：https://github.com/dengxiaoning/cesium_dev_kit

## 方法

### createBoxGraphics(options?: BoxGraphicsOptions)

创建Box

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `BoxGraphicsOptions` | `position`（`Cartesian3`）：Cartesian3坐标 - `show`（`boolean`）：是否显示 - `name`（`string`）：名称 - `dimensions`：盒子长宽高 - `distanceDisplayCondition`：显示条件 - `outlineColor`：外边线颜色 - `outline`（`boolean`）：是否显示外边线 - `fill`（`boolean`）：是否填充 - `material`（`boolean`）：材质 |

**返回**：返回BoxGraphics实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.createBoxGraphics({
    name: 'boxG',
    position:Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 200),
     material:Cesium.Color.RED.withAlpha(0.2),
     clampToGround:false,
     clampToS3M:false
})
```

**另见**：getBoxGraphics

### createCanvasGraphics(options?: CanvasGraphicsOptions)

canvas 贴图

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `CanvasGraphicsOptions` | `positions`（`Array<Cartesian3>`）：坐标数组 - `img`（`string`）：图片 - `cwidth`（`number`）：宽度 - `cheight`（`number`）：高度 - `callback`：回调 |

**返回**：返回rectangle实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.createCanvasGraphics({
positions:Cesium.Cartesian3.fromDegreesArray(
           110.16018735617934, 31.036076859828338, 
           110.17845812703679,31.033686527335444,
           110.19261040403379, 31.02892781958261, 
           110.20775152895165,31.02475678594998,
           110.2247484728178,31.019315371809977, 
           110.24033095328579,31.017866033294506)
img : "images/ysCesium/logo.png"
cwidth : 500,
cheight:200,
speed:0.06,
callback:res=>{console.log(res)}
})
```

### createCorridorGraphics(options?: CorridorGraphicsOptions)

创建走廊（参数同 `craeteCorridorGraphics`） - `positions`（`any[]`）：坐标数组 - `height`（`number`）：高度 - `width`（`number`）：宽度 - `material`（`MaterialInput`）：材质 - `outline`（`boolean`）：是否显示外边线 - `extrudedHeight`（`number`）：拉伸高度 - `cornerType`：转角类型

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `CorridorGraphicsOptions` | - |

### createCustomDefBillboardGraphics(options?: CustomDefBillboardGraphicsOptions)

自定义标牌气泡框

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `CustomDefBillboardGraphicsOptions` | `position`（`Cartesian3`）：坐标数组 - `height`（`number`）：高度 - `width`（`number`）：宽度 - `text`（`string`）：文字 - `image`（`string`）：气泡窗图片 - `b_pixelOffset`（`Cartesian2`）：偏移 - `b_scale`（`number`）：缩放比例 - `callback`：回调返回entity |

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.createCustomDefBillboardGraphics({
     position: Cesium.Cartesian3.fromDegrees(110.16018735617934, 31.036076859828338),
     image: "static/data/images/Textures/circle_bg.png",
width : 150;
height:80;
text: "建工集团",
b_pixelOffset:new Cesium.Cartesian2(80, -35),
b_scale : 1.5,
})
```

**另见**：getBillboardGraphics

### createDynamicBlinkCircleGraphics(options?: DynamicBlinkCircleGraphicsOptions)

创建闪烁圆（参数同 `craeteDynamicBlinkCircleGraphics`） - `position`：Cartesian3坐标 - `alp`（`number`）：频率 - `flog`（`boolean`）：显示雾气效果 - `height`（`number`）：高度 - `semiMinorAxis`（`number`）：短半轴 - `semiMajorAxis`（`number`）：长半轴

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DynamicBlinkCircleGraphicsOptions` | - |

### createDynamicCircleGraphics(options?: DynamicCricleGraphicsOptions)

创建动态圆（参数同 `craeteDynamicCricleGraphics`） - `center`（`any | number[]`）：中心坐标数组 - `radius`（`number`）：半径 - `rotateAmount`（`number`）：旋转频率 - `height`（`number`）：高度 - `scale`（`number`）：外圆缩放比例 - `scale2`（`number`）：内圆缩放比例 - `imge`（`string`）：材质图片 - `material`（`MaterialInput`）：材质(与图片二选一)

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DynamicCricleGraphicsOptions` | - |

### createDynamicCylinderGraphics(options?: DynamicCylinderGraphicsOptions)

创建动态圆柱（参数同 `craeteDynamicCylinderGraphics`） - `cylinder`（`CylinderGraphicsOptions`）：椎体对象（传给 getCylinderGraphics 的参数） - `entity`：entity实体 - `width`（`number`）：宽度 - `clampToGround`（`boolean`）：是否贴地

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DynamicCylinderGraphicsOptions` | - |

### createDynamicPolyLineGraphics(options?: DynamicPolyLineGraphicsOptions)

创建动态线（参数同 `craeteDynamicPolyLineGraphics`） - `positions`（`any[]`）：坐标数组 - `material`（`MaterialInput`）：材质 - `width`（`number`）：宽度 - `clampToGround`（`boolean`）：是否贴地

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DynamicPolyLineGraphicsOptions` | - |

### createDynamicShadeWallGraphics(options?: DynamicShadeWallGraphicsOptions)

创建渐变墙（参数同 `craeteDynamicShadeWallGraphics`） - `positions`（`any[]`）：坐标数组 - `alp`（`number`）：透明比例 0~1 - `num`（`number`）：渐变步长 - `speed`（`number`）：速度 0~1 - `color`（`any | string`）：颜色 - `img`（`string`）：材质图片

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `DynamicShadeWallGraphicsOptions` | - |

### createFadeCylinderGraphics(options?: FadeCylinderGraphicsOptions)

创建渐变锥体

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `FadeCylinderGraphicsOptions` | `position`（`Cartesian3`）：Cartesian3坐标 - `color`（`string`）：颜色 - `duration`（`number`）：持续时长 - `length`（`number`）：长度 - `topRadius`（`number`）：顶部半径 - `bottomRadius`（`number`）：底部半径 - `slices`（`number`）：垂直分段数量 |

**返回**：返回cylinder实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.createFadeCylinderGraphics({
     position:Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 200),
length:   500 / 2,
topRadius:   130,
bottomRadius:   20,
color: new Cesium.Color(0, 1, 1, 0.4),
slices: 128,
duration:5
})
```

**另见**：- getCylinderGraphics
 - CircleFadeMaterialProperty

### createFanShape(options: object)

创建扇形

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options` | `object` | `viewer`：cesium 视图对象 - `custMaterial`（`Material`）：自定义材质 - `speed`（`Number`）：运动速度 - `longitude`（`Number`）：纬度 - `latitude`（`Number`）：经度 - `alt`（`Number`）：高度(z轴) - `direction`（`String`）：扫描方向（"-"顺时针，"+"逆时针） |

**返回**：返回wall实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.createFanShape({
viewer: this.viewer,
longitude: 104.06417395476578,
latitude: 30.636185094244944,
alt: 700,
speed: 2.0,
direction: '+',
custMaterial: Cesium.Color.AQUAMARINE.withAlpha(0.5)
})
```

### createGifBillboardGraphics(options?: GifBillboardGraphicsOptions)

gif 图片投影

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `GifBillboardGraphicsOptions` | `position`（`Cartesian3`）：Cartesian3坐标 - `dimensions`（`Cartesian2`）：长宽高 - `url`（`string`）：图片 - `normal`（`Cartesian3`）：垂直方向 |

**返回**：返回entity实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.createGifBillboardGraphics({
position: Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 200),
url: 'static/data/file/scene1.gif'
})
```

### createGraphics()

### createLineGraphics(options?: LineGraphicsOptions)

创建线

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `LineGraphicsOptions` | `positions`（`Array<Cartesian3>`）：坐标数组 - `name`（`string`）：图形名称 - `oid`（`string`）：原始id - `material`：配置线段材质 - `width`（`number`）：线宽 - `clampToGround`（`boolean`）：是否贴地 - `label`：绘制label图形的参数 |

**返回**：返回PolylineGraphics实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.createLineGraphics({
   name:'pLine',
   oid:'pLineID',
positions: Cesium.Cartesian3.fromDegreesArray([
104.09816110606057,
30.659821965447698,
104.1120972824757,
30.65330300319938,
104.10758419863926,
30.64592470850288,
104.09351691196979,
30.652434826507452,
104.09816110606057,
30.659821965447698
]),
show: true,
material:  Cesium.Color.YELLOW,
width:1,
clampToGround: false,
})
```

**另见**：getLineGraphics

### createModelGraphics(options?: ModelGraphicsOptions)

创建模型

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `ModelGraphicsOptions` | `position`（`Cartesian3`）：Cartesian3坐标 - `m_url`（`string`）：模型url - `url`（`string`）：模型url - `m_scale`（`number`）：缩放比例 - `scale`（`number`）：缩放比例 |

**返回**：返回ModelGraphics实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.createModelGraphics({
    position:Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 200),
url:"model/person.gltf",
scale:2
})
```

**另见**：getModelGraphics

### createPointsGraphics(options?: PointsGraphicsOptions)

创建点信息

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `PointsGraphicsOptions` | `positions`（`Array<Cartesian3>`）：坐标数组 - `name`（`string`）：图形名称 - `oid`（`string`）：原始id - `material`（`boolean`）：材质 - `point`（`boolean`）：标识是point图形 - `billboard`：绘制billboard图形的参数 - `label`：绘制label图形的参数 |

**返回**：返回实例数组

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.createPointsGraphics({
   name:'cylinderObj',
   oid:'cylinderID',
positions: [Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 400.0)],
billboard: {
b_img: 'static/data/images/Textures/billboard2.png',
b_width: 40,
b_height: 25,
b_scale: 1.5,
b_scaleByDistance: new Cesium.NearFarScalar(1.5e2, 2.0, 1.5e7, 0.5),
heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
},
label: {
l_text: '中科较大',
l_fillColor: Cesium.Color.YELLOW,
l_outlineColor: Cesium.Color.KHAKI,
}
})
```

**另见**：- getPointGraphics
 - getBillboardGraphics
 - getLabelGraphics

### createPolygonGraphics(options?: PolygonGraphicsOptions)

创建面

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `PolygonGraphicsOptions` | `positions`（`Array<Cartesian3>`）：坐标数组 - `material`：配置线段材质 - `clampToGround`（`boolean`）：是否贴地 - `clampToS3M`（`boolean`）：是否贴s3m模型 |

**返回**：返回PolygonGraphics实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.createPolygonGraphics({
     positions:Cesium.Cartesian3.fromDegreesArray([
104.09816110606057,
30.659821965447698,
104.1120972824757,
30.65330300319938,
104.10758419863926,
30.64592470850288,
104.09351691196979,
30.652434826507452,
104.09816110606057,
30.659821965447698
]),
     material:Cesium.Color.RED.withAlpha(0.2),
     clampToGround:false,
     clampToS3M:false
})
```

**另见**：getPolygonGraphics

### createRotateCylinderGraphics(options?: RotateCylinderGraphicsOptions)

创建旋转圆柱（参数同 `craeteRotateCylinderGraphics`） - `position`：Cartesian3坐标 - `length`（`number`）：长度 - `topRadius`（`number`）：顶部半径 - `bottomRadius`（`number`）：底部半径 - `slices`（`number`）：垂直分段数量 - `img`（`string`）：材质图片 - `material`（`MaterialInput`）：材质(与图片二选一)

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `RotateCylinderGraphicsOptions` | - |

### createRotatePlaneGraphics(options?: RotatePlaneGraphicsOptions)

创建旋转面（参数同 `craeteRotatePlaneGraphics`） - `positions`（`any[]`）：坐标数组 - `center`（`number[]`）：中心点（经纬度数组） - `dimensions`（`any | number[]`）：长宽高 - `image`（`string`）：图片

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `RotatePlaneGraphicsOptions` | - |

### createVideoPlaneGraphics(options?: VideoPlaneGraphicsOptions)

视频投放

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `VideoPlaneGraphicsOptions` | `position`（`Cartesian3`）：Cartesian3坐标 - `dimensions`（`Cartesian2`）：长宽高 - `videoElement`（`HTMLElement`）：video绑定dom - `normal`（`Cartesian3`）：垂直方向 |

**返回**：返回plane实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.createVideoPlaneGraphics({
position: Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 200),
videoElement: videoDom,
dimensions: new Cesium.Cartesian2(400.0, 200.0),
})
```

### getBillboardGraphics(options?: BillboardGraphicsOptions)

获取广告牌图形

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `BillboardGraphicsOptions` | `b_img`（`string`）：背景图地址 - `b_width`（`number`）：宽度 - `b_height`（`number`）：高度 - `b_clampToGround`（`boolean`）：贴地 - `b_scale`（`number`）：缩放比例 - `b_scaleByDistance`（`string`）：缩放远近距离 - `b_pixelOffset`（`Cesium.Cartesian2`）：偏移 - `b_eyeOffset`（`Cesium.Cartesian2`）：视角偏移设置 - `b_heightReference`（`Cesium.HeightReference`）：高程参照设置 |

**返回**：返回BillboardGraphics实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.getBillboardGraphics({
b_img: "images/bill.png",
b_width: 35,
b_height : 35,
b_clampToGround : true,
b_scale : 1,
b_pixelOffset :new Cesium.Cartesian2(0, -20),
b_scaleByDistance : new Cesium.NearFarScalar(1.5e2, 0.7, 1.5e7, 0.5),
b_eyeOffset: new Cesium.Cartesian2(0, -20),
b_heightReference: Cesium.HeightReference.RELATIVE_TO_TERRAIN
})
```

### getBoxGraphics(options?: BoxGraphicsOptions)

获取盒子图形

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `BoxGraphicsOptions` | `show`（`boolean`）：是否显示 - `dimensions`：盒子长宽高 - `distanceDisplayCondition`：显示条件 - `outlineColor`：外边线颜色 - `outline`（`boolean`）：是否显示外边线 - `fill`（`boolean`）：是否填充 - `material`（`boolean`）：材质 |

**返回**：返回BoxGraphics实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.getBoxGraphics({
show:true,
dimensions:new Cesium.Cartesian3(400000.0, 300000.0, 500000.0),
outlineColor:  Cesium.Color.YELLOW,
outline:   true,
fill:   true,
material:Cesium.Color.RED.withAlpha(0.5),
distanceDisplayCondition: new Cesium.DistanceDisplayCondition(2000.0, 4000.0)
})
```

### getCylinderGraphics(options?: CylinderGraphicsOptions)

获取锥体图形

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `CylinderGraphicsOptions` | `length`（`number`）：长度 - `topRadius`（`number`）：顶部半径 - `bottomRadius`（`number`）：底部半径 - `material`（`boolean`）：材质 - `slices`（`number`）：垂直分段数量 |

**返回**：返回CylinderGraphics实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.getCylinderGraphics({
length:   500 / 2,
topRadius:   130,
bottomRadius:   20,
material: new Cesium.Color(0, 1, 1, 0.4),
slices: 128,
})
```

### getEllipseGraphics(options?: EllipseGraphicsOptions)

获取椭圆

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `EllipseGraphicsOptions` | `e_semiMajorAxis`（`number`）：长半轴 - `e_semiMinorAxis`（`number`）：短半轴 - `e_metarial`：材质 - `e_outline`（`boolean`）：是否显示外边线 |

**返回**：返回EllipseGraphics实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.getEllipseGraphics({
e_semiMajorAxis:1000080.0,
e_semiMinorAxis:1000000.0,
e_metarial:Cesium.Color.RED.withAlpha(0.5),
e_outline:true
})
```

### getEllipsoidGraphics(options?: EllipsoidGraphicsOptions)

获取球

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `EllipsoidGraphicsOptions` | `radii`（`number`）：半径 - `innerRadii`（`number`）：内球半径 - `maximumCone`（`number`）：椭圆最大角度 - `stackPartitions`（`number`）：垂直分段数 - `slicePartitions`（`number`）：平行分段数 - `outlineWidth`（`number`）：外边线宽度 - `outlineColor`：外边线颜色 - `outline`（`boolean`）：是否显示外边线 - `fill`（`boolean`）：是否填充 - `material`（`boolean`）：材质 |

**返回**：返回EllipsoidGraphics实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.getEllipsoidGraphics({
radii: 1000000.0, //单位 米
innerRadii: 50000.0,
maximumCone: Cesium.Math.PI_OVER_TWO,
stackPartitions:   56,
slicePartitions:   56,
outlineWidth:   2.0,
outlineColor:  Cesium.Color.YELLOW,
outline:   true,
fill:   true,
material:  Cesium.Color.RED.withAlpha(0.1),
})
```

### getLabelGraphics(options?: LabelGraphicsOptions)

获取标签图形

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `LabelGraphicsOptions` | `l_text`（`string`）：标签文字 - `l_font`（`string`）：字体 - `l_fillColor`（`string`）：颜色 - `l_style`（`string`）：风格 - `l_outlineColor`（`number`）：外边线颜色 - `l_outlineWidth`（`number`）：外边线宽度 - `l_showBackground`（`boolean`）：是否显示背景颜色 - `l_backgroundColor`：背景颜色 - `l_verticalOrigin`（`string`）：垂直方向 - `l_pixelOffset`（`Cesium.Cartesian2`）：偏移 - `l_heightReference`（`Cesium.HeightReference`）：高程参照设置 |

**返回**：返回LabelGraphics实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.getLabelGraphics({
l_text:"你好",
l_font : "14px sans-serif",
l_fillColor : Cesium.Color.GOLD,
l_style : Cesium.LabelStyle.FILL_AND_OUTLINE,
l_outlineWidth : 2,
l_showBackground: false,
l_backgroundColor : new Cesium.Color(0.165, 0.165, 0.165, 0.8),
l_verticalOrigin : Cesium.VerticalOrigin.BOTTOM,
l_pixelOffset: new Cesium.Cartesian2(0, -30),
l_heightReference: Cesium.HeightReference.RELATIVE_TO_TERRAIN
})
```

### getLineGraphics(options?: LineGraphicsOptions)

获取线图形

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `LineGraphicsOptions` | `positions`（`Array<Cartesian3>`）：绘制线图形的坐标数组 - `material`：配置线段材质 - `width`（`number`）：线宽 - `clampToGround`（`boolean`）：是否贴地 |

**返回**：返回PolylineGraphics实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.getLineGraphics({
    positions:Cesium.Cartesian3.fromDegreesArray([
104.09816110606057,
30.659821965447698,
104.1120972824757,
30.65330300319938,
104.10758419863926,
30.64592470850288,
104.09351691196979,
30.652434826507452,
104.09816110606057,
30.659821965447698
]),
     material:Cesium.Color.RED.withAlpha(0.2),
     clampToGround:false,
     width:1
})
```

### getModelGraphics(options?: ModelGraphicsOptions)

获取模型

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `ModelGraphicsOptions` | `m_url`（`string`）：模型url - `url`（`string`）：模型url - `m_scale`（`number`）：缩放比例 - `scale`（`number`）：缩放比例 |

**返回**：返回ModelGraphics实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.getModelGraphics({
url:"model/person.gltf",
scale:2
})
```

### getPathGraphics(options?: PathGraphicsOptions)

获取路径

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `PathGraphicsOptions` | `resolution`（`number`）：采样频率 - `glowPower`（`number`）：发光强度 - `color`：颜色 - `width`（`number`）：宽度 |

**返回**：返回PathGraphics实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.getPathGraphics({
resolution:1,
glowPower:0.1,
color:Cesium.Color.YELLOW,
width:24
})
```

### getPlaneGraphics(options?: PlaneGraphicsOptions)

获取面板图形

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `PlaneGraphicsOptions` | `plane`：面板垂直方向 - `dimensions`：面板长宽高 - `material`（`boolean`）：材质 |

**返回**：返回PlaneGraphics实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.getPlaneGraphics({
   plane: new Cesium.Plane(Cesium.Cartesian3.UNIT_Y, 0.0),
dimensions:new Cesium.Cartesian2(170.0, 130.0),
material:Cesium.Color.BLUE
})
```

### getPointGraphics(options?: PointGraphicsOptions)

获取点图形

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `PointGraphicsOptions` | `color`：点颜色 - `pixelSize`（`number`）：点大小 - `outlineColor`（`number`）：边线颜色 - `outlineWidth`（`number`）：边线宽 |

**返回**：返回PointGraphics实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.getPointGraphics({
    color:Cesium.Color.GREEN,
     pixelSize:5,
     outlineColor:Cesium.Color.WHITE,
     outlineWidth:1
})
```

### getPolygonGraphics(options?: PolygonGraphicsOptions)

获取面图形

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `PolygonGraphicsOptions` | `positions`（`Array<Cartesian3>`）：绘制线图形的坐标数组 - `material`：配置线段材质 - `clampToGround`（`boolean`）：是否贴地 |

**返回**：返回PolygonGraphics实例

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
graphicObj.graphics.getPolygonGraphics({
    positions:Cesium.Cartesian3.fromDegreesArray([
104.09816110606057,
30.659821965447698,
104.1120972824757,
30.65330300319938,
104.10758419863926,
30.64592470850288,
104.09351691196979,
30.652434826507452,
104.09816110606057,
30.659821965447698
]),
     material:Cesium.Color.RED.withAlpha(0.2),
     clampToGround:false
})
```

### setGraphicsFloat(options?: SetGraphicsFloatOptions)

图形浮动

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `SetGraphicsFloatOptions` | `position`（`Cartesian3`）：坐标数组 - `entity`（`Entity`）：实体对象 - `maxHeiht`（`number`）：最大高度 - `minHeiht`（`number`）：最小高度 - `cartesians`（`Cartesian`）：原始位置 - `speed`（`Cartesian`）：速度 |

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
const billboardGraphics =  graphicObj.graphics.getBillboardGraphics({
b_img: "images/bill.png",
b_width: 35,
b_height : 35,
b_clampToGround : true,
b_scale : 1,
b_pixelOffset :new Cesium.Cartesian2(0, -20),
b_scaleByDistance : new Cesium.NearFarScalar(1.5e2, 0.7, 1.5e7, 0.5),
});
graphicObj.graphics.setGraphicsRotate({
entity: billboardGraphics,
cartesians: Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 200),
minHeiht : 5,
maxHeiht:100,
speed:0.06,
})
```

**另见**：- transformWGS84ToCartesian
 - transformCartesianToWGS84
 - transformCartesianArrayToWGS84Array
 - transformWGS84ArrayToCartesianArray

### setGraphicsRotate(options?: SetGraphicsRotateOptions)

设置图形旋转

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `SetGraphicsRotateOptions` | `position`：wgs84坐标 - `entity`（`Entity`）：实体对象 - `rotateAmount`（`number`）：旋转比例 |

**示例**

```ts
import { Graphics } from 'cesium_dev_kit/graphics'
const graphicObj = new Graphics({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
});
const billboardGraphics =  graphicObj.graphics.getBillboardGraphics({
b_img: "images/bill.png",
b_width: 35,
b_height : 35,
b_clampToGround : true,
b_scale : 1,
b_pixelOffset :new Cesium.Cartesian2(0, -20),
b_scaleByDistance : new Cesium.NearFarScalar(1.5e2, 0.7, 1.5e7, 0.5),
});
graphicObj.graphics.setGraphicsRotate({
entity:billboardGraphics ,
position: { lng: 104.081701757991, lat: 30.627042558105988, alt: 1 },
rotateAmount: 4,
})
```

**另见**：transformWGS84ToCartesian
