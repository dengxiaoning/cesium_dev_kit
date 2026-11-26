import type {
  Cartesian2,
  Cartesian3,
  Cartographic,
  PostProcessStage,
  ScreenSpaceEventHandler,
  Viewer as CesiumViewer
} from 'cesium'
import { createDefaultStatic, joinStaticUrl } from '../defaultStatic'
import localDefaultValue from './defaultValue'

/** cesium Viewer 实例类型（来自 `cesium` 包，仅类型引用，不影响打包体积） */
export type Viewer = CesiumViewer

/**
 * Cesium 未在公开类型里声明、但本库运行时会读写的 Scene 成员。
 * 集中在这里补充，避免为了几个私有字段把整个 viewer 退回 `any`。
 */
type ViewerScene = CesiumViewer['scene'] & {
  /** 旧版 FXAA 开关（新版迁移到 `postProcessStages.fxaa`） */
  fxaa?: boolean
  /** 地下模式开关（公开类型未声明） */
  undergroundMode?: boolean
}

/** 相机私有成员（`_direction` 为未归一化的原始方向） */
type ViewerCamera = CesiumViewer['camera'] & {
  _direction: Cartesian3
}

/**
 * cesium 全局对象类型。
 *
 * 已知成员（`Cesium.Cartesian3`、`Cesium.Viewer` 等）直接取 `cesium` 包的真实类型，
 * 只有本库运行时补丁上去的成员（`Cesium.Scene` 上的影像服务提供者、近景天空盒、
 * 材质属性，以及 Cesium 未导出的私有类）才回退到 `any`。
 */
export type CesiumGlobal = typeof import('cesium') & {
  /** 本库会在运行时扩展 `Cesium.Scene`（`AmapImageryProvider`、`GroundSkyBox` 等） */
  Scene: typeof import('cesium').Scene & Record<string, any>
} & Record<string, any>

/** 模块内部持有的 cesium 全局对象 */

/** 静态资源（defaultStatic）配置 */
export interface StaticResourceConf {
  /** 静态资源服务前缀 */
  baseService: string
  /** 天空盒 / 图标等资源的分组配置 */
  skyBox?: Record<string, Record<string, string>>
  /** 其它静态资源分组 */
  [group: string]: unknown
}

/**
 * 宽松赋值：把 JS 里常见的入参（颜色字符串、Cartesian3、CallbackProperty 等）
 * 直接交给 Cesium，由 Cesium 内部转换成对应的 Property 类型
 */
export function asProperty<T>(value: unknown): T {
  return value as T
}

/**
 * 把一个「模块工厂」包装成构造函数。
 *
 * 背景：libs 下各模块历史上使用模块级 `let Cesium` / `let dfSt` / 拖拽状态。
 * 多个 viewer 或多个 kit 实例并存时，后创建的实例会覆盖先前的全局状态。
 *
 * 该包装器在每次 `new Xxx(...)` 时调用一次 factory，得到一份全新的构造函数与
 * 原型（以及全新的闭包变量），从而让每个实例拥有独立上下文，而无需把上千处
 * `Cesium.xxx` 改写成 `this._Cesium.xxx`。
 *
 * 混入系统会通过 `__cesiumDevKitCreateModule` 直接拿到这份新构造函数，在实例化
 * 之前把父模块方法拷贝到它的原型上，避免破坏原有“构造期间即可调用父方法”的行为。
 */
export function createScopedConstructor<C extends new (...args: any[]) => any>(
  factory: () => C
): C {
  function Scoped(this: any, ...args: any[]) {
    const Impl = factory()
    return new Impl(...args)
  }

  // 保留 prototype 供旧代码/调试查看。真正的混入会使用 factory() 返回的新构造函数。
  Scoped.prototype = factory().prototype

  Object.defineProperty(Scoped, '__cesiumDevKitCreateModule', {
    value: factory,
    enumerable: false,
    configurable: false,
    writable: false
  })

  return Scoped as unknown as C
}

/**
 * 从 scoped 构造函数上取出一次性的真实模块构造函数。
 * 非 scoped 构造函数会原样返回。
 */
export function resolveScopedConstructor<T>(ctor: T): T {
  const factory = (ctor as any)?.__cesiumDevKitCreateModule
  return typeof factory === 'function' ? factory() : ctor
}

/**
 * 幂等销毁 viewer。
 *
 * 约定：只有「由 kit 自己创建」的 viewer 才应该调用；外部传入的 viewer 由使用方负责销毁。
 * 内部会正确处理 Cesium 的 isDestroyed/destroy，并吞掉重复销毁等异常。
 */
export function disposeViewer(viewer: any): void {
  if (!viewer) return
  try {
    if (typeof viewer.isDestroyed === 'function' && viewer.isDestroyed()) return
    if (typeof viewer.destroy === 'function') {
      viewer.destroy()
    }
  } catch (err) {
    // 销毁失败不应阻断页面卸载流程
    console.warn('[cesium_dev_kit] failed to dispose viewer:', err)
  }
}

/** 资源释放回调 */
export type Cleanup = () => void

/**
 * 每个模块实例的清理任务表。
 *
 * 用 WeakMap 而不是实例属性，避免「原型混入 + Object.assign」把父模块的
 * `destroy` 覆盖到子模块上，也避免给实例挂一堆可枚举字段。
 */
const cleanupRegistry = new WeakMap<object, Cleanup[]>()

/**
 * 登记一个清理任务（移除监听、实体、DataSource 等）。
 * 同一实例的清理任务按登记的逆序执行。
 */
export function registerCleanup(target: object, cleanup: Cleanup): void {
  if (!target || typeof cleanup !== 'function') return
  const list = cleanupRegistry.get(target)
  if (list) {
    list.push(cleanup)
  } else {
    cleanupRegistry.set(target, [cleanup])
  }
}

/**
 * 把 `from` 上登记的清理任务迁移到 `to`。
 *
 * `prototypeExtends` 会先 new 出父模块实例、再把自有属性 Object.assign 到子实例；
 * 若不迁移，父模块（Base/Graphics 等）创建的 DataSource 和监听器会永远失去引用。
 */
export function transferCleanups(from: any, to: any): void {
  if (!from || !to || from === to) return
  const list = cleanupRegistry.get(from)
  if (!list || list.length === 0) return
  cleanupRegistry.delete(from)
  const target = cleanupRegistry.get(to)
  if (target) {
    target.push(...list)
  } else {
    cleanupRegistry.set(to, list)
  }
}

/**
 * 执行某个模块实例登记的所有清理任务（幂等）。
 */
export function disposeModule(target: any): void {
  if (!target || (typeof target !== 'object' && typeof target !== 'function')) return
  const list = cleanupRegistry.get(target)
  if (!list) return
  cleanupRegistry.delete(target)
  for (let i = list.length - 1; i >= 0; i--) {
    try {
      list[i]()
    } catch (err) {
      console.warn('[cesium_dev_kit] cleanup failed:', err)
    }
  }
}

/**
 * 给模块实例挂一个不可枚举的 `destroy()`。
 *
 * 不可枚举很关键：`prototypeExtends` 会 `Object.assign(child, parentInstance)`，
 * 可枚举的实例属性会覆盖子模块自己的 destroy。
 */
export function attachDestroy(target: any): void {
  if (!target) return
  if (typeof target.destroy === 'function') return
  Object.defineProperty(target, 'destroy', {
    value: function destroy(this: any) {
      disposeModule(this)
    },
    enumerable: false,
    configurable: true,
    writable: true
  })
}

/**
 * 将 source 原型上的方法拷贝到 target 原型上（用于模块间的“混入”，兼容 class 的非枚举方法）
 */
export function mixinPrototype(target: Function, source: Function): void {
  Object.getOwnPropertyNames(source.prototype).forEach((name) => {
    if (name !== 'constructor') {
      ;(target.prototype as Record<string, unknown>)[name] = (source.prototype as Record<string, unknown>)[name]
    }
  })
}

/** 静态资源（defaultStatic）配置 */

/** 相机位置信息 */
export interface cameraPosType {
  lon: number
  lat: number
  height: number
  heading: number
  pitch: number
  roll: number
  position: Cartesian3
  cameraHeading: number
  cameraPitch: number
  cameraRoll: number
  center: { x: number; y: number }
  direction: Cartesian3
}

/** WGS84 地理坐标（弧度） */
export type CartographicType = Cartographic

/** 84 坐标信息 */
export interface WGS84Type {
  lng: number
  lat: number
  alt?: number
  lon?: number
}

/** 点击后返回的位置信息 */
export interface clickPositionType {
  wgs84Coor: WGS84Type
  graphicCoor: { height: number; latitude: number; longitude: number }
  cameraPosition: { cameraPosistion: Cartesian3; heading: number; pitch: number; roll: number }
}

/** 天地图图层样式类型 */
export interface TDTStyleType {
  img: string
  cia: string
  vec: string
  cva: string
  ter: string
  cta: string
}

/** 屏幕事件回调收到的 movement 数据 */
export interface ScreenSpaceEventMovement {
  /** 事件发生时的屏幕二维坐标（像素） */
  position: Cartesian2
  /** 鼠标移动时的结束位置，仅 MOUSE_MOVE 事件有 */
  endPosition?: Cartesian2
}

/** 鼠标事件回调：`event` 为屏幕事件数据，`handlers` 为当前的 ScreenSpaceEventHandler 实例 */
export type MouseEventHandler = (
  event: ScreenSpaceEventMovement,
  handlers: ScreenSpaceEventHandler
) => void

/** bindHandleEvent 支持注册的鼠标事件，key 是事件名，value 是回调函数 */
export interface BindHandleEventOptions {
  /** 左键单击 */
  leftClick?: MouseEventHandler
  /** 鼠标移动 */
  mouseMove?: MouseEventHandler
  /** 左键双击 */
  doubleClick?: MouseEventHandler
  /** 左键按下 */
  leftDown?: MouseEventHandler
  /** 滚轮滚动 */
  mouseWheel?: MouseEventHandler
  /** 左键抬起 */
  leftUp?: MouseEventHandler
}

