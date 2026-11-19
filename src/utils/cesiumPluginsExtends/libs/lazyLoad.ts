/**
 * 浏览器专用依赖的惰性加载器。
 *
 * `dat.gui` / `echarts` 在模块加载阶段就会访问 `window` / `document`，
 * 若在库根入口被顶层 `import`，会导致 Node / SSR 环境
 * `import 'cesium_dev_kit'` 直接抛出 `window is not defined` / `document is not defined`。
 *
 * 这里统一改为按需 `import()`，仅在真正调用到相关方法时才加载这些包，
 * 因此它们可以被声明为可选 peer 依赖：不用这些能力就不会被打进业务包。
 */

import { CesiumDevKitError, isCesiumDevKitError } from './errors'

let echartsPromise: Promise<any> | null = null
let datGuiPromise: Promise<any> | null = null
let libgifPromise: Promise<any> | null = null

/** 归一化动态 import 结果：优先取 default（兼容 CJS 的 module.exports） */
function unwrap(mod: any): any {
  if (mod && typeof mod === 'object' && mod.default) {
    return mod.default
  }
  return mod
}

/**
 * 加载一个可选依赖，缺失时抛出结构化错误。
 * @param pkg - 包名（用于提示安装命令）
 * @param loader - 动态 import 函数
 */
function loadOptional<T>(pkg: string, loader: () => Promise<any>): Promise<T> {
  return loader()
    .then(unwrap)
    .catch((err) => {
      if (isCesiumDevKitError(err)) throw err
      throw new CesiumDevKitError(
        'OPTIONAL_DEPENDENCY_MISSING',
        `该功能需要可选依赖 "${pkg}"，请先安装：npm i ${pkg}`,
        { cause: err, details: { package: pkg } }
      )
    })
}

/** 惰性加载 echarts（用于坡度分析剖面图） */
export function loadEcharts(): Promise<any> {
  if (!echartsPromise) {
    echartsPromise = loadOptional('echarts', () => import('echarts'))
  }
  return echartsPromise
}

/** 惰性加载 dat.gui（用于各控制面板） */
export function loadDatGui(): Promise<any> {
  if (!datGuiPromise) {
    datGuiPromise = loadOptional('dat.gui', () => import('dat.gui'))
  }
  return datGuiPromise
}

/** 惰性加载 libgif（用于导出 GIF） */
export function loadLibgif(): Promise<any> {
  if (!libgifPromise) {
    libgifPromise = loadOptional('libgif', () => import('libgif'))
  }
  return libgifPromise
}
