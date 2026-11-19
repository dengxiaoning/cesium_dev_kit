import { createSingleImport } from './Base'
import type { SingleImportConstructor } from './Base'
import { Primitive as PrimitiveCom, Base } from '../libs'
import type { PrimitiveInstance } from '../libs/Primitive'
import type { BaseInstance } from '../libs/Base'
import type { Viewer } from '../libs/Base'

/** new Primitive(...) 返回的实例结构 */
export interface PrimitiveExtendsApi {
  /** cesium viewer 实例 */
  viewer: Viewer
  /** Primitive 模块实例（已混入 Base 等方法） */
  primitive: PrimitiveInstance & BaseInstance
}

/**
 * Primitive 图元模块（单独引入版）
 */
export const Primitive = createSingleImport<PrimitiveExtendsApi>(
  [Base],
  PrimitiveCom,
  'primitive'
) as SingleImportConstructor<PrimitiveExtendsApi>
