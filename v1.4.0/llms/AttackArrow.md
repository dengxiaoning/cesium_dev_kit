# AttackArrow

> 标绘（攻击箭头）模块

- 分类：标绘箭头
- API 页面：https://dengxiaoning.github.io/cesium_dev_kit/classes/AttackArrow.html
- 源码：https://github.com/dengxiaoning/cesium_dev_kit

## 方法

### cartesianToLatlng(cartesian?: Cartesian3): number[]

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `cartesian?` | `Cartesian3` | - |

### createByData(data: number[][]): void

通过数据 绘制攻击箭头

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `data` | `number[][]` | 绘制箭头的数据 |

**示例**

```ts
import { AttackArrow } from 'cesium_dev_kit'
const attackArrowObj = new AttackArrow(viewer, Cesium)
attackArrowObj.createByData([
[110.16018735617934, 31.036076859828338],
[ 104.10758419863926,30.64592470850288],
[ 104.09351691196979, 30.652434826507452],
[104.09816110606057,30.659821965447698]])
```

### creatPoint(cartesian?: Cartesian3)

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `cartesian?` | `Cartesian3` | - |

### disable(): void

销毁绘制操作

### getLnglats(): number[][]

获取攻击中的关键点 经纬度

**示例**

```ts
import { AttackArrow } from 'cesium_dev_kit'
const attackArrowObj = new AttackArrow(viewer, Cesium)
 const res = attackArrowObj.getLnglats()
```

### getPositions(): any[]

获取攻击箭头中的关键点 世界坐标

**示例**

```ts
import { AttackArrow } from 'cesium_dev_kit'
const attackArrowObj = new AttackArrow(viewer, Cesium)
 const res = attackArrowObj.getPositions()
```

### showArrowOnMap(positions?: Cartesian3[])

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `positions?` | `Cartesian3[]` | - |

### startDraw(options: AttackArrowStartDrawOptions | object): void

开始绘制攻击箭头

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options` | `AttackArrowStartDrawOptions \| object` | 兼容老版本(可以是回调函数callback(),也可以为参数对象{fillMaterial:object(),callback:function()}) - `callback`：回调函数 - `fillMaterial`（`Material`）：填充材质 |

**示例**

```ts
import { AttackArrow } from 'cesium_dev_kit'
const attackArrowObj = new AttackArrow(viewer, Cesium)
attackArrowObj.startDraw({fillMaterial: Cesium.Color.DARKKHAKI.withAlpha(0.8),callback:(res)=>{console.log(res)})
```

### startModify(): void

攻击箭头 - 编辑

**示例**

```ts
import { AttackArrow } from 'cesium_dev_kit'
const attackArrowObj = new AttackArrow(viewer, Cesium)
attackArrowObj.startModify((res)=>{console.log(res))
```