/** @deprecated 拼写有误，请使用 {@link BindHandleEventOptions} */
export type BindHandelEventOptions = BindHandleEventOptions

/** setView / flyTo 的相机参数 */
export interface CameraSetOptions {
  /** 目标位置（笛卡尔坐标），必填 —— 为空时方法直接返回不执行 */
  position: Cartesian3
  /** 相机与目标点的距离（米），传入时会在 position 基础上做偏移 */
  distance?: number
  /** 相机姿态，角度单位为弧度 */
  orientation?: {
    /** 朝向 */
    heading: number
    /** 倾斜角 */
    pitch: number
    /** 翻滚角 */
    roll?: number
  }
  /** 飞行时长（秒），仅 flyTo 生效，默认 3 */
  duration?: number
  /** 飞行插值方式，如 `Cesium.EasingFunction.QUADRATIC_IN_OUT`，仅 flyTo 生效 */
  easingFunction?: any
  /** 飞行完成后的回调，仅 flyTo 生效 */
  callback?: () => void
}

/** setDarkEffect（黑夜特效）的参数 */
export interface DarkEffectOptions {
  /** 颜色偏移量，默认 `Cesium.Cartesian3(0.1, 0.2, 0.3)` */
  offset?: Cartesian3
}

/** setBlurBloom（场景蓝光/泛光）的参数 */
export interface BlurBloomOptions {
  /** 曝光区域宽度（像素） */
  width?: number
  /** 曝光区域高度（像素） */
  height?: number
}

/** setCameraEotateHeading（相机绕点环绕飞行）的参数 */
export interface CameraRotateHeadingOptions {
  /** 环绕中心经度（度） */
  lng: number
  /** 环绕中心纬度（度） */
  lat: number
  /** 环绕中心高度（米） */
  height: number
}

/** 影像服务提供者构造参数 */
export type ImageryProviderOptions = Record<string, any>

/** 百度影像拓展实例（仿 ImageryProvider 结构） */
export interface BaiduImageryProviderInstance {
  [key: string]: any
}

/** Cesium 内部私有类型 DrawCommand（未对外导出，宽松占位） */
export interface SceneDrawCommand {
  [key: string]: any
}

/** Cesium 内部私有类型 CubeMap（未对外导出，宽松占位） */
export interface SceneCubeMap {
  [key: string]: any
}

/** Cesium 内部私有类型 FrameState（未对外导出，宽松占位） */
export interface SceneFrameState {
  [key: string]: any
}

/** 近景天空盒实例 */
export interface GroundSkyBoxInstance {
  [key: string]: any
}
/**
 * @typedef {Object} cameraPosType - 相机位置信息
 * @property {number} lon -  经度
 * @property {number} lat - 纬度
 * @property {number} height - 高度
 * @property {number} heading - 朝向，角度<degrees>数据,使用时需要Cesium.Math.toRadians转换为弧度
 * @property {number} pitch - 倾斜度，角度<degrees>数据,使用时需要Cesium.Math.toRadians转换为弧度
 * @property {number} roll - 翻滚角，角度<degrees>数据,使用时需要Cesium.Math.toRadians转换为弧度
 * @property {Cartesian3} position - 相机笛卡尔积位置
 * @property {number} cameraHeading - 相机朝向
 * @property {number} cameraPitch - 相机倾斜度
 * @property {number} cameraRoll - 相机翻滚角
 * @property {object} center - 中心坐标，{x:102.736485445,y:29.87345}
 * @property {Cartesian3} direction - 方向
 */
/**
 * @typedef {Object}  CartographicType - WGS84地理坐标
 * @property {number} longitude  - 经度
 * @property {number} latitude - 纬度
 * @property {number} height - 高度
 */
/**
 * @typedef {Object}  WGS84Type - 84坐标信息
 * @property {number} lng - 经度
 * @property {number} lat - 纬度
 * @property {number} alt - 高度
 */
/**
 * @typedef {Object}  clickPositionType - 点击后返回位置信息
 * @property {WGS84Type} wgs84Coor - 点击位置
 * @property {CartographicType} graphicCoor - 实体真实位置
 * @property {cameraPosType} cameraPosition - 相机位置
 */

/**
 * @typedef {Object}  TDTStyleType - 天地图样式类型
 * @property {string} img - 卫星影像
 * @property {string} cia - 卫星影像标记
 * @property {string} vec - 矢量图
 * @property {string} cva - 矢量图标记
 * @property {string} ter - 地形图
 * @property {string} cta - 地形图标记
 */

/**
 * 基本构造方法base
 * @class
 * @param {object} params
 * @param {object} params.viewer - cesium 实例
 * @param {object} params.cesiumGlobal - cesium 全局对象
 * @param {Array} params.defaultStatic - 静态资源
 * @exports Base
 */
/**
 * 为每个实例创建独立闭包，避免模块级 Cesium/dfSt 及交互状态在多个 viewer 间共享。
 * 由 createScopedConstructor 在每次 new 时调用。
 */
