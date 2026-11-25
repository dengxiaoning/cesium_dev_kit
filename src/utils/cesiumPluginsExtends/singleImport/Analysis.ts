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

/** 剖面分析的纯计算工具（无需 viewer 即可使用） */
export { computeProfileStats, buildProfileChartData, interpolateLngLat } from '../libs/analysis/profile'
export type { ProfileSample, ProfileStats } from '../libs/analysis/profile'
export type { ProfileAnalysisOptions, ProfileAnalysisResult } from '../libs/Analysis'
