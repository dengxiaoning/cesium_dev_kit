import { createSingleImport } from './Base'
import type { SingleImportConstructor } from './Base'
import { Analysis as AnalysisCom, Base, Draw, Math2d, Math3d, Plugin } from '../libs'
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
  [Base, Math3d, Math2d, Draw, Plugin],
  AnalysisCom,
  'analysis'
) as SingleImportConstructor<AnalysisExtendsApi>

/** 剖面分析的纯计算工具（无需 viewer 即可使用） */
export { computeProfileStats, buildProfileChartData, interpolateLngLat } from '../libs/analysis/profile'
export type { ProfileSample, ProfileStats } from '../libs/analysis/profile'
export type { ProfileAnalysisOptions, ProfileAnalysisResult } from '../libs/Analysis'

/** 地形表面分析的纯计算工具（坡度/坡向、方量对比、通视判定） */
export {
  computeSlopeAspect,
  computeVolumeCompare,
  isPointInPolygon,
  computeSightlineVisibility,
  buildAspectChartData,
  buildVolumeCompareChartData
} from '../libs/analysis/terrainSurface'
export type {
  SlopeAspectInput,
  SlopeAspectResult,
  VolumeCell,
  VolumeCompareResult,
  LngLat,
  SightSample,
  SightlineOptions,
  SightlineResult,
  AspectChartSample,
  VolumeCompareChartItem
} from '../libs/analysis/terrainSurface'
export type {
  AspectAnalysisOptions,
  AspectAnalysisResult,
  AspectSample,
  MultiViewshedAnalysisOptions,
  MultiViewshedAnalysisResult,
  MultiViewshedObserver,
  CutVolumeCompareOptions,
  CutVolumeCompareResult,
  VolumeCompareItem,
  BatchClipPlanOptions,
  BatchClipPlanResult,
  VisibilityPathOptions,
  VisibilityPathResult
} from '../libs/Analysis'
