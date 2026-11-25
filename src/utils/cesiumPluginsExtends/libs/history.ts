/**
 * 通用撤销 / 重做栈（框架无关、无 Cesium 依赖，可在 Node 中单测）。
 *
 * 设计要点：
 * - `execute(cmd)` 先执行再记录；`record(cmd)` 只记录「已经执行过」的命令；
 * - `undo()` 调用 `revert()`，`redo()` 再次 `apply()`；
 * - 任何新命令都会清空 redo 栈（标准撤销语义）；
 * - `maxSize` 限制撤销深度，超出丢弃最旧的命令；
 * - `subscribe()` 可在工具栏按钮上实时反映 `canUndo` / `canRedo`。
 *
 * @example
 * ```ts
 * const history = new CommandHistory({ maxSize: 50 })
 * history.execute({
 *   label: '新增点',
 *   apply: () => store.add(point),
 *   revert: () => store.remove(point.id)
 * })
 * history.undo()
 * history.redo()
 * ```
 */

/** 一条可撤销命令 */
export interface HistoryCommand {
  /** 命令名称，便于 UI 展示「撤销：xxx」 */
  label?: string
  /** 执行 / 重做时调用 */
  apply: () => void
  /** 撤销时调用 */
  revert: () => void
}

/** 撤销栈对外暴露的状态快照 */
export interface HistoryState {
  canUndo: boolean
  canRedo: boolean
  undoSize: number
  redoSize: number
  /** 下一次撤销对应的命令名称 */
  lastLabel?: string
}

export type HistoryListener = (state: HistoryState) => void

export interface CommandHistoryOptions {
  /** 最多保留多少步撤销，默认 100 */
  maxSize?: number
}

export class CommandHistory {
  private readonly undoStack: HistoryCommand[] = []
  private readonly redoStack: HistoryCommand[] = []
  private readonly listeners = new Set<HistoryListener>()
  private readonly maxSize: number

  constructor(options: CommandHistoryOptions = {}) {
    this.maxSize = Math.max(1, Math.floor(options.maxSize ?? 100))
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  get undoSize(): number {
    return this.undoStack.length
  }

  get redoSize(): number {
    return this.redoStack.length
  }

  /** 执行并记录一条命令（执行失败则不记录） */
  execute(command: HistoryCommand): void {
    command.apply()
    this.record(command)
  }

  /** 记录一条「已经执行过」的命令，不会再次 apply */
  record(command: HistoryCommand): void {
    this.undoStack.push(command)
    if (this.undoStack.length > this.maxSize) this.undoStack.shift()
    this.redoStack.length = 0
    this.notify()
  }

  /** 撤销一步；成功返回 true */
  undo(): boolean {
    const command = this.undoStack.pop()
    if (!command) return false
    try {
      command.revert()
    } catch (err) {
      // 撤销失败时把命令放回，保持状态一致
      this.undoStack.push(command)
      throw err
    }
    this.redoStack.push(command)
    this.notify()
    return true
  }

  /** 重做一步；成功返回 true */
  redo(): boolean {
    const command = this.redoStack.pop()
    if (!command) return false
    try {
      command.apply()
    } catch (err) {
      this.redoStack.push(command)
      throw err
    }
    this.undoStack.push(command)
    this.notify()
    return true
  }

  /** 清空撤销 / 重做栈 */
  clear(): void {
    if (!this.undoStack.length && !this.redoStack.length) return
    this.undoStack.length = 0
    this.redoStack.length = 0
    this.notify()
  }

  getState(): HistoryState {
    return {
      canUndo: this.canUndo,
      canRedo: this.canRedo,
      undoSize: this.undoSize,
      redoSize: this.redoSize,
      lastLabel: this.undoStack[this.undoStack.length - 1]?.label
    }
  }

  /** 订阅状态变化，返回取消订阅函数 */
  subscribe(listener: HistoryListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    if (!this.listeners.size) return
    const state = this.getState()
    for (const listener of this.listeners) listener(state)
  }
}
