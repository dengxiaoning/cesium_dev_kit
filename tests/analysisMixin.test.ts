import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { prototypeExtends } from '../src/utils/cesiumPluginsExtends/kit'
import { Base, Math2d, Math3d, Draw, Plugin, Analysis } from '../src/utils/cesiumPluginsExtends/libs'

/**
 * 回归测试：Analysis 必须混入 Draw 所依赖的 Math3d / Math2d。
 *
 * 背景：Draw 自身是 `protoExtends([Base, Math3d, Math2d], Draw)`，其
 * `_addInfoPoint` 会调 `$this.getPositionDistance()`（Math3d）。
 * 而 `prototypeExtends` 的 `exeClone` 只拷贝父原型的 **own** 方法，且
 * `resolveScopedConstructor` 每次 `factory()` 都生成全新原型 —— 所以
 * `_draw` 那次 Math3d 混入不会串到 `_analysis`。
 *
 * 早期原型共享时这个疏漏被掩盖；改成按实例隔离后，剖面 / 通视等所有
 * 走 `drawLineGraphics` 的分析都会抛
 * `TypeError: $this.getPositionDistance is not a function`。
 *
 * 这里直接从源码解析出真实的父模块列表再构建，既验证行为，也守住接线。
 */

const MODULES: Record<string, unknown> = { Base, Math2d, Math3d, Draw, Plugin, Analysis }

/** 从源码里取出 Analysis 的父模块列表，确保测试覆盖的是真实接线而不是测试里硬编码的列表 */
function readAnalysisParents(file: string, pattern: RegExp): string[] {
  const src = readFileSync(join(process.cwd(), file), 'utf8')
  const matched = src.match(pattern)
  expect(matched, `未在 ${file} 中匹配到 Analysis 的父模块列表`).toBeTruthy()
  return (matched![1].match(/[A-Za-z0-9_]+/g) || []).filter((name) => name in MODULES)
}

describe('Analysis 原型混入依赖', () => {
  it('createKit 的 analysis 混入列表包含 Draw 依赖的 Math3d / Math2d', () => {
    const parents = readAnalysisParents(
      'src/utils/cesiumPluginsExtends/kit.ts',
      /protoExtends\((\[[^\]]*\])\s*,\s*Analysis\)/
    )
    expect(parents).toContain('Draw')
    expect(parents).toContain('Math3d')
    expect(parents).toContain('Math2d')

    // 用真实列表构建（viewer 传 undefined：各构造函数均有 if (viewer) 保护，
    // 只执行 exeClone 的原型拷贝，不需要 Cesium / DOM stub）
    const protoExtends = prototypeExtends(undefined as never, undefined as never, undefined)
    const analysis = protoExtends(
      parents.map((name) => MODULES[name]),
      Analysis
    ) as Record<string, unknown>

    // Draw._addInfoPoint 依赖（剖面 / 通视等画线分析都会走到）
    expect(typeof analysis.getPositionDistance).toBe('function')
    expect(typeof analysis.getPositionsArea).toBe('function')
    // Draw 自身方法
    expect(typeof analysis.drawLineGraphics).toBe('function')
    // Analysis 自身方法仍然保留
    expect(typeof analysis.createProfileAnalysis).toBe('function')
  })

  it('singleImport 的 analysis 混入列表同样包含 Math3d / Math2d', () => {
    const parents = readAnalysisParents(
      'src/utils/cesiumPluginsExtends/singleImport/Analysis.ts',
      /createSingleImport[\s\S]*?\[([^\]]*)\]/
    )
    expect(parents).toContain('Draw')
    expect(parents).toContain('Math3d')
    expect(parents).toContain('Math2d')
  })
})

