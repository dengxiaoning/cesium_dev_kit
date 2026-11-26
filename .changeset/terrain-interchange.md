---
"cesium_dev_kit": minor
---

新增地形高度场的数据交换能力，挂在新子路径 `cesium_dev_kit/terrain`（纯计算，无 Cesium / Three 依赖，可脱离 viewer 单测）：

- `heightFieldToGeoTIFF()`：把高度场导出为单波段 Float32 GeoTIFF（小端、WGS84 地理配准），可直接给 QGIS / GDAL 使用，或作为离线地形源。
- `heightFieldToAsciiGrid()` / `asciiGridToHeightField()`：ESRI ASCII 格网（`.asc`）导出与回读。
- `heightFieldToXyz()`：逐顶点导出 `lng lat height` 文本。
- `quantizeHeightField()` / `dequantizeHeightField()`：Int16 量化，把高度场从 4 字节/点压到 2 字节/点。
- `diffHeightField()` / `applyHeightPatch()`：协同差量，只同步被改动的顶点（last-write-wins），替代整场传输。

输入与 `TerrainEdit.getHeightField()` 的返回值（`{ segments, bounds, base, current }`）结构兼容，无需转换即可复用。
