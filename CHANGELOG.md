# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范。

## [Unreleased]

### 新增（Added）
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