describe('多观察点可视域必须为每个观察点摆视域姿态', () => {
  it('createMultiViewshedAnalysis 要 setPoseByTargetPoint 或设置 direction/distance', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/utils/cesiumPluginsExtends/libs/Analysis.ts'),
      'utf8'
    )
    // 截取该方法体（到下一个方法为止），避免正则边界误判
    const start = src.indexOf('createMultiViewshedAnalysis: function')
    const end = src.indexOf('createCutVolumeCompareAnalysis: function')
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const body = src.slice(start, end)

    // ShadowPrimitive 构造后默认 _direction=0 / _pitch=0 / _distance=100，
    // 相机贴地朝北只看 100m，视域小到看不见（只剩黄色 debug 框架）。
    // 必须显式摆姿势，否则多观察点可视域等于没渲染。
    expect(body).toContain('setPoseByTargetPoint')
    expect(body).toContain('distance = defaultDistance')
    // 交互模式要跟随鼠标瞄准当前观察点（与单观察点可视域一致）
    expect(body).toContain('mouseMove')
  })
})

describe('多观察点交互：确认这一击不能又新建一个观察点', () => {
  const src = readFileSync(
    join(process.cwd(), 'src/utils/cesiumPluginsExtends/libs/Analysis.ts'),
    'utf8'
  )
  const start = src.indexOf('createMultiViewshedAnalysis: function')
  const end = src.indexOf('createCutVolumeCompareAnalysis: function')
  const body = src.slice(start, end)

  it('点击处理先判断 aiming（确认）并 return，之后才走到新建观察点', () => {
    const clickStart = body.indexOf('leftClick:')
    const moveStart = body.indexOf('mouseMove:')
    expect(clickStart).toBeGreaterThan(-1)
    expect(moveStart).toBeGreaterThan(clickStart)
    const clickBody = body.slice(clickStart, moveStart)

    const aimingIdx = clickBody.indexOf('if (aiming)')
    const placeIdx = clickBody.indexOf('addObserverCartesian(position)')
    expect(aimingIdx, '缺少「确认」分支').toBeGreaterThan(-1)
    expect(placeIdx, '缺少新建观察点').toBeGreaterThan(aimingIdx)

    // 确认分支必须提前 return，否则会落到新建（表现就是「点一下收尾却多一个」）
    const confirmBranch = clickBody.slice(aimingIdx, placeIdx)
    expect(confirmBranch).toContain('return;')
    expect(confirmBranch).not.toContain('addObserverCartesian(')
  })

  it('结果对象提供 finish() 以提前结束交互', () => {
    expect(body).toContain('finish: function')
    // 接口同步声明，调用方拿得到类型
    expect(src).toContain('finish(): void')
  })
})

describe('分析类交互事件不能层层叠加', () => {
  const src = readFileSync(
    join(process.cwd(), 'src/utils/cesiumPluginsExtends/libs/Analysis.ts'),
    'utf8'
  )

  it('bindAnalysisEvent 会销毁上一层 handler', () => {
    const helperStart = src.indexOf('function bindAnalysisEvent')
    const helperEnd = src.indexOf('/** 画笔类方法的通用参数')
    expect(helperStart, '缺少 bindAnalysisEvent 辅助函数').toBeGreaterThan(-1)
    expect(helperEnd).toBeGreaterThan(helperStart)
    const helper = src.slice(helperStart, helperEnd)

    expect(helper).toContain('_analysisEventHandler')
    expect(helper).toContain('.destroy()')
  })

  it('交互式分析都走 bindAnalysisEvent，而不是直接 bindHandleEvent', () => {
    // 每次 bindHandleEvent 都 new 一个 handler 且只在模块销毁时清理，
    // 不销毁上一层就会：每点一次按钮多一层，一次左键触发多个回调（观察点成倍冒出）
    const sliceBetween = (from: string, to: string) => {
      const s = src.indexOf(from)
      const e = src.indexOf(to)
      expect(s).toBeGreaterThan(-1)
      expect(e).toBeGreaterThan(s)
      return src.slice(s, e)
    }

    const multiViewshed = sliceBetween(
      'createMultiViewshedAnalysis: function',
      'createCutVolumeCompareAnalysis: function'
    )
    expect(multiViewshed).toContain('bindAnalysisEvent($this, {')
    expect(multiViewshed).not.toContain('$this.bindHandleEvent({')

    const visualField = sliceBetween(
      'createVisualFieldAnalysis: function',
      'createClipPlanAnalysis: function'
    )
    expect(visualField).toContain('bindAnalysisEvent($this, {')
    expect(visualField).not.toContain('$this.bindHandleEvent({')
  })
})