export function createBaseModule() {
  let Cesium = {} as CesiumGlobal
  let dfSt: StaticResourceConf | undefined = undefined

class Base {
  _viewer!: CesiumViewer
  _drawLayer!: any
  /** 模块标识，如 'base' */
  type!: string
  /** 模块标识（与 {@link type} 相同） */
  id!: string
  /** @deprecated 拼写无意义，请使用 {@link type} / {@link id} */
  myname!: string
  /** 释放当前模块持有的监听器 / DataSource（幂等） */
  destroy!: () => void

  constructor(viewer?: any, cesiumGlobal?: CesiumGlobal, defaultStatic?: StaticResourceConf) {
  if (viewer) {
    /** @access private */
    this._viewer = viewer
    /** @access private */
    Cesium = cesiumGlobal as CesiumGlobal
    /** @access private */
    // 未显式传入时回退到库内置配置，避免图片地址变成相对路径后静默 404
    dfSt = defaultStatic || createDefaultStatic()
    /** @private */
    this._drawLayer = new Cesium.CustomDataSource('drawLayer')
    viewer && viewer.dataSources.add(this._drawLayer)
    // 捕获当前实例创建的数据源：prototypeExtends 的 Object.assign 可能覆盖 this._drawLayer
    const drawLayer = this._drawLayer
    attachDestroy(this)
    registerCleanup(this, () => {
      if (this._viewer && drawLayer) {
        this._viewer.dataSources.remove(drawLayer, true)
        if (this._drawLayer === drawLayer) this._drawLayer = undefined
      }
    })
    this.type = 'base'
    this.id = 'base'
    // 兼容旧字段
    this.myname = 'BASE'
    /** @private */
    this._installBaiduImageryProvider()
    /** @private */
    this._installGoogleImageryProvider()
    /** @private */
    this._installAmapImageryProvider()
    /** @private */
    this._installTencentImageryProvider()
    /** @private */
    this._installTdtImageryProvider()
    /** @private */
    this._installGroundSkyBox()
  }
}


  /**
   * 创建一个Graphics实体
   * @function
   * @returns {Entity} Entity
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   *  const entity = kit.base.createGraphics()
   */
  createGraphics() {
    return new Cesium.Entity()
  }
  /**
   * 判断对象是否有某个属性
   * @private
   * @param {object} obj 对象
   * @param {string} field  属性字段
   * @param {string} defVal  默认返回
   * @returns {string}
   */
  _objHasOwnProperty(obj: any, field: any, defVal: any) {
    return obj.hasOwnProperty(field) ? obj[field] : defVal
  }
  getDfSt(attrArr: string[]) {
    if (!dfSt) return undefined
    const conf = dfSt
    const res = attrArr.reduce((pre: any, curr: any) => {
      if (pre) {
        return pre[curr]
      } else {
        return (conf as Record<string, any>)[curr]
      }
    }, undefined)
    if (res === undefined || res === null) return undefined
    if (typeof res !== 'string') return res
    return joinStaticUrl(conf.baseService, res)
  }

  /**
   * 天空盒
   *  @function
   * @returns {SkyBox} SkyBox
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * kit.base.setOneSkyBox()
   */
  setOneSkyBox() {
    return new Cesium.SkyBox({
      sources: {
        positiveX:
          this.getDfSt(['skyBox', 'one', 'positiveX']) ||
          'static/data/images/SkyBox/00h+00.jpg',
        negativeX:
          this.getDfSt(['skyBox', 'one', 'negativeX']) ||
          'static/data/images/SkyBox/12h+00.jpg',
        positiveY:
          this.getDfSt(['skyBox', 'one', 'positiveY']) ||
          'static/data/images/SkyBox/06h+00.jpg',
        negativeY:
          this.getDfSt(['skyBox', 'one', 'negativeY']) ||
          'static/data/images/SkyBox/18h+00.jpg',
        positiveZ:
          this.getDfSt(['skyBox', 'one', 'positiveZ']) ||
          'static/data/images/SkyBox/06h+90.jpg',
        negativeZ:
          this.getDfSt(['skyBox', 'one', 'negativeZ']) ||
          'static/data/images/SkyBox/06h-90.jpg'
      }
    })
  }

  /**
   * 天空盒2
   *  @function
   * @returns {SkyBox} SkyBox
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * kit.base.setTwoSkyBox()
   */
  setTwoSkyBox() {
    return new Cesium.SkyBox({
      sources: {
        positiveX:
          this.getDfSt(['skyBox', 'two', 'negativeZ']) ||
          'static/data/images/SkyBox/Version2_dark_px.jpg',
        negativeX:
          this.getDfSt(['skyBox', 'two', 'negativeX']) ||
          'static/data/images/SkyBox/Version2_dark_mx.jpg',
        positiveY:
          this.getDfSt(['skyBox', 'two', 'positiveY']) ||
          'static/data/images/SkyBox/Version2_dark_py.jpg',
        negativeY:
          this.getDfSt(['skyBox', 'two', 'negativeY']) ||
          'static/data/images/SkyBox/Version2_dark_my.jpg',
        positiveZ:
          this.getDfSt(['skyBox', 'two', 'positiveZ']) ||
          'static/data/images/SkyBox/Version2_dark_pz.jpg',
        negativeZ:
          this.getDfSt(['skyBox', 'two', 'negativeZ']) ||
          'static/data/images/SkyBox/Version2_dark_mz.jpg'
      }
    })
  }
  /**
   * 天空盒3
   *  @function
   * @returns {SkyBox} SkyBox
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * kit.base.setThreeSkyBox()
   */
  setThreeSkyBox() {
    return new Cesium.SkyBox({
      sources: {
        positiveX:
          this.getDfSt(['skyBox', 'three', 'negativeZ']) ||
          'static/data/images/SkyBox/tycho2t3_80_pxs.jpg',
        negativeX:
          this.getDfSt(['skyBox', 'three', 'negativeX']) ||
          'static/data/images/SkyBox/tycho2t3_80_mxs.jpg',
        positiveY:
          this.getDfSt(['skyBox', 'three', 'positiveY']) ||
          'static/data/images/SkyBox/tycho2t3_80_pys.jpg',
        negativeY:
          this.getDfSt(['skyBox', 'three', 'negativeY']) ||
          'static/data/images/SkyBox/tycho2t3_80_mys.jpg',
        positiveZ:
          this.getDfSt(['skyBox', 'three', 'positiveZ']) ||
          'static/data/images/SkyBox/tycho2t3_80_pzs.jpg',
        negativeZ:
          this.getDfSt(['skyBox', 'three', 'negativeZ']) ||
          'static/data/images/SkyBox/tycho2t3_80_mzs.jpg'
      }
    })
  }
  /**
   * 近景天空盒
   *  @function
   * @returns {GroundSkyBox} SkyBox
   * @see {@link module:Base#SkyBoxOnGround|SkyBoxOnGround}
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * kit.base.setOneGroundSkyBox()
   */
  setOneGroundSkyBox() {
    return new Cesium.Scene.GroundSkyBox({
      sources: {
        positiveX:
          this.getDfSt(['skyBox', 'nearOne', 'positiveX']) ||
          'static/data/images/SkyBox/rightav9.jpg',
        negativeX:
          this.getDfSt(['skyBox', 'nearOne', 'negativeX']) ||
          'static/data/images/SkyBox/leftav9.jpg',
        positiveY:
          this.getDfSt(['skyBox', 'nearOne', 'positiveY']) ||
          'static/data/images/SkyBox/frontav9.jpg',
        negativeY:
          this.getDfSt(['skyBox', 'nearOne', 'negativeY']) ||
          'static/data/images/SkyBox/backav9.jpg',
        positiveZ:
          this.getDfSt(['skyBox', 'nearOne', 'positiveZ']) ||
          'static/data/images/SkyBox/topav9.jpg',
        negativeZ:
          this.getDfSt(['skyBox', 'nearOne', 'negativeZ']) ||
          'static/data/images/SkyBox/bottomav9.jpg'
      }
    })
  }
  /**
   * 近景天空盒2
   *  @function
   * @returns {GroundSkyBox} SkyBox
   * @see {@link module:Base#SkyBoxOnGround|SkyBoxOnGround}
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * kit.base.setTwoGroundSkyBox()
   */
  setTwoGroundSkyBox() {
    return new Cesium.Scene.GroundSkyBox({
      sources: {
        positiveX:
          this.getDfSt(['skyBox', 'nearTwo', 'positiveX']) ||
          'static/data/images/SkyBox/SunSetRight.png',
        negativeX:
          this.getDfSt(['skyBox', 'nearTwo', 'negativeX']) ||
          'static/data/images/SkyBox/SunSetLeft.png',
        positiveY:
          this.getDfSt(['skyBox', 'nearTwo', 'positiveY']) ||
          'static/data/images/SkyBox/SunSetFront.png',
        negativeY:
          this.getDfSt(['skyBox', 'nearTwo', 'negativeY']) ||
          'static/data/images/SkyBox/SunSetBack.png',
        positiveZ:
          this.getDfSt(['skyBox', 'nearTwo', 'positiveZ']) ||
          'static/data/images/SkyBox/SunSetUp.png',
        negativeZ:
          this.getDfSt(['skyBox', 'nearTwo', 'negativeZ']) ||
          'static/data/images/SkyBox/SunSetDown.png'
      }
    })
  }
  /**
   * 近景天空盒3
   * @function
   * @returns {GroundSkyBox} SkyBox
   * @see {@link module:Base#SkyBoxOnGround|SkyBoxOnGround}
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * kit.base.setThreeGroundSkyBox()
   */
  setThreeGroundSkyBox() {
    return new Cesium.Scene.GroundSkyBox({
      sources: {
        positiveX:
          this.getDfSt(['skyBox', 'nearThree', 'positiveX']) ||
          'static/data/images/SkyBox/Right.jpg',
        negativeX:
          this.getDfSt(['skyBox', 'nearThree', 'negativeX']) ||
          'static/data/images/SkyBox/Left.jpg',
        positiveY:
          this.getDfSt(['skyBox', 'nearThree', 'positiveY']) ||
          'static/data/images/SkyBox/Front.jpg',
        negativeY:
          this.getDfSt(['skyBox', 'nearThree', 'negativeY']) ||
          'static/data/images/SkyBox/Back.jpg',
        positiveZ:
          this.getDfSt(['skyBox', 'nearThree', 'positiveZ']) ||
          'static/data/images/SkyBox/Up.jpg',
        negativeZ:
          this.getDfSt(['skyBox', 'nearThree', 'negativeZ']) ||
          'static/data/images/SkyBox/Down.jpg'
      }
    })
  }
  /**
   * 黑夜特效
   * @function
   * @param {object} options
   * @param {Cartesian3} options.offset - 偏移
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * kit.base.setDarkEffect({offset:new Cesium.Cartesian3(0.1, 0.2, 0.3)})
   * @returns {postProcessStages} postProcessStages 实例
   */
  setDarkEffect(options?: DarkEffectOptions) {
    options = options || {}
    var fs =
      'uniform sampler2D colorTexture;\n' +
      'in vec2 v_textureCoordinates;\n' +
      'uniform float scale;\n' +
      'uniform vec3 offset;\n' +
      'void main() {\n' +
      ' vec4 color = texture(colorTexture, v_textureCoordinates);\n' +
      ' out_FragColor = vec4(color.r*0.2,color.g * 0.4,color.b*0.6, 1.0);\n' +
      '}\n'
    return this._viewer.scene.postProcessStages.add(
      new Cesium.PostProcessStage({
        name: 'darkEffect',
        fragmentShader: fs,
        uniforms: {
          scale: 1.0,
          offset() {
            return options.offset || new Cesium.Cartesian3(0.1, 0.2, 0.3)
          }
        }
      })
    )
  }
  /**
   * 场景蓝光
   * @function
   * @param {object} options
   * @param {number} options.width - 曝光区域宽度
   * @param {number} options.height - 曝光区域高度
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * kit.base.setBlurBloom({width:80,height:97})
   * @returns {postProcessStages} postProcessStages 实例
   */
  setBlurBloom(options?: BlurBloomOptions) {
    if (this._viewer && options) {
      var fs =
        'uniform float height;\n' +
        'uniform float width;\n' +
        'uniform sampler2D colorTexture1;\n' +
        '\n' +
        'in vec2 v_textureCoordinates;\n' +
        '\n' +
        'const int SAMPLES = 9;\n' +
        'void main()\n' +
        '{\n' +
        'vec2 st = v_textureCoordinates;\n' +
        'float wr = float(1.0 / width);\n' +
        'float hr = float(1.0 / height);\n' +
        'vec4 result = vec4(0.0);\n' +
        'int count = 0;\n' +
        'for(int i = -SAMPLES; i <= SAMPLES; ++i){\n' +
        'for(int j = -SAMPLES; j <= SAMPLES; ++j){\n' +
        'vec2 offset = vec2(float(i) * wr, float(j) * hr);\n' +
        'result += texture(colorTexture1, st + offset);\n' +
        '}\n' +
        '}\n' +
        'result = result / float(count);\n' +
        'out_FragColor = result;\n' +
        '}\n'

      return this._viewer.scene.postProcessStages.add(
        new Cesium.PostProcessStage({
          name: 'blur_x_direction',
          fragmentShader: fs,
          uniforms: {
            width: options.width,
            height: options.height,
            colorTexture1: 'Bright'
          }
        })
      )
    }
  }

  /**
   * 雨天特效
   * @function
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * kit.base.setRainEffect()
   * @returns {postProcessStages} postProcessStages 实例
   */
  setRainEffect() {
    if (this._viewer) {
      var fs =
        'uniform sampler2D colorTexture;\n\
                  in vec2 v_textureCoordinates;\n\
                  \n\
                  float hash(float x){\n\
                  return fract(sin(x*23.3)*13.13);\n\
                  }\n\
                  \n\
                  void main(){\n\
                      float time = czm_frameNumber / 60.0;\n\
                      vec2 resolution = czm_viewport.zw;\n\
                      vec2 uv=(gl_FragCoord.xy*2.-resolution.xy)/min(resolution.x,resolution.y);\n\
                      vec3 c=vec3(.6,.7,.8);\n\
                      float a=-.4;\n\
                      float si=sin(a),co=cos(a);\n\
                      uv*=mat2(co,-si,si,co);\n\
                      uv*=length(uv+vec2(0,4.9))*.3+1.;\n\
                      float v=1.-sin(hash(floor(uv.x*100.))*2.);\n\
                      float b=clamp(abs(sin(20.*time*v+uv.y*(5./(2.+v))))-.95,0.,1.)*20.;\n\
                      c*=v*b;\n\
                      out_FragColor = mix(texture(colorTexture, v_textureCoordinates), vec4(c, 1), 0.2);\n\
                  }\n\
                  '
      return this._viewer.scene.postProcessStages.add(
        new Cesium.PostProcessStage({
          name: 'rainEffect',
          fragmentShader: fs
        })
      )
    }
  }
  /**
   * 雪天特效
   * @function
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * kit.base.setSnowEffect()
   * @returns {postProcessStages} postProcessStages 实例
   */
  setSnowEffect() {
    if (this._viewer) {
      var fs =
        'uniform sampler2D colorTexture;\n\
                      in vec2 v_textureCoordinates;\n\
                      float snow(vec2 uv,float scale){\n\
                          float time = czm_frameNumber / 60.0;\n\
                          float w=smoothstep(1.,0.,-uv.y*(scale/10.));\n\
                          if(w<.1)return 0.;\n\
                          uv+=time/scale;\n\
                          uv.y+=time*2./scale;\n\
                          uv.x+=sin(uv.y+time*.5)/scale;\n\
                          uv*=scale;\n\
                          vec2 s=floor(uv),f=fract(uv),p;\n\
                          float k=3.,d;\n\
                          p=.5+.35*sin(11.*fract(sin((s+p+scale)*mat2(7,3,6,5))*5.))-f;\n\
                          d=length(p);\n\
                          k=min(d,k);\n\
                          k=smoothstep(0.,k,sin(f.x+f.y)*0.01);\n\
                          return k*w;\n\
                      }\n\
                      \n\
                      void main(){\n\
                          vec2 resolution = czm_viewport.zw;\n\
                          vec2 uv=(gl_FragCoord.xy*2.-resolution.xy)/min(resolution.x,resolution.y);\n\
                          vec3 finalColor=vec3(0);\n\
                          float c = 0.0;\n\
                          c+=snow(uv,30.)*.0;\n\
                          c+=snow(uv,20.)*.0;\n\
                          c+=snow(uv,15.)*.0;\n\
                          c+=snow(uv,10.);\n\
                          c+=snow(uv,8.);\n\
                          c+=snow(uv,6.);\n\
                          c+=snow(uv,5.);\n\
                          finalColor=(vec3(c));\n\
                          out_FragColor = mix(texture(colorTexture, v_textureCoordinates), vec4(finalColor,1), 0.3);\n\
                          \n\
                      }\n\
                      '
      return this._viewer.scene.postProcessStages.add(
        new Cesium.PostProcessStage({
          name: 'snowEffect',
          fragmentShader: fs
        })
      )
    }
  }
  /**
   *  雾天
   * @function
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * kit.base.setFogEffect()
   * @returns {postProcessStages} postProcessStages 实例
   */
  setFogEffect() {
    if (this._viewer) {
      var fs =
        'float getDistance(sampler2D depthTexture, vec2 texCoords) \n' +
        '{ \n' +
        '    float depth = czm_unpackDepth(texture(depthTexture, texCoords)); \n' +
        '    if (depth == 0.0) { \n' +
        '        return czm_infinity; \n' +
        '    } \n' +
        '    vec4 eyeCoordinate = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth); \n' +
        '    return -eyeCoordinate.z / eyeCoordinate.w; \n' +
        '} \n' +
        'float interpolateByDistance(vec4 nearFarScalar, float distance) \n' +
        '{ \n' +
        '    float startDistance = nearFarScalar.x; \n' +
        '    float startValue = nearFarScalar.y; \n' +
        '    float endDistance = nearFarScalar.z; \n' +
        '    float endValue = nearFarScalar.w; \n' +
        '    float t = clamp((distance - startDistance) / (endDistance - startDistance), 0.0, 1.0); \n' +
        '    return mix(startValue, endValue, t); \n' +
        '} \n' +
        'vec4 alphaBlend(vec4 sourceColor, vec4 destinationColor) \n' +
        '{ \n' +
        '    return sourceColor * vec4(sourceColor.aaa, 1.0) + destinationColor * (1.0 - sourceColor.a); \n' +
        '} \n' +
        'uniform sampler2D colorTexture; \n' +
        'uniform sampler2D depthTexture; \n' +
        'uniform vec4 fogByDistance; \n' +
        'uniform vec4 fogColor; \n' +
        'in vec2 v_textureCoordinates; \n' +
        'void main(void) \n' +
        '{ \n' +
        '    float distance = getDistance(depthTexture, v_textureCoordinates); \n' +
        '    vec4 sceneColor = texture(colorTexture, v_textureCoordinates); \n' +
        '    float blendAmount = interpolateByDistance(fogByDistance, distance); \n' +
        '    vec4 finalFogColor = vec4(fogColor.rgb, fogColor.a * blendAmount); \n' +
        '    out_FragColor = alphaBlend(finalFogColor, sceneColor); \n' +
        '} \n'

      return this._viewer.scene.postProcessStages.add(
        new Cesium.PostProcessStage({
          fragmentShader: fs,
          uniforms: {
            fogByDistance: new Cesium.Cartesian4(10, 0.0, 200, 0.3),
            fogColor: Cesium.Color.AZURE
          }
        })
      )
    }
  }
  /**
   * 默认场景配置
   * @function
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * kit.base.setDefSceneConfig()
   */
  setDefSceneConfig() {
    if (this._viewer) {
      const scene = this._viewer.scene as ViewerScene
      const terrainProvider = scene.terrainProvider as typeof scene.terrainProvider & {
        /** 关闭地形裙边（部分 Cesium 版本私有字段） */
        isCreateSkirt?: boolean
      }
      scene.sun.show = false
      scene.moon.show = false
      scene.fxaa = true
      scene.globe.depthTestAgainstTerrain = true
      scene.undergroundMode = false
      terrainProvider.isCreateSkirt = false
      scene.skyAtmosphere.show = false
      scene.globe.showGroundAtmosphere = false
      scene.globe.enableLighting = true
      scene.fog.enabled = false
      ;(this._viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none'
    }
  }
  /**
   * 场景泛光
   * @function
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * kit.base.setBloomLightScene()
   */
  setBloomLightScene() {
    if (this._viewer) {
      this._viewer.scene.postProcessStages.bloom.enabled = true
      this._viewer.scene.postProcessStages.bloom.uniforms.contrast = 119
      this._viewer.scene.postProcessStages.bloom.uniforms.brightness = -0.4
      this._viewer.scene.postProcessStages.bloom.uniforms.glowOnly = false
      this._viewer.scene.postProcessStages.bloom.uniforms.delta = 0.9
      this._viewer.scene.postProcessStages.bloom.uniforms.sigma = 3.78
      this._viewer.scene.postProcessStages.bloom.uniforms.stepSize = 5
      this._viewer.scene.postProcessStages.bloom.uniforms.isSelected = false
    }
  }
  /**
   * 删除后置效果
   * @function
   * @param {Array} stage -后置场景对象数组
   */
  removePostProcessStage(stage?: PostProcessStage | PostProcessStage[]) {
    if (stage) {
      if (Array.isArray(stage)) {
        stage.forEach((e: any) => {
          if (this._viewer.scene.postProcessStages.contains(e)) {
            this._viewer.scene.postProcessStages.remove(e)
          }
        })
      } else {
        if (this._viewer.scene.postProcessStages.contains(stage)) {
          this._viewer.scene.postProcessStages.remove(stage)
        }
      }
    }
  }
  /**
   * 相机定位
   * @function
   * @param {object} options
   * @param {Cartesian3} options.position - 目标位置数组
   * @param {number} options.distance - 距离
   * @param {object} options.orientation - 方位，包含[朝向|倾斜角|翻滚角]
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * kit.base.setView({
      position: new Cesium.Cartesian3(-1337035.7496454942, 5285202.940044943, 3305373.990594733),
      orientation: {
        heading: 6.108097731064569,
        pitch: -0.15254104473396812,
        roll: 6.283157460498558,
      },
    });
   */
  setView(options?: CameraSetOptions) {
    if (this._viewer && options && options.position) {
      if (options.distance) {
        //距离

        var pos1 = new Cesium.Cartesian3(
          0,
          options.distance,
          (window as any).opt.distance
        )
        options.position = Cesium.Cartesian3.add(
          options.position,
          pos1,
          new Cesium.Cartesian3()
        )
      }
      this._viewer.scene.camera.setView({
        destination: options.position,
        orientation: options.orientation || {
          heading: Cesium.Math.toRadians(90.0),
          pitch: Cesium.Math.toRadians(90.0),
          roll: Cesium.Math.toRadians(0.0)
        }
      })
    }
  }
  /**
   * 相机飞行
   * @param {object} options
   * @param {Cartesian3} options.position - 目标位置数组
   * @param {number} options.distance - 距离
   * @param {number} options.duration - 过度时长(秒为单位)
   * @param {object} options.orientation - 方位，包含[朝向|倾斜角|翻滚角]
   * @param {object} options.easingFunction - 飞行中在duration时间内插值方式
   * @param {Function} options.callback - 操作完成后的回调
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * kit.base.flyTo({
        position: { x: -1337132.0092982147, y: 5330611.474631115, z: 3228680.029449292 },
        orientation: {
          heading: Cesium.Math.toRadians(1.0114629015290062),
          pitch: Cesium.Math.toRadians(-23.53661660731824),
          roll: Cesium.Math.toRadians(0.00324596311071617)
        },,
        distance：300,
        duration:3
      })
   */
  flyTo(options?: CameraSetOptions) {
    if (this._viewer && options && options.position) {
      if (options.distance) {
        //距离
        var pos1 = new Cesium.Cartesian3(0, options.distance, 0)
        options.position = Cesium.Cartesian3.add(
          options.position,
          pos1,
          new Cesium.Cartesian3()
        )
      }
      this._viewer.scene.camera.flyTo({
        destination: options.position,
        orientation: options.orientation || {
          heading: Cesium.Math.toRadians(90.0),
          pitch: Cesium.Math.toRadians(90.0),
          roll: Cesium.Math.toRadians(0.0)
        },
        // pitchAdjustHeight: 500,
        easingFunction:
          options.easingFunction || Cesium.EasingFunction.LINEAR_NONE,
        duration: options.duration || 3,
        complete: options.callback
      })
    }
  }

  /**
   *笛卡尔转坐标WGS84
   * @param {Cartesian3} cartesian -  笛卡尔积坐标数组
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * kit.base.transformCartesianToWGS84(Cesium.Cartesian3.fromDegrees(110.16018735617934, 31.036076859828338))
   * @returns {WGS84Type}  转换后wgs84坐标对象
   *
   */
  transformCartesianToWGS84(cartesian?: Cartesian3 | WGS84Type) {
    if (this._viewer && cartesian) {
      const input = cartesian as any
      // 已经是 WGS84 写法时直接返回，保证本方法可重复调用（幂等）
      if (input.x === undefined && (input.lng !== undefined || input.lon !== undefined)) {
        return {
          lng: Number(input.lng ?? input.lon),
          lat: Number(input.lat),
          alt: Number(input.alt ?? input.height ?? 0),
        }
      }
      // 从笛卡尔坐标获取经纬度
      const cartographicEntity = Cesium.Cartographic.fromCartesian(cartesian as Cartesian3);
     return  {
        lng: Cesium.Math.toDegrees(cartographicEntity.longitude),
        lat: Cesium.Math.toDegrees(cartographicEntity.latitude),
        alt: cartographicEntity.height,
      };
    }
  }
  /**
   * 坐标数组转换 笛卡尔转84
   * @function
   * @param {Array<WGS84Type>} WSG84Arr  -WSG84Arr坐标数组
   * @param {number} alt - z轴高层
   * @see {@link module:Base#transformWGS84ToCartesian|transformWGS84ToCartesian}
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * kit.base.transformWGS84ArrayToCartesianArray([{lng:110.16018735617934, lat:31.036076859828338, alt:0 }])
   * @returns {Array<Cartesian3>} 转换后的笛卡尔积数组
   */
  transformWGS84ArrayToCartesianArray(WSG84Arr: WGS84Type[], alt?: number) {
    if (this._viewer && WSG84Arr) {
      var $this = this
      return WSG84Arr
        ? WSG84Arr.map(function (item: any) {
            return $this.transformWGS84ToCartesian(item, alt)
          })
        : []
    }
  }
  /**
   * 坐标转换 84转笛卡尔
   * @function
   * @param {WGS84Type} position  坐标数组
   * @param {number} position.lng  - 经度
   * @param {number} position.lon  - 纬度
   * @param {number} position.lat  - z轴
   * @param {number} alt - 高层
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * kit.base.transformWGS84ToCartesian({lng:110.16018735617934, lat:31.036076859828338, alt:0 },30)
   * @returns {Cartesian3} 转换后的笛卡尔积数组
   */
  transformWGS84ToCartesian(position?: WGS84Type, alt?: number) {
    if (this._viewer) {
      return position
        ? Cesium.Cartesian3.fromDegrees(
            (position.lng ?? position.lon)!,
            position.lat,
            (position.alt = alt || position.alt),
            Cesium.Ellipsoid.WGS84
          )
        : Cesium.Cartesian3.ZERO
    }
  }
  /**
   * 笛卡尔积坐标数组转换 84地理坐标
   * @param {Array<Cartesian3>} cartesianArr
   * @see {@link module:Base#transformCartesianToWGS84|transformCartesianToWGS84}
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * kit.base.transformCartesianArrayToWGS84Array(Cesium.Cartesian3.fromDegreesArray( 110.16018735617934, 31.036076859828338, 110.17845812703679,31.033686527335444))
   * @returns {Array<WGS84Type>} 转换后的笛卡尔积数组
   */
  transformCartesianArrayToWGS84Array(cartesianArr: Cartesian3[]) {
    if (this._viewer) {
      var $this = this
      if (!cartesianArr) return []
      // 过滤掉无法转换的坐标，避免回调里拿到 undefined 再按 .lng 读取时报错
      return cartesianArr
        .map(function (item: any) {
          return $this.transformCartesianToWGS84(item)
        })
        .filter(function (item: any) {
          return !!item
        })
    }
  }
    /**
   * wgs84坐标转地图坐标
   * @param {object<WGS84Type>} position
   * @param {number} position.lng  - 经度
   * @param {number} position.lon  - 经度
   * @param {number} position.lat  - 纬度
   * @param {number} position.alt  - z轴
   * @see {@link module:Base#transformCartesianToWGS84|transformCartesianToWGS84}
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * const wgs84 =  kit.base.transformCartesianToWGS84(Cesium.Cartesian3.fromDegrees(110.16018735617934, 31.036076859828338));
   * const cartographic = kit.base.transformWGS84ToCartographic(wgs84)
   * // or
   * const cartographic2 = kit.base.transformWGS84ToCartographic({lng:110.16018735617934, lat:31.036076859828338, alt:0 });
   * @returns {CartographicType} 地理坐标
   *
   */
    transformWGS84ToCartographic(position: WGS84Type) {
      return position
        ? Cesium.Cartographic.fromDegrees(
            (position.lng ?? position.lon)!,
            position.lat,
            position.alt
          )
        : Cesium.Cartographic.ZERO
    }
    /**
   * 经纬度坐标数组转笛卡尔积世界坐标数组
   * @param {Array[]} lnglats - 经纬度坐标数组
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
    *     Cesium,
    *     containerId: 'cesiumContainer'
    * })
    * kit.base.lnglatArrayToCartesians([[117,40],[118.41]])
   * @returns {Cartesian3[]} cartesians -  笛卡尔积世界坐标数组
   */
  lnglatArrayToCartesians(lnglats: number[][]) {
    if (!lnglats || lnglats.length < 1) return [];
    let cartArr: any[] = [];
  
    for (let i = 0; i < lnglats.length; i++) {
      let cartesian3Obj = Cesium.Cartesian3.fromDegrees(Number(lnglats[i][0]), Number(lnglats[i][1]), Number(lnglats[i][2] || 0));
      cartArr.push(cartesian3Obj);
    }
  
    return cartArr;
  }
  /**
   * 相机绕点旋转
   * @function
   * @param {object} options
   * @param {number} options.lng - 经度
   * @param {number} options.lat - 纬度
   * @param {number} options.height - z轴高度
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const kit = createKit({
   *    Cesium,
        containerId: 'cesiumContainer'
      })
   * kit.base.setCameraEotateHeading({
                lng: 117.1423291616,
                lat: 39.0645831633,
                height: 15.8
            })
   */
  setCameraEotateHeading(options: CameraRotateHeadingOptions) {
    if (options) {
      let viewer = this._viewer
      let position = Cesium.Cartesian3.fromDegrees(
        options.lng,
        options.lat,
        options.height
      )
      // 相机看点的角度，如果大于0那么则是从地底往上看，所以要为负值，这里取-30度
      let pitch = Cesium.Math.toRadians(-30)
      // 给定飞行一周所需时间，比如10s, 那么每秒转动度数
      let angle = 360 / 30
      // 给定相机距离点多少距离飞行，这里取值为5000m
      let distance = 5000
      let startTime = Cesium.JulianDate.fromDate(new Date())
      viewer.clock.startTime = startTime.clone() // 开始时间
      viewer.clock.currentTime = startTime.clone() // 当前时间
      viewer.clock.clockRange = Cesium.ClockRange.CLAMPED // 行为方式
      viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK // 时钟设置为当前系统时间; 忽略所有其他设置。
      //相机的当前heading
      let initialHeading = viewer.camera.heading
      let Exection = function TimeExecution() {
        // 当前已经过去的时间，单位s
        let delTime = Cesium.JulianDate.secondsDifference(
          viewer.clock.currentTime,
          viewer.clock.startTime
        )
        let heading = Cesium.Math.toRadians(delTime * angle) + initialHeading
        viewer.scene.camera.setView({
          destination: position, // 点的坐标
          orientation: {
            heading: heading,
            pitch: pitch
          }
        })
        viewer.scene.camera.moveBackward(distance)

        if (
          Cesium.JulianDate.compare(
            viewer.clock.currentTime,
            viewer.clock.stopTime
          ) >= 0
        ) {
          viewer.clock.onTick.removeEventListener(Exection)
        }
      }
      viewer.clock.onTick.addEventListener(Exection)
      registerCleanup(this, () => {
        viewer.clock.onTick.removeEventListener(Exection)
      })
    }
  }
  /**
   * 拾取位置点
   * @param {Cartesian2} px - 屏幕二维坐标
   * @see {@link module:Base#transformWGS84ToCartesian|transformWGS84ToCartesian}
   * @see {@link module:Base#transformCartesianToWGS84|transformCartesianToWGS84}
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const { viewer, base } = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   *  const _handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
   * _handler.setInputAction(function (movement: any) {
        var cartesian = base.getCatesian3FromPX(movement.endPosition);
         console.log(cartesian)
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
   * @returns  {boolean|Cartesian3}
   */
  getCatesian3FromPX(px: Cartesian2) {
    if (this._viewer && px) {
      var picks = this._viewer.scene.pick(px)
      var cartesian = null
      var isOn3dtiles = false,
        isOnTerrain = false
      if (picks instanceof Cesium.Cesium3DTileFeature) {
        //模型上拾取
        isOn3dtiles = true
      }
      // 3dtilset
      if (isOn3dtiles) {
        cartesian = this._viewer.scene.pickPosition(px)
        if (cartesian) {
          let cartographic = Cesium.Cartographic.fromCartesian(cartesian)
          if (cartographic.height < 0) cartographic.height = 0
          let lon = Cesium.Math.toDegrees(cartographic.longitude),
            lat = Cesium.Math.toDegrees(cartographic.latitude),
            height = cartographic.height //模型高度
          cartesian = this.transformWGS84ToCartesian({
            lng: lon,
            lat: lat,
            alt: height
          })
        }
      }
      // 地形
      if (!picks) {
        var ray = this._viewer.scene.camera.getPickRay(px)
        if (!ray) return null
        cartesian = this._viewer.scene.globe.pick(ray, this._viewer.scene)
        isOnTerrain = true
      }
      // 如果拾取到了物体，但不是模型
      if (picks&&!isOn3dtiles) {
        cartesian = this._viewer.scene.pickPosition(px)
        if (cartesian) {
          let cartographic = Cesium.Cartographic.fromCartesian(cartesian)
          if (cartographic.height < 0) cartographic.height = 0
          let lon = Cesium.Math.toDegrees(cartographic.longitude),
            lat = Cesium.Math.toDegrees(cartographic.latitude),
            height = cartographic.height //模型高度
          cartesian = this.transformWGS84ToCartesian({
            lng: lon,
            lat: lat,
            alt: height
          })
        }
      }
      // 地球
      if (!isOn3dtiles && !isOnTerrain&&!picks) {
        
        cartesian = this._viewer.scene.camera.pickEllipsoid(
          px,
          this._viewer.scene.globe.ellipsoid
        )
      }
      if (cartesian) {
        let position = this.transformCartesianToWGS84(cartesian)
        if (position!.alt < 0) {
          cartesian = this.transformWGS84ToCartesian(position, 0.1)
        }
        return cartesian
      }
      return false
    }
  }

  /**
   * 获取相机位置
   * @function
   * @returns {cameraPosType} 相机位置信息
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const { base } = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   *
   *   base.bindHandleEvent({
   *      leftClick: function click (event, _handlers) {
   *        const pos = base.getCameraPosition();
   *        console.log(pos);
   *      }
   *     })
   */
  getCameraPosition() {
    if (this._viewer) {
      var result = this._viewer.scene.camera.pickEllipsoid(
        new Cesium.Cartesian2(
          this._viewer.canvas.clientWidth / 2,
          this._viewer.canvas.clientHeight / 2
        )
      )
      if (result) {
        var curPosition = Cesium.Ellipsoid.WGS84.cartesianToCartographic(
            result
          ),
          lon = (curPosition.longitude * 180) / Math.PI,
          lat = (curPosition.latitude * 180) / Math.PI

        var direction = (this._viewer.camera as ViewerCamera)._direction,
          x = Cesium.Math.toDegrees(direction.x),
          y = Cesium.Math.toDegrees(direction.y),
          z = Cesium.Math.toDegrees(direction.z),
          height = this._viewer.camera.positionCartographic.height,
          heading = Cesium.Math.toDegrees(this._viewer.camera.heading),
          pitch = Cesium.Math.toDegrees(this._viewer.camera.pitch),
          roll = Cesium.Math.toDegrees(this._viewer.camera.roll)

        // 相机看向太空时无法计算视图范围
        var rectangle = this._viewer.camera.computeViewRectangle()
        if (!rectangle) return undefined
        var west = (rectangle.west / Math.PI) * 180,
          north = (rectangle.north / Math.PI) * 180,
          east = (rectangle.east / Math.PI) * 180,
          south = (rectangle.south / Math.PI) * 180,
          centerx = (west + east) / 2,
          cnetery = (north + south) / 2

        return {
          lon: lon,
          lat: lat,
          height: height,
          heading: heading,
          pitch: pitch,
          roll: roll,
          position: this._viewer.camera.position,
          cameraHeading: this._viewer.camera.heading,
          cameraPitch: this._viewer.camera.pitch,
          cameraRoll: this._viewer.camera.roll,
          center: {
            x: centerx,
            y: cnetery
          },
          direction: new Cesium.Cartesian3(x, y, z)
        }
      }
    }
  }
  /**
   * 通过点击屏幕Cartesian2二维坐标，获取鼠标点击后的xy值；
   * 根据xy判断当前目标对象是3dtiles、地形、模型、地球等通过不同方式获取对应位置信息
   * @function
   * @param {Cesium.Event} e - 监听的事件对象
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const { base } = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   *
   *   base.bindHandleEvent({
   *      leftClick: function click (event, _handlers) {
   *        const cartesian3 = base.pickUpPosition(event);
   *        console.log(cartesian3);
   *      }
   *     })
   * @returns {boolean|Cartesian3}
   */
  pickUpPosition(e: ScreenSpaceEventMovement) {
    const cartesian3 = this.getCatesian3FromPX(e.position);
    return cartesian3;
  }
  /**
   * 获取鼠标点击后的位置信息
   * @function
   * @param {Cesium.Event} e - 监听的事件对象
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const { base } = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   *
   *   base.bindHandleEvent({
   *      leftClick: function click (event, _handlers) {
   *        const { wgs84Coor, graphicCoor, cameraPosition } = base.getHandlerClickPosition(event);
   *        console.log(wgs84Coor, graphicCoor, cameraPosition);
   *      }
   *     })
   * @returns {clickPositionType}
   */
  getHandlerClickPosition(e: ScreenSpaceEventMovement) {
    if (this._viewer) {
      let scene = this._viewer.scene
      let viewer = this._viewer
      let pickPositionElliposid = scene.camera.pickEllipsoid(e.position, scene.globe.ellipsoid);
      // 点击到地球外（太空/天空盒）时无法得到交点
      if (!pickPositionElliposid) return undefined
      let cameraPosition = {
        cameraPosistion: viewer.camera.position,
        heading: viewer.camera.heading,
        pitch: viewer.camera.pitch,
        roll: viewer.camera.roll
      };


      // 将迪卡转换为地理坐标
      let cartographic = Cesium.Cartographic.fromCartesian(
        pickPositionElliposid
      )
      if (cartographic.height < 0) cartographic.height = 0
      let wgs84Coor = {
        alt: cartographic.height,
        lat: Cesium.Math.toDegrees(cartographic.latitude),
        lon: Cesium.Math.toDegrees(cartographic.longitude)
      }

      let pickPosition = scene.pickPosition(e.position)
      //从笛卡尔坐标获取经纬度
      let cartographicEntity = Cesium.Cartographic.fromCartesian(pickPosition)
      let graphicCoor = {
        height: cartographicEntity.height,
        latitude: Cesium.Math.toDegrees(cartographicEntity.latitude),
        longitude: Cesium.Math.toDegrees(cartographicEntity.longitude)
      }
      return { wgs84Coor, graphicCoor, cameraPosition }
    }
  }
  //修改相机状态
  updateCameraState(flag: boolean) {
    const controller = this._viewer.scene.screenSpaceCameraController
    controller.enableRotate = flag
    controller.enableTranslate = flag
    controller.enableZoom = flag
    controller.enableTilt = flag
    controller.enableLook = flag
  }

  /**
   * 鼠标事件注册
   * @function
   * @param {object} options
   * @param {Function} options.leftClick - 左键点击，回调签名 `(event, handlers)`
   * @param {Function} options.mouseMove - 鼠标移动
   * @param {Function} options.doubleClick - 左键双击
   * @param {Function} options.leftDown - 左键按下
   * @param {Function} options.mouseWheel - 鼠标滚动
   * @param {Function} options.leftUp - 左键弹起
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const { base } = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   *  base.bindHandleEvent({
        leftClick: function click(event, _handlers) {
             todo something...
        },
        mouseMove: function move(event) {
          todo something...
        },
      });
   */
  bindHandleEvent({
    leftClick: _mouseLeftClickHandler,
    mouseMove: _mouseMoveHandler,
    doubleClick: _mouseDbClickHandler,
    leftDown: _mouseLeftDownHandler,
    mouseWheel: _mouseWheelHandler,
    leftUp: _mouseLeftUpHandler
  }: BindHandleEventOptions = {}) {
    if (this._viewer) {
      var _handlers = new Cesium.ScreenSpaceEventHandler(this._viewer.canvas)
      registerCleanup(this, () => {
        if (_handlers && !_handlers.isDestroyed()) _handlers.destroy()
      })
      _mouseLeftClickHandler &&
        _handlers.setInputAction(function (movement: any) {
          _mouseLeftClickHandler(movement, _handlers)
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

      _mouseMoveHandler &&
        _handlers.setInputAction(function (movement: any) {
          _mouseMoveHandler(movement, _handlers)
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

      _mouseDbClickHandler &&
        _handlers.setInputAction(function (movement: any) {
          _mouseDbClickHandler(movement, _handlers)
        }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)

      _mouseLeftDownHandler &&
        _handlers.setInputAction(function (movement: any) {
          _mouseLeftDownHandler(movement, _handlers)
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN)

      _mouseWheelHandler &&
        _handlers.setInputAction(function (movement: any) {
          _mouseWheelHandler(movement, _handlers)
        }, Cesium.ScreenSpaceEventType.WHEEL)

      _mouseLeftUpHandler &&
        _handlers.setInputAction(function (movement: any) {
          _mouseLeftUpHandler(movement, _handlers)
        }, Cesium.ScreenSpaceEventType.LEFT_UP)
      // 返回 handler，便于调用方在重复绑定前销毁上一次的监听（避免事件层层叠加）
      return _handlers
    }
  }
  /**
   * @deprecated 拼写有误，请使用 {@link bindHandleEvent}
   */
  bindHandelEvent(options?: BindHandleEventOptions) {
    return this.bindHandleEvent(options)
  }
  /**
   * 获取鼠标信息
   * @param {function} callback
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const { base } = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * base.getHandlePosition(res=>{console.log(res)})
   */
  getHandlePosition(callback: (position: WGS84Type | undefined, handler: ScreenSpaceEventHandler) => void) {
    if (this._viewer) {
      var _handler = new Cesium.ScreenSpaceEventHandler(
          this._viewer.scene.canvas
        ),
        $this = this
      registerCleanup(this, () => {
        if (_handler && !_handler.isDestroyed()) _handler.destroy()
      })
      _handler.setInputAction(function (movement: any) {
        var cartesian = $this._viewer.scene.camera.pickEllipsoid(
          movement.endPosition,
          $this._viewer.scene.globe.ellipsoid
        )

        if (typeof callback === 'function') {
          callback($this.transformCartesianToWGS84(cartesian), _handler)
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    }
  }
  /**
   * @deprecated 拼写有误，请使用 {@link getHandlePosition}
   */
  getHandelPosition(callback: (position: WGS84Type | undefined, handler: ScreenSpaceEventHandler) => void) {
    return this.getHandlePosition(callback)
  }
  /**
   * 保存当前场景png
   * @example
   * import { createKit } from 'cesium_dev_kit'
   * const { base } = createKit({
   *     Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * base.saveSceneImages()
   */
  saveSceneImages() {
    if (this._viewer) {
      const dataURLtoBlob = function (dataurl: any) {
        var arr = dataurl.split(','),
          mime = arr[0].match(/:(.*?);/)[1],
          bstr = atob(arr[1]),
          n = bstr.length,
          u8arr = new Uint8Array(n)
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n)
        }
        return new Blob([u8arr], {
          type: mime
        })
      }

      var canvas = this._viewer.scene.canvas
      var image = canvas
        .toDataURL('image/png')
        .replace('image/png', 'image/octet-stream')
      var link = document.createElement('a')
      // var strDataURI = image.substr(22, image.length)
      var blob = dataURLtoBlob(image)
      var objurl = URL.createObjectURL(blob)
      link.download = 'scene.png'
      link.href = objurl
      link.click()
    }
  }
  /**
   * amap
   * @private
   *
   */
  _installAmapImageryProvider() {
    const IMG_URL =
      'https://webst{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}'
    const ELEC_URL =
      'https://webrd{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}'
    /**
     * 高度地图扩展
     * @global
     * @param {object} options
     * @param {string} options.style - 图层类型，可选['elec'| 'img']
     * @param {string} options.url - 地址
     * @param {boolean} options.subdomains - 子域
     * @returns {UrlTemplateImageryProvider}
     * @example
     * viewer.imageryLayers.addImageryProvider(new Cesium.Scene.AmapImageryProvider({
        style: 'img'
      }));
     */
    function AmapImageryProvider(options: any) {
      options['url'] = options.style === 'img' ? IMG_URL : ELEC_URL
      if (!options.subdomains) {
        options['subdomains'] = ['01', '02', '03', '04']
      }
      return new Cesium.UrlTemplateImageryProvider(options)
    }

    Cesium.Scene.AmapImageryProvider = AmapImageryProvider
  }
  /**
   * 天地图
   * @private
   */
  _installTdtImageryProvider() {
    const MAP_URL =
      'https://{s}.tianditu.gov.cn/{layer}_w/wmts?service=wmts&request=GetTile&version=1.0.0&LAYER={layer}&tileMatrixSet=w&TileMatrix={TileMatrix}&TileRow={TileRow}&TileCol={TileCol}&style=default&format=tiles&tk={key}'
    /**
     * 天地图加载方法
     * @global
     * @param {object} options
     * @param {string} options.key - 天地图key
     * @param {TDTStyleType} [options.style=vec] - 图层类型
     * @returns  {WebMapTileServiceImageryProvider}
     * @example
     * viewer.imageryLayers.addImageryProvider(new Cesium.Scene.TdtImageryProvider({
        key: '7eb11c0c503429878691ac917238f87f',
        style: 'cva'
      }));
     */
    function TdtImageryProvider(options: any) {
      return new Cesium.WebMapTileServiceImageryProvider({
        url: MAP_URL.replace(/\{layer\}/g, options.style || 'vec').replace(
          /\{key\}/g,
          options.key || ''
        ),
        layer: options.style + '_w',
        style: 'default', // WMTS请求的样式名称
        format: 'tiles', // MIME类型，用于从服务器检索图像
        tileMatrixSetID: 'GoogleMapsCompatible', //	用于WMTS请求的TileMatrixSet的标识符
        subdomains: ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'], // 天地图8个服务器
        minimumLevel: 0, // 最小层级
        maximumLevel: 18 // 最大层级
      })
    }

    Cesium.Scene.TdtImageryProvider = TdtImageryProvider
  }
  /**
   * 腾讯
   * @private
   */
  _installTencentImageryProvider() {
    const IMG_URL =
      'https://p2.map.gtimg.com/sateTiles/{z}/{sx}/{sy}/{x}_{reverseY}.jpg?version=229'
    const ELEC_URL =
      'https://rt3.map.gtimg.com/tile?z={z}&x={x}&y={reverseY}&type=vector&styleid=1'
    /**
     * 腾讯底图加载方法
     * @global
     * @param {object} options
     * @param {string} options.layer - 图层类型，可选['elec'| 'img']
     * @param {string} options.url - 地址
     * @param {boolean} options.subdomains - 子域
     * @returns {ImageryProvider}
     * @example
     * viewer.imageryLayers.addImageryProvider(
        new Cesium.Scene.TencentImageryProvider({
          layer: 'img',
          url: 'https://p2.map.gtimg.com/sateTiles/{z}/{sx}/{sy}/{x}_{reverseY}.jpg?version=229'
        }));
     */
    function TencentImageryProvider(options: any) {
      if (options.layer === 'img') {
        if (!options['url']) {
          options['url'] = IMG_URL
        }
        if (!options.subdomains) {
          options['subdomains'] = ['0', '1', '2']
        }
        options['customTags'] = {
          sx(imageryProvider: any, x: any, y: any, level: any) {
            return x >> 4
          },
          sy(imageryProvider: any, x: any, y: any, level: any) {
            return ((1 << level) - y) >> 4
          }
        }
      } else {
        if (!options['url']) {
          options['url'] = ELEC_URL
        }
      }
      return new Cesium.UrlTemplateImageryProvider(options)
    }
    Cesium.Scene.TencentImageryProvider = TencentImageryProvider
  }
  /**
   * google
   * @private
   */
  _installGoogleImageryProvider() {
    //标注 影像 地形三种
    const ELEC_URL =
      'https://mt{s}.google.cn/vt/lyrs=m@207000000&hl=zh-CN&gl=CN&src=app&x={x}&y={y}&z={z}&s=Galile'
    const IMG_URL =
      'https://mt{s}.google.cn/vt/lyrs=s&hl=zh-CN&x={x}&y={y}&z={z}&s=Gali'
    const TER_URL =
      'https://mt{s}.google.cn/vt/lyrs=t@131,r@227000000&hl=zh-CN&gl=cn&x={x}&y={y}&z={z}&s=Galile'
    /**
     * 谷歌地图加载方法
     * @global
     * @param {object} options
     * @param {boolean} options.subdomains - 子域
     * @param {string} options.style - 图层类型，可选['img'|'ter']
     * @returns  {ImageryProvider}
     * @example
     *viewer.imageryLayers.addImageryProvider(new Cesium.Scene.GoogleImageryProvider({
        style: 'img'
      }));
     */
    function GoogleImageryProvider(options: any) {
      options['url'] =
        options.style === 'img'
          ? IMG_URL
          : options.style === 'ter'
          ? TER_URL
          : ELEC_URL
      if (!options.subdomains) {
        options['subdomains'] = ['1', '2', '3', '4', '5']
      }
      return new Cesium.UrlTemplateImageryProvider(options)
    }

    Cesium.Scene.GoogleImageryProvider = GoogleImageryProvider
  }
  /**
   * @deprecated 拼写有误，请使用 {@link _installGoogleImageryProvider}（该方法同时是幂等的）
   */
  _installGooGleImageryProvider() {
    return this._installGoogleImageryProvider()
  }
  /**
   * 百度影像拓展
   * @private
   */
  _installBaiduImageryProvider() {
    var TEMP_MAP_URL =
      'https://api{s}.map.bdimg.com/customimage/tile?&x={x}&y={y}&z={z}&scale=1&customid={style}'
    /**
     * 百度影像拓展
     * @global
     * @param {Object} options
     * @param {string} url - 图层路径
     * @param {string} style - 样式,可选['normal'|'midnight'|'dark'|'googlelite'|'redalert']
     * @example
     * const opts = {
     *   url: 'https://api.map.baidu.com/customimage/tile?udt=20181205&scale=1&ak=1XjLLEhZhQNUzd93EjU5nOGQ',
     *  style: 'midnight'
     * }
     *viewer.imageryLayers.addImageryProvider(new Cesium.Scene.BaiduImageryProvider(commonOption));
     */
    function BaiduImageryProvider(this: any, options: any) {
      TEMP_MAP_URL = options.url || TEMP_MAP_URL

      this._url = TEMP_MAP_URL
      this._tileWidth = 256
      this._tileHeight = 256
      this._maximumLevel = 18
      this._minimumLevel = 1
      this._tilingScheme = new Cesium.WebMercatorTilingScheme({
        rectangleSouthwestInMeters: new Cesium.Cartesian2(-33554054, -33746824),
        rectangleNortheastInMeters: new Cesium.Cartesian2(33554054, 33746824)
      })
      this._rectangle = this._tilingScheme.rectangle
      this._credit = undefined
      this._style = options.style || 'normal'
      this._ready = true
    }

    Object.defineProperties(BaiduImageryProvider.prototype, {
      url: {
        get() {
          return this._url
        }
      },
      token: {
        get() {
          return this._token
        }
      },
      tileWidth: {
        get() {
          if (!this.ready) {
            throw new Cesium.DeveloperError(
              'tileWidth must not be called before the imagery provider is ready.'
            )
          }
          return this._tileWidth
        }
      },
      tileHeight: {
        get() {
          if (!this.ready) {
            throw new Cesium.DeveloperError(
              'tileHeight must not be called before the imagery provider is ready.'
            )
          }
          return this._tileHeight
        }
      },
      maximumLevel: {
        get() {
          if (!this.ready) {
            throw new Cesium.DeveloperError(
              'tileHeight must not be called before the imagery provider is ready.'
            )
          }
          return this._tileHeight
        }
      },
      minimumLevel: {
        get() {
          if (!this.ready) {
            throw new Cesium.DeveloperError(
              'minimumLevel must not be called before the imagery provider is ready.'
            )
          }
          return 0
        }
      },
      tilingScheme: {
        get() {
          if (!this.ready) {
            throw new Cesium.DeveloperError(
              'tilingScheme must not be called before the imagery provider is ready.'
            )
          }
          return this._tilingScheme
        }
      },

      rectangle: {
        get() {
          if (!this.ready) {
            throw new Cesium.DeveloperError(
              'rectangle must not be called before the imagery provider is ready.'
            )
          }
          return this._rectangle
        }
      },

      ready: {
        get() {
          return !!this._url
        }
      },

      credit: {
        get() {
          return this._credit
        }
      },
      readyPromise: {
        get() {
          return this._readyPromise.promise
        }
      },
      usingPrecachedTiles: {
        get() {
          return this._useTiles
        }
      },
      hasAlphaChannel: {
        get() {
          return true
        }
      },
      layers: {
        get() {
          return this._layers
        }
      }
    })
    function buildImageUrl(imageryProvider: any, x: any, y: any, level: any, _style: any) {
      var url = imageryProvider._url + '&x={x}&y={y}&z={z}&customid={style}'
      var tileW = imageryProvider._tilingScheme.getNumberOfXTilesAtLevel(level)
      var tileH = imageryProvider._tilingScheme.getNumberOfYTilesAtLevel(level)

      url = url
        .replace('{x}', String(x - tileW / 2))
        .replace('{y}', String(tileH / 2 - y - 1))
        .replace('{z}', String(level))
        .replace('{style}', _style)
      return url
    }
    BaiduImageryProvider.prototype.getTileCredits = function (this: any, x: any, y: any, level: any) {
      return undefined
    }

    BaiduImageryProvider.prototype.requestImage = function (this: any, x: any, y: any, level: any) {
      if (!this.ready) {
        throw new Cesium.DeveloperError(
          'requestImage must not be called before the imagery provider is ready.'
        )
      }
      var url = buildImageUrl(this, x, y, level, this._style)

      return Cesium.ImageryProvider.loadImage(this, url)
    }

    Cesium.Scene.BaiduImageryProvider = BaiduImageryProvider
  }
  // 拓展近景天空盒
  _installGroundSkyBox() {
    var BoxGeometry = Cesium.BoxGeometry,
      Cartesian3 = Cesium.Cartesian3,
      // 不再往 Cesium.Scene 上挂 defaultValue（那是 Cesium 的私有命名空间，
      // 全局补丁会与其他插件冲突）。Cesium 未导出 defaultValue 时用本地等价实现。
      defaultValue = Cesium.defaultValue || localDefaultValue,
      defined = Cesium.defined,
      destroyObject = Cesium.destroyObject,
      DeveloperError = Cesium.DeveloperError,
      GeometryPipeline = Cesium.GeometryPipeline,
      Matrix3 = Cesium.Matrix3,
      Matrix4 = Cesium.Matrix4,
      Transforms = Cesium.Transforms,
      VertexFormat = Cesium.VertexFormat,
      BufferUsage = Cesium.BufferUsage,
      CubeMap = Cesium.CubeMap,
      DrawCommand = Cesium.DrawCommand,
      loadCubeMap = Cesium.loadCubeMap,
      RenderState = Cesium.RenderState,
      VertexArray = Cesium.VertexArray,
      BlendingState = Cesium.BlendingState,
      SceneMode = Cesium.SceneMode,
      ShaderProgram = Cesium.ShaderProgram,
      ShaderSource = Cesium.ShaderSource
    //片元着色器，直接从源码复制
    var SkyBoxFS =
      'uniform samplerCube u_cubeMap;\n\
                    in vec3 v_texCoord;\n\
                    void main()\n\
                    {\n\
                    vec4 color = texture(u_cubeMap, normalize(v_texCoord));\n\
                    out_FragColor = vec4(czm_gammaCorrect(color).rgb, czm_morphTime);\n\
                    }\n\
                    '

    //顶点着色器有修改，主要是乘了一个旋转矩阵
    var SkyBoxVS =
      'in vec3 position;\n\
                    out vec3 v_texCoord;\n\
                    uniform mat3 u_rotateMatrix;\n\
                    void main()\n\
                    {\n\
                    vec3 p = czm_viewRotation * u_rotateMatrix * (czm_temeToPseudoFixed * (czm_entireFrustum.y * position));\n\
                    gl_Position = czm_projection * vec4(p, 1.0);\n\
                    v_texCoord = position.xyz;\n\
                    }\n\
                    '
    /*
     * 版本适配：新版 Cesium 移除了 Matrix4.getRotation。
     * 这里只在本地做函数适配，不把 getMatrix3 赋到 Matrix4.getRotation 上——
     * 改写 Cesium 全局对象会与其他 Cesium 插件互相干扰。
     */
    var getRotation =
      typeof Matrix4.getRotation === 'function'
        ? Matrix4.getRotation.bind(Matrix4)
        : Matrix4.getMatrix3.bind(Matrix4)
    /**
     * 拓展近景天空盒
     * @global
     * @param {object} options
     * @param {object} options.sources - 配置天空盒六面的图片
     * @param {boolean} options.show - 是否显示
     * @example
     * new Cesium.Scene.GroundSkyBox({
            sources: {
              positiveX: "static/data/images/SkyBox/rightav9.jpg",
              negativeX:  "static/data/images/SkyBox/leftav9.jpg",
              positiveY:  "static/data/images/SkyBox/frontav9.jpg",
              negativeY: "static/data/images/SkyBox/backav9.jpg",
              positiveZ: "static/data/images/SkyBox/topav9.jpg",
              negativeZ: "static/data/images/SkyBox/bottomav9.jpg",
            },
          })
     */
    function SkyBoxOnGround(this: any, options: any) {
      this.sources = options.sources
      this._sources = undefined
      /**
       * Determines if the sky box will be shown.
       *
       * @type {Boolean}
       * @default true
       */
      this.show = defaultValue(options.show, true)

      this._command = new DrawCommand({
        modelMatrix: Matrix4.clone(Matrix4.IDENTITY),
        owner: this
      })
      this._cubeMap = undefined

      this._attributeLocations = undefined
      this._useHdr = undefined
    }

    var skyboxMatrix3 = new Matrix3()
    SkyBoxOnGround.prototype.update = function (this: any, frameState: any, useHdr: any) {
      var that = this

      if (!this.show) {
        return undefined
      }

      if (
        frameState.mode !== SceneMode.SCENE3D &&
        frameState.mode !== SceneMode.MORPHING
      ) {
        return undefined
      }

      if (!frameState.passes.render) {
        return undefined
      }

      var context = frameState.context

      if (this._sources !== this.sources) {
        this._sources = this.sources
        var sources = this.sources

        if (
          !defined(sources.positiveX) ||
          !defined(sources.negativeX) ||
          !defined(sources.positiveY) ||
          !defined(sources.negativeY) ||
          !defined(sources.positiveZ) ||
          !defined(sources.negativeZ)
        ) {
          throw new DeveloperError(
            'this.sources is required and must have positiveX, negativeX, positiveY, negativeY, positiveZ, and negativeZ properties.'
          )
        }

        if (
          typeof sources.positiveX !== typeof sources.negativeX ||
          typeof sources.positiveX !== typeof sources.positiveY ||
          typeof sources.positiveX !== typeof sources.negativeY ||
          typeof sources.positiveX !== typeof sources.positiveZ ||
          typeof sources.positiveX !== typeof sources.negativeZ
        ) {
          throw new DeveloperError(
            'this.sources properties must all be the same type.'
          )
        }

        if (typeof sources.positiveX === 'string') {
          // Given urls for cube-map images.  Load them.
          loadCubeMap(context, this._sources).then(function (cubeMap: any) {
            that._cubeMap = that._cubeMap && that._cubeMap.destroy()
            that._cubeMap = cubeMap
          })
        } else {
          this._cubeMap = this._cubeMap && this._cubeMap.destroy()
          this._cubeMap = new CubeMap({
            context: context,
            source: sources
          })
        }
      }

      var command = this._command

      command.modelMatrix = Transforms.eastNorthUpToFixedFrame(
        frameState.camera._positionWC
      )
      if (!defined(command.vertexArray)) {
        command.uniformMap = {
          u_cubeMap() {
            return that._cubeMap
          },
          u_rotateMatrix() {
            return getRotation(command.modelMatrix, skyboxMatrix3)
          }
        }

        var geometry = BoxGeometry.createGeometry(
          BoxGeometry.fromDimensions({
            dimensions: new Cartesian3(2.0, 2.0, 2.0),
            vertexFormat: VertexFormat.POSITION_ONLY
          })
        )
        var attributeLocations = (this._attributeLocations = GeometryPipeline.createAttributeLocations(
          geometry!
        ))

        command.vertexArray = VertexArray.fromGeometry({
          context: context,
          geometry: geometry,
          attributeLocations: attributeLocations,
          bufferUsage: BufferUsage._DRAW
        })

        command.renderState = RenderState.fromCache({
          blending: BlendingState.ALPHA_BLEND
        })
      }

      if (!defined(command.shaderProgram) || this._useHdr !== useHdr) {
        var fs = new ShaderSource({
          defines: [useHdr ? 'HDR' : ''],
          sources: [SkyBoxFS]
        })
        command.shaderProgram = ShaderProgram.fromCache({
          context: context,
          vertexShaderSource: SkyBoxVS,
          fragmentShaderSource: fs,
          attributeLocations: this._attributeLocations
        })
        this._useHdr = useHdr
      }

      if (!defined(this._cubeMap)) {
        return undefined
      }

      return command
    }
    SkyBoxOnGround.prototype.isDestroyed = function (this: any) {
      return false
    }
    SkyBoxOnGround.prototype.destroy = function (this: any) {
      var command = this._command
      command.vertexArray = command.vertexArray && command.vertexArray.destroy()
      command.shaderProgram =
        command.shaderProgram && command.shaderProgram.destroy()
      this._cubeMap = this._cubeMap && this._cubeMap.destroy()
      return destroyObject(this)
    }

    Cesium.Scene.GroundSkyBox = SkyBoxOnGround
  }
  /**
   * 移除绑定的handler事件
   *@function
   * @param {Array} eventNameArr  handler名称数组，如['LEFT_CLICK','MOUSE_MOVE']
   */
  removeHandlerByName(eventNameArr: string[] = []) {
    eventNameArr.forEach((eHandler: string) => {
      this._viewer.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType[eHandler as keyof typeof Cesium.ScreenSpaceEventType]
      )
    })
  }
}

  return Base
}

export const Base = createScopedConstructor(createBaseModule)
export type BaseInstance = InstanceType<typeof Base>

export type BaseConstructor = typeof Base
