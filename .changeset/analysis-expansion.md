---
"cesium_dev_kit": minor
---

`Analysis` 空间分析能力扩展（第二梯队）：

- 新增 `createAspectAnalysis()`：沿一条线计算坡度 / 坡向，输出曲线并返回平均坡度、主导坡向；支持直接传 `positions` 或交互画线。
- 新增 `createVisibilityPathAnalysis()`：沿路径做通视判定，可见段绿色、遮挡段红色，返回 `visible` / `firstBlockerIndex` / `visibleRatio`；支持 `observerHeight` / `targetHeight`。
- 新增 `createMultiViewshedAnalysis()`：多观察点可视域叠加。支持 `observers` 批量传入（可给 `target` 瞄准，或按 `direction` / `pitch` / `distance` 摆姿势）；交互模式为「左键放置 → 移动鼠标瞄准 → 再次左键确认 → 下一击放下一个」，确认那一击不会误建新观察点，观察者默认离地 `eyeHeight`（1.7m），返回可 `addObserver` / `finish` / `remove` 的结果对象。
- 新增 `createCutVolumeCompareAnalysis()`：按多个设计标高统计挖方 / 填方并绘制对比柱状图；支持直接传多边形 `positions` 或交互绘制。
- 新增 `createBatchClipPlanAnalysis()`：多区域批量地形开挖，支持 `regions` 批量传入或交互绘制，返回统一 `remove()`。
- 新增纯计算模块 `libs/analysis/terrainSurface.ts`（`computeSlopeAspect` / `computeVolumeCompare` / `isPointInPolygon` / `computeSightlineVisibility` 及图表数据整理），从 `cesium_dev_kit/analysis` 导出，可脱离 viewer 单测。
