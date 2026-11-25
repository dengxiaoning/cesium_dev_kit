/**
 * React 适配器：把 `createKit` 的生命周期接到 React 组件生命周期上。
 *
 * - `useEffect` 挂载时创建 kit、卸载时自动 `dispose()`，无需手动清理；
 * - `kit` / `viewer` 用 `useState` 持有（重量对象，不做深层响应式）；
 * - `options` 只在挂载时读取一次，变化不会重建（如需重建请用 `key` 重新挂载组件）。
 *
 * 必须在函数组件内调用。
 *
 * @example
 * ```tsx
 * import * as Cesium from 'cesium'
 * import { useCesiumKit } from 'cesium_dev_kit/react'
 *
 * function Map() {
 *   const { kit, viewer, ready, error } = useCesiumKit({
 *     Cesium,
 *     containerId: 'cesiumContainer'
 *   })
 *
 *   if (error) return <div>初始化失败：{error.message}</div>
 *
 *   return <div id="cesiumContainer" style={{ width: '100%', height: '100%' }} />
 * }
 * ```
 */
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'
import { createKit } from '../kit'
import type { CreateKitOptions, ResModulesType } from '../kit'
import { isBrowser } from '../libs/context'
import { reportError } from '../libs/errors'

/** `useCesiumKit` 的返回值 */
export interface UseCesiumKitReturn {
  /** 已创建的 kit 实例（创建完成前为 null） */
  kit: ResModulesType | null
  /** kit 内的 Cesium viewer（等价于 `kit?.viewer`） */
  viewer: ResModulesType['viewer'] | null
  /** kit 是否已就绪 */
  ready: boolean
  /** 创建阶段抛出的错误（正常情况下为 null） */
  error: Error | null
  /** 手动销毁（组件卸载时也会自动触发） */
  dispose: () => void
}

export function useCesiumKit(options: CreateKitOptions): UseCesiumKitReturn {
  const [kit, setKit] = useState<ResModulesType | null>(null)
  const [viewer, setViewer] = useState<ResModulesType['viewer'] | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const instanceRef = useRef<ResModulesType | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const dispose = useCallback(() => {
    const instance = instanceRef.current
    if (!instance) return
    try {
      instance.dispose()
    } catch (err) {
      reportError(err, { scope: 'useCesiumKit.dispose' })
    }
    instanceRef.current = null
    setKit(null)
    setViewer(null)
    setReady(false)
  }, [])

  useEffect(() => {
    if (!isBrowser()) return
    try {
      const instance = createKit(optionsRef.current)
      instanceRef.current = instance
      setKit(instance)
      setViewer(instance.viewer)
      setReady(true)
    } catch (err) {
      const e = err as Error
      setError(e)
      reportError(err, { scope: 'useCesiumKit.create' })
    }

    return () => {
      const instance = instanceRef.current
      if (!instance) return
      try {
        instance.dispose()
      } catch (err) {
        reportError(err, { scope: 'useCesiumKit.dispose' })
      }
      instanceRef.current = null
    }
    // 仅挂载时创建一次；options 变化不重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { kit, viewer, ready, error, dispose }
}

/** 跨组件共享 kit 的 React Context */
export const CesiumKitContext = createContext<ResModulesType | null>(null)

/** Context Provider（配合 {@link useCesiumKitShared} 使用） */
export const CesiumKitProvider = CesiumKitContext.Provider

/**
 * 读取上层 {@link CesiumKitProvider} 注入的 kit；未注入时返回 null。
 *
 * @example
 * const kit = useCesiumKitShared()
 * kit?.graphics.createPointGraphics({ ... })
 */
export function useCesiumKitShared(): ResModulesType | null {
  return useContext(CesiumKitContext)
}
