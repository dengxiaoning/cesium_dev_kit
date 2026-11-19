import assert from 'node:assert'
import { CesiumDevKitError, isCesiumDevKitError, setErrorHandler, reportError } from '../src/utils/cesiumPluginsExtends/libs/errors'
import { createContext, disposeContext, isBrowser } from '../src/utils/cesiumPluginsExtends/libs/context'
import { Graphics } from '../src/utils/cesiumPluginsExtends/libs/Graphics'

// 1. 统一错误类型：code / message / cause 都要可读
{
  const cause = new Error('boom')
  const err = new CesiumDevKitError('IMAGERY_FAILED', '底图创建失败', { cause, details: { type: 'X' } })
  assert.equal(err.name, 'CesiumDevKitError')
  assert.equal(err.code, 'IMAGERY_FAILED')
  assert.equal(err.cause, cause)
  assert.deepEqual(err.details, { type: 'X' })
  assert.ok(err.message.includes('IMAGERY_FAILED'), 'message 应包含错误码')
  assert.ok(err instanceof Error, '应继承自 Error')
  assert.ok(err instanceof CesiumDevKitError, 'instanceof 判断应成立')
  assert.ok(isCesiumDevKitError(err))

  // 跨包副本（不同 class 实例）也能识别
  const foreign = { name: 'CesiumDevKitError', code: 'INTERNAL', message: 'x' }
  assert.ok(isCesiumDevKitError(foreign), '跨副本错误应通过 duck-typing 识别')
  assert.equal(isCesiumDevKitError(new Error('x')), false)
  assert.equal(isCesiumDevKitError(null), false)
}

// 2. reportError：自定义处理器优先，处理器自身抛错不影响主流程
{
  const seen: Array<{ error: unknown; scope?: string }> = []
  setErrorHandler((error, context) => {
    seen.push({ error, scope: context?.scope })
  })
  const e = new Error('warn-me')
  reportError(e, { scope: 'unit' })
  assert.equal(seen.length, 1)
  assert.equal(seen[0].error, e)
  assert.equal(seen[0].scope, 'unit')

  setErrorHandler(() => {
    throw new Error('handler broke')
  })
  const originalError = console.error
  const originalWarn = console.warn
  let logged = 0
  console.error = () => {
    logged++
  }
  console.warn = () => {
    logged++
  }
  reportError(new Error('still safe'), { scope: 'unit' })
  console.error = originalError
  console.warn = originalWarn
  assert.ok(logged >= 1, '处理器抛错时应回退到 console')

  // 恢复默认
  setErrorHandler(null)
}

// 3. createContext 参数校验：错误码必须是 MISSING_CESIUM / MISSING_VIEWER
{
  assert.throws(
    () => createContext({ containerId: 'app' } as any),
    (err: any) => isCesiumDevKitError(err) && err.code === 'MISSING_CESIUM'
  )
  assert.throws(
    () => createContext({ Cesium: {} } as any),
    (err: any) => isCesiumDevKitError(err) && err.code === 'MISSING_VIEWER'
  )
}

// 4. 外部 viewer：上下文不接管销毁，assetsBaseUrl 正确落到 defaultStatic
{
  let destroyed = 0
  const viewer: any = { destroy: () => destroyed++ }
  const ctx = createContext({ Cesium: {} as any, viewer, assetsBaseUrl: 'https://cdn.test/kit' })
  assert.equal(ctx.ownsViewer, false, '外部 viewer 不应由 kit 持有')
  assert.equal(ctx.assetsBaseUrl, 'https://cdn.test/kit')
  assert.equal(ctx.defaultStatic.baseService, 'https://cdn.test/kit')
  disposeContext(ctx)
  assert.equal(destroyed, 0, 'disposeContext 不能销毁外部 viewer')
}

// 5. 空字符串 assetsBaseUrl = 使用站点相对路径
{
  const ctx = createContext({ Cesium: {} as any, viewer: {} as any, assetsBaseUrl: '' })
  assert.equal(ctx.assetsBaseUrl, '')
}

// 6. 命名修正：create* 正式方法存在，craete* 仍保留兼容
{
  const proto: any = Graphics.prototype
  const pairs = [
    ['createCorridorGraphics', 'craeteCorridorGraphics'],
    ['createDynamicPolyLineGraphics', 'craeteDynamicPolyLineGraphics'],
    ['createDynamicCylinderGraphics', 'craeteDynamicCylinderGraphics'],
    ['createRotateCylinderGraphics', 'craeteRotateCylinderGraphics'],
    ['createDynamicBlinkCircleGraphics', 'craeteDynamicBlinkCircleGraphics'],
    ['createDynamicCircleGraphics', 'craeteDynamicCricleGraphics'],
    ['createDynamicShadeWallGraphics', 'craeteDynamicShadeWallGraphics'],
    ['createRotatePlaneGraphics', 'craeteRotatePlaneGraphics']
  ]
  for (const [next, legacy] of pairs) {
    assert.equal(typeof proto[next], 'function', `${next} 应存在`)
    assert.equal(typeof proto[legacy], 'function', `${legacy} 应保留兼容`)
  }
}

// 7. SSR 判定不应在 Node 下抛错（import 本身必须安全）
{
  assert.equal(typeof isBrowser(), 'boolean')
}

console.log('✔ api 契约测试通过')
