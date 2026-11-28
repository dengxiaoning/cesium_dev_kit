# TerrainEdit

> 地形编辑：在 Cesium 地球上圈定范围，做塌陷 / 抬升 / 平整 / 平滑，并叠加水面与台阶。 ## 实现思路 Cesium 没有开放「写地形」的接口（`terrainProvider` 只读），所以这里采用 **采样真实地形 + Three.js 局部网格覆盖** 的方式： 1. 绘制多边形后，在多边形包围盒内生成规则格网，用 `sampleTerrainMostDetailed` 采样真实地形高度作为基准面； 2. 形变只在多边形内部按「到边界的距离」加权生效，边界处权重为 0， 因此覆盖网格与原始地形在坑口处严丝合缝，不会有悬空或裂缝； 3. 用 Three.js 渲染这张带顶点色的网格，配合 `stepHeight` 生成台阶、 水面与等高线，视觉上就是被挖开的矿坑 / 被堆起来的土方。 如果后续要把形变写回 Cesium 地形，可以基于同一份 `TerrainGrid` 生成 `CustomHeightmapTerrainProvider` 的高度图，形变算法不需要改。

- 分类：地形编辑
- API 页面：https://dengxiaoning.github.io/cesium_dev_kit/classes/TerrainEdit.html
- 源码：https://github.com/dengxiaoning/cesium_dev_kit

## 方法

### apply(options?: TerrainEditApplyOptions): TerrainEditInstance

对当前范围执行一次形变。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `TerrainEditApplyOptions` | 形变参数 - `waterLevel`（`number \| 'auto' \| null`）：水面高度： - `rebuildWater`（`boolean`）：是否重建水面（默认 true） |

**示例**

```ts
// 塌陷 60 米，台阶高 6 米，水面自动
terrainEdit.apply({ mode: 'sink', depth: 60, stepHeight: 6, waterLevel: 'auto' })
// 再往上堆 20 米
terrainEdit.apply({ mode: 'raise', depth: 20 })
```

### beginDraw(options?: TerrainEditDrawOptions): TerrainEditInstance

开始在地形上绘制编辑范围。 左键加点、移动鼠标实时预览、双击或右键结束；至少 3 个点才会生成地形块。 绘制时依赖 `scene.pickPosition` / `globe.pick` 贴合真实地形，因此需要先设置 `viewer.terrainProvider`（真实地形）并开启 `depthTestAgainstTerrain`。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `TerrainEditDrawOptions` | 绘制样式与回调 - `color`（`string`）：线条颜色，默认 `#7defff` - `width`（`number`）：线宽（像素），默认 4 - `callback`（`(polygon: TerrainLngLatHeight[]) => void`）：绘制完成后回调，参数为经纬度顶点（度） - `segments`（`number`）：网格分辨率（每边划分数），默认 64 |

**示例**

```ts
// 打开绘制：双击结束后会自动生成可编辑地形块
terrainEdit.beginDraw({
  color: '#7defff',
  callback: (polygon) => console.log('绘制完成', polygon)
})
```

### beginStroke(): TerrainEditInstance

开始一次涂抹（记录撤销快照）

### cancelDraw(): TerrainEditInstance

取消绘制并清除草稿线。

### clear(): TerrainEditInstance

清除地形块、水面与绘制状态。

### destroy(): void

兼容 kit 的统一销毁入口

### dispose(): void

释放全部资源（three 网格、绘制的实体、事件监听）。

### enableBrush(enabled: boolean): TerrainEditInstance

开启 / 关闭鼠标涂抹。 开启后会接管左键拖动（Cesium 的旋转相机被临时关闭，滚轮缩放仍可用）， 并显示贴地的圆形笔刷光标；关闭后恢复相机操作。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `enabled` | `boolean` | true 开启，false 关闭 |

### endStroke(): TerrainEditInstance

结束一次涂抹（落定等高线与统计）

### exportData(): TerrainEditSnapshot | null

