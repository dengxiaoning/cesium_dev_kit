import { Controller } from '../initConf'
import type { Viewer, CesiumGlobal } from '../libs/Base'
import { disposeViewer, resolveScopedConstructor, transferCleanups, disposeModule } from '../libs/Base'
import { CesiumDevKitError, reportError } from '../libs/errors'

/** cesium 全局命名空间对象 */
export type { CesiumGlobal }

/**
 * 可被混入的模块构造函数
 * （libs 下各模块都符合该形状：new 之后得到模块实例，且带 prototype）
 */
export type SingleImportComponent = new (...args: any[]) => any

/**
 * singleImport 下各模块的构造参数
 */
export interface SingleImportOptions {
  /** 全局 Cesium 对象（必传） */
  cesiumGlobal?: CesiumGlobal
  /** 全局 THREE 对象（使用 three 相关模块时传入） */
  threeGlobal?: any
  /** 挂载 viewer 的 dom id 或 dom 元素 */
  containerId?: string | HTMLElement
  /** 挂载 three 的 dom id */
  threeContainerId?: string | HTMLElement
  /** cesium viewer 配置 */
  viewerConfig?: Record<string, any>
  /** 其它额外配置 */
  extraConfig?: Record<string, any>
  /** 需要加载的影像图层配置 */
  MapImageryList?: any[]
  /** 静态资源配置 */
  defaultStatic?: any
  /** 外部传入已经实例化的 viewer */
  viewer?: Viewer
  /** 其它扩展参数 */
  [key: string]: any
}

/**
 * 初始化模块的内部参数：在用户参数基础上追加本次要混入的模块信息
 */
export interface SingleImportInitOptions extends SingleImportOptions {
  /** 需要被混入（继承）的父模块，可传单个或数组 */
  baseExtendsCom?: SingleImportComponent | SingleImportComponent[]
  /** 本次要实例化的目标模块构造函数 */
  extendsCom?: SingleImportComponent
  /** 目标模块实例在返回对象上的字段名，如 'graphics' */
  extendsComName?: string
}

/** 可释放资源的最小接口（kit 自己创建的 viewer 会被销毁） */
export interface Disposable {
  dispose: () => void
  /** 销毁当前模块持有的监听器 / DataSource（由 dispose 自动调用） */
  destroy?: () => void
}

/** singleImport 模块组装完成后返回的对象结构 */
export type SingleImportResult = Record<string, any> & Partial<Disposable>

/**
 * singleImport 模块构造函数类型
 * @template T - new 之后返回的实例结构
 */
export interface SingleImportConstructor<T> {
  new (options: SingleImportOptions): T & Disposable
  prototype: T
}

/**
 * 生成原型混入函数
 *
 * 思路：先把父模块原型上的方法逐个拷贝到子模块原型上，再 new 出子模块实例，
 * 随后用 `父模块.call(实例)` 执行父模块构造函数，从而把父模块的字段补充到实例上。
 * @param viewer - cesium viewer 实例
 * @param cesiumGlobal - 全局 Cesium 对象
 * @param defaultStatic - 静态资源配置
 * @param threeGlobal - three 相关配置
 * @returns 混入执行函数
 */
export function prototypeExtends(
  viewer: Viewer,
  cesiumGlobal: CesiumGlobal,
  defaultStatic?: any,
  threeGlobal?: any
): (
  parents: SingleImportComponent | SingleImportComponent[],
  children: SingleImportComponent
) => SingleImportResult {
  function _inner(
    parents: SingleImportComponent | SingleImportComponent[],
    children: SingleImportComponent
  ): SingleImportResult {
    let curr: SingleImportResult = {}
    // scoped 构造函数每次实例化都需要一份新的真实构造函数/原型，
    // 这样模块级 Cesium/dfSt 闭包才能按实例隔离。
    const Child = resolveScopedConstructor(children)
    const parentInstances: any[] = []
    if (Array.isArray(parents)) {
      parents.forEach((pp: SingleImportComponent) => {
        // 先构造一个真实的父实例，使其闭包中的 Cesium/dfSt 被初始化，
        // 再把这份原型方法拷贝到子模块原型上。否则拷贝到的是未初始化闭包。
        const Parent = resolveScopedConstructor(pp)
        const temp = new Parent(viewer, cesiumGlobal, defaultStatic, threeGlobal)
        exeClone(Parent, Child)
        parentInstances.push(temp)
      })
      curr = new Child(viewer, cesiumGlobal, defaultStatic, threeGlobal)
      parentInstances.forEach((temp) => Object.assign(curr, temp))
      parentInstances.forEach((temp) => transferCleanups(temp, curr))
    } else {
      const Parent = resolveScopedConstructor(parents)
      const temp = new Parent(viewer, cesiumGlobal, defaultStatic, threeGlobal)
      exeClone(Parent, Child)
      curr = new Child(viewer, cesiumGlobal, defaultStatic, threeGlobal)
      Object.assign(curr, temp)
      transferCleanups(temp, curr)
    }

    /**
     * 把父模块原型上的方法拷贝到目标模块原型上，实现方法复用
     * @param cloneTarget - 已初始化的父模块构造函数
     * @param targetCtor - 本次实际使用的子模块构造函数
     */
    function exeClone(
      cloneTarget: SingleImportComponent,
      targetCtor: SingleImportComponent
    ): void {
      // 拷贝方法（getOwnPropertyNames 以兼容 class 的非枚举方法）
      const keys = Object.getOwnPropertyNames(cloneTarget.prototype)
      for (let i = 0, len = keys.length; i < len; i++) {
        if (keys[i] !== 'constructor') {
          ;(targetCtor.prototype as any)[keys[i]] = (
            cloneTarget.prototype as any
          )[keys[i]]
        }
      }
    }
    return curr
  }
  return _inner
}

