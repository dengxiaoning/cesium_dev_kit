import { Controller } from '../initConf'
import { createDefaultStatic } from '../defaultStatic'
import { CesiumDevKitError, isCesiumDevKitError, setErrorHandler } from './errors'
import type { CesiumDevKitErrorHandler, CesiumDevKitErrorCode } from './errors'
import { disposeViewer } from './Base'
import type { CesiumGlobal, StaticResourceConf, Viewer } from './Base'
import type { ExtraConfig, ImageryProviderConf } from '../initConf'

/**
 * 运行环境判断：是否处于浏览器 / 有 DOM 的环境。
 *
 * 库本身允许在 Node / SSR 中 `import`（顶层不访问 window/document），
 * 但创建 viewer、操作 DOM 的能力必须在浏览器里调用。
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

/**
 * 断言当前处于浏览器环境。
 * @param feature - 能力名称，用于错误信息
 */
export function assertBrowser(feature: string): void {
  if (!isBrowser()) {
    throw new CesiumDevKitError(
      'UNSUPPORTED_ENVIRONMENT',
      `${feature} 需要 DOM 环境，当前看起来是 Node/SSR。请把调用放到浏览器生命周期（如 onMounted / useEffect）里。`,
      { details: { feature } }
    )
  }
}

/**
 * 创建 kit 上下文所需参数。
 *
 * `CreateKitOptions` 继承本接口，因此 `createKit` 与 `createContext` 用同一套参数。
 */
export interface CesiumContextOptions {
  /** Cesium 全局命名空间（与 `Cesium` 二选一，必须提供一个） */
  cesiumGlobal?: CesiumGlobal
  /** `cesiumGlobal` 的别名，便于 `createKit({ Cesium })` 写法 */
  Cesium?: CesiumGlobal
  /** 全局 THREE 对象（使用 three 相关能力时传入） */
  threeGlobal?: any
  /** `threeGlobal` 的别名 */
  three?: any
  /** 挂载 viewer 的 dom id 或元素（不传 `viewer` 时必传） */
  containerId?: string | HTMLElement
  /** 挂载 three 容器的 dom id 或元素 */
  threeContainerId?: string | HTMLElement
  /** 外部已创建好的 viewer（传入后 kit 不会销毁它） */
  viewer?: Viewer
  /** cesium Viewer 构造参数 */
  viewerConfig?: Record<string, unknown>
  /** 额外配置（AccessToken / logo / depthTest ...） */
  extraConfig?: ExtraConfig
  /** 影像 provider 配置，透传给 Viewer 构造参数 */
  imageryProvider?: Record<string, ImageryProviderConf | unknown>
  /** 初始化后追加的影像图层 */
  MapImageryList?: ImageryProviderConf[]
  /** 自定义静态资源配置（优先级高于 `assetsBaseUrl`） */
  defaultStatic?: StaticResourceConf
  /**
   * 静态资源基础地址，等价于 `createDefaultStatic(assetsBaseUrl)`。
   * 传空字符串表示使用站点相对路径（需自行托管 public/static）。
   */
  assetsBaseUrl?: string
  /**
   * 非致命错误处理器，等价于全局 `setErrorHandler`。
   * 用于接管库内被 catch 掉的错误（销毁失败、可选依赖缺失等）。
   */
  onError?: CesiumDevKitErrorHandler
}

/**
 * 一次 kit 实例的运行时上下文。
 *
 * 所有模块共享同一个 context，模块内部不再依赖模块级全局变量，
 * 因此同一个页面可以安全地同时存在多个 kit / 多个 viewer。
 */
