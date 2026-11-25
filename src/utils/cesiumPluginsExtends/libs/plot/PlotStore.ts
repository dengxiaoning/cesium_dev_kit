/**
 * 标绘（攻击箭头 / 钳击箭头 / 直线箭头）的数据模型 + 序列化 + 撤销/重做。
 *
 * 与 `annotationStore` 同构，拆成两层：
 * - `PlotStore`：纯数据层（无 Cesium 依赖），管理控制点、撤销/重做、JSON 导入导出；
 * - `PlotLayer`：绑定层，把 store 里的标绘同步成 Cesium 图形（需要 viewer）。
 *
 * 标绘本身已有 `createByData()`（数据 -> 图形）和 `getLnglats()`（图形 -> 数据），
 * 这里在其上补齐「多条标绘的统一管理 + 持久化 + 历史记录」。
 */
import { CommandHistory } from '../history'
import type { HistoryState } from '../history'

/** 支持的标绘类型 */
export type PlotType = 'AttackArrow' | 'PincerArrow' | 'StraightArrow'

/** 控制点经纬度 [lng, lat] */
export type PlotPosition = [number, number]

/** 一条标绘 */
export interface PlotItem {
  id: string
  type: PlotType
  /** 控制点（顺序与交互绘制时一致） */
  positions: PlotPosition[]
  /** 填充色（CSS 颜色字符串，如 '#ff0000'）；不传用默认红色 */
  fillMaterial?: string
  /** 业务自定义字段，随 JSON 一起保存 */
  meta?: Record<string, unknown>
}

/** 新增标绘时的输入（id 可省略） */
export type PlotInput = Omit<PlotItem, 'id'> & { id?: string }

/** 序列化格式 */
export interface PlotSnapshot {
  version: 1
  plots: PlotItem[]
}

export interface PlotStoreOptions {
  history?: CommandHistory
  idFactory?: () => string
}

export interface PlotStoreState {
  plots: PlotItem[]
  canUndo: boolean
  canRedo: boolean
}

export type PlotStoreListener = (state: PlotStoreState) => void

/** 各类型标绘所需的最少控制点 */
export const PLOT_MIN_POINTS: Record<PlotType, number> = {
  AttackArrow: 3,
  PincerArrow: 3,
  StraightArrow: 3
}

const PLOT_TYPES: PlotType[] = ['AttackArrow', 'PincerArrow', 'StraightArrow']

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

function cloneList(list: PlotItem[]): PlotItem[] {
  return list.map((item) => clone(item))
}

function isValidPosition(position: PlotPosition): boolean {
  return (
    Array.isArray(position) &&
    position.length >= 2 &&
    Number.isFinite(position[0]) &&
    Number.isFinite(position[1])
  )
}

function validate(item: PlotItem): void {
  if (!PLOT_TYPES.includes(item.type)) {
    throw new Error(`不支持的标绘类型：${String(item.type)}`)
  }
  const min = PLOT_MIN_POINTS[item.type]
  if (!Array.isArray(item.positions) || item.positions.length < min) {
    throw new Error(`${item.type} 至少需要 ${min} 个控制点`)
  }
  if (!item.positions.every(isValidPosition)) {
    throw new Error('标绘控制点必须是 [lng, lat]')
  }
}

export class PlotStore {
  readonly history: CommandHistory
  private readonly idFactory: () => string
  private readonly map = new Map<string, PlotItem>()
  private order: string[] = []
  private readonly listeners = new Set<PlotStoreListener>()
  private seq = 0

  constructor(options: PlotStoreOptions = {}) {
    this.history = options.history ?? new CommandHistory()
    this.idFactory =
      options.idFactory ?? (() => `plot-${Date.now().toString(36)}-${++this.seq}`)
    this.history.subscribe(() => this.notify())
  }

  /** 当前所有标绘（按插入顺序） */
  getAll(): PlotItem[] {
    return this.order.map((id) => this.map.get(id)!).filter(Boolean)
  }

  get(id: string): PlotItem | undefined {
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

  /** 新增一条标绘 */
  add(input: PlotInput): PlotItem {
    const id = input.id ?? this.idFactory()
    if (this.map.has(id)) throw new Error(`标绘 id 已存在：${id}`)
    const item: PlotItem = clone({
      id,
      type: input.type,
      positions: input.positions,
      fillMaterial: input.fillMaterial,
      meta: input.meta
    })
    validate(item)
    this.mutate('add', [...this.getAll(), item])
    return this.get(id)!
  }

  /** 更新一条标绘（meta 浅合并），不存在返回 null */
  update(id: string, patch: Partial<Omit<PlotItem, 'id'>>): PlotItem | null {
    const old = this.get(id)
    if (!old) return null
    const next: PlotItem = {
      ...old,
      ...patch,
      id,
      positions: patch.positions ?? old.positions,
      meta: patch.meta ? { ...old.meta, ...patch.meta } : old.meta
    }
    validate(next)
    this.mutate(
      'update',
      this.getAll().map((item) => (item.id === id ? next : item))
    )
    return this.get(id) ?? null
  }

  /** 删除一条标绘 */
  remove(id: string): boolean {
    if (!this.map.has(id)) return false
    this.mutate(
      'remove',
      this.getAll().filter((item) => item.id !== id)
    )
    return true
  }

  /** 清空（可撤销） */
  clear(): void {
    if (!this.order.length) return
    this.mutate('clear', [])
  }

  /** 载入快照（可撤销） */
  load(snapshot: PlotSnapshot | PlotItem[]): void {
    const list = Array.isArray(snapshot) ? snapshot : snapshot.plots
    if (!Array.isArray(list)) throw new Error('无效的标绘快照')
    list.forEach(validate)
    this.mutate('load', cloneList(list))
  }

  /** 直接替换全部内容，不进入撤销栈（用于初始化 / fromJSON） */
  replaceAll(list: PlotItem[]): void {
    this.restore(cloneList(list))
    this.notify()
  }

  /** 序列化为纯 JSON */
  toJSON(): PlotSnapshot {
    return { version: 1, plots: cloneList(this.getAll()) }
  }

  /** 从快照创建 store（不产生撤销记录） */
  static fromJSON(
    snapshot: PlotSnapshot | PlotItem[],
    options: PlotStoreOptions = {}
  ): PlotStore {
    const store = new PlotStore(options)
    const list = Array.isArray(snapshot) ? snapshot : snapshot.plots
    store.replaceAll(list)
    return store
  }

  undo(): boolean {
    return this.history.undo()
  }

  redo(): boolean {
    return this.history.redo()
  }

  getState(): PlotStoreState {
    return {
      plots: this.getAll(),
      canUndo: this.canUndo,
      canRedo: this.canRedo
    }
  }

  subscribe(listener: PlotStoreListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private restore(list: PlotItem[]): void {
    this.map.clear()
    this.order = []
    for (const item of list) {
      if (!item || typeof item.id !== 'string') continue
      this.map.set(item.id, item)
      this.order.push(item.id)
    }
  }

  private mutate(label: string, next: PlotItem[]): void {
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

export type { HistoryState }
