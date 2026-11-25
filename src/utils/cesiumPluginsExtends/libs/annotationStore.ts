/**
 * 标注数据模型 + 序列化 + 撤销/重做。
 *
 * 拆成两层：
 * - `AnnotationStore`：纯数据层（无 Cesium 依赖），负责增删改、撤销/重做、JSON 导入导出；
 * - `AnnotationLayer`：绑定层，把 store 里的标注同步成 Cesium entity（需要 viewer）。
 *
 * 这样业务逻辑（校验、历史、持久化）可以脱离浏览器单测，渲染层只做「数据 -> entity」。
 */
import { CommandHistory } from './history'
import type { HistoryState } from './history'
import type { CesiumGlobal } from './Base'

/** 标注类型 */
export type AnnotationType = 'point' | 'polyline' | 'polygon'

/** 坐标：[经度, 纬度] 或 [经度, 纬度, 高度] */
export type AnnotationPosition = [number, number] | [number, number, number]

/** 标注样式（按需扩展） */
export interface AnnotationStyle {
  /** 主色，CSS 颜色字符串，如 '#ffcc00' */
  color?: string
  /** 描边色 */
  outlineColor?: string
  /** 线宽 / 轮廓宽度 */
  lineWidth?: number
  /** 点大小（像素） */
  pointSize?: number
  /** 是否贴地 */
  clampToGround?: boolean
  /** 面材质（CSS 颜色或图片 URL） */
  material?: string
  [key: string]: unknown
}

/** 一条标注 */
export interface Annotation {
  id: string
  type: AnnotationType
  positions: AnnotationPosition[]
  style?: AnnotationStyle
  /** 业务自定义字段（不参与渲染，随 JSON 一起保存） */
  meta?: Record<string, unknown>
}

/** 新增标注时的输入（id 可省略，由 store 生成） */
export type AnnotationInput = Omit<Annotation, 'id'> & { id?: string }

/** 序列化格式 */
export interface AnnotationSnapshot {
  version: 1
  annotations: Annotation[]
}

export interface AnnotationStoreOptions {
  /** 复用外部历史栈；不传则内部新建 */
  history?: CommandHistory
  /** 生成 id 的函数，默认 `anno-<自增>` */
  idFactory?: () => string
}

/** store 对外状态快照 */
export interface AnnotationStoreState {
  annotations: Annotation[]
  canUndo: boolean
  canRedo: boolean
}

export type AnnotationStoreListener = (state: AnnotationStoreState) => void

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

function cloneList(list: Annotation[]): Annotation[] {
  return list.map((item) => clone(item))
}

/** 校验坐标是否合法（lng/lat 必须是有限数字） */
function isValidPosition(position: AnnotationPosition): boolean {
  return (
    Array.isArray(position) &&
    position.length >= 2 &&
    Number.isFinite(position[0]) &&
    Number.isFinite(position[1])
  )
}

export class AnnotationStore {
  readonly history: CommandHistory
  private readonly idFactory: () => string
  private readonly map = new Map<string, Annotation>()
  private order: string[] = []
  private readonly listeners = new Set<AnnotationStoreListener>()
  private seq = 0

  constructor(options: AnnotationStoreOptions = {}) {
    this.history = options.history ?? new CommandHistory()
    this.idFactory =
      options.idFactory ?? (() => `anno-${Date.now().toString(36)}-${++this.seq}`)
    // 任何历史变化（含 undo/redo）都同步通知 store 订阅者
    this.history.subscribe(() => this.notify())
  }

  /** 当前所有标注（按插入顺序，返回浅拷贝数组） */
  getAll(): Annotation[] {
    return this.order.map((id) => this.map.get(id)!).filter(Boolean)
  }

  get(id: string): Annotation | undefined {
    return this.map.get(id)
  }

  get size(): number {
    return this.order.length
  }

  get canUndo(): boolean {
    return this.history.canUndo
  }

  get canRedo(): boolean {
    return this.history.canRedo
  }

  /** 新增一条标注，返回最终写入的标注 */
  add(input: AnnotationInput): Annotation {
    const id = input.id ?? this.idFactory()
    if (this.map.has(id)) throw new Error(`标注 id 已存在：${id}`)
    if (!input.positions || input.positions.length === 0) {
      throw new Error('标注至少需要一个坐标点')
    }
    if (!input.positions.every(isValidPosition)) {
      throw new Error('标注坐标必须是 [lng, lat] 或 [lng, lat, height]')
    }
    const annotation: Annotation = clone({
      id,
      type: input.type,
      positions: input.positions,
      style: input.style,
      meta: input.meta
    })
    this.mutate('add', [...this.getAll(), annotation])
    return this.get(id)!
  }

