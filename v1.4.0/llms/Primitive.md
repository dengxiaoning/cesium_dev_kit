# Primitive

> 图元拓展模块

- 分类：图元与分析
- API 页面：https://dengxiaoning.github.io/cesium_dev_kit/classes/Primitive.html
- 源码：https://github.com/dengxiaoning/cesium_dev_kit

## 方法

### createHeatmap3d(param?: HeatmapOptions)

三维热力图

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `param?` | `HeatmapOptions` | - |

**返回**：图元对象

**示例**

```ts
import { Primitive } from 'cesium_dev_kit/primitive'
const priObj = new Primitive({
   cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
  })
const HEAT_DATA = [{ lng: 104.009628, lat: 30.736313, num: 857 },
{ lng: 104.042587, lat: 30.682755, num: 2043 },{ lng: 104.038467, lat: 30.693741, num: 2021 },{ lng: 104.04808, lat: 30.700607, num: 616 },
{ lng: 104.013748, lat: 30.732193, num: 213 },{ lng: 104.005508, lat: 30.751419, num: 78 },{ lng: 104.063187, lat: 30.71022, num: 86 },
{ lng: 104.042587, lat: 30.748672, num: 1346 },{ lng: 104.017868, lat: 30.692368, num: 6000 },{ lng: 104.061813, lat: 30.700607, num: 53 },
{ lng: 103.962936, lat: 30.717087, num: 513 },{ lng: 104.100266, lat: 30.766525, num: 129 },{ lng: 104.045334, lat: 30.741806, num: 327 },
{ lng: 104.039841, lat: 30.719833, num: 516 },{ lng: 104.028854, lat: 30.71434, num: 1268 },{ lng: 104.030228, lat: 30.708847, num: 243 },
{ lng: 104.030228, lat: 30.725327, num: 477 },{ lng: 104.015121, lat: 30.719833, num: 15 },{ lng: 104.005508, lat: 30.690994, num: 339 },
{ lng: 104.053574, lat: 30.733566, num: 739 },{ lng: 104.002762, lat: 30.725327, num: 1201 },{ lng: 104.135971, lat: 30.758286, num: 1384 },
{ lng: 104.043961, lat: 30.696487, num: 998 },{ lng: 104.039841, lat: 30.725327, num: 300 },{ lng: 104.085159, lat: 30.793991, num: 4 },
{ lng: 104.043961, lat: 30.697861, num: 154 },{ lng: 104.021988, lat: 30.736313, num: 383 },{ lng: 104.071426, lat: 30.682755, num: 245 },
{ lng: 104.075546, lat: 30.682755, num: 1832 },{ lng: 104.074173, lat: 30.695114, num: 5941 },{ lng: 104.0522, lat: 30.689621, num: 676 },
{ lng: 104.096146, lat: 30.7267, num: 148 },{ lng: 104.127731, lat: 30.750046, num: 467 },{ lng: 104.021988, lat: 30.699234, num: 1118 }];
let custPrimitive = priObj.primitive.customPrimivive({
const headMapObjectPivmitive = priObj.primitive.createHeatmap3d({
heatData: HEAT_DATA,
boundsArr: [103.8258, 30.58595, 104.252263, 30.87]
});
let primitiveObj = priObj.viewer.scene.primitives.add(headMapObjectPivmitive);
primitiveObj.show = true;
```

### customPrimivive(params?: Record): void

自定义图元

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `params?` | `Record` | `img`（`string`）：纹理texture图片地址 - `center`：中心坐标 - `height1`（`number`）：起始高度 - `height2`（`number`）：最终高度 - `scale`（`number`）：图元缩放比例 |

**示例**

```ts
import { Primitive } from 'cesium_dev_kit/primitive'
const priObj = new Primitive({
   cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
  })
let custPrimitive = priObj.primitive.customPrimivive({
    center: [104.0737048186066, 30.634227553819127],
    height1: 0,
    height2: 20,
   scale: 0.00006,
   img: 'static/data/images/Textures/beautiful.jpg'
  })
 priObj.viewer.scene.primitives.add(custPrimitive);
```
