/**
 * `cesium_dev_kit/terrain` —— 地形高度场的数据交换（纯计算，无 Cesium / Three 依赖）。
 *
 * 提供 DEM / GeoTIFF / XYZ 导出、Int16 量化、协同差量同步。输入是规则格网高度场，
 * 与 `TerrainEdit.getHeightField()` 的返回值（`{ segments, bounds, base, current }`）结构兼容。
 *
 * @example
 * import { heightFieldToGeoTIFF, diffHeightField } from 'cesium_dev_kit/terrain'
 *
 * const field = terrainEdit.getHeightField()
 * const tiff = heightFieldToGeoTIFF(field)
 * const patch = diffHeightField(field) // 只有被改动的顶点，便于协同同步
 */
export {
  heightFieldToGeoTIFF,
  heightFieldToAsciiGrid,
  asciiGridToHeightField,
  heightFieldToXyz,
  geoTIFFToHeightField,
  xyzToHeightField,
  quantizeHeightField,
  dequantizeHeightField,
  diffHeightField,
  applyHeightPatch
} from '../libs/terrain/terrainInterchange'
export type {
  HeightField,
  GeoTiffOptions,
  AsciiGridOptions,
  XyzOptions,
  QuantizeOptions,
  QuantizedHeightField,
  DiffOptions,
  TerrainPatch
} from '../libs/terrain/terrainInterchange'
