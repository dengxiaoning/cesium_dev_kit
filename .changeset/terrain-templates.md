---
"cesium_dev_kit": minor
---

新增地形模板 `TerrainEdit.applyTemplate()`：一键套用常见工程造型，再拿笔刷微调。

- `pit`（基坑）：下沉，可配 `depth` / `stepHeight`。
- `mound`（土堆）：抬升，可配 `depth` / `stepHeight`。
- `platform`（平台）：整平到 `targetHeight`（不传取内圈平均高度）。
- `ramp`（坡道）：沿 `direction` 线性起坡，`startHeight` / `endHeight` 不传时按两侧地形自动取。

纯计算实现 `applyTerrainTemplate()` 同时从 `cesium_dev_kit/terrain` 导出，可脱离 viewer 单测。模板会记入撤销历史；地形编辑演示页新增「基坑 / 土堆 / 平台 / 坡道」四个按钮。
