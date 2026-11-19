import type { Viewer, CesiumGlobal } from './libs/Base'
import { reportError } from './libs/errors'

/**
 * 注意：库内不再内置 Cesium Ion token。
 * 请通过 `extraConfig.AccessToken` 传入，或在应用入口自行设置
 * `Cesium.Ion.defaultAccessToken`，避免使用库作者的配额且便于轮换。
 */

/**
 * 初始化参数中的额外配置
 */
export interface ExtraConfig {
  /** 认证 token */
  AccessToken?: string
  /** 显示 logo，默认 true（传 false 隐藏 logo） */
  logo?: boolean
  /** 是否开启深度检测，默认 false */
  depthTest?: boolean
  /** 其它自定义配置 */
  [key: string]: unknown
}

/**
 * imageryProvider 配置项
 */
export interface ImageryProviderConf {
  /** Provider 类型：WebMapTileServiceImageryProvider/UrlTemplateImageryProvider/TileMapServiceImageryProvider */
  type: string
  /** 对应 provider 的参数配置 */
  option?: Record<string, unknown>
  /** 兼容旧版本的配置字段（与 option 等价） */
  classConfig?: Record<string, unknown>
}

/**
 * Viewer 配置（保留 cesium 官方配置项，同时允许扩展字段）
 */
export type ViewerConfig = ViewerViewerConstructorOptions & Record<string, unknown>

/** cesium Viewer 构造参数类型 */
type ViewerViewerConstructorOptions = NonNullable<
  ConstructorParameters<typeof import('cesium').Viewer>[1]
>

/**
 * Controller.init 的入参
 */
export interface ControllerInitOptions {
  /** 挂载 viewer 的 dom id 或 dom 元素 */
  containerId?: string | HTMLElement
  /** viewer 配置 */
  viewerConfig?: ViewerConfig
  /** 额外配置 */
  extraConfig?: ExtraConfig
  /** 需要加载的影像图层配置 */
  MapImageryList?: ImageryProviderConf[]
  /** imageryProvider 配置 */
  imageryProvider?: Record<string, ImageryProviderConf | unknown>
  /** 外部传入已经实例化的 viewer，传入后不再重新创建 */
  viewer?: Viewer
}

/**
 * cesium 初始化控制器
 */
class Controller {
  /** 当前 viewer 实例 */
  viewer: Viewer | null = null
  /**
   * 本次初始化使用的 Cesium 全局对象。
   *
   * 作为实例字段而不是模块级变量：同一个页面可能存在多个 kit / 多份 Cesium，
   * 模块级变量会被后创建的实例覆盖。
   */
  private Cesium: CesiumGlobal

  /**
   * @param cesiumGlobal - 全局 Cesium 对象
   */
  constructor(cesiumGlobal: CesiumGlobal) {
    this.Cesium = cesiumGlobal
    this.init_data()
  }

  init_data(): void {
    this.viewer = null
  }

  /**
   * 初始化 viewer
   * @param options - 初始化配置
   * @returns cesium viewer 实例
   */
  init({
    containerId,
    viewerConfig,
    extraConfig,
    MapImageryList,
    imageryProvider,
    viewer
  }: ControllerInitOptions): Viewer {
    const mapID = containerId
    let vConfig: ViewerConfig = {
      contextOptions: {
        webgl: {
          alpha: false
        }
      },
      // 默认设置
      animation: false, //动画控件
      timeline: false, //时间线
      fullscreenButton: false, // 全屏按钮
      geocoder: false, //地名查找（依赖google服务）
      homeButton: false, //重置到初始焦点与缩放
      selectionIndicator: false, //
      shadow: true,
      sceneMode: this.Cesium.SceneMode.SCENE3D,
      infoBox: false, //消息框
      sceneModePicker: false, //场景模式选择
      navigationHelpButton: false, //导航帮助按钮
      projectionPicker: false, //投影方式选择（3D、2D、Columbus）
      baseLayerPicker: false,
      shouldAnimate: true,
      navigation: false,
      showRenderLoopErrors: true // 是否显示render异常信息
    }
    let providerConf = this.findCesiumProvider(imageryProvider)
    // 仅在使用方显式传入 token 时覆盖，避免库内置 token 带来的配额与合规问题
    const accessToken = extraConfig?.['AccessToken']
    if (accessToken) {
      this.Cesium.Ion.defaultAccessToken = accessToken
    }
    vConfig = Object.assign(vConfig, viewerConfig) // 后台接口配置 融合替换 默认配置
    // 如果外部传入viewer 将不再重新实例化viewer

    const _viewer: Viewer = viewer || new this.Cesium.Viewer(mapID as string, { ...vConfig, ...providerConf })
    if (extraConfig && !extraConfig['logo']) {
      const cC = _viewer.cesiumWidget.creditContainer as HTMLElement
      cC.style.display = 'none' // 影藏logo
    }

    // 是否开启深度参数
    if (extraConfig && extraConfig['depthTest']) {
      // 设置开启深度检测
      _viewer.scene.globe.depthTestAgainstTerrain = true
    }

    // 增加配置图层
    if (MapImageryList && MapImageryList.length > 0) {
      for (let i = 0; i < MapImageryList.length; i++) {
        this.addImageryProvider(
          _viewer,
          MapImageryList[i].type,
          MapImageryList[i].option || MapImageryList[i].classConfig
        )
      }
    }
    // 监听容器尺寸变化,自动同步 canvas 尺寸(详见 bindContainerResize 注释)
    // 外部传入的 viewer 由外部自行管理,不做绑定
    if (!viewer) {
      // 只在浏览器环境访问 DOM；Node/SSR 下由 createContext 提前拦截
      const containerEl =
        typeof document === 'undefined'
          ? null
          : mapID && (mapID as Node).nodeType === 1
            ? (mapID as HTMLElement)
            : document.getElementById(mapID as string)
      this.bindContainerResize(_viewer, containerEl)
    }

    this.viewer = _viewer
    return _viewer
  }

