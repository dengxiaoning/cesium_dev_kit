import { createSingleImport } from './Base'
import type { SingleImportConstructor } from './Base'
import { Material as MaterialCom, Base, Shaders } from '../libs'
import type { MaterialInstance } from '../libs/Material'
import type { BaseInstance } from '../libs/Base'
import type { Viewer } from '../libs/Base'

/** new Material(...) 返回的实例结构 */
export interface MaterialExtendsApi {
  /** cesium viewer 实例 */
  viewer: Viewer
  /** Material 模块实例（已混入 Base 等方法） */
  material: MaterialInstance & BaseInstance
}

/**
 * 材质模块（单独引入版）
 */
export const Material = createSingleImport<MaterialExtendsApi>(
  [Base, Shaders],
  MaterialCom,
  'material'
) as SingleImportConstructor<MaterialExtendsApi>
