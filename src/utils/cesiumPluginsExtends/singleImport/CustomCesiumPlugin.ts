import { createSingleImport } from './Base'
import type { SingleImportConstructor } from './Base'
import { Base, CustomCesiumPlugin as CustomCesiumPluginCom } from '../libs'
import type { CustomCesiumPluginInstance } from '../libs/CustomCesiumPlugin'
import type { BaseInstance } from '../libs/Base'
import type { Viewer } from '../libs/Base'

/** new CustomCesiumPlugin(...) 返回的实例结构 */
export interface CustomCesiumPluginExtendsApi {
  /** cesium viewer 实例 */
  viewer: Viewer
  /** 自定义扩展（传感器）模块实例 */
  customCesiumPlugin: CustomCesiumPluginInstance & BaseInstance
}

/**
 * 自定义 cesium 扩展（如传感器）模块（单独引入版）
 */
export const CustomCesiumPlugin = createSingleImport<CustomCesiumPluginExtendsApi>(
  Base,
  CustomCesiumPluginCom,
  'customCesiumPlugin'
) as SingleImportConstructor<CustomCesiumPluginExtendsApi>
