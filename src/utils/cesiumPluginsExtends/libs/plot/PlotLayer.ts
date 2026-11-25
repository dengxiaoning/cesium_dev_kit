/**
 * 标绘的 Cesium 绑定层。
 *
 * 订阅 {@link PlotStore}，把每条标绘同步为对应的箭头图形：
 * - `AttackArrow` / `PincerArrow` / `StraightArrow` 复用各自的 `createByData()`；
 * - 删除或变更时调用 `disable()` 并彻底销毁 handler / tooltip，避免监听器累积；
 * - `destroy()` 取消订阅并移除本层创建的所有图形。
 */
import { AttackArrow } from './AttackArrow'
import { PincerArrow } from './PincerArrow'
import { StraightArrow } from './StraightArrow'
import type { CesiumGlobal } from '../Base'
import type { PlotItem, PlotStore } from './PlotStore'

export interface PlotLayerOptions {
  /** Cesium 全局对象 */
  Cesium: CesiumGlobal
  /** Cesium viewer */
  viewer: any
  /** 数据源 */
  store: PlotStore
  /** 自定义填充材质解析；不传则把 fillMaterial 当作 CSS 颜色字符串 */
  resolveMaterial?: (item: PlotItem, Cesium: CesiumGlobal) => any
}

type PlotConstructor = new (viewer: any, cesiumGlobal: any) => any

const PLOT_CONSTRUCTORS: Record<string, PlotConstructor> = {
  AttackArrow: AttackArrow as unknown as PlotConstructor,
  PincerArrow: PincerArrow as unknown as PlotConstructor,
  StraightArrow: StraightArrow as unknown as PlotConstructor
}

export class PlotLayer {
  private readonly Cesium: CesiumGlobal
  private readonly viewer: any
  private readonly store: PlotStore
  private readonly resolveMaterial?: (item: PlotItem, Cesium: CesiumGlobal) => any
  private readonly instances = new Map<string, any>()
  private readonly signatures = new Map<string, string>()
  private readonly unsubscribe: () => void
  private disposed = false

  constructor(options: PlotLayerOptions) {
    if (!options?.Cesium) throw new Error('PlotLayer 需要传入 Cesium')
    if (!options.viewer) throw new Error('PlotLayer 需要传入 viewer')
    if (!options.store) throw new Error('PlotLayer 需要传入 store')
    this.Cesium = options.Cesium
    this.viewer = options.viewer
    this.store = options.store
    this.resolveMaterial = options.resolveMaterial
    this.unsubscribe = this.store.subscribe(() => this.sync())
    this.sync()
  }

  /** 手动全量对齐（store 变化会自动触发） */
  sync(): void {
    if (this.disposed) return
    const current = new Map<string, PlotItem>()
    for (const item of this.store.getAll()) current.set(item.id, item)

    for (const [id, signature] of Array.from(this.signatures.entries())) {
      const item = current.get(id)
      if (!item) {
        this.removeInstance(id)
        this.signatures.delete(id)
        continue
      }
      const nextSignature = JSON.stringify(item)
      if (nextSignature !== signature) {
        this.removeInstance(id)
        this.addInstance(item)
        this.signatures.set(id, nextSignature)
      }
    }

    for (const [id, item] of current) {
      if (this.signatures.has(id)) continue
      this.addInstance(item)
      this.signatures.set(id, JSON.stringify(item))
    }
  }

  /** 取消订阅并移除本层创建的所有标绘 */
  destroy(): void {
    if (this.disposed) return
    this.disposed = true
    this.unsubscribe()
    for (const id of Array.from(this.instances.keys())) this.removeInstance(id)
    this.signatures.clear()
  }

  private addInstance(item: PlotItem): void {
    const Ctor = PLOT_CONSTRUCTORS[item.type]
    if (!Ctor) return
    const instance = new Ctor(this.viewer, this.Cesium)
    if (item.fillMaterial) {
      instance.fillMaterial = this.resolveMaterial
        ? this.resolveMaterial(item, this.Cesium)
        : this.Cesium.Color.fromCssColorString(item.fillMaterial)
    }
    instance.createByData(item.positions)
    this.instances.set(item.id, instance)
  }

  private removeInstance(id: string): void {
    const instance = this.instances.get(id)
    if (!instance) return
    this.instances.delete(id)

    if (typeof instance.disable === 'function') instance.disable()
    // disable() 内部会重新创建一个 handler，这里彻底销毁，避免多次增删后监听器累积
    if (instance.handler && typeof instance.handler.destroy === 'function') {
      instance.handler.destroy()
    }
    instance.handler = null
    if (instance.modifyHandler && typeof instance.modifyHandler.destroy === 'function') {
      instance.modifyHandler.destroy()
    }
    instance.modifyHandler = null
    if (instance.tooltip && typeof instance.tooltip.destroy === 'function') {
      instance.tooltip.destroy()
    }
  }
}
