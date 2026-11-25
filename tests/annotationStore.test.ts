import { describe, it, expect } from 'vitest'
import { AnnotationStore } from '../src/utils/cesiumPluginsExtends/libs/annotationStore'

describe('AnnotationStore', () => {
  it('add / get / size', () => {
    const store = new AnnotationStore()
    store.add({ id: 'a', type: 'point', positions: [[104, 30]] })
    expect(store.size).toBe(1)
    expect(store.get('a')?.type).toBe('point')
    expect(store.getAll().map((item) => item.id)).toEqual(['a'])
  })

  it('重复 id 抛错', () => {
    const store = new AnnotationStore()
    store.add({ id: 'a', type: 'point', positions: [[104, 30]] })
    expect(() => store.add({ id: 'a', type: 'point', positions: [[104, 30]] })).toThrow()
  })

  it('update 合并 style / meta', () => {
    const store = new AnnotationStore()
    store.add({
      id: 'a',
      type: 'point',
      positions: [[104, 30]],
      style: { color: 'red' },
      meta: { k: 1 }
    })
    store.update('a', { style: { pointSize: 10 }, meta: { j: 2 } })
    const annotation = store.get('a')!
    expect(annotation.style).toMatchObject({ color: 'red', pointSize: 10 })
    expect(annotation.meta).toMatchObject({ k: 1, j: 2 })
  })

  it('update 不存在的 id 返回 null', () => {
    const store = new AnnotationStore()
    expect(store.update('missing', { type: 'point' })).toBe(null)
  })

  it('undo / redo 覆盖 add / remove / clear', () => {
    const store = new AnnotationStore()
    store.add({ id: 'a', type: 'point', positions: [[104, 30]] })
    store.add({ id: 'b', type: 'point', positions: [[105, 31]] })
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
    const store = new AnnotationStore()
    store.add({
      id: 'a',
      type: 'polyline',
      positions: [
        [104, 30],
        [105, 31]
      ],
      style: { lineWidth: 3 }
    })
    const json = JSON.parse(JSON.stringify(store.toJSON()))
    const restored = AnnotationStore.fromJSON(json)
    expect(restored.getAll()).toEqual(store.getAll())
    expect(restored.canUndo).toBe(false)
  })

  it('load 可撤销', () => {
    const store = new AnnotationStore()
    store.add({ id: 'a', type: 'point', positions: [[104, 30]] })
    store.load({
      version: 1,
      annotations: [{ id: 'b', type: 'point', positions: [[1, 2]] }]
    })
    expect(store.getAll().map((item) => item.id)).toEqual(['b'])
    store.undo()
    expect(store.getAll().map((item) => item.id)).toEqual(['a'])
  })

  it('非法坐标抛错', () => {
    const store = new AnnotationStore()
    expect(() => store.add({ id: 'x', type: 'point', positions: [[NaN, 30]] })).toThrow()
    expect(() => store.add({ id: 'y', type: 'point', positions: [] })).toThrow()
  })

  it('subscribe 在 undo / redo 时也会触发', () => {
    const store = new AnnotationStore()
    const sizes: number[] = []
    store.subscribe((state) => sizes.push(state.annotations.length))
    store.add({ id: 'a', type: 'point', positions: [[104, 30]] })
    store.undo()
    store.redo()
    expect(sizes).toEqual([1, 0, 1])
  })

  it('idFactory 可自定义', () => {
    let n = 0
    const store = new AnnotationStore({ idFactory: () => `custom-${++n}` })
    const created = store.add({ type: 'point', positions: [[0, 0]] })
    expect(created.id).toBe('custom-1')
  })
})