  /**
   * 监听 viewer 容器尺寸变化并自动调用 viewer.resize()
   * 【背景】useDefaultRenderLoop: false 时,cesium 不会像默认渲染循环那样自动同步
   * canvas 尺寸,而融合 three 必须关闭默认渲染循环。路由切换重新挂载页面时,容器
   * 可能先以 0 高度完成挂载(布局稍后恢复),此时创建的 canvas 绘图缓冲区会停留在
   * 0 高,地图将永久黑屏。ResizeObserver 可在容器尺寸变化(包括初始 0 -> 正常尺寸)
   * 时及时同步,同时兼顾侧栏折叠等仅容器尺寸变化、不触发 window resize 的场景。
   * @param viewer - cesium viewer 实例
   * @param container - viewer 容器 DOM 元素
   */
  bindContainerResize(viewer: Viewer, container: Element | null): void {
    if (typeof ResizeObserver === 'undefined' || !container) return
    const doResize = () => {
      try {
        if (typeof viewer.isDestroyed !== 'function' || !viewer.isDestroyed()) {
          viewer.resize()
        }
      } catch (err) {
        // viewer 已销毁时 resize 会抛错，属于可忽略场景，但仍上报便于排查
        reportError(err, { scope: 'Controller.bindContainerResize' })
      }
    }
    const observer = new ResizeObserver(doResize)
    observer.observe(container)
    // 下一帧补一次同步,防止挂载瞬间布局尚未稳定
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(doResize)
    // viewer 销毁时断开监听,避免闭包持有已销毁实例
    const originalDestroy = viewer.destroy.bind(viewer)
    viewer.destroy = function () {
      try {
        observer.disconnect()
      } catch (err) {
        reportError(err, { scope: 'Controller.bindContainerResize.disconnect' })
      }
      return originalDestroy()
    }
  }

  /**
   * 添加影像图层
   * @param viewer - cesium viewer 实例
   * @param type - provider 类型
   * @param option - provider 参数
   */
  addImageryProvider(viewer: Viewer, type: string, option?: Record<string, unknown>): void {
    viewer.imageryLayers.addImageryProvider(
      this.createCesiumProvider({
        type,
        option
      })
    )
  }

  /**
   * 获取 cesium provider 配置对象（将配置中的 provider 描述转换为 provider 实例）
   * @param options - provider 配置
   * @returns 转换后的配置对象
   */
  findCesiumProvider(options?: Record<string, ImageryProviderConf | unknown>): Record<string, unknown> {
    const object: Record<string, unknown> = {}
    if (!options) return object
    for (const key in options) {
      const item = options[key] as ImageryProviderConf
      if (item && item.type) {
        object[key] = this.createCesiumProvider(item)
        continue
      }
      object[key] = options[key]
    }

    return object
  }

  /**
   * 根据类型创建 cesium imagery provider 实例
   * @param config - provider 配置
   * @returns provider 实例
   */
  createCesiumProvider(config: ImageryProviderConf): any {
    switch (config.type) {
      case 'WebMapTileServiceImageryProvider':
        return new (this.Cesium as any)[config.type](config.option)
      case 'UrlTemplateImageryProvider':
        return new (this.Cesium as any)[config.type](config.option)
      case 'TileMapServiceImageryProvider':
        return new (this.Cesium as any)[config.type](config.option)
    }
  }
}

export { Controller }
