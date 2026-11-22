# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范。

## [Unreleased]

### 变更（Changed）
- **发布流程补上 GitHub Release**：`release.yml` 在 npm 发布成功后，用 `CHANGELOG.md` 里对应版本的
  小节创建 / 更新 GitHub Release（新增 `scripts/release-notes.mjs`）；取不到小节时退回
  `--generate-notes`。另外 npm 上已存在该版本时跳过发布，便于 tag 重跑时只补建 Release。

## [1.2.1] - 2026-11-22

### 修复（Fixed）
- **笔刷圈外的地形不再被改动**：`applyBrush` 的塌方坡（`relaxTalus`）以前按「深度 ÷ tan(安息角)」往外铺、上限 3 倍半径，小半径笔刷（如 30m）会把圈外近百米的地形一起削平。现在 `radius` 是硬边界：塌方坡只铺在圈内，边缘噪声也只往圈内揉。`radius` 的文档同步改为「圈外不会被这一笔改动」。
- **地形笔刷的落笔点跟随指针**：`_pickLngLat` 原来只和 Cesium 的原始地形（`globe.pick`）求交；编辑区是叠在上面的 three 网格，挖下去以后射线先命中原始地表，落笔点和笔刷圈会比指针偏出一大截（坑越深偏得越远，视频里能偏出上百像素）。现在命中后再沿射线与「编辑后的高度场」迭代求交，笔刷圈始终落在指针下方的编辑面上。
- **陡壁贴图不再被竖向拉伸**：地表贴图原来只按经纬度做平面投影，挖深或堆高后立面接近垂直，同一个像元被摊到整条坡面上，看起来是一条条竖纹。现在 `_updateSurfaceUVs` 按坡面弧长重算 UV（只补「弧长 − 水平投影」的差值，缓坡 / 平台不受影响），立面纹理按 1:1 尺度铺开；接缝留在坑底 / 平台内侧的硬折边上，坑口与原地形仍然对齐。近垂直立面（约 49°~64°）会淡出弧长展开，交给岩土材质，避免竖直面上法线抖动把纹理折成锯齿。

### 变更（Changed）
- **程序化岩土材质改为默认开启**：陡壁上的卫星影像是平面俯视图，无论怎么投影都容易发虚 / 折叠；现在默认按「坡度 + 挖填深度」在影像上叠一层 3D 噪声岩土，近垂直立面看起来像真实土石断面，缓坡仍以影像为主。需要完全保留影像时调用 `setCutSurfaceEnabled(false)` 或 `setArea({ cutSurface: false })`。

## [1.2.0] - 2026-11-21

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

## [1.1.24] - 2026-11-21

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

## [1.1.23]

- 历史版本。详见 [GitHub releases](https://github.com/dengxiaoning/cesium_dev_kit/releases)。
