import { createSingleImport } from './Base'
import type { SingleImportConstructor } from './Base'
import { Control as ControlCom, Base } from '../libs'
import type { ControlInstance } from '../libs/Control'
import type { BaseInstance } from '../libs/Base'
import type { Viewer } from '../libs/Base'

/** new Control(...) 返回的实例结构 */
export interface ControlExtendsApi {
  /** cesium viewer 实例 */
  viewer: Viewer
  /** Control 模块实例（已混入 Base 等方法） */
  control: ControlInstance & BaseInstance
}

/**
 * 地图控件模块（单独引入版）
 */
export const Control = createSingleImport<ControlExtendsApi>(
  [Base],
  ControlCom,
  'control'
) as SingleImportConstructor<ControlExtendsApi>