导出当前编辑结果，得到一份可直接 `JSON.stringify` 的数据包。 **为什么是「返回数据」而不是「保存文件」**：这个模块跑在调用方的页面里， 数据落到哪儿（后端接口、localStorage、对象存储、GIS 文件、剪贴板）属于业务决定， 库不该替用户选。所以这里只产出**完整、自包含、可序列化**的快照， 存哪儿、存多久、要不要加密压缩，交给调用方；示例页里的「保存数据」 就是拿这个返回值自己做了个下载，而不是库内置了一套存储。 快照不只包含高度：二次编辑需要「原始地形 + 几何参数」才能正确重算挖填方、 重烘坡面明暗、继续用笔刷，所以 `grid.base` 与 `grid.current` 两份高度场都会带上 （Float32 原样 base64，往返逐位无损），并附带多边形、区域参数、水面 / 等高线 / 贴图状态以及笔刷设置。 体量：`segments = 160` 时约 277KB（两份 161×161 的 Float32，base64 后），gzip 约 180KB。 这份开销是「无损」换来的：需要更小的载荷就降低 `setArea({ segments })`， 或者只用 `getHeightField()` 自己量化 / 转成 GeoTIFF 等格式。

**返回**：数据包；尚未圈定编辑范围时返回 null

**示例**

```ts
// 存到自己的后端
const data = terrainEdit.exportData()
await fetch('/api/terrain/1', { method: 'POST', body: JSON.stringify(data) })

// 或者做成文件让用户下载（下载这一步属于业务侧，不在库里）
const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
const a = document.createElement('a')
a.href = URL.createObjectURL(blob)
a.download = 'terrain.json'
a.click()
```

### finishDraw(): TerrainEditInstance

手动结束绘制（等价于双击 / 右键）。 点数不足 3 个时会自动取消，并触发 `onError`。

### getBrush(): Required & object

读取当前笔刷参数

### getHeightField(): TerrainHeightField | null

取当前高度场（Float32Array 副本），用于在内存里做二次计算。 不需要序列化、只要数值时用这个：不经过 base64，直接拿到 `base` / `current`， 两者之差就是每个顶点的挖填量（负数挖、正数填），可以直接喂给等高线、 坡度分析、导出成 GeoTIFF 或自己的格网格式。数组是副本，改它不影响场景。

**返回**：高度场；尚未圈定编辑范围时返回 null

**示例**

```ts
const field = terrainEdit.getHeightField()
const delta = field.current.map((h, i) => h - field.base[i])
console.log('最大挖深', Math.min(...delta))
```

### getPolygon(): TerrainLngLatHeight[]

获取当前多边形（度）。

### getStats(): TerrainEditStatsResult | null

读取当前范围的地形统计：面积、最高最低点、挖填方量、水面高程。

**返回**：统计结果；未设置范围时返回 null

### importData(snapshot: string | TerrainEditSnapshot): TerrainEditInstance

载入 `exportData()` 导出的数据，恢复到可继续编辑的状态。 与 `setPolygon()` 的关键区别：**不会再采样地形**。高度直接从数据包里恢复， 所以即使此刻没有配置地形服务、或者原地形数据已经变了，也能一模一样地复原； 载入后笔刷、撤销、统计、水面、等高线照常工作，地表贴图按新范围在后台重新取。 数据包结构不对（不是本模块导出的、版本不匹配、base64 损坏、长度对不上、 范围与 polygon 不匹配）都会抛 `INVALID_ARGUMENT`，不会渲染出一块错位的地形。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `snapshot` | `string \| TerrainEditSnapshot` | `exportData()` 的返回值，或它 `JSON.parse` 之后的对象； 也可以直接给 JSON 字符串（例如 `localStorage.getItem()` 的返回值），内部会自己解析 |

**示例**

```ts
const data = await (await fetch('/api/terrain/1')).json()
terrainEdit.importData(data).enableBrush(true)

// 从 localStorage 读也一样
terrainEdit.importData(localStorage.getItem('terrain-1') || '')
```

### refreshTexture(): Promise

重建地表贴图（例如切换了影像图层、或区域范围变了之后）。

### setArea(center: any, options?: TerrainEditAreaOptions): Promise

