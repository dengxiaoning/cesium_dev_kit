import { createSingleImport } from './Base'
import type { SingleImportConstructor } from './Base'
import { PassEffect as PassEffectCom, Base, Shaders } from '../libs'
import type { PassEffectInstance } from '../libs/PassEffect'
import type { BaseInstance } from '../libs/Base'
import type { Viewer } from '../libs/Base'

/** new PassEffect(...) 返回的实例结构 */
export interface PassEffectExtendsApi {
  /** cesium viewer 实例 */
  viewer: Viewer
  /** PassEffect 模块实例（已混入 Base 等方法） */
  passEffect: PassEffectInstance & BaseInstance
}

/**
 * 后期处理（滤镜）模块（单独引入版）
 */
export const PassEffect = createSingleImport<PassEffectExtendsApi>(
  [Base, Shaders],
  PassEffectCom,
  'passEffect'
) as SingleImportConstructor<PassEffectExtendsApi>
