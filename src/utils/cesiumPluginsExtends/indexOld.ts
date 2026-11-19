import { createKit } from './kit'
import type { CreateKitOptions, ResModulesType } from './kit'
import type { CesiumGlobal } from './libs/Base'
import type { ExtraConfig, ImageryProviderConf } from './initConf'

/** cesium 全局命名空间对象 */
export type { CesiumGlobal }

/**
 * 其它额外配置（兼容旧类型名）
 * @deprecated 请使用 `ExtraConfig`
 */
export type ExtraConfigOptions = ExtraConfig

/**
 * 配置 provider 的参数对象（兼容旧类型名）
 * @deprecated 请使用 `ImageryProviderConf`
 */
export type ProviderConfOptions = ImageryProviderConf

/**
 * initCesium 的参数（兼容旧入口，字段与 `CreateKitOptions` 一致）
 */
export type InitCesiumOptions = CreateKitOptions

/** initCesium 返回的所有模块实例 */
export type { ResModulesType }

/**
 * 初始化 Cesium 对象（兼容入口）。
 *
 * @deprecated 新代码请使用 `createKit(options)`：
 * 命名更准确（它不是构造函数，不需要 `new`），返回值类型也更完整。
 * 本入口会一直保留到下一个大版本。
 *
 * @example
 * import * as Cesium from 'cesium'
 * import { initCesium } from 'cesium_dev_kit'
 *
 * // 旧写法仍然可用
 * const { viewer, graphics, dispose } = new initCesium({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
 * // 推荐写法
 * const kit = createKit({ Cesium, containerId: 'cesiumContainer' })
 */
function initCesiumFactory(options: InitCesiumOptions): ResModulesType {
  return createKit(options)
}

/** initCesium 同时支持函数调用与 new 调用（兼容历史用法） */
export interface InitCesiumConstructor {
  (options: InitCesiumOptions): ResModulesType
  new (options: InitCesiumOptions): ResModulesType
  prototype: ResModulesType
}

export const initCesium = initCesiumFactory as unknown as InitCesiumConstructor

export { createKit }
export type { CreateKitOptions }
