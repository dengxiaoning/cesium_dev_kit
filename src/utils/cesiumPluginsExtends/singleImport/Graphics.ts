import { createSingleImport } from './Base'
import type { SingleImportConstructor } from './Base'
import { Graphics as GraphicsCom, Base } from '../libs'
import type { GraphicsInstance } from '../libs/Graphics'
import type { BaseInstance } from '../libs/Base'
import type { Viewer } from '../libs/Base'

/** new Graphics(...) 返回的实例结构 */
export interface GraphicsExtendsApi {
  /** cesium viewer 实例 */
  viewer: Viewer
  /** Graphics 模块实例（已混入 Base 等方法） */
  graphics: GraphicsInstance & BaseInstance
}

/**
 * 图形绘制模块（单独引入版）
 * 内部会自动创建 viewer，并把 Base 的方法混入 Graphics 模块
 */
export const Graphics = createSingleImport<GraphicsExtendsApi>(
  [Base],
  GraphicsCom,
  'graphics'
) as SingleImportConstructor<GraphicsExtendsApi>