  /** 更新一条标注（style / meta 做浅合并），不存在返回 null */
  update(id: string, patch: Partial<Omit<Annotation, 'id'>>): Annotation | null {
    const old = this.get(id)
    if (!old) return null
    if (patch.positions && !patch.positions.every(isValidPosition)) {
      throw new Error('标注坐标必须是 [lng, lat] 或 [lng, lat, height]')
    }
    const next: Annotation = {
      ...old,
      ...patch,
      id,
      positions: patch.positions ?? old.positions,
      style: patch.style ? { ...old.style, ...patch.style } : old.style,
      meta: patch.meta ? { ...old.meta, ...patch.meta } : old.meta
    }
    this.mutate(
      'update',
      this.getAll().map((item) => (item.id === id ? next : item))
    )
    return this.get(id) ?? null
  }

  /** 删除一条标注，成功返回 true */
  remove(id: string): boolean {
    if (!this.map.has(id)) return false
    this.mutate(
      'remove',
      this.getAll().filter((item) => item.id !== id)
    )
    return true
  }

  /** 清空全部标注（可撤销） */
  clear(): void {
    if (!this.order.length) return
    this.mutate('clear', [])
  }

  /** 载入一份快照（可撤销） */
  load(snapshot: AnnotationSnapshot | Annotation[]): void {
    const list = Array.isArray(snapshot) ? snapshot : snapshot.annotations
    if (!Array.isArray(list)) throw new Error('无效的标注快照')
    this.mutate('load', cloneList(list))
  }

  /** 直接替换全部内容，不进入撤销栈（用于初始化 / fromJSON） */
  replaceAll(list: Annotation[]): void {
    this.restore(cloneList(list))
    this.notify()
  }

  /** 序列化为可持久化的纯 JSON */
  toJSON(): AnnotationSnapshot {
    return { version: 1, annotations: cloneList(this.getAll()) }
  }

  /** 从快照创建 store（不产生撤销记录） */
  static fromJSON(
    snapshot: AnnotationSnapshot | Annotation[],
    options: AnnotationStoreOptions = {}
  ): AnnotationStore {
    const store = new AnnotationStore(options)
    const list = Array.isArray(snapshot) ? snapshot : snapshot.annotations
    store.replaceAll(list)
    return store
  }

  undo(): boolean {
    return this.history.undo()
  }

  redo(): boolean {
    return this.history.redo()
  }

  getState(): AnnotationStoreState {
    return {
      annotations: this.getAll(),
      canUndo: this.canUndo,
      canRedo: this.canRedo
    }
  }

  /** 订阅 store 变化（含撤销 / 重做），返回取消订阅函数 */
  subscribe(listener: AnnotationStoreListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private restore(list: Annotation[]): void {
    this.map.clear()
    this.order = []
    for (const item of list) {
      if (!item || typeof item.id !== 'string') continue
      this.map.set(item.id, item)
      this.order.push(item.id)
    }
  }

  private mutate(label: string, next: Annotation[]): void {
    const before = cloneList(this.getAll())
    const after = cloneList(next)
    this.history.execute({
      label,
      apply: () => this.restore(cloneList(after)),
      revert: () => this.restore(cloneList(before))
    })
  }

  private notify(): void {
    if (!this.listeners.size) return
    const state = this.getState()
    for (const listener of this.listeners) listener(state)
  }
}

/* -------------------------------------------------------------------------- */
/*                              Cesium 绑定层                                  */
/* -------------------------------------------------------------------------- */

export interface AnnotationLayerOptions {
  /** Cesium 全局对象 */
  Cesium: CesiumGlobal
  /** Cesium viewer */
  viewer: any
  /** 数据源 */
  store: AnnotationStore
  /** entity id 前缀，默认 `cdk-anno-` */
  idPrefix?: string
  /** 自定义「标注 -> entity」转换；不传则按类型生成默认 entity */
  createEntity?: (annotation: Annotation, Cesium: CesiumGlobal) => any
}

/**
 * 把 {@link AnnotationStore} 同步为 Cesium entity。
 *
 * - store 有任何变化（增删改、撤销、重做、载入）都会自动 diff 并更新 entity；
 * - 变更的标注采用「删掉重建」策略，避免 Cesium 属性更新 API 的兼容坑；
 * - `destroy()` 会取消订阅并移除本层创建的 entity。
 */
export class AnnotationLayer {
  private readonly Cesium: CesiumGlobal
  private readonly viewer: any
  private readonly store: AnnotationStore
  private readonly idPrefix: string
  private readonly createEntity?: (annotation: Annotation, Cesium: CesiumGlobal) => any
  private readonly signatures = new Map<string, string>()
  private readonly entities = new Map<string, any>()
  private readonly unsubscribe: () => void
  private disposed = false

