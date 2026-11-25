import {
  onMounted,
  onScopeDispose,
  ref,
  shallowRef,
  provide,
  inject,
  type InjectionKey,
  type Ref,
  type ShallowRef
} from 'vue'
import { createKit } from '../kit'
import type { CreateKitOptions, ResModulesType } from '../kit'
import { isBrowser } from '../libs/context'
import { reportError } from '../libs/errors'

/**
 * Vue 3 组合式 API 适配器：把 `createKit` 的生命周期接到组件生命周期上。
 *
 * - `onMounted` 时才创建 kit（保证挂载容器已存在、处于浏览器环境）；
 * - `onScopeDispose` 时自动 `dispose()`，无需手动清理；
 * - 返回 `shallowRef`（kit / viewer 是重量对象，不需要深层响应式）。
 *
 * 必须在组件的 `setup()` 内调用。
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import * as Cesium from 'cesium'
 * import { useCesiumKit } from 'cesium_dev_kit/vue'
 *
 * const { kit, viewer, ready, error } = useCesiumKit({
 *   Cesium,
 *   containerId: 'cesiumContainer'
 * })
 * </script>
 *
 * <template>
 *   <div id="cesiumContainer" style="width:100%;height:100%"></div>
 * </template>
 * ```
 */
export interface UseCesiumKitReturn {
  /** 已创建的 kit 实例（创建完成前为 null） */
  kit: ShallowRef<ResModulesType | null>
  /** kit 内的 Cesium viewer（等价于 `kit.value?.viewer`） */
  viewer: ShallowRef<ResModulesType['viewer'] | null>
  /** kit 是否已就绪 */
  ready: Ref<boolean>
  /** 创建阶段抛出的错误（正常情况下为 null） */
  error: ShallowRef<Error | null>
  /** 手动销毁（组件卸载时也会自动触发） */
  dispose: () => void
}

export function useCesiumKit(options: CreateKitOptions): UseCesiumKitReturn {
  const kit = shallowRef<ResModulesType | null>(null)
  const viewer = shallowRef<ResModulesType['viewer'] | null>(null)
  const ready = ref(false)
  const error = shallowRef<Error | null>(null)
  let instance: ResModulesType | null = null

  const dispose = () => {
    if (!instance) return
    try {
      instance.dispose()
    } catch (err) {
      reportError(err, { scope: 'useCesiumKit.dispose' })
    }
    instance = null
    kit.value = null
    viewer.value = null
    ready.value = false
  }

  onMounted(() => {
    if (!isBrowser()) return
    try {
      instance = createKit(options)
      kit.value = instance
      viewer.value = instance.viewer
      ready.value = true
    } catch (err) {
      error.value = err as Error
      reportError(err, { scope: 'useCesiumKit.create' })
    }
  })

  onScopeDispose(dispose)

  return { kit, viewer, ready, error, dispose }
}

/** 跨组件共享 kit 的注入键（配合 {@link provideCesiumKit} / {@link useCesiumKitShared}） */
export const CESIUM_KIT_KEY: InjectionKey<ShallowRef<ResModulesType | null>> = Symbol(
  'cesium_dev_kit:kit'
)

/**
 * 在父组件 provide 一个 kit ref，让子组件无需重复创建、共享同一个 viewer。
 *
 * @example
 * const { kit } = useCesiumKit(options)
 * provideCesiumKit(kit)
 */
export function provideCesiumKit(kitRef: ShallowRef<ResModulesType | null>): void {
  provide(CESIUM_KIT_KEY, kitRef)
}

/**
 * 读取父组件通过 {@link provideCesiumKit} 注入的 kit ref；未注入时返回 undefined。
 */
export function useCesiumKitShared(): ShallowRef<ResModulesType | null> | undefined {
  return inject(CESIUM_KIT_KEY, undefined)
}
