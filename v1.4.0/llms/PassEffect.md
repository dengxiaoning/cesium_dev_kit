# PassEffect

> 后期效果模块

- 分类：后处理特效
- API 页面：https://dengxiaoning.github.io/cesium_dev_kit/classes/PassEffect.html
- 源码：https://github.com/dengxiaoning/cesium_dev_kit

## 方法

### createFireParticleSystem(options?: FireParticleSystemOptions)

创建火焰粒子

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `FireParticleSystemOptions` | `position`（`Cartesian3`）：粒子显示位置 - `fireImage`（`string`）：粒子图片 - `startScale`（`number`）：粒子出生时的比例，相对于原始大小 - `endScale`（`number`）：粒子在死亡时的比例 - `minimumParticleLife`（`number`）：设置粒子寿命的可能持续时间的最小界限（以秒为单位），粒子的实际寿命将随机生成 - `maximumParticleLife`（`number`）：设置粒子寿命的可能持续时间的最大界限（以秒为单位），粒子的实际寿命将随机生成 - `minimumSpeed`（`number`）：置以米/秒为单位的最小界限，超过该最小界限，随机选择粒子的实际速度。 - `maximumSpeed`（`number`）：设置以米/秒为单位的最大界限，超过该最大界限，随机选择粒子的实际速度。 - `particleSize`（`number`）：以像素为单位缩放image的大小 - `emissionRate`（`number`）：每秒发射的粒子数 - `startColor`（`Color`）：粒子出生时的颜色 - `endColor`（`Color`）：当粒子死亡时的颜色 - `emitter`（`Color`）：粒子发射器，可选[BoxEmitter,CircleEmitter,ConeEmitter,SphereEmitter] |

**示例**

```ts
import { PassEffect } from 'cesium_dev_kit/pass-effect'
const passEffectObj = new PassEffect({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
const fireParticle = passEffectObj.passEffect.createFireParticleSystem({
     position: Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 180.0)
     fireImage:'static/data/images/file/fire.png',
     startScale: 3,
     endScale: 1.5,
     minimumParticleLife: 1.5,
     maximumParticleLife: 1.8,
     minimumSpeed: 7,
     maximumSpeed: 9,
     particleSize: 2,
     emissionRate: 200,
     startColor: new Cesium.Color(1, 1, 1, 1),
     endColor: new Cesium.Color(0.5, 0, 0, 0),
     emitter:new Cesium.ConeEmitter(Cesium.Math.toRadians(45.0))
})
 // 添加到场景中区
  passEffectObj.viewer.scene.primitives.add(fireParticle);
```

### createLightScan_changeOnePosition(data?: LightCentrumScanData, entity?: any, arr?: number[])

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `data?` | `LightCentrumScanData` | - |
| `entity?` | `any` | - |
| `arr?` | `number[]` | - |

### createLightScan_entityCList(viewer?: Viewer, point?: object[], data?: LightCentrumScanData)

- `circle`（`number[]`）：扫描参数数组 `[半径, 圆心x, 圆心y, 分段数]`，`0.003` 表示半径 - `positionList`（`Cartesian3[] | number[][]`）：坐标数组（类似 polygon，需要闭合） - `material`：材质，可传颜色或 MaterialProperty - `number`（`number`）：扫描比例，数字越小速度越快 - `observer`（`Cartesian3`）：观察点，也就是光源点

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `viewer?` | `Viewer` | - |
| `point?` | `object[]` | - |
| `data?` | `LightCentrumScanData` | - |

### createLightScan_getCirclePoints(r?: number, ox?: number, oy?: number, count?: number): object[]

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `r?` | `number` | - |
| `ox?` | `number` | - |
| `oy?` | `number` | - |
| `count?` | `number` | - |

### destroy(): void

释放当前模块持有的监听器 / DataSource（幂等）

### lighitCentrumScanEffect(data?: LightCentrumScanData): any[]

光锥扫描

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `data?` | `LightCentrumScanData` | `circle`：第一个参数 0.003表示半径， - `positionList`：坐标数组（类似polygon需要闭合） - `material`（`Material`）：材质 - `number`（`number`）：扫描比例（数字越小速度越快） - `observer`：观察点，也就是光源点 第二个第三个分别表示底座圆心的坐标,第四个表示切割成多少个点。 组成多少个面。越多会越卡 尽量实际项目不影响效果，越少越好 |

**返回**：返回polygon实例数组

**示例**

```ts
import { PassEffect } from 'cesium_dev_kit/pass-effect'
const passEffectObj = new PassEffect({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
passEffectObj.passEffect.lighitCentrumScanEffect({
circle: [0.003, 117, 35, 30],
observer: [117.01, 35.01, 500],
positionList: [ [117, 35],[117.01, 35],[117.01, 35.01], [117, 35.01],[117, 35]], 
material: Cesium.Color.RED.withAlpha(0.5, 
number: 100
})
```

### satelliteScan(options?: SatelliteScanOptions)

卫星扫描

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `SatelliteScanOptions` | `position`（`Cartesian3`）：坐标 - `repeat`（`number`）：重复比例10~60 - `color`（`Color`）：颜色 - `length`（`number`）：雷达高度 - `thickness`（`number`）：雷达边厚度0.1~0.9 |

**示例**

```ts
import { PassEffect } from 'cesium_dev_kit/pass-effect'
const passEffectObj = new PassEffect({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
passEffectObj.passEffect.satelliteScan({
     position: [116.39, 39.9],
     length: 40000.0,
     color: Cesium.Color.LIGHTGREEN.withAlpha(0.8),
     repeat: 40,
     thickness: 0.1
  })
```

### setCircleScanEffect(options?: CircleScanEffectOptions)

圆形扩散效果

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `CircleScanEffectOptions` | `position`（`Cartesian3`）：坐标 - `id`（`string`）：id - `radius`（`number`）：半径 - `color`（`Color`）：颜色 - `duration`（`number`）：持续时长 - `circleMode`（`string`）：类型，默认CircleScan扫描 - `border`（`number`）：边框 |

**示例**

```ts
import { PassEffect } from 'cesium_dev_kit/pass-effect'
const passEffectObj = new PassEffect({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
passEffectObj.passEffect.setCircleScanEffect({
id: 'CircleScan',
position: Cesium.Cartesian3.fromDegrees(104.08985268964015, 30.635443158056148, 10.0),
color: Cesium.Color.MEDIUMTURQUOISE.withAlpha(0.5),
duration: 5000,
border: 10,
radius: 2000
})
```

### setRadarScanEffect(options?: RadarScanEffectOptions)

雷达扫描

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `RadarScanEffectOptions` | `position`（`Cartesian3`）：坐标 - `id`（`string`）：id - `radius`（`number`）：半径 - `color`（`Color`）：颜色 - `duration`（`number`）：持续时长 - `border`（`number`）：边框 |

**示例**

```ts
import { PassEffect } from 'cesium_dev_kit/pass-effect'
const passEffectObj = new PassEffect({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
passEffectObj.passEffect.setRadarScanEffect({
id: 'radarScanA',
position: Cesium.Cartesian3.fromDegrees(104.08985268964015, 30.635443158056148, 10.0),
color: Cesium.Color.LIGHTGREEN.withAlpha(0.8),
duration: 2000,
radius: 1000,
border: -1,
width: 5.0
})
```