  constructor(options: AnnotationLayerOptions) {
    if (!options?.Cesium) throw new Error('AnnotationLayer 需要传入 Cesium')
    if (!options.viewer) throw new Error('AnnotationLayer 需要传入 viewer')
    if (!options.store) throw new Error('AnnotationLayer 需要传入 store')
    this.Cesium = options.Cesium
    this.viewer = options.viewer
    this.store = options.store
    this.idPrefix = options.idPrefix ?? 'cdk-anno-'
    this.createEntity = options.createEntity
    this.unsubscribe = this.store.subscribe(() => this.sync())
    this.sync()
  }

  /** 手动全量对齐（一般不需要调用，store 变化会自动触发） */
  sync(): void {
    if (this.disposed) return
    const current = new Map<string, Annotation>()
    for (const annotation of this.store.getAll()) current.set(annotation.id, annotation)

    // 删除已移除 / 已变更的
    for (const [id, signature] of Array.from(this.signatures.entries())) {
      const annotation = current.get(id)
      if (!annotation) {
        this.removeEntity(id)
        this.signatures.delete(id)
        continue
      }
      const nextSignature = JSON.stringify(annotation)
      if (nextSignature !== signature) {
        this.removeEntity(id)
        this.addEntity(annotation)
        this.signatures.set(id, nextSignature)
      }
    }

    // 新增
    for (const [id, annotation] of current) {
      if (this.signatures.has(id)) continue
      this.addEntity(annotation)
      this.signatures.set(id, JSON.stringify(annotation))
    }
  }

  /** 取消订阅并移除本层创建的所有 entity */
  destroy(): void {
    if (this.disposed) return
    this.disposed = true
    this.unsubscribe()
    for (const id of Array.from(this.entities.keys())) this.removeEntity(id)
    this.signatures.clear()
  }

  private addEntity(annotation: Annotation): void {
    const entity =
      (this.createEntity
        ? this.createEntity(annotation, this.Cesium)
        : this.defaultEntity(annotation)) ?? null
    if (!entity) return
    this.viewer.entities.add(entity)
    this.entities.set(annotation.id, entity)
  }

  private removeEntity(id: string): void {
    const entity = this.entities.get(id)
    if (entity) {
      this.viewer.entities.remove(entity)
      this.entities.delete(id)
    }
  }

  private toCartesians(positions: AnnotationPosition[]): any[] {
    const Cesium = this.Cesium
    const hasHeight = positions.some((position) => position.length >= 3)
    if (hasHeight) {
      const flat: number[] = []
      for (const position of positions) flat.push(position[0], position[1], position[2] ?? 0)
      return Cesium.Cartesian3.fromDegreesArrayHeights(flat)
    }
    const flat: number[] = []
    for (const position of positions) flat.push(position[0], position[1])
    return Cesium.Cartesian3.fromDegreesArray(flat)
  }

  private defaultEntity(annotation: Annotation): any {
    const Cesium = this.Cesium
    const style = annotation.style ?? {}
    const color = style.color
      ? Cesium.Color.fromCssColorString(style.color)
      : Cesium.Color.YELLOW

    if (annotation.type === 'point') {
      const position = annotation.positions[0]
      return {
        position: Cesium.Cartesian3.fromDegrees(
          position[0],
          position[1],
          position[2] ?? 0
        ),
        point: {
          pixelSize: style.pointSize ?? 8,
          color,
          outlineColor: style.outlineColor
            ? Cesium.Color.fromCssColorString(style.outlineColor)
            : Cesium.Color.WHITE,
          outlineWidth: 1
        }
      }
    }

    const cartesians = this.toCartesians(annotation.positions)

    if (annotation.type === 'polyline') {
      return {
        polyline: {
          positions: cartesians,
          width: style.lineWidth ?? 2,
          material: color,
          clampToGround: style.clampToGround ?? false
        }
      }
    }

    return {
      polygon: {
        hierarchy: cartesians,
        material: style.material ?? color.withAlpha(0.4),
        clampToGround: style.clampToGround ?? true
      }
    }
  }
}

export type { HistoryState }
