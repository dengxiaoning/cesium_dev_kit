import { describe, it, expect, vi } from 'vitest'
import { CommandHistory } from '../src/utils/cesiumPluginsExtends/libs/history'

describe('CommandHistory', () => {
  it('execute 执行并记录，undo/redo 正确回放', () => {
    const value = { n: 0 }
    const history = new CommandHistory()
    history.execute({
      label: 'inc',
      apply: () => {
        value.n += 1
      },
      revert: () => {
        value.n -= 1
      }
    })
    expect(value.n).toBe(1)
    expect(history.canUndo).toBe(true)
    expect(history.canRedo).toBe(false)
    expect(history.getState().lastLabel).toBe('inc')

    expect(history.undo()).toBe(true)
    expect(value.n).toBe(0)
    expect(history.canRedo).toBe(true)

    expect(history.redo()).toBe(true)
    expect(value.n).toBe(1)
  })

  it('新命令清空 redo 栈', () => {
    const history = new CommandHistory()
    const log: number[] = []
    history.execute({ apply: () => log.push(1), revert: () => log.pop() })
    history.undo()
    expect(history.canRedo).toBe(true)
    history.execute({ apply: () => log.push(2), revert: () => log.pop() })
    expect(history.canRedo).toBe(false)
  })

  it('record 不会重复 apply', () => {
    const history = new CommandHistory()
    const apply = vi.fn()
    const revert = vi.fn()
    history.record({ apply, revert })
    expect(apply).not.toHaveBeenCalled()
    history.undo()
    expect(revert).toHaveBeenCalledOnce()
    history.redo()
    expect(apply).toHaveBeenCalledOnce()
  })

  it('maxSize 丢弃最旧命令', () => {
    const history = new CommandHistory({ maxSize: 2 })
    const value = { n: 0 }
    for (let i = 0; i < 5; i++) {
      history.execute({
        apply: () => {
          value.n += 1
        },
        revert: () => {
          value.n -= 1
        }
      })
    }
    expect(history.undoSize).toBe(2)
    expect(history.undo()).toBe(true)
    expect(history.undo()).toBe(true)
    expect(history.undo()).toBe(false)
    expect(value.n).toBe(3)
  })

  it('subscribe 收到状态变化，取消订阅后不再触发', () => {
    const history = new CommandHistory()
    const states: boolean[] = []
    const off = history.subscribe((state) => states.push(state.canUndo))
    history.execute({ apply: () => {}, revert: () => {} })
    history.undo()
    off()
    history.execute({ apply: () => {}, revert: () => {} })
    expect(states).toEqual([true, false])
  })

  it('apply 抛错时不记录', () => {
    const history = new CommandHistory()
    expect(() =>
      history.execute({
        apply: () => {
          throw new Error('boom')
        },
        revert: () => {}
      })
    ).toThrow('boom')
    expect(history.canUndo).toBe(false)
  })

  it('revert 抛错时命令保留在撤销栈', () => {
    const history = new CommandHistory()
    history.execute({
      apply: () => {},
      revert: () => {
        throw new Error('revert-fail')
      }
    })
    expect(() => history.undo()).toThrow('revert-fail')
    expect(history.canUndo).toBe(true)
    expect(history.canRedo).toBe(false)
  })

  it('clear 清空两个栈', () => {
    const history = new CommandHistory()
    history.execute({ apply: () => {}, revert: () => {} })
    history.undo()
    history.clear()
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(false)
  })
})
