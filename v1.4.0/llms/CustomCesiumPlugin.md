# CustomCesiumPlugin

> 自定义插件(传感器)

- 分类：扩展
- API 页面：https://dengxiaoning.github.io/cesium_dev_kit/classes/CustomCesiumPlugin.html
- 源码：https://github.com/dengxiaoning/cesium_dev_kit

## 方法

### createRadarPrimitive(options?: RadarPrimitiveOptions)

锥形传感器

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `RadarPrimitiveOptions` | `position`（`Cartesian3`）：坐标 - `angle`（`number`）：角度 - `radius`（`number`）：半径 - `heading`（`number`）：方向 - `pitch`（`number`）：倾斜度 - `roll`：翻滚角 - `color`：颜色 - `lineColor`：线条颜色 |

**示例**

```ts
import { CustomCesiumPlugin } from 'cesium_dev_kit/custom-cesium-plugin'
const {customCesiumPlugin} = new CustomCesiumPlugin({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
customCesiumPlugin.createRadarPrimitive(
{
position:Cesium.Cartesian3.fromDegrees(117.224, 31.819, 128),
roll: 0,
pitch: 40,
heading: 0
}
)
```

### createRectangularSensorGraphics(options?: RectangularSensorOptions)

伞形传感器

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `RectangularSensorOptions` | `position`（`Cartesian3`）：坐标位置 - `show`：是否显示 - `heading`（`number`）：朝向 - `pitch`（`number`）：倾斜度 - `roll`（`number`）：翻滚角 - `slice`（`number`）：切分段数 - `radius`（`number`）：传感器的半径 - `material`（`Material`）：材质 - `modelMatrix`（`Matrix4`）：模型矩阵 - `showSectorLines`（`Color`）：是否显示扇面的线 - `lineColor`（`Color`）：线的颜色 - `showScanPlane`（`boolean`）：显示扫描面板 - `scanPlaneColor`（`Color`）：扫描面板颜色 - `scanPlaneMode`（`string`）：扫描面模式 可选[垂直vertical/水平horizontal] - `scanPlaneRate`（`number`）：扫描速率 - `showLateralSurfaces`（`number`）：是否显示侧面 - `xHalfAngle`（`number`）：传感器水平半角 - `yHalfAngle`（`number`）：传感器垂直半角 - `showThroughEllipsoid`（`boolean`）：是否穿过地球 |

**示例**

```ts
import { CustomCesiumPlugin } from 'cesium_dev_kit/custom-cesium-plugin'
const {customCesiumPlugin} = new CustomCesiumPlugin({
    cesiumGlobal: Cesium,
    containerId: 'cesiumContainer'
})
customCesiumPlugin.createRectangularSensorGraphics({
position: Cesium.Cartesian3.fromDegrees(117.224, 31.819, 128),
roll: 0,
pitch: 0,
heading: 90,
xHalfAngle:0,
yHalfAngle:0
})
```

### createSatelliteCoverageSimulationGraphics(options?: SatelliteCoverageOptions)

卫星覆盖锥 - `position`（`Cartesian3`）：卫星位置 - `angle`（`number`）：锥角（度） - `radius`（`number`）：覆盖半径（米） - `heading`（`number`）：朝向（度） - `pitch`（`number`）：倾斜度（度） - `roll`（`number`）：翻滚角（度） - `color`（`Color`）：覆盖区域颜色 - `lineColor`（`Color`）：轮廓线颜色

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `SatelliteCoverageOptions` | - |
