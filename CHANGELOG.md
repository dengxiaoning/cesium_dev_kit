# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范。

`1.2.1` 及之前的条目为手工维护；`1.3.0` 起由 [changesets](https://github.com/changesets/changesets)
在发版时生成 —— 尚未发版的改动记录在 `.changeset/` 目录，而不是写在这里。
版本号怎么判定、多久发一次，见 [RELEASING.md](RELEASING.md)。

## 1.5.1 - 2026-11-28

### 修复（Fixed）

- fix(terrain): 修复关闭「显示等高线」后编辑区漆黑、控制台刷屏 `glDrawElements: Must have element array buffer bound`
  
  **根因**：地表材质是「透明 + `DoubleSide`」，three 会把这种材质拆成「背面 + 正面」两遍绘制
  （`renderObject` 里临时改 `material.side` 并 `needsUpdate`）。两遍对应两个 shader program，
  而 three 的 `bindingStates` 按 `geometry.id + program.id` 缓存 VAO —— 同一块地表因此有两个 VAO。
  元素缓冲只在 VAO 首次建立或 `forceUpdate` 时被显式 `bindBuffer`，第二个 VAO 一旦遇到程序重建
  （比如等高线材质被 dispose）就会丢掉元素缓冲：从上方看时背面那遍被剔除，正面那遍
  `drawElements` 失败，整块地表不画，表现为编辑区一片漆黑。这也解释了为什么
  「影像贴图关掉再打开」（触发一次完整 `_rebuild`）能恢复，以及恢复后勾选/取消等高线都不再坏。
  
  - 地表、水面、笔刷圆盘材质统一加 `forceSinglePass: true`：透明 + 双面只画一遍，外观不变，
    draw call 减半，也不会再产生第二个 VAO。
  - 融合渲染每帧改用 `renderer.resetState()`（连 `bindingStates` 一起重置并强制重绑），
    保证每帧第一笔绘制都会重新绑定 VAO 与元素缓冲。
  - `setContourVisible()` 不再整块重建地形，只增删等高线对象。
  - 影像 / 羽化贴图按画布与格网缓存复用，范围变化、关闭贴图、`clear()` / `dispose()` 时释放，
    避免反复重建时 3072²（约 50MB）纹理泄漏把显存吃满。

## 1.5.0 - 2026-11-28

### 新增 / 变更（Added / Changed）

- `Analysis` 空间分析能力扩展（第二梯队）：
  
  - 新增 `createAspectAnalysis()`：沿一条线计算坡度 / 坡向，输出曲线并返回平均坡度、主导坡向；支持直接传 `positions` 或交互画线。
  - 新增 `createVisibilityPathAnalysis()`：沿路径做通视判定，可见段绿色、遮挡段红色，返回 `visible` / `firstBlockerIndex` / `visibleRatio`；支持 `observerHeight` / `targetHeight`。
  - 新增 `createMultiViewshedAnalysis()`：多观察点可视域叠加。支持 `observers` 批量传入（可给 `target` 瞄准，或按 `direction` / `pitch` / `distance` 摆姿势）；交互模式为「左键放置 → 移动鼠标瞄准 → 再次左键确认 → 下一击放下一个」，确认那一击不会误建新观察点，观察者默认离地 `eyeHeight`（1.7m），返回可 `addObserver` / `finish` / `remove` 的结果对象。
  - 新增 `createCutVolumeCompareAnalysis()`：按多个设计标高统计挖方 / 填方并绘制对比柱状图；支持直接传多边形 `positions` 或交互绘制。
  - 新增 `createBatchClipPlanAnalysis()`：多区域批量地形开挖，支持 `regions` 批量传入或交互绘制，返回统一 `remove()`。
  - 新增纯计算模块 `libs/analysis/terrainSurface.ts`（`computeSlopeAspect` / `computeVolumeCompare` / `isPointInPolygon` / `computeSightlineVisibility` 及图表数据整理），从 `cesium_dev_kit/analysis` 导出，可脱离 viewer 单测。
- 新增地形高度场的数据交换能力，挂在新子路径 `cesium_dev_kit/terrain`（纯计算，无 Cesium / Three 依赖，可脱离 viewer 单测）：
  
  - `heightFieldToGeoTIFF()` / `geoTIFFToHeightField()`：把高度场导出为单波段 Float32 GeoTIFF（小端、WGS84 地理配准），并可从 `.tif` 解码回来；可直接给 QGIS / GDAL 使用，或作为离线地形源。
  - `heightFieldToAsciiGrid()` / `asciiGridToHeightField()`：ESRI ASCII 格网（`.asc`）导出与回读。
  - `heightFieldToXyz()` / `xyzToHeightField()`：逐顶点 `lng lat height` 文本导出与回读。
  - `quantizeHeightField()` / `dequantizeHeightField()`：Int16 量化，把高度场从 4 字节/点压到 2 字节/点。
  - `diffHeightField()` / `applyHeightPatch()`：协同差量，只同步被改动的顶点（last-write-wins），替代整场传输。
  - `TerrainEdit.importHeightField()`：把解码后的高度场直接载入为可继续编辑的地形块（不要求快照 / 多边形结构）。
  
  输入与 `TerrainEdit.getHeightField()` 的返回值（`{ segments, bounds, base, current }`）结构兼容，无需转换即可复用。地形编辑演示页（保存 / 载入）同步支持 JSON / GeoTIFF / ASCII / XYZ 四种格式。
- 新增地形模板 `TerrainEdit.applyTemplate()`：一键套用常见工程造型，再拿笔刷微调。
  
  - `pit`（基坑）：下沉，可配 `depth` / `stepHeight`。
  - `mound`（土堆）：抬升，可配 `depth` / `stepHeight`。
  - `platform`（平台）：整平到 `targetHeight`（不传取内圈平均高度）。
  - `ramp`（坡道）：沿 `direction` 线性起坡，`startHeight` / `endHeight` 不传时按两侧地形自动取。
  
  纯计算实现 `applyTerrainTemplate()` 同时从 `cesium_dev_kit/terrain` 导出，可脱离 viewer 单测。模板会记入撤销历史；地形编辑演示页新增「基坑 / 土堆 / 平台 / 坡道」四个按钮。

### 修复（Fixed）

- 修复交互式分析的鼠标事件会层层叠加：
  
  `bindHandleEvent` 每次调用都会新建一个 `ScreenSpaceEventHandler`，且只在模块销毁时才清理，从不销毁上一次绑定的。因此重复点击同一个分析按钮（或连续启动两个交互式分析）后，一层 handler 叠一层——一次左键会同时触发多个回调，画出来的观察点 / 视域成倍冒出，像套娃一样。
  
  - `bindHandleEvent` 现在会把创建的 handler 返回给调用方（纯增量，原有忽略返回值的用法不受影响）。
  - `Analysis` 内部新增 `bindAnalysisEvent()`，重复绑定前先销毁上一层；`createVisualFieldAnalysis()`（可视域）与 `createMultiViewshedAnalysis()`（多观察点视域）已改用它，同一实例上始终只保留最后一层监听。
- 修复 `Analysis` 因缺少 `Math3d` / `Math2d` 混入导致的运行时报错。
  
  `Analysis` 的原型混入列表原为 `[Base, Draw, Plugin]`，但 `Draw` 自身依赖 `Math3d`（`getPositionDistance` / `getPositionsArea`）与 `Math2d`（`computeStar2d` 等）。`prototypeExtends` 的 `exeClone` 只拷贝父原型的 own 方法，且 `resolveScopedConstructor` 每次都会生成全新原型，因此 `Draw` 那份混入不会传递到 `Analysis`。
  
  表现为所有经 `drawLineGraphics` / `drawPolygonGraphics` 的分析（剖面、通视、环视、开挖、淹没、坡度、方量等）在首次点击时抛出 `TypeError: $this.getPositionDistance is not a function`。
  
  现将两处接线（`kit.ts` 的 `createKit` 与 `singleImport/Analysis.ts`）统一为 `[Base, Math3d, Math2d, Draw, Plugin]`，与 `Draw` 自身的 `[Base, Math3d, Math2d]` 对齐，并新增回归测试 `tests/analysisMixin.test.ts`。
- 修复地形编辑区「贴在地图上、不贴合地形」的问题 —— 旋转 / 翻滚 / 缩放都不会再和地图脱开。
  
  **根因有两层**
  
  1. 编辑块的基准面取自 `globe.getHeight()`（当前 LOD 的 renderedMesh），这个值随视角变化：
     同一块山地在不同视角下能差几十上百米，瓦片没精化时还会返回 `undefined` 或接近 0 的离谱高度。
     旧实现拿它当主数据源、缺失点还按 `0` 兜底，相机一动块体就跟着 LOD 变形，边缘垂下一整面
     「竖直幕布」。
  2. 即使高度对了，编辑块也只是一张独立的 three 网格：底下的 Cesium 原地形还在原高度上，
     两层地表叠在一起；而 three 内容默认不做深度测试，永远画在地形之上 —— 压低视角时前景山体
     挡不住它，整块就像一张贴片盖在山坡上。
  
  **修复**
  
  - 基准面改用与视角无关的 `sampleTerrainMostDetailed`（兜底 `sampleTerrain` 最高级别）：
    同一经纬度永远得到同一个高度，相机怎么转，块体的位置和形状都不变。
  - 采样值加合理性校验（`-1500` ~ `9000` m）+ 8 邻域中位数孤立尖峰剔除，再走邻域扩散补洞，
    不再用 `0` 兜底，避免「一个点掉到海平面 → 垂下一面千米幕布」。
  - 新增 `cutTerrain`（默认 `true`）：用 `globe.clippingPolygons` 把编辑区底下的 Cesium 原地形挖掉
    （内缩一圈，内缩量默认 `feather × 1.8`）。区域里只剩编辑块这一层地表，原地形不会再从块面里
    穿出来，挖出来的坑也不会被原地形盖住。`clear()` / `dispose()` / 切回手绘多边形时会把地形还回去。
  - **只替换真正编辑过的区域**（见文末最终方案）：没刷过的格网 alpha=0，three 网格透明，
    露出 Cesium 真实地球；只有刷动过的地方才显示网格，并且只挖掉那块区域底下的地形。
  - 多边形模式（手绘范围）仍保留「按当前渲染地形对齐块边界」：相机停稳后沿边界采样
    `globe.getHeight()`，把显示修正量向块内扩散，块面边缘和画面里的地形逐点重合。
  - 边缘羽化带宽度改为按 `feather`（米）换算，不再固定占整块 10%：2.4km 的地块原来是 240m 的
    半透明边，挖掉地形后那圈会透空，现在与裁剪内缩量对齐。
  - 影像贴图取到跨域瓦片时画布会被「污染」，上传后贴图变全黑（编辑区成一块黑斑）。现在会先探测，
    污染就退回顶点着色，不再出现黑块。
  - 新增 `hideWhenUnderground`（默认 `true`）：相机钻到编辑面以下时隐藏 three 网格，
    与 Cesium 单面地形表现一致，避免像一张悬空的毯子。
  
  **新增 / 变化的选项**
  
  - `cutTerrain`（新增，默认 `true`）：是否挖掉编辑区底下的 Cesium 原地形；需要 WebGL2，不支持时自动跳过。
  - `cutInset`（新增）：裁剪多边形内缩距离（米），默认取 `feather × 1.8`。
  - `followTerrain`（新增，默认 `true`）：块面边缘是否跟随当前渲染地形自动对齐；只修正显示高度，不改块体基准面。
  - `followInterval`（新增，默认 `200ms`）：边缘对齐的重算间隔；只在相机停稳后重算。
  - `hideWhenUnderground`（新增，默认 `true`）：相机到地表以下时隐藏编辑块。
  - `skirtDepth` 默认值 `28` → `0`：默认**不生成裙边**，传 `> 0` 时才保留侧壁。
  
  **集成要求（重要）**：要让编辑块被前景地形正确遮挡，viewer 需要能和 three 共享深度 ——
  `orderIndependentTranslucency: false`、`msaaSamples: 1`、`contextOptions.webgl.antialias: false`
  （抗锯齿可用 FXAA 后处理补回）。否则会打一条控制台提示，块面仍会盖住前景地形。
  演示页已按这套配置改好。
  
  **代价**：重建区域每次都要做一次与视角无关的地形采样（160 段约 2~5s，旧实现遍历
  `getHeight` 同样要 ~8s 且会阻塞主线程），进度提示文案不变。
  
  ---
  
  ## 追加修复：笔刷与鼠标偏移、坑沿「竖直幕布」
  
  上一轮修完之后还剩两个问题：笔刷圈和光标对不上（实测偏 129px），以及编辑区域看着
  像一块贴片浮在地形上 —— 剖开高度场才发现坑沿是一面一格高的**竖直墙**。
  
  **笔刷 / 光标偏移**
  
  根因是从「上一次的地形交点」出发做牛顿迭代，收敛判据用的是**高度差**。平缓视线下
  1 m 的高度差能对应几百米的水平距离，判据一满足，屏幕位置早就跑偏了。改成沿射线
  行进 + 二分求根（区间由编辑块包围球裁剪），三个采样点的误差降到 **0 px**。
  `_pickLngLat` 先求编辑面交点，未命中再回落到 `globe.pick`。
  
  **坑沿竖直幕布（本轮的主要根因）**
  
  三个独立缺陷叠在一起：
  
  1. `applyBrush` 每格写的是 `h + (target - h) * w`。这个式子的不动点是 `target`，
     只要 `w > 0`，同一处反复落笔整圈都会指数收敛到目标标高 —— **连本该渐隐到自然地面
     的过渡带也被一起吃掉**。收完之后边缘只剩一格高的断崖：实测距笔心 134m 还是坑底
     1080，151m 就是原地面 1230，150m 的高差全压在 17m 的一格里。
  2. 过渡带宽度按「**笔心**的原始高度与目标之差」算。深挖时笔心本来就贴着目标
     （一笔只降一级），圈边却还高出一百多米，于是坡宽只算出二十几米，把一两百米落差
     硬塞进最后一格。
  3. 塌方坡想按安息角把坡摊开，但圈内已经没有空间，只能把高差一路推到笔刷边界，
     在圈边留下断崖（实测坑沿被多削 65m，边界高差反而涨到 102m）。
  
  对应修法：
  
  - 写入改为以**原始地面** `base` 为参考系：`shaped = base + (target - base) * w`，
    再加一钳 `挖 → min(h, max(next, shaped))` / `填 → max(h, min(next, shaped))`。
    `shaped` 于是成为每格的地板（挖）/ 天花板（填）：渐隐按 `w` **永久保留**（重复落笔幂等），
    重叠区域又取「最深处」，拖出来的沟底依然是平的。每笔降一级的手感不变
    （`target` 仍按当前高度重算）。
  - 坡宽改用**圈内最大落差**（扫一遍 `base`）而不是笔心落差；系数取 0.9，
    让平台保持大半个圈，坡面交给后续处理。
  - 挖方不再走塌方坡（抬升保留）。填充的 `maxDrop` 不变，堆土仍有自然坡脚。
  - `padLimit` 只拦「往上垫」这一侧：往下压只是挖土，挖多深都不会悬空。
    早先不分方向地拦 `|target - h|`，坑心比目标高 111.8m、上限正好 108m，
    坑心被整片跳过，只剩塌方坡一格格削出来的同心台阶。
  - 边界噪声改成**降频**而非减幅：波长 0.55R → 0.9R，并让噪声按比例缩放整个轮廓
    （平台边 + 过渡带一起动）。之前只削最外圈，平台边被 `coreR = 0.9R` 锁死，坑口永远是圆。
  - 坑壁岩土着色改用高度场相邻高差判陡（`slope = maxStep / cellM`），不再用顶点法线 ——
    法线被平均后整面墙只有几十个顶点过门槛。
  
  **效果**（150m 笔刷、150m 落差山坡、同一处按住 90 笔）
  
  | | 修前 | 修后 |
  |---|---|---|
  | 圈边一格内的高差 | 102 m | 24 m（其中 14m 是山体自然坡度）|
  | 圈外改动 | 0 | 0 |
  | 坑壁剖面 | 1080 平底 → 一格跳到 1230 | 1080 → 1085 → 1102 → 1124 → 1151 → 1183 → 1220 → 1244 |
  
  **破坏性变更**：`applyBrush` 的写入语义由「向目标收敛」变为「向 `base` 定出的
  最终形状单调推进」。重复落笔不会再把过渡带吃没；需要继续加深时由调用方重算 `target`
  （`TerrainEdit` 的笔画正是这么做的）。
  
  ---
  
  ## 追加修复：只显示真正编辑过的区域，未编辑处保持真实地球
  
  用户反馈截图里编辑块和左侧地球之间有**明显的颜色差和高度台阶**（右侧编辑区偏色、偏高）。
  上一版把整块 2.4km 见方都换成 three 网格：网格用的是建区时烘好的静态影像贴图
  （固定分辨率 / 色调），而周围是 Cesium 实时渲染的影像和 LOD 地形。两者在块边界对不上，
  就成了「一块贴在地球上的、颜色和高度都不一样的方块」——裙边只是把它放大了一圈。
  
  **根因**
  
  - 编辑区是**整块独立网格**：即使一笔都没刷，这块 2.4km 也会盖住真实地球；
  - 静态贴图的分辨率 / 影像层级与屏幕上的实时影像不一致（缩放后更明显）；
  - 网格高度来自 `sampleTerrainMostDetailed`（真值），地球渲染的是随视角变化的 LOD，
    块边界天然存在几米级高差；
  - 所有顶点都乘了坡度明暗，未编辑区域整体偏暗。
  
  **修复（最终方案）：编辑区域掩膜 + 按编辑范围动态裁剪**
  
  - **未编辑区域完全透明**：新增顶点属性 `aEdit`，按格网与原始高度的差值生成掩膜。
    没被刷动过的地方 `aEdit = 0`，材质开 `alphaTest` 直接丢弃这些片元——
    既不画颜色也不写深度，Cesium 的真实地球原样显示。整个编辑区在没动过之前**完全不可见**。
  - **只显示编辑范围**：刷动后取编辑过格网的包围盒，向外扩 `EDIT_PAD_CELLS = 3` 格、
    再渐隐 `EDIT_FADE_CELLS = 3` 格。掩膜在裁剪矩形内保持 1、矩形外渐隐，
    所以不会在矩形角上透出裁剪洞。
  - **按编辑范围动态裁剪地形**：`cutTerrain` 不再固定挖整块，而是只挖「编辑范围 + 3 格」
    底下的 Cesium 地形；裁剪边落在未编辑的原始地面上，和周围地形同高。
    `undo()` / `clear()` / 切回手绘模式时自动把地形还回去。
  - **等高线也只画在编辑范围附近**：未编辑时整块不画，避免在真实地球上留下一圈矩形线框。
  - **默认关闭裙边**：`skirtDepth` 默认 `0`，不再生成土色侧壁。
  - **去掉整体下沉**：`settle` 默认 `0`。
  - **明暗只作用于编辑过的顶点**：未编辑顶点保持 `shade = 1`，只有刷动过的坡面才压暗提亮。
  - 多边形（手绘）模式保持原行为：用户圈定的范围本身就是要显示/编辑的区域；
    该模式仍用 `followTerrain` 沿边界对齐当前渲染地形。
  
  **可见的行为变化**
  
  - 进入页面时看到的就是真实地球，编辑区不再是预先铺好的一块贴片；
  - 只有刷过的地方才「长」出 three 网格，并且只挖掉那块地方的地形；
  - 编辑范围外的一圈保持真实地球的影像、颜色和地形高度，颜色/高度台阶随之消失。
  
  **实测**（160 段、2.4km 见方、本地地形服务）
  
  | | 修前 | 修后 |
  |---|---|---|
  | 未编辑时的编辑区 | 整块贴图，颜色/高度与周围不同 | 完全透明，真实地球原样显示 |
  | 编辑区边界 | 2.4km 矩形硬边 + 褐色裙边 | 只有编辑范围附近可见，向外渐隐 |
  | 地形裁剪 | 固定挖整块 | 只挖编辑范围（+3 格），撤销即恢复 |
  | 未编辑块面的明暗 | 比周围暗约 16% | 与周围影像一致（shade = 1） |
  | 拾取 / 笔刷偏移 | — | 0~1 px |

## 1.4.0 - 2026-11-25

### 新增 / 变更（Added / Changed）

- 新增多个子路径模块与空间分析能力：
  
  - 新增 `cesium_dev_kit/history`：通用撤销 / 重做栈 `CommandHistory`（`execute` / `record` / `undo` / `redo` / `subscribe`，支持 `maxSize` 与撤销失败回滚）。
  - 新增 `cesium_dev_kit/annotation`：标注数据模型 `AnnotationStore`（增删改、撤销重做、JSON 导入导出）与 Cesium 绑定层 `AnnotationLayer`（把标注同步为 entity，删除 / 变更时彻底清理 handler 与 tooltip）。
  - 新增 `cesium_dev_kit/web-components`：框架无关的 `<cesium-draw-toolbar>` 自定义元素与 `defineDrawToolbar` / `bindDrawToolbar`，对 SSR 安全。
  - 新增 `cesium_dev_kit/plot`：标绘序列化 `PlotStore` + `PlotLayer`，并重新导出 `AttackArrow` / `PincerArrow` / `StraightArrow`。
  - `Analysis` 新增 `createProfileAnalysis()`（剖面分析）：沿一条线采样地形，输出高程剖面图与统计（最高 / 最低 / 平均 / 累计爬升下降）；纯计算部分 `computeProfileStats` / `buildProfileChartData` / `interpolateLngLat` 从 `cesium_dev_kit/analysis` 导出。
  - 修复标绘 `createByData()` 从数据还原时 `objId` 未生成、entity 无法被追踪的问题。
- 新增框架适配层：
  
  - 新增 `cesium_dev_kit/vue`：Vue 3 组合式 API `useCesiumKit` / `provideCesiumKit` / `useCesiumKitShared`，把 kit 的创建 / 销毁接到组件生命周期上。
  - 新增 `cesium_dev_kit/react`：React Hook `useCesiumKit` 与 `CesiumKitContext` / `CesiumKitProvider` / `useCesiumKitShared`，挂载创建、卸载自动 `dispose()`。
  - `vue` / `react` 均为可选 peer 依赖，不用对应框架完全不受影响。

### 修复（Fixed）

- 修复文档中按需引入的错误示例，将singleImport与createKit初始化走统一逻辑。
- 工程化与文档：
  
  - 测试体系迁移到 Vitest（`npm test`），旧断言脚本改名为 `tests/*.legacy.ts`；新增 `CommandHistory` / `AnnotationStore` / `PlotStore` / 剖面计算 / 工具条解析等单测。
  - 新增 Playwright 文档站冒烟测试（`test:e2e`）与覆盖率（`test:coverage`）。
  - 新增 Cesium 版本矩阵 CI（1.105 / 1.122 / latest）与 E2E 工作流。
  - 新增英文文档站（`README.en.US.md` + `typedoc.en.json`）与版本化文档（`versions.json` + `scripts/archive-version.mjs`）。
  - 库与演示站拆分为两个 tsc 程序（`tsconfig.lib.json`），避免 Vue JSX 与 React 类型声明冲突。

## 1.3.0 - 2026-11-23

### 新增 / 变更（Added / Changed）

- `threeJs.initThree()` 新增 `fusion: 'single-context'`：Three.js 不再叠一张独立 canvas，而是复用 Cesium 的 canvas 与 WebGL 上下文，直接画进 Cesium 的帧里，从根本上消除双 canvas 方案的深度冲突、坐标漂移与合成开销。
  
  - **新增 `fusion` / `depth` / `precision` 三个可选参数**。不传 `fusion`（默认 `'overlay'`）时行为与 1.2.x 完全一致，仍是双 canvas 叠加，旧代码不用改一行。融合模式开启后，Three.js 的绘制挂在 `scene.postRender`，与 Cesium 共用真实深度缓冲（`depth: 'canvas-blit'` 默认开启）：物体既能被地形遮挡，也能遮挡地形。`precision: 'double'` 在 float64 中合成「视图矩阵 × 场景→ECEF」只降一次精度，并逐元素复制 `frustum.projectionMatrix`（保住 near/far、offscreen offset、DPR），贴地物体随相机移动不再上下漂浮。
  - **新增 `getFusionStatus()`**：返回当前视锥数量、是否对数深度、MSAA 采样数、深度来源等诊断信息，用来排查「遮挡没生效」到底卡在哪一环。
  - **融合模式会自动收敛两处场景参数**：把 `scene.logarithmicDepthFarToNearRatio` 抬到单视锥（多视锥会在帧中执行 `clearDepth`，帧末只剩最近一段的深度，会漏遮挡；单段在日志深度下无精度损失），并跳过原来用于「伪造遮挡」的 ECEF 模拟球（`sphere` / `sphere3` 不再创建）。
  - **失败降级而不是花屏**：开启 OIT 时深度不在可搬运的 FBO 上、MSAA 下 `blitFramebuffer` 失败，都会自动退回「仅共享上下文」并在控制台说明原因，不会把 Cesium 画面弄花；后者可设 `scene.msaaSamples = 1` 规避。
  
  此外修正一处类型声明：
  
  - **`Control.definedMouseEvent()` 的声明改为对象参数 `{ targetEntity, ctrlFlag }`**。运行时自 1.2.x 起就已是对象参数，旧声明与实现不符；按旧声明写的 `definedMouseEvent(entity, flag)` 实际从未生效（拖拽会静默不响应），升级后按新声明改写即可。
  - **类型收窄**：`Base` / `Draw` / `PassEffect` / `Graphics` / `Math3d` / `Plot` 等模块把大量 `any` 换成精确的 Cesium 类型。`strict` 工程升级后可能出现新的类型报错，属于预期内的收窄，按提示补齐即可，运行时不受影响。

## 1.2.1 - 2026-11-22

### 修复（Fixed）
- **笔刷圈外的地形不再被改动**：`applyBrush` 的塌方坡（`relaxTalus`）以前按「深度 ÷ tan(安息角)」往外铺、上限 3 倍半径，小半径笔刷（如 30m）会把圈外近百米的地形一起削平。现在 `radius` 是硬边界：塌方坡只铺在圈内，边缘噪声也只往圈内揉。`radius` 的文档同步改为「圈外不会被这一笔改动」。
- **地形笔刷的落笔点跟随指针**：`_pickLngLat` 原来只和 Cesium 的原始地形（`globe.pick`）求交；编辑区是叠在上面的 three 网格，挖下去以后射线先命中原始地表，落笔点和笔刷圈会比指针偏出一大截（坑越深偏得越远，视频里能偏出上百像素）。现在命中后再沿射线与「编辑后的高度场」迭代求交，笔刷圈始终落在指针下方的编辑面上。
- **陡壁贴图不再被竖向拉伸**：地表贴图原来只按经纬度做平面投影，挖深或堆高后立面接近垂直，同一个像元被摊到整条坡面上，看起来是一条条竖纹。现在 `_updateSurfaceUVs` 按坡面弧长重算 UV（只补「弧长 − 水平投影」的差值，缓坡 / 平台不受影响），立面纹理按 1:1 尺度铺开；接缝留在坑底 / 平台内侧的硬折边上，坑口与原地形仍然对齐。近垂直立面（约 49°~64°）会淡出弧长展开，交给岩土材质，避免竖直面上法线抖动把纹理折成锯齿。

### 变更（Changed）
- **程序化岩土材质改为默认开启**：陡壁上的卫星影像是平面俯视图，无论怎么投影都容易发虚 / 折叠；现在默认按「坡度 + 挖填深度」在影像上叠一层 3D 噪声岩土，近垂直立面看起来像真实土石断面，缓坡仍以影像为主。需要完全保留影像时调用 `setCutSurfaceEnabled(false)` 或 `setArea({ cutSurface: false })`。

## 1.2.0 - 2026-11-21

### 新增（Added）
- 地形编辑新增**数据导出 / 载入**，用来保存编辑结果并支持二次编辑：
  - `exportData()` 返回一份可直接 `JSON.stringify` 的数据包（`TerrainEditSnapshot`）：多边形、格网参数、**原始与编辑后两份高度场**、水面 / 等高线 / 贴图状态、笔刷参数与土方统计。高度用 `base64(Float32 小端)`（`packHeights`）编码，往返逐位无损，反复存读不会漂移；`segments = 160` 时约 277KB（base64 后），gzip 约 180KB；需要更小就降 `segments` 或自行量化。
  - `importData(snapshot)` 免采样直接复原：不依赖地形服务，换设备 / 原地形数据变了也能一模一样地恢复，载入后笔刷、撤销、统计、水面、贴图照常工作。数据校验失败（非本模块数据、版本不符、base64 损坏、长度或范围不匹配）抛 `INVALID_ARGUMENT`，不会渲染错位地形。
  - `getHeightField()` 返回 `Float32Array` 副本（`base` / `current`），差值为每点挖填量，便于直接做坡度分析或转自己的格网格式。
  - 新增纯算法层 `libs/terrain/terrainData.ts` 与单测 `tests/terrainData.test.ts`（无损往返、损坏数据、范围错位、`fillHoles` 一致性）。
  - 不做内置 `save()` 写文件的原因：数据落到哪儿（后端 / localStorage / 对象存储 / GIS 文件）是业务决定，库只负责产出结构稳定、可序列化的数据；示例页的「保存数据」就是拿 `exportData()` 自己做下载。

### 变更（Changed）
- **地形笔刷内核重写：从「按权重减量」改成「目标标高平台」**。以前每笔按 `w × maxDelta` 逐次减，一阶导永远连续，刷出来只是原曲面整体压低一点的缩放版 —— 这才是「模糊、不像地形」的根因，换贴图和加开关都补不回来。现在每次落笔把笔刷核心（默认占半径 0.9）**压到同一个绝对标高**，核心到外沿只留一圈宽度跟着台阶落差走的窄过渡带（`BRUSH_WALL_PER_STEP`），不用 `smoothstep`（两端零斜率会把坑底和坑沿都抹圆）；超过 34° 安息角的壁由 `relaxTalus` 限坡侵蚀成一圈直的塌方坡。于是单笔就是「平底 + 直壁 + 两道硬坡折」。实测斜坡上 281 个平台顶点高度极差 0、全部落在目标标高；按住 12 级后 101m 处出现清晰坡折。
- **整条笔画锁定目标标高**：`beginStroke()` 按第一笔落笔处对齐到台阶标高，拖动时沿途所有落笔共用它（`applyBrush` 也支持显式 `targetHeight`）；只有指针停住不动时，喷洒定时器每拍把锁定标高再推进一级。于是「拖动 = 平底平台」「按住 = 一层层往下掉」两种手感都成立。实测沿缓坡拖 6 笔锁同一标高，沟底 21 点极差 0。
- **默认参数收敛，示例页不再靠开关规避劣质效果**：`strength` 默认 1（小于 1 坑底永远压不平）、`hardness` 默认 0.9、`roughness` 默认 0.28（只轻微揉边界，不再承担「让笔迹显形」）；程序化岩土材质默认关闭 —— 立面只有几米宽，影像几乎不被拉伸，台阶层次改由几何坡折 + 不依赖开关的方向性明暗（迎光/背光）表现。示例页删掉「笔刷强度」「边缘棱角」「开挖面岩土」三个控件，只留笔刷半径、台阶落差、目标高程与两个显示选项；`setCutSurfaceEnabled()` / `setArea({ cutSurface })` / `roughness` 保留为高级 API。
- 喷洒节拍由 **80ms 放缓到 140ms**：现在每拍推进一级台阶而不是连续磨高度，太快会把层次糊成一片。`maxDelta` 的语义由「单次施加强度」改为「一级台阶的落差」（默认 3m）。

### 修复（Fixed）
- 修复 `setArea()` 之后改用 `setPolygon()` 时**范围边框不显示**：`_areaMode` 一直留在 `true`，而边框渲染会因区域模式直接跳过。现在 `setPolygon()` 会把范围重新标记为「手绘」，`_renderBoundary()` 也会先拆掉旧边框再决定是否重画；`setArea()` 在内部调用完 `setPolygon()` 后再标回区域模式。

## 1.1.24 - 2026-11-21

### 新增（Added）
- 示例页新增**源码面板**：每个 Demo 右下角多了一个 `</>` 图标，点开即在右侧展开与窗口等高的代码抽屉，顶部按目录展示当前示例的文件路径（如 `src/views/example/terrain/terrainEdit.vue`）、语言与行数，正文带行号与语法高亮（关键字、方法名、类名、变量、字符串、数字、注释分色），并支持一键复制全文；面板宽度可拖拽、`Esc` 关闭，首页 / 系统管理等非示例页面不显示入口。源码通过 `import.meta.glob('src/views/example/**/*.vue', { as: 'raw' })` 收集，新增示例无需维护映射表。
- 新增 **`TerrainEdit`（地形笔刷）** 模块：`setArea()` 就地铺一块可编辑区域后，**按住左键拖动即可连续涂抹**（下沉 / 抬升 / 整平 / 平滑，笔刷半径、强度、单笔高度、硬边均可调），实时改地形并即时重绘；同时保留多边形框选 + 一次成型的 `setPolygon()` + `apply()` 用法（塌陷/堆高/平整/平滑、台阶量化、坑底水面、土方统计）。`createKit()` 返回值新增 `terrainEdit` 字段，也可 `new TerrainEdit(viewer)` 单独使用。
  为了让编辑区「不像贴片」：地表直接向当前影像图层取瓦片拼成纹理贴到网格上（`buildImageryTexture`），保留原卫星影像；等高线改为 marching squares 按固定等高距生成（缓坡稀疏、陡坡密集）并随涂抹实时重画；编辑区边缘用 `alphaMap` 羽化进原地表，羽化带按像素距离叠加低频扰动，避免四条边是笔直的「贴片线」。
  由于 Cesium 的 `terrainProvider` 只读，实现方式为「先采样真实地形高度，再用 Three.js 局部规则格网覆盖多边形范围」，因此不污染全局地形，可随时 `undo()` / `clear()` 还原，也不影响范围外的地表。
- 新增纯算法层 `libs/terrain/terrainGrid.ts`：规则格网构建、到边界距离加权形变扩散（`smoothstep` 羽化）、台阶量化、多边形耳切三角剖分、土方量与顶点着色；不依赖 Cesium / Three，可独立单测与复用。
- 新增配套示例 `src/views/example/terrain/terrainEdit.vue`（菜单「地形编辑 → 地形开挖（塌陷/台阶/水面）」），含绘制范围、示例范围、模式/深度/台阶/水位调节、执行与撤销、统计面板。
- 新增单测 `tests/terrainGrid.test.ts`：覆盖点在多边形、面积误差、正负距离、格网 `stride`/`inside`/`weight`、四种形变模式、台阶量化不超过设定深度、挖填方统计、三角剖分与顶点去重。
- GitHub Pages 站点同时托管**在线 Demo**：文档在根路径、示例站发布在 `/demo/`，文档页顶部与侧边栏新增「在线 Demo」入口；演示站支持 `?auto=1` 用内置模拟账号直达，不再先落在登录页。
- 新增 `npm run build:demo:pages`：把示例站构建到 `docs/demo/`（`base: './'`，可直接挂在任意子路径下）。
- 新增 `cesium_dev_kit/default-static` 子路径，导出 `defaultStatic`、`createDefaultStatic()`、`DEFAULT_STATIC_BASE`：未显式传入 `defaultStatic` 时库内自动回退到默认 CDN，避免默认图片静默 404；支持一行代码切换到自有 CDN 或相对路径自托管。
- 发布现代化库产物：ESM（`*.mjs`）、CJS（`*.cjs`）、类型声明（`.d.ts` / `.d.mts`）与 sourcemap。
- `package.json` 增加 `main` / `module` / `types` / `exports` / `typesVersions` / `files` / `sideEffects`，支持按需引入子路径：`cesium_dev_kit/graphics`、`/primitive`、`/analysis` 等。
- 新增 `tsup.config.ts` 与 `npm run build:lib`，每个子路径入口自包含，避免 `graphics` 连带引入 `echarts` / `dat.gui`。
- 新增 `dispose()`：`initCesium` 与 `singleImport` 各模块均可释放由 kit 自己创建的 viewer；外部传入的 viewer 不会被销毁。
- 新增 `scripts/check-exports.mjs` 与 CI 校验，防止 `package.json` 导出路径与构建产物不一致。
- CI 升级为 Node 20/22/24 矩阵，并加入单测、类型检查、库构建、导出校验和 demo 构建。

### 变更（Changed）
- 地形笔刷的**地表贴图分辨率按范围自适应**：2400m 范围由 2048（约 1.2m/像素）提到 3072（约 0.8m/像素），超大范围给到 4096 / 256 张瓦片，并让画布分辨率与瓦片原生分辨率对齐；同时把 mipmap 与各向异性过滤开到显卡上限，斜视角不再糊成一片。
- 地形笔刷交互改为**「按住左键不放就持续开挖 / 抬高」**：指针停住不动由固定节拍逐级下挖，松开左键立即停止；移动时**按走过的地面距离**施加（每 `radius × 0.1` 刷一次），涂抹密度只与路程有关，快拖慢拖深浅一致。
- CI 矩阵收敛为 **Node 20 / 22 / 24**，移除已停止维护的 18.x；`Release` 与 `Docs` 工作流统一使用 Node 24（自带 npm 11，可直接启用 Trusted Publishing）。
- `package-lock.json` 纳入版本管理，三个工作流的安装步骤由 `npm install` 改为 `npm ci`，构建可复现、不再因依赖浮动而出现「本地能跑、CI 挂掉」；`.gitignore` 不再忽略 lockfile（仅挡 `pnpm-lock.yaml` / `yarn.lock`）。
- **（破坏性）** 移除库内置的 Cesium Ion token。请通过 `extraConfig.AccessToken` 传入，或在应用入口设置 `Cesium.Ion.defaultAccessToken`。
- 运行依赖降为可选 peer 依赖：`dat.gui`、`echarts`、`libgif` 已移入 `peerDependencies` 并标记 `optional`，仅在用到控制面板 / 坡度剖面图 / GIF 导出时需安装；Vue / Element Plus / axios / OpenLayers 等演示站依赖移至 `devDependencies`。
- `dat.gui`、`echarts`、`libgif` 改为惰性 `import()` 加载：根入口 `import 'cesium_dev_kit'` 在 Node / SSR 环境不再因 `window` / `document` 未定义而报错。
- `three` 标记为可选 peer 依赖（`peerDependenciesMeta.three.optional = true`），只在 Three.js 集成场景需要安装。
- 高德/谷歌/百度影像的 7 个 `http://` 瓦片地址改为 `https://`，避免 HTTPS 站点混合内容被拦截。
- `cesium` 与 `three` 由 `dependencies` 调整为 `peerDependencies`，避免使用方重复打包、版本冲突。
- 放宽 `engines`：`node` 由 `==16.0.0` 调整为 `>=16.0.0`，`npm` 由 `==8.19.4` 调整为 `>=8.0.0`。
- `package.json` 补充 `description`、`keywords`、`repository`、`homepage`、`bugs` 等元数据，提升 npm 可发现性。

### 修复（Fixed）
- 修复**挖深之后坑壁糊成一片、越挖越不像**：地表贴图是按经纬度平面投影取样的，坡面越陡被拉得越长（拉伸比 = `sqrt(1 + 坡度²)`）。实测挖到 480m 深、坑口半径只有 150m 时，坑壁接近垂直，影像被拉长十几倍，整面墙成了一团放射状色带——这不是分辨率不够，把贴图提到 8192 也治不了，因为要摊薄的是同一批像素。现在按「坡度 + 挖填深度」把这类坡面渐变成程序化岩土（三维噪声 + 层理 + 碎屑凹凸，用 `fwidth` 做距离淡出避免远处变成毛毡），影像只在缓坡与未改动的地表保留。（后续笔刷改为「目标标高平台」模型后，立面只剩几米宽，投影拉伸自然消失，这项程序化岩土已降级为默认关闭的高级选项。）
- 修复**下沉后坑底「顶出一块原地面」，看起来像叠加层被戳穿**：手绘范围一旦折返/自交，射线法的奇偶规则会把交点旁的一小块判成「区域外」，这块在格网里既没有面、笔刷也刷不到，于是它一直停在原始高度，周围挖下去之后就成了一块顶着原地面的孤岛。现在 `buildTerrainGrid` 默认做一次「从格网边界洪水填充」把被包住的内部空洞补成实心（补出来的点按内圈处理、给满权重、参与高度采样与笔刷），`setPolygon()` / `setArea()` 新增 `fillHoles` 开关（默认 `true`，需要镂空时显式关掉）。单测覆盖：`fillHoles: false` 复现空洞（`inside = 0`），默认情况下洞心被填平且能被笔刷挖动。
- 修复**一笔涂抹被重复叠加**：按住左键拖动时 `strokeAt()` 会被调用几十上百次，同一顶点只要还在笔刷范围内就每次再减一个 `maxDelta`，实测拖三趟能把中心点挖到 **376m** 深，坑壁近乎垂直、贴图被拉成竖条，从斜角看就像坑底「脱离」了地面。现在移动时按路程节流（`strokeBase` + 可选 `strokeLimit` 仍可用于限制单笔总深度，默认 0 不限制）。
- 修复笔刷**「按了没反应」**：此前把「一整笔的总量」压成了「单次施加」的量级，拖一整笔和单击一样深（实测均为 12m）。现在按住即持续累加，实测按住 1.5 秒下沉约 43m、抬升约 15m。
- 修复指针**滑出地形后定时器仍在旧位置继续挖**：`MOUSE_MOVE` 里拾取不到地表时直接 `return`，没更新「最后移动时间」，于是被判定为静止。现在只要指针真的动过就先记账，拾取不到则停掉持续施加。
- 修复 `level` 模式**第二次落笔沿用上一笔目标高度**、看起来像整平失效：自动推断出的 `targetHeight` 现在只在本次笔画内有效，`endStroke()` / `clear()` 时清掉，外部显式传入的目标高度不受影响。
- 修复 `enableBrush(false)` **关不掉笔刷**：原先只把开关置 false，`ScreenSpaceEventHandler` 从未销毁，左键拖地图时仍在落笔；现在关闭时会 `destroy()` 掉涂抹事件、把未结束的一笔 `endStroke()` 收尾并移除笔刷光标。
- 修复关闭笔刷后**左键拖不动地图**：Cesium 的 `rotateEventTypes` 默认是单个枚举值 `0`（不是数组），原先用 `if (prev.rotateEventTypes)` 判断为假而跳过恢复，左键就一直被留在笔刷上；改为统一按数组存取，并在恢复后兜底确保左键回到旋转事件里。`enableBrush` 也改为幂等，重复开启不会覆盖已保存的相机配置。
- 修复 Three 与 Cesium 合成时编辑区「随镜头上下浮动」：`ThreeScene.update()` 原顺序是先取相机矩阵再渲染 Cesium，导致 Three 永远用上一帧的矩阵，相机一动贴地内容就整体漂移；改为 `renderCesium() → updateCameraMatrix() → renderThree()` 后，拖拽/缩放实测逐帧误差 0 像素。
- 修复画完地形后坑体「看着是平的」：涂抹只改高度，法线重算后顶点色里的明暗仍是旧的；现在从 `_baseColors` 底色按新法线重烘一次（顶点色是破坏性相乘，不能在上次结果上叠加）。
- 修复 Demo 链接失效：`benpaodehenji.com` 域名已过期，README、文档导航（原 “Demo” 项）与首页全部改指 GitHub Pages 上的 `/demo/`。
- 修复 `getDfSt()` 在目标字段不存在时返回 `baseService + undefined` 的问题；绝对地址、`data:` URI 和站点根路径不再被错误拼接 `baseService`。
- 修复 README 示例中泄漏的真实天地图 token、失效的 `/src/views/...` 绝对路径、不存在的 `sceneMang` 字段，以及 `http://` 瓦片地址。
- `package.json` 的 `files` 改为包含整个 `dist`，修复 sourcemap 与 `.d.mts` 实际未发布的问题。
- CI 与 CHANGELOG 对齐：改为 Node 20/22/24 矩阵，执行 `typecheck`、`test`、`build:lib`、`check:exports`、`npm pack --dry-run`，移除 `strict-ssl false` 与不安全的 http registry 配置。
- 修正原型混入时使用 `instance.constructor` 作为 `Reflect.construct` newTarget 的问题：旧模块的 `X.prototype = { ... }` 会继承 `Object.prototype.constructor`，导致临时实例原型错误、`this._installXxx is not a function`。
- 修复 `Plugin.ts` 中 `setTimeout` 回调参数隐式 `any`，使 `tsup --dts` 可以正常生成类型声明。
- 修复 `dragDialog.ts`、`localstorage.ts` 的类型错误，`npm run typecheck` 现已通过。
- 移除 `package.json` 中的自我依赖 `cesium_dev_kit`。
- `Primitive` 模块 XyzAxisPrimitive `remove()` 中 `this._handler.distory()` 拼写错误修正为 `destroy()`。
- `Math3d.getPositionsAngle()` 中 `"heading "`（尾部多一个空格）修正为 `"heading"`，使偏航角分支真正生效。
- `Math2d.getFactorial2d()` 移除永远不命中的 `switch` 死分支，直接按阶乘计算（行为不变）。
- `Math2d.isClockWise` 此前只在接口声明、未实现，现补为 `isClockWise2d` 的别名（`getBisectorNormals2d` 调用处修复）。
- `Analysis` 方量分析中 `new Cesium.PolygonGeometry.fromPositions(...)` 误加 `new`（会抛 “not a constructor”）修正为直接调用。
- `Analysis` 坡度分析中 `appendChild(el, "dark", {...})` 多余参数移除。

### 重构（Refactor）
- `Math2d`、`Math3d` 由「构造函数 + 原型赋值 + `as unknown as` 强转」重构为真正的 ES6 `class`（保留 `XxxInstance` / `XxxConstructor` 类型别名兼容旧引用）。
- 新增 `mixinPrototype(target, source)` 工具（`libs/Base.ts`），替代 `X.prototype = { ...X.prototype, ...Base.prototype }` 原型重写。
- `indexOld.ts` / `singleImport/Base.ts` 的 `exeClone` 由 `Object.keys` 改为 `Object.getOwnPropertyNames`（兼容 class 的非枚举方法）。
- 消除模块级全局状态：核心模块的 Cesium/dfSt 与拖拽等交互状态改为按实例隔离的闭包，新增 createScopedConstructor 包装器，多 viewer 并存互不覆盖。
- 标绘（plot）模块的 BasePlot / AttackArrow / StraightArrow / PincerArrow 也改为按实例隔离的 Cesium（`this._Cesium`），每个箭头实例使用各自传入的 `cesiumGlobal`；Sensor 入口移除冗余的模块级 `let Cesium`，直接使用 `cesiumGlobal` 参数。

### 测试（Tests）
- 新增基于 `tsx` + Node 内置 `assert` 的单元测试，覆盖纯几何模块 `plot/plotUtil` 与 `Math2d`（无 Cesium 依赖）。
- `package.json` 新增 `test` 脚本与 `tsx` 开发依赖。

### 类型（Types）
- 修正公开 API 拼写并提供向后兼容别名（旧名标记 `@deprecated`）：`bindHandelEvent` → `bindHandleEvent`、`getHandelPosition` → `getHandlePosition`、`cluserColors( Type )` → `clusterColors( Type )`、`barLableType` → `barLabelType`。聚合图层同时兼容 `clusterColors` 与旧的 `cluserColors`。
- 为 `cesiumPluginsExtends` 下所有模块补齐 `XxxInstance` / `XxxConstructor` 接口与各方法 options 类型，消除约 1600 处 `any`。
- 集中 Cesium 类型引用：各模块不再各自 `import 'cesium'`，统一通过 `cesiumGlobal` 传入的 Cesium 对象，`CesiumGlobal` / `Viewer` 等类型由 `libs/Base.ts` 统一导出。

## 1.1.23

- 历史版本。详见 [GitHub releases](https://github.com/dengxiaoning/cesium_dev_kit/releases)。
