import { createSingleImport } from './Base'
import type { SingleImportConstructor } from './Base'
import { Analysis as AnalysisCom, Base, Draw, Plugin } from '../libs'
import type { AnalysisInstance } from '../libs/Analysis'
import type { BaseInstance } from '../libs/Base'
import type { Viewer } from '../libs/Base'

/** new Analysis(...) 返回的实例结构 */
export interface AnalysisExtendsApi {
  /** cesium viewer 实例 */
  viewer: Viewer
  /** Analysis 模块实例（已混入 Base 等方法） */
  analysis: AnalysisInstance & BaseInstance
}

/**
 * 空间分析模块（单独引入版）
 */
export const Analysis = createSingleImport<AnalysisExtendsApi>(
  [Base, Draw, Plugin],
  AnalysisCom,
  'analysis'
) as SingleImportConstructor<AnalysisExtendsApi>
