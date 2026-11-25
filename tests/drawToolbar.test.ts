import { describe, it, expect } from 'vitest'
import {
  normalizeModes,
  resolveActiveMode,
  DEFAULT_DRAW_MODES
} from '../src/utils/cesiumPluginsExtends/libs/webcomponents/drawToolbar'

describe('drawToolbar 纯函数', () => {
  it('normalizeModes 无输入时回退默认值', () => {
    expect(normalizeModes()).toEqual(DEFAULT_DRAW_MODES)
    expect(normalizeModes('')).toEqual(DEFAULT_DRAW_MODES)
    expect(normalizeModes(null)).toEqual(DEFAULT_DRAW_MODES)
  })

  it('normalizeModes 解析逗号字符串、去重、过滤非法项', () => {
    expect(normalizeModes('point, polygon ,point,foo')).toEqual(['point', 'polygon'])
  })

  it('normalizeModes 支持数组输入', () => {
    expect(normalizeModes(['circle', 'wall', 'circle'])).toEqual(['circle', 'wall'])
  })

  it('normalizeModes 全部非法时回退默认值', () => {
    expect(normalizeModes('foo,bar')).toEqual(DEFAULT_DRAW_MODES)
  })

  it('resolveActiveMode 命中返回模式，否则返回 null', () => {
    expect(resolveActiveMode(['point', 'polygon'], 'point')).toBe('point')
    expect(resolveActiveMode(['point'], 'polygon')).toBe(null)
    expect(resolveActiveMode(['point'], null)).toBe(null)
    expect(resolveActiveMode(['point'], undefined)).toBe(null)
  })
})
