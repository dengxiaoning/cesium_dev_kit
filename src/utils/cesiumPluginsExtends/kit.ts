import {
  Base,
  Material,
  Shaders,
  Graphics,
  Draw,
  Primitive,
  CustomCesiumPlugin,
  PassEffect,
  Math2d,
  Math3d,
  Control,
  Plugin,
  Analysis,
  AttackArrow,
  StraightArrow,
  PincerArrow,
  ThreeJs,
  TerrainEdit
} from './libs'
import type { BaseInstance } from './libs/Base'
import { disposeModule, resolveScopedConstructor, transferCleanups, disposeViewer } from './libs/Base'
import type { MaterialInstance } from './libs/Material'
import type { ShadersInstance } from './libs/Shaders'
import type { GraphicsInstance } from './libs/Graphics'
import type { DrawInstance } from './libs/Draw'
import type { PrimitiveInstance } from './libs/Primitive'
import type { CustomCesiumPluginInstance } from './libs/CustomCesiumPlugin'
import type { PassEffectInstance } from './libs/PassEffect'
import type { Math2dInstance } from './libs/Math2d'
import type { Math3dInstance } from './libs/Math3d'
import type { ControlInstance } from './libs/Control'
import type { PluginInstance } from './libs/Plugin'
import type { AnalysisInstance } from './libs/Analysis'
import type { AttackArrowInstance } from './libs/plot/AttackArrow'
import type { StraightArrowInstance } from './libs/plot/StraightArrow'
import type { PincerArrowInstance } from './libs/plot/PincerArrow'
import type { ThreeJsInstance } from './libs/ThreeJs'
import type { TerrainEditInstance } from './libs/TerrainEdit'
import { createContext, disposeContext } from './libs/context'
import type { CesiumContext, CesiumContextOptions } from './libs/context'
import { reportError } from './libs/errors'

/** 创建 kit 的参数，与 {@link CesiumContextOptions} 一致 */
export type CreateKitOptions = CesiumContextOptions

/** kit 内所有模块实例 */
export interface ResModulesType {
  /** cesium viewer 实例 */
  viewer: CesiumContext['viewer']
  /** 本次 kit 的运行时上下文 */
  context: CesiumContext
  /**
   * 销毁 kit 持有的资源（幂等）。
   *
   * - viewer 由 kit 创建：调用 `viewer.destroy()`；
   * - viewer 由外部传入：只清理 kit 自己添加的监听 / 实体，不动外部 viewer。
   */
  dispose: () => void
  /** 是否已释放 */
  isDisposed: () => boolean
  /** 材质模块 */
  material: MaterialInstance & BaseInstance & ShadersInstance
  /** 图形模块 */
  graphics: GraphicsInstance & BaseInstance
  /** 数学 3d 计算工具 */
  math3d: Math3dInstance & BaseInstance
  /** 数学 2d 计算工具 */
  math2d: Math2dInstance
  /** 图元模块 */
  primitive: PrimitiveInstance & BaseInstance
  /** 绘制模块 */
  draw: DrawInstance & BaseInstance & Math3dInstance & Math2dInstance
  /** 后置处理模块 */
  passEffect: PassEffectInstance & BaseInstance & ShadersInstance
  /** 自定义扩展（传感器）模块 */
  customCesiumPlugin: CustomCesiumPluginInstance & BaseInstance
  /** 场景控制模块 */
  control: ControlInstance & BaseInstance
  /** 插件模块 */
  plugin: PluginInstance & BaseInstance & GraphicsInstance
  /** 基础模块 */
  base: BaseInstance
  /** 分析模块 */
  analysis: AnalysisInstance & BaseInstance & DrawInstance & PluginInstance
  /** 标绘（攻击箭头）模块 */
  attackArrowObj: AttackArrowInstance
  /** 标绘（直线箭头）模块 */
  straightArrowObj: StraightArrowInstance
  /** 标绘（钳击箭头）模块 */
  pincerArrowObj: PincerArrowInstance
  /** threejs 集成模块 */
  threeJs: ThreeJsInstance
  /**
   * 地形编辑模块：圈定多边形后做塌陷 / 抬升 / 平整 / 平滑，并叠加水面。
   *
   * 依赖 three.js：需要 `createKit({ three })`，并在使用前调用 `kit.threeJs.initThree()`。
   */
  terrainEdit: TerrainEditInstance
}

/**
 * 原型混入：把 parents 的原型方法拷贝到 children 上，并依次初始化。
 *
 * @deprecated 内部兼容层。新代码请使用 `createKit` 组合出来的模块实例，
 * 库将在后续大版本移除原型混入机制。
 */
export function prototypeExtends(
  viewer: CesiumContext['viewer'],
  cesiumGlobal: CesiumContext['Cesium'],
  defaultStatic?: CesiumContext['defaultStatic']
): (parents: any, children: any) => any {
  function _inner(parents: any, children: any): any {
    let curr: any = null
    // scoped 构造函数每次实例化都需要一份新的真实构造函数/原型，
    // 这样模块级 Cesium/dfSt 闭包才能按实例隔离。
    const Child = resolveScopedConstructor(children)
    const parentInstances: any[] = []
    if (Array.isArray(parents)) {
      parents.forEach((pp: any) => {
        // 先构造真实的父实例，初始化其闭包，再拷贝原型方法。
        const Parent = resolveScopedConstructor(pp)
        const temp = new Parent(viewer, cesiumGlobal, defaultStatic)
        exeClone(Parent, Child)
        parentInstances.push(temp)
      })
      curr = new Child(viewer, cesiumGlobal, defaultStatic)
      parentInstances.forEach((temp) => Object.assign(curr, temp))
      // 父模块实例创建的 DataSource / 监听器清理任务要跟着挂到 curr 上
      parentInstances.forEach((temp) => transferCleanups(temp, curr))
    } else {
      const Parent = resolveScopedConstructor(parents)
      const temp = new Parent(viewer, cesiumGlobal, defaultStatic)
      exeClone(Parent, Child)
      curr = new Child(viewer, cesiumGlobal, defaultStatic)
      Object.assign(curr, temp)
      transferCleanups(temp, curr)
    }

    function exeClone(cloneTarget: any, targetCtor: any): void {
      //拷贝方法（getOwnPropertyNames 以兼容 class 的非枚举方法）
      const keys = Object.getOwnPropertyNames(cloneTarget.prototype)
      for (let i = 0, len = keys.length; i < len; i++) {
        if (keys[i] !== 'constructor') {
          targetCtor.prototype[keys[i]] = cloneTarget.prototype[keys[i]]
        }
      }
    }
    return curr
  }
  return _inner
}