/**
 * 初始化 viewer 并组装模块实例
 *
 * 步骤：校验参数 → 创建 viewer → 混入父模块方法并实例化目标模块
 * @param options - 初始化参数
 * @returns 组装后的模块对象，形如 `{ viewer, [extendsComName]: 模块实例 }`
 */
export function initSingleImportModule({
  cesiumGlobal,
  threeGlobal,
  containerId,
  threeContainerId,
  viewerConfig = {},
  extraConfig = {},
  MapImageryList = [],
  defaultStatic,
  baseExtendsCom = [],
  extendsCom,
  extendsComName,
  viewer
}: SingleImportInitOptions): SingleImportResult {
  if (!cesiumGlobal) {
    throw new CesiumDevKitError('MISSING_CESIUM', '缺少 Cesium 全局对象，请传入 cesiumGlobal（或别名 Cesium）。')
  }
  if (!containerId && !viewer) {
    throw new CesiumDevKitError(
      'MISSING_VIEWER',
      '缺少 containerId 或 viewer：请传入挂载容器 id，或直接传入已创建的 viewer。'
    )
  }
  const initCom = new Controller(cesiumGlobal)
  const _viewer = initCom.init({
    containerId,
    viewerConfig,
    extraConfig,
    MapImageryList,
    viewer
  })
  // 只有内部创建的 viewer 才由 kit 负责销毁；外部传入的 viewer 交给使用方管理
  const ownsViewer = !viewer
  // three 容器绑定优化
  const threeConf = threeGlobal ? { threeGlobal, containerId, threeContainerId } : ''
  // 合并对象，实现继承
  const protoExtends = prototypeExtends(_viewer, cesiumGlobal, defaultStatic, threeConf)
  const _tempName = protoExtends(baseExtendsCom, extendsCom as SingleImportComponent)
  let disposed = false
  return {
    viewer: _viewer,
    [extendsComName as string]: _tempName,
    dispose: () => {
      if (disposed) return
      disposed = true
      try {
        if (typeof (_tempName as any).destroy === 'function') {
          ;(_tempName as any).destroy()
        } else {
          disposeModule(_tempName)
        }
      } catch (err) {
        reportError(err, { scope: 'singleImport.dispose' })
      }
      if (ownsViewer) disposeViewer(_viewer)
    }
  }
}

/**
 * 生成 singleImport 各模块的构造函数
 *
 * 用法：`export const Graphics = createSingleImport<GraphicsExtendsApi>([Base], GraphicsCom, 'graphics')`
 * @template T - new 之后返回的实例结构
 * @param baseExtendsCom - 需要混入的父模块（单个或数组）
 * @param extendsCom - 目标模块构造函数
 * @param extendsComName - 目标模块实例在返回对象上的字段名
 * @returns 可直接 new 的模块构造函数
 */
export function createSingleImport<T extends object>(
  baseExtendsCom: SingleImportComponent | SingleImportComponent[],
  extendsCom: SingleImportComponent,
  extendsComName: string
): SingleImportConstructor<T> {
  function CreatedModule(obj: SingleImportOptions): T & Disposable {
    return initSingleImportModule({
      ...obj,
      baseExtendsCom,
      extendsCom,
      extendsComName
    }) as unknown as T & Disposable
  }
  return CreatedModule as unknown as SingleImportConstructor<T>
}
