import { createSingleImport } from './Base'
import type { SingleImportConstructor } from './Base'
import { ThreeJs as ThreeJsCom } from '../libs'
import type { ThreeJsInstance } from '../libs/ThreeJs'
import type { BaseInstance } from '../libs/Base'
import type { Viewer } from '../libs/Base'

/** new ThreeJs(...) 返回的实例结构 */
export interface ThreeJsExtendsApi {
  /** cesium viewer 实例 */
  viewer: Viewer
  /** ThreeJs 模块实例（已混入 Base 等方法） */
  threeJs: ThreeJsInstance & BaseInstance
}

/**
 * three.js 融合模块（单独引入版）
 */
export const ThreeJs = createSingleImport<ThreeJsExtendsApi>(
  [],
  ThreeJsCom,
  'threeJs'
) as SingleImportConstructor<ThreeJsExtendsApi>
