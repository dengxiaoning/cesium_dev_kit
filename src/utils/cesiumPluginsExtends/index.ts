import { createKit, initCesium } from './indexOld'
import { defaultStatic, createDefaultStatic, DEFAULT_STATIC_BASE } from './defaultStatic'
import { createContext, disposeContext, isBrowser, assertBrowser } from './libs/context'
import { CesiumDevKitError, isCesiumDevKitError, setErrorHandler, getErrorHandler, reportError } from './libs/errors'
import {
  Graphics,
  Material,
  Primitive,
  Draw,
  Analysis,
  CustomCesiumPlugin,
  PassEffect,
  Plugin,
  ThreeJs,
  Control,
  Math2d,
  Math3d,
  AttackArrow,
  StraightArrow,
  PincerArrow,
  TerrainEdit,
} from './singleImport/index'

export type { CreateKitOptions, ResModulesType } from './indexOld'
export type { CesiumContext, CesiumContextOptions } from './libs/context'
export type { CesiumDevKitErrorCode, CesiumDevKitErrorHandler } from './libs/errors'
export type { CesiumGlobal } from './libs/Base'
export type {
  TerrainEditInstance,
  TerrainEditConstructor,
  TerrainEditDrawOptions,
  TerrainEditApplyOptions,
  TerrainEditStatsResult,
  TerrainEditModuleOptions,
  TerrainEditPosition,
  TerrainEditMode,
  TerrainEditSnapshot,
  TerrainEditBrushState,
  TerrainEditAreaInfo,
  TerrainEditViewState,
  TerrainHeightField,
  TerrainHeightsPayload,
  HeightField
} from './libs/TerrainEdit'

export {
  // 推荐入口
  createKit,
  // 兼容入口
  initCesium,
  // 上下文与错误
  createContext,
  disposeContext,
  isBrowser,
  assertBrowser,
  CesiumDevKitError,
  isCesiumDevKitError,
  setErrorHandler,
  getErrorHandler,
  reportError,
  // 静态资源
  defaultStatic,
  createDefaultStatic,
  DEFAULT_STATIC_BASE,
  // 模块
  Graphics,
  Material,
  Primitive,
  Draw,
  Analysis,
  CustomCesiumPlugin,
  PassEffect,
  Plugin,
  ThreeJs,
  Control,
  Math2d,
  Math3d,
  AttackArrow,
  StraightArrow,
  PincerArrow,
  TerrainEdit,
};
