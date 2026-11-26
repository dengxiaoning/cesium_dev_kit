---
"cesium_dev_kit": minor
---

新增地形高度场的数据交换能力，挂在新子路径 `cesium_dev_kit/terrain`（纯计算，无 Cesium / Three 依赖，可脱离 viewer 单测）：

- `heightFieldToGeoTIFF()` / `geoTIFFToHeightField()`：把高度场导出为单波段 Float32 GeoTIFF（小端、WGS84 地理配准），并可从 `.tif` 解码回来；可直接给 QGIS / GDAL 使用，或作为离线地形源。
- `heightFieldToAsciiGrid()` / `asciiGridToHeightField()`：ESRI ASCII 格网（`.asc`）导出与回读。
- `heightFieldToXyz()` / `xyzToHeightField()`：逐顶点 `lng lat height` 文本导出与回读。
- `quantizeHeightField()` / `dequantizeHeightField()`：Int16 量化，把高度场从 4 字节/点压到 2 字节/点。
- `diffHeightField()` / `applyHeightPatch()`：协同差量，只同步被改动的顶点（last-write-wins），替代整场传输。
- `TerrainEdit.importHeightField()`：把解码后的高度场直接载入为可继续编辑的地形块（不要求快照 / 多边形结构）。

输入与 `TerrainEdit.getHeightField()` 的返回值（`{ segments, bounds, base, current }`）结构兼容，无需转换即可复用。地形编辑演示页（保存 / 载入）同步支持 JSON / GeoTIFF / ASCII / XYZ 四种格式。
