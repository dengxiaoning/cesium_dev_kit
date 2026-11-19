import { createSingleImport } from './Base'
import type { SingleImportConstructor } from './Base'
import { Plugin as PluginCom, Base, Graphics } from '../libs'
import type { PluginInstance } from '../libs/Plugin'
import type { BaseInstance } from '../libs/Base'
import type { Viewer } from '../libs/Base'

/** new Plugin(...) 返回的实例结构 */
export interface PluginExtendsApi {
  /** cesium viewer 实例 */
  viewer: Viewer
  /** Plugin 模块实例（已混入 Base 等方法） */
  plugin: PluginInstance & BaseInstance
}

/**
 * 插件模块（单独引入版）
 */
export const Plugin = createSingleImport<PluginExtendsApi>(
  [Base, Graphics],
  PluginCom,
  'plugin'
) as SingleImportConstructor<PluginExtendsApi>