/**
 * 创建一个 Cesium 开发套件实例（推荐入口）。
 *
 * 相比 `new initCesium(...)`：
 * - 不依赖模块级全局状态，同一页面可并存多个 kit / 多个 viewer；
 * - 返回带 `context` 的显式上下文，便于测试与依赖注入；
 * - `dispose()` 有明确契约：自己创建的 viewer 才销毁。
 *
 * @example
 * import * as Cesium from 'cesium'
 * import { createKit } from 'cesium_dev_kit'
 *
 * const kit = createKit({
 *   Cesium,
 *   containerId: 'cesiumContainer',
 *   assetsBaseUrl: '/static/',
 *   viewerConfig: { infoBox: false }
 * })
 *
 * kit.graphics.getPointGraphics({ ... })
 *
 * // 组件卸载时
 * kit.dispose()
 */
export function createKit(options: CreateKitOptions): ResModulesType {
  const context = createContext(options)
  const { viewer: _viewer, Cesium: cesiumGlobal, defaultStatic, three } = context

  // 合并对象，实现继承
  const protoExtends = prototypeExtends(_viewer, cesiumGlobal, defaultStatic)
  // 初始化材质
  const _material = protoExtends([Base, Shaders], Material)
  const _graphics = protoExtends(Base, Graphics)
  const _math3d = protoExtends(Base, Math3d)
  const _math2d = new Math2d(_viewer, cesiumGlobal)
  const _primitive = protoExtends(Base, Primitive)
  const _draw = protoExtends([Base, Math3d, Math2d], Draw)
  const _passEffect = protoExtends([Base, Shaders], PassEffect)
  const _customCesiumPlugin = protoExtends(Base, CustomCesiumPlugin)
  const _control = protoExtends(Base, Control)
  const _plugin = protoExtends([Base, Graphics], Plugin)
  const _base = new Base(_viewer, cesiumGlobal)
  // Draw 自身依赖 Math3d（getPositionDistance / getPositionsArea）与 Math2d（computeStar2d 等），
  // Analysis 复用 Draw 的方法，必须带上同样的父模块，否则 analysis 实例上取不到这些方法。
  const _analysis = protoExtends([Base, Math3d, Math2d, Draw, Plugin], Analysis)
  const _attackArrowObj = new AttackArrow(_viewer, cesiumGlobal)
  const _straightArrowObj = new StraightArrow(_viewer, cesiumGlobal)
  const _pincerArrowObj = new PincerArrow(_viewer, cesiumGlobal)
  // three 容器绑定优化
  const threeConf = three
    ? {
        threeGlobal: three,
        containerId: context.containerId,
        threeContainerId: context.threeContainerId
      }
    : ''
  const _threeJs = new ThreeJs(_viewer, cesiumGlobal, defaultStatic, threeConf)
  // 地形编辑依赖 three 场景，先拿到 threeJs 实例，真正绘制时再要求 initThree
  const _terrainEdit = new TerrainEdit(_viewer, cesiumGlobal, three, _threeJs)

  // 按「依赖方先销毁、viewer 最后销毁」的顺序释放各模块资源
  const moduleInstances: any[] = [
    _terrainEdit,
    _threeJs,
    _analysis,
    _draw,
    _plugin,
    _passEffect,
    _customCesiumPlugin,
    _control,
    _primitive,
    _graphics,
    _material,
    _math3d,
    _math2d,
    _base,
    _attackArrowObj,
    _straightArrowObj,
    _pincerArrowObj
  ]
  let disposed = false

  const dispose = () => {
    if (disposed) return
    disposed = true
    moduleInstances.forEach((mod) => {
      try {
        if (mod && typeof mod.destroy === 'function') {
          mod.destroy()
        } else {
          disposeModule(mod)
        }
      } catch (err) {
        reportError(err, { scope: 'createKit.dispose' })
      }
    })
    // 只有 kit 自己创建的 viewer 才销毁
    if (context.ownsViewer) {
      disposeViewer(_viewer)
    } else {
      disposeContext(context)
    }
  }

  return {
    viewer: _viewer,
    context,
    material: _material,
    graphics: _graphics,
    math3d: _math3d,
    math2d: _math2d,
    primitive: _primitive,
    draw: _draw,
    passEffect: _passEffect,
    customCesiumPlugin: _customCesiumPlugin,
    control: _control,
    plugin: _plugin,
    base: _base,
    analysis: _analysis,
    attackArrowObj: _attackArrowObj,
    straightArrowObj: _straightArrowObj,
    pincerArrowObj: _pincerArrowObj,
    threeJs: _threeJs,
    terrainEdit: _terrainEdit,
    dispose,
    isDisposed: () => disposed
  }
}