就地开辟一块可连续涂抹的地形编辑区域（不需要先画多边形）。 区域是一个边长 `size` 米的正方形，内部按 `segments` 划分成规则格网， 边缘按 `feather` 米羽化，因此刷到边界时不会出现断崖。 建好之后配合 `enableBrush()` + 鼠标拖动即可像地形笔刷一样连续涂抹。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `center` | `any` | 区域中心：`[lng, lat]` / `{lng, lat}` / `Cartesian3` |
| `options?` | `TerrainEditAreaOptions` | 区域尺寸与格网分辨率 - `size`（`number`）：区域边长（米），默认 2000 - `segments`（`number`）：每边划分数，默认 160 - `feather`（`number`）：边缘过渡宽度（米），默认 80 - `texture`（`boolean`）：是否取影像作为地表贴图，默认 true - `fillHoles`（`boolean`）：是否把区域内部被包住的空洞填平，默认 true（见 setPolygon） - `cutSurface`（`boolean`）：是否启用程序化岩土材质，默认 true。 |

**示例**

```ts
// 以当前视野中心为原点，铺一块 2km、160x160 的可编辑器
await terrainEdit.setArea([117.1, 36.25], { size: 2000, segments: 160 })
terrainEdit.setBrush({ mode: 'lower', radius: 150, maxDelta: 3 }).enableBrush(true)
```

### setBrush(options?: TerrainEditBrushOptions): TerrainEditInstance

设置笔刷参数（不影响已刷出的地形）。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `options?` | `TerrainEditBrushOptions` | 模式、半径、台阶落差、目标高度 - `mode`（`TerrainBrushMode`）：笔刷模式，默认 `lower`（下沉） - `radius`（`number`）：笔刷半径（米），默认 110 - `strength`（`number`）：向目标标高推进的比例 0~1，默认 1（一步压到绝对平）。 - `hardness`（`number`）：平整核心占半径的比例 0~1，默认 0.9：平台几乎铺满笔刷，边缘只留一圈窄立面 - `roughness`（`number`）：坑口不规则度 0~1，默认 0.28。 - `maxDelta`（`number`）：一级台阶的落差（米），默认 3。 - `strokeLimit`（`number`）：一笔之内的累计上限系数（`maxDelta × strokeLimit`）。 - `targetHeight`（`number \| null`）：`level` 模式的目标高程（米），缺省取落笔处原地形高度 |

**示例**

```ts
terrainEdit.setBrush({ mode: 'level', radius: 200, targetHeight: 900 })
```

### setContourVisible(visible: boolean): TerrainEditInstance

显示 / 隐藏台阶等高线（青色网格线）。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `visible` | `boolean` | true 显示，false 隐藏 |

### setCutSurfaceEnabled(enabled: boolean): TerrainEditInstance

挖/填出来的坡面是否叠加程序化岩土材质（默认 true）。 陡壁上的卫星影像是平面俯视图，近垂直面会发虚；打开后按「坡度 + 挖填深度」 在影像之上叠一层 3D 噪声岩土，更像真实的开挖断面。缓坡仍保留影像。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `enabled` | `boolean` | - |

**示例**

```ts
terrainEdit.setCutSurfaceEnabled(false)
```

### setPolygon(positions: any[], options?: object): Promise

直接指定多边形范围（不经过鼠标绘制）。 生成过程会按格网采样真实地形高度，因此返回 Promise； 采样失败（例如没有配置地形）时自动退化为 0 高程平面。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `positions` | `any[]` | 多边形顶点，支持 `[lng, lat]` / `{lng, lat}` / Cartesian3 |
| `options?` | `object` | 网格分辨率等参数 |

**示例**

```ts
await terrainEdit.setPolygon([
  [117.095, 36.245],
  [117.105, 36.245],
  [117.105, 36.255],
  [117.095, 36.255]
])
```

### setTextureEnabled(enabled: boolean): TerrainEditInstance

是否用影像贴图显示编辑区（默认 true）。 开启后会向当前影像图层要瓦片，把地表纹理贴到编辑区， 挖开的地表仍是它本来的颜色，而不是一块纯色网格。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `enabled` | `boolean` | - |

### setWaterLevel(level: number | "auto" | null): TerrainEditInstance

设置水面高度并立即重绘。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `level` | `number \| "auto" \| null` | 相对水位（0~1）/ 绝对高程（米）/ 'auto' / null |

### strokeAt(lng: number, lat: number): TerrainEditInstance

手动落笔：在一次涂抹中连续调用即可画出连续轨迹（等价于按住拖动）。 只在 `beginStroke()` 与 `endStroke()` 之间调用才会被合并成一步撤销。

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `lng` | `number` | 经度 |
| `lat` | `number` | 纬度 |

### undo(): TerrainEditInstance

撤销上一次形变（最多保留 20 步）。
