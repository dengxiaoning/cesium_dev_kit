import { describe, it, expect } from 'vitest'
import { PlotStore, PLOT_MIN_POINTS } from '../src/utils/cesiumPluginsExtends/libs/plot/PlotStore'

const line = (id: string, type = 'AttackArrow' as const, n = 3) => ({
  id,
  type,
  positions: Array.from({ length: n }, (_, i) => [104 + i * 0.01, 30 + i * 0.01] as [number, number])
})

describe('PlotStore', () => {
  it('add / get / size', () => {
    const store = new PlotStore()
    store.add(line('a'))
    expect(store.size).toBe(1)
    expect(store.get('a')?.type).toBe('AttackArrow')
    expect(store.getAll().map((item) => item.id)).toEqual(['a'])
  })

  it('不支持的标绘类型抛错', () => {
    const store = new PlotStore()
    expect(() =>
      store.add({ id: 'x', type: 'Foo' as never, positions: [[0, 0], [1, 1], [2, 2]] })
    ).toThrow()
  })

  it('控制点不足时抛错', () => {
    const store = new PlotStore()
    expect(() => store.add({ id: 'x', type: 'StraightArrow', positions: [[0, 0], [1, 1]] })).toThrow(
      /至少需要 3/
    )
    expect(() =>
      store.add({ id: 'y', type: 'AttackArrow', positions: [[NaN, 1], [1, 1], [2, 2]] })
    ).toThrow()
  })

  it('PLOT_MIN_POINTS 校验', () => {
    expect(PLOT_MIN_POINTS.StraightArrow).toBe(3)
    expect(PLOT_MIN_POINTS.AttackArrow).toBe(3)
    expect(PLOT_MIN_POINTS.PincerArrow).toBe(3)
  })

  it('update 合并 meta', () => {
    const store = new PlotStore()
    store.add({ ...line('a'), meta: { k: 1 } })
    store.update('a', { meta: { j: 2 }, fillMaterial: '#ff0000' })
    const item = store.get('a')!
    expect(item.fillMaterial).toBe('#ff0000')
    expect(item.meta).toMatchObject({ k: 1, j: 2 })
  })

  it('undo / redo 覆盖 add / remove / clear', () => {
    const store = new PlotStore()
    store.add(line('a'))
    store.add(line('b'))
    expect(store.size).toBe(2)

    store.remove('a')
    expect(store.size).toBe(1)
    store.undo()
    expect(store.size).toBe(2)
    expect(store.get('a')).toBeTruthy()
    store.redo()
    expect(store.size).toBe(1)

    store.clear()
    expect(store.size).toBe(0)
    store.undo()
    expect(store.size).toBe(1)
  })

  it('序列化往返一致，fromJSON 不产生撤销记录', () => {
    const store = new PlotStore()
    store.add({ ...line('a'), fillMaterial: '#00ff00' })
    store.add(line('b', 'PincerArrow', 4))
    const json = JSON.parse(JSON.stringify(store.toJSON()))
    const restored = PlotStore.fromJSON(json)
    expect(restored.getAll()).toEqual(store.getAll())
    expect(restored.canUndo).toBe(false)
  })

  it('load 可撤销', () => {
    const store = new PlotStore()
    store.add(line('a'))
    store.load({ version: 1, plots: [line('b')] })
    expect(store.getAll().map((item) => item.id)).toEqual(['b'])
    store.undo()
    expect(store.getAll().map((item) => item.id)).toEqual(['a'])
  })

  it('subscribe 在 undo / redo 时也会触发', () => {
    const store = new PlotStore()
    const sizes: number[] = []
    store.subscribe((state) => sizes.push(state.plots.length))
    store.add(line('a'))
    store.undo()
    store.redo()
    expect(sizes).toEqual([1, 0, 1])
  })

  it('idFactory 可自定义', () => {
    let n = 0
    const store = new PlotStore({ idFactory: () => `plot-${++n}` })
    const created = store.add({ type: 'AttackArrow', positions: [[0, 0], [1, 1], [2, 2]] })
    expect(created.id).toBe('plot-1')
  })
})
