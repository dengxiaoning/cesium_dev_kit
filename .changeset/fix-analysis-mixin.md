---
"cesium_dev_kit": patch
---

修复 `Analysis` 因缺少 `Math3d` / `Math2d` 混入导致的运行时报错。

`Analysis` 的原型混入列表原为 `[Base, Draw, Plugin]`，但 `Draw` 自身依赖 `Math3d`（`getPositionDistance` / `getPositionsArea`）与 `Math2d`（`computeStar2d` 等）。`prototypeExtends` 的 `exeClone` 只拷贝父原型的 own 方法，且 `resolveScopedConstructor` 每次都会生成全新原型，因此 `Draw` 那份混入不会传递到 `Analysis`。

表现为所有经 `drawLineGraphics` / `drawPolygonGraphics` 的分析（剖面、通视、环视、开挖、淹没、坡度、方量等）在首次点击时抛出 `TypeError: $this.getPositionDistance is not a function`。

现将两处接线（`kit.ts` 的 `createKit` 与 `singleImport/Analysis.ts`）统一为 `[Base, Math3d, Math2d, Draw, Plugin]`，与 `Draw` 自身的 `[Base, Math3d, Math2d]` 对齐，并新增回归测试 `tests/analysisMixin.test.ts`。