export interface CesiumContext {
  /** 注入的 Cesium 全局对象 */
  readonly Cesium: CesiumGlobal
  /** 本次 kit 使用的 viewer */
  readonly viewer: Viewer
  /** 静态资源（图标 / 天空盒等）配置 */
  readonly defaultStatic: StaticResourceConf
  /** 静态资源前缀（`defaultStatic.baseService`） */
  readonly assetsBaseUrl: string
  /** three 全局对象（未传入时为 undefined） */
  readonly three?: any
  /** viewer 是否由 kit 创建（决定 dispose 时是否销毁） */
  readonly ownsViewer: boolean
  /** 挂载容器（外部传入 viewer 时可能为 undefined） */
  readonly containerId?: string | HTMLElement
  /** three 容器 */
  readonly threeContainerId?: string | HTMLElement
}

/** 解析静态资源配置：显式 defaultStatic > assetsBaseUrl > 内置默认 CDN */
function resolveStatic(options: CesiumContextOptions): StaticResourceConf {
  if (options.defaultStatic) return options.defaultStatic
  if (typeof options.assetsBaseUrl === 'string') {
    return createDefaultStatic(options.assetsBaseUrl)
  }
  return createDefaultStatic()
}

/**
 * 创建（或接管）viewer，并组装出上下文。
 *
 * @example
 * const ctx = createContext({ Cesium, containerId: 'cesiumContainer', assetsBaseUrl: '/static/' })
 * ctx.viewer // 可直接使用
 */
export function createContext(options: CesiumContextOptions): CesiumContext {
  const Cesium = options.cesiumGlobal ?? options.Cesium
  const three = options.threeGlobal ?? options.three

  if (!Cesium) {
    throw new CesiumDevKitError(
      'MISSING_CESIUM',
      '缺少 Cesium 全局对象，请传入 cesiumGlobal（或别名 Cesium）。'
    )
  }
  if (!options.containerId && !options.viewer) {
    throw new CesiumDevKitError(
      'MISSING_VIEWER',
      '缺少 containerId 或 viewer：请传入挂载容器 id，或直接传入已创建的 viewer。'
    )
  }
  if (!options.viewer) {
    // 需要 new Cesium.Viewer，必须有 DOM
    assertBrowser('createKit / initCesium')
  }

  if (options.onError) setErrorHandler(options.onError)

  const defaultStatic = resolveStatic(options)

  let viewer = options.viewer as Viewer
  try {
    if (!viewer) {
      const controller = new Controller(Cesium)
      viewer = controller.init({
        containerId: options.containerId,
        viewerConfig: options.viewerConfig,
        extraConfig: options.extraConfig,
        MapImageryList: options.MapImageryList,
        imageryProvider: options.imageryProvider
      })
    } else {
      // 外部 viewer：只追加配置，不重建 viewer
      const controller = new Controller(Cesium)
      // 外部 viewer 同样支持 extraConfig（logo / depthTest），与 kit 自建 viewer 保持一致
      controller.applyExtraConfig(viewer, options.extraConfig)
      if (options.MapImageryList && options.MapImageryList.length > 0) {
        options.MapImageryList.forEach((item) => {
          controller.addImageryProvider(viewer, item.type, item.option || item.classConfig)
        })
      }
    }
  } catch (err) {
    if (isCesiumDevKitError(err)) throw err
    throw new CesiumDevKitError('INTERNAL', '创建 Cesium viewer 失败，请检查 containerId 与 viewerConfig。', {
      cause: err,
      details: { containerId: options.containerId }
    })
  }

  return {
    Cesium,
    viewer,
    defaultStatic,
    assetsBaseUrl: defaultStatic.baseService ?? '',
    three,
    ownsViewer: !options.viewer,
    containerId: options.containerId,
    threeContainerId: options.threeContainerId
  }
}

/** 释放上下文：仅销毁 kit 自己创建的 viewer */
export function disposeContext(context: CesiumContext | null | undefined): void {
  if (!context || !context.ownsViewer) return
  disposeViewer(context.viewer)
}

/** 抛出统一错误（内部使用，便于统一格式） */
export function throwKitError(
  code: CesiumDevKitErrorCode,
  message: string,
  options?: { cause?: unknown; details?: Record<string, unknown> }
): never {
  throw new CesiumDevKitError(code, message, options)
}
