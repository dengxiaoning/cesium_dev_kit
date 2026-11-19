/**
 * 统一错误类型与错误上报出口。
 *
 * 设计目标：
 * 1. 不再 `throw '字符串'`：所有库内主动抛出的错误都带稳定的 `code`，
 *    使用方可以按 code 做分支处理，而不用匹配错误文案。
 * 2. 不再吞掉异常：原本的 `catch {}` 改为 {@link reportError}，
 *    默认走 `console.warn` 并带上上下文，使用方也可以通过
 *    {@link setErrorHandler} 接管（上报监控、弹提示等）。
 */

/** 错误码（稳定契约，新增只会追加） */
export type CesiumDevKitErrorCode =
  /** 未传入 Cesium 全局对象 */
  | 'MISSING_CESIUM'
  /** 既没有 containerId 也没有传入 viewer */
  | 'MISSING_VIEWER'
  /** 参数非法 */
  | 'INVALID_ARGUMENT'
  /** 影像图层创建 / 加载失败 */
  | 'IMAGERY_FAILED'
  /** 可选依赖（echarts / dat.gui / libgif / three）未安装 */
  | 'OPTIONAL_DEPENDENCY_MISSING'
  /** 当前环境不支持（如 SSR / Node 下调用了需要 DOM 的能力） */
  | 'UNSUPPORTED_ENVIRONMENT'
  /** 实例已销毁后继续调用 */
  | 'DISPOSED'
  /** Cesium 版本 / 内部 API 不兼容 */
  | 'UNSUPPORTED_CESIUM_VERSION'
  /** 其它内部错误 */
  | 'INTERNAL'

/** CesiumDevKitError 构造参数 */
export interface CesiumDevKitErrorOptions {
  /** 原始错误（会被挂到 `cause` 上，便于排查） */
  cause?: unknown
  /** 附加上下文（provider 类型、url、参数名等） */
  details?: Record<string, unknown>
}

/**
 * 库统一错误类型。
 *
 * @example
 * try {
 *   await kit.base.addImageryProviderAsync({ type: 'X', option: {} })
 * } catch (err) {
 *   if (isCesiumDevKitError(err) && err.code === 'IMAGERY_FAILED') {
 *     // 降级到备用底图
 *   }
 * }
 */
export class CesiumDevKitError extends Error {
  /** 稳定错误码 */
  readonly code: CesiumDevKitErrorCode
  /** 附加上下文 */
  readonly details?: Record<string, unknown>
  /** 原始错误 */
  readonly cause?: unknown

  constructor(code: CesiumDevKitErrorCode, message: string, options: CesiumDevKitErrorOptions = {}) {
    super(`[cesium_dev_kit:${code}] ${message}`)
    this.name = 'CesiumDevKitError'
    this.code = code
    this.details = options.details
    this.cause = options.cause
    // 编译到 ES5/ES2019 时继承内置 Error 需要手动修正原型链
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** 判断是否为库内抛出的结构化错误（跨包实例 / 多副本场景同样有效） */
export function isCesiumDevKitError(value: unknown): value is CesiumDevKitError {
  if (value instanceof CesiumDevKitError) return true
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { name?: string }).name === 'CesiumDevKitError' &&
    typeof (value as { code?: string }).code === 'string'
  )
}

/** 错误上报上下文 */
export interface ErrorReportContext {
  /** 出错的能力/模块，如 'graphics.createPointGraphics' */
  scope?: string
  /** 其它附加上下文 */
  [key: string]: unknown
}

/**
 * 自定义错误处理器。
 * 返回值会被忽略；处理器内部抛错不会影响主流程。
 */
export type CesiumDevKitErrorHandler = (error: unknown, context?: ErrorReportContext) => void

let errorHandler: CesiumDevKitErrorHandler | null = null

/**
 * 注册全局错误处理器（传 null 恢复默认的 console.warn）。
 *
 * 适合接入 Sentry 等监控：
 * ```ts
 * setErrorHandler((err, ctx) => Sentry.captureException(err, { extra: ctx }))
 * ```
 */
export function setErrorHandler(handler: CesiumDevKitErrorHandler | null): void {
  errorHandler = handler
}

/** 获取当前注册的错误处理器（未注册时为 null） */
export function getErrorHandler(): CesiumDevKitErrorHandler | null {
  return errorHandler
}

/**
 * 上报一个非致命错误。
 *
 * 用于原本 `catch {}` 的位置：既不打断主流程，也不让问题彻底消失。
 * 已注册 {@link setErrorHandler} 时交给使用方，否则 `console.warn`。
 */
export function reportError(error: unknown, context?: ErrorReportContext): void {
  if (errorHandler) {
    try {
      errorHandler(error, context)
      return
    } catch (handlerError) {
      // 使用方的处理器自身出错时不能影响库逻辑
      console.error('[cesium_dev_kit] error handler threw:', handlerError)
    }
  }
  const scope = context?.scope ? `[cesium_dev_kit:${context.scope}]` : '[cesium_dev_kit]'
  console.warn(scope, error, context ?? '')
}

/** 把任意抛出物归一化成 Error，便于统一上报 */
export function toError(value: unknown): Error {
  if (value instanceof Error) return value
  if (typeof value === 'string') return new Error(value)
  try {
    return new Error(JSON.stringify(value))
  } catch {
    return new Error(String(value))
  }
}
