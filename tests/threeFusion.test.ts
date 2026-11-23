import assert from 'node:assert'
import * as Cesium from 'cesium'
import * as THREE from 'three'
import { initThreeScene } from '../src/utils/cesiumPluginsExtends/libs/ThreeScene'

/**
 * 融合模式（single-context + 深度共享）的核心链路测试。
 *
 * 这里不依赖浏览器：Cesium 的 Camera 与 Three 的 Matrix4 都是纯数学，
 * 足以验证「相机与几何是否严格自洽」——也就是坐标漂移问题的根因。
 */

const CENTER: [number, number] = [104.08, 30.62]

function createCesiumCamera() {
  const camera = new Cesium.Camera({
    canvas: { clientWidth: 1200, clientHeight: 800, width: 1200, height: 800 },
    mapProjection: new Cesium.GeographicProjection(Cesium.Ellipsoid.WGS84),
    mode: Cesium.SceneMode.SCENE3D,
    drawingBufferWidth: 1200,
    drawingBufferHeight: 800
  } as any)
  camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(CENTER[0], CENTER[1], 3000),
    orientation: {
      heading: Cesium.Math.toRadians(30),
      pitch: Cesium.Math.toRadians(-40),
      roll: 0
    }
  })
  return camera
}

function createHarness(options: any = {}) {
  const cesiumCamera = createCesiumCamera()
  const postRender = new Cesium.Event()

  const scene: any = {
    canvas: { clientWidth: 1200, clientHeight: 800 },
    context: {
      drawingBufferWidth: 1200,
      drawingBufferHeight: 800,
      webgl2: true,
      _gl: {}
    },
    globe: { ellipsoid: Cesium.Ellipsoid.WGS84, enableLighting: false },
    screenSpaceCameraController: {},
    light: { color: { red: 1, green: 1, blue: 1 }, intensity: 1 },
    mode: options.mode === undefined ? Cesium.SceneMode.SCENE3D : options.mode,
    //CV/2D 下 morphTime 为 0，3D 为 1
    morphTime: options.morphTime === undefined ? 1 : options.morphTime,
    numberOfFrustums: 1,
    msaaSamples: 1,
    logarithmicDepthBuffer: true,
    postRender,
    camera: cesiumCamera,
    mapProjection: new Cesium.GeographicProjection(Cesium.Ellipsoid.WGS84),
    sun: { _boundingVolume: { center: Cesium.Cartesian3.fromDegrees(104, 30, 1000) } },
    _view: null,
    _environmentState: { usePostProcess: false, useOIT: false },
    requestRenderMode: false
  }

  const viewer: any = {
    scene,
    camera: cesiumCamera,
    isDestroyed: () => false,
    resize() {},
    render() {
      //与真实 CesiumWidget 一致：render 结束同步触发 postRender
      postRender.raiseEvent(scene, 0)
    },
    destroy() {}
  }

  const SceneClass: any = initThreeScene({ THREE, Cesium, viewer })
  const threeCamera = new THREE.PerspectiveCamera()
  const renderer: any = {
    domElement: {},
    render() {
      renderer.renderCount++
    },
    renderCount: 0,
    setViewport() {},
    setScissorTest() {},
    setSize(width: number, height: number) {
      renderer.setSizeCalls.push([width, height])
    },
    //overlay 模式必须给 canvas 定尺寸；融合模式则一次都不能调（会清空 Cesium 画面）
    setSizeCalls: [] as any[],
    state: { reset() {} }
  }

  const instance = new SceneClass({
    cesiumDom: { children: [{ children: [{ style: {} }] }] },
    threeHabit: false,
    enableLighting: false,
    camera: threeCamera,
    renderer,
    lngLat: CENTER,
    fusion: options.fusion || 'single-context',
    depth: options.depth || 'none',
    precision: options.precision || 'double'
  })

  return { instance, scene, viewer, renderer, threeCamera, cesiumCamera, postRender }
}

function distance(a: any, b: any) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

/* ============ 1. 相机与几何严格自洽（治坐标漂移） ============ */
{
  const { instance, threeCamera, cesiumCamera, renderer } = createHarness()
  const target: [number, number, number] = [104.0817, 30.627, 120]
  const obj = new THREE.Object3D()
  instance.add(obj)
  instance.setObjectPosition(obj, target)
  instance.updateCameraMatrix()

  const world = obj.getWorldPosition(new THREE.Vector3())
  const absolute = Cesium.Cartesian3.fromDegrees(target[0], target[1], target[2])

  // 场景坐标 -> ECEF 的映射必须精确还原目标点（不允许出现肉眼可见的偏移）
  const sceneToEcef = instance._matrixScratch.sceneToEcef
  const recovered = Cesium.Matrix4.multiplyByPoint(
    sceneToEcef,
    new Cesium.Cartesian3(world.x, world.y, world.z),
    new Cesium.Cartesian3()
  )
  assert.ok(
    distance(recovered, absolute) < 1e-6,
    '场景坐标反算 ECEF 应精确还原放置位置，实际误差 ' + distance(recovered, absolute).toExponential(2)
  )

  // 视图矩阵必须等于 viewMatrix * sceneToEcef
  const expectedView = Cesium.Matrix4.multiply(
    cesiumCamera.viewMatrix,
    sceneToEcef,
    new Cesium.Matrix4()
  )
  const actualView = threeCamera.matrixWorldInverse.elements
  let maxViewError = 0
  for (let i = 0; i < 16; i++) {
    maxViewError = Math.max(maxViewError, Math.abs(actualView[i] - (expectedView as any)[i]))
  }
  assert.ok(maxViewError < 1e-9, '视图矩阵应与 viewMatrix*sceneToEcef 完全一致，误差 ' + maxViewError)

  // 眼空间坐标必须与 Cesium 自己的计算结果一致
  const eyeCesium = Cesium.Matrix4.multiplyByPoint(
    cesiumCamera.viewMatrix,
    absolute,
    new Cesium.Cartesian3()
  )
  const eyeThree = world.clone().applyMatrix4(threeCamera.matrixWorldInverse)
  assert.ok(
    distance(eyeThree, eyeCesium) < 1e-6,
    'three 眼空间坐标应与 Cesium 一致，实际偏差 ' + distance(eyeThree, eyeCesium).toExponential(2)
  )

  // 相机在场景空间的坐标必须等于「ECEF 位置 - 原点」，即场景空间与 ECEF 只差一个平移。
  // 这条能抓住"多重/少乘一次场景根变换"这类错误（旋转被用两遍时偏差可达公里级）。
  const origin = Cesium.Cartesian3.fromDegrees(CENTER[0], CENTER[1], 0)
  const cameraScenePos = new THREE.Vector3().setFromMatrixPosition(threeCamera.matrixWorld)
  const cameraExpected = Cesium.Cartesian3.subtract(
    cesiumCamera.positionWC,
    origin,
    new Cesium.Cartesian3()
  )
  assert.ok(
    distance(cameraScenePos, cameraExpected) < 1e-6,
    '相机场景坐标应等于 ECEF 位置减原点，实际偏差 ' +
      distance(cameraScenePos, cameraExpected).toExponential(2)
  )

  // 投影矩阵必须直接复制，保留 near/far / off-center
  let maxProjError = 0
  for (let i = 0; i < 16; i++) {
    maxProjError = Math.max(
      maxProjError,
      Math.abs(threeCamera.projectionMatrix.elements[i] - (cesiumCamera.frustum.projectionMatrix as any)[i])
    )
  }
  assert.ok(maxProjError < 1e-12, '投影矩阵应逐元素复制自 Cesium frustum，误差 ' + maxProjError)
  assert.equal(threeCamera.near, cesiumCamera.frustum.near, 'camera.near 必须跟随 Cesium 视锥')
  assert.equal(threeCamera.far, cesiumCamera.frustum.far, 'camera.far 必须跟随 Cesium 视锥（对数深度分母）')
  assert.equal(threeCamera.matrixWorldAutoUpdate, false, '必须禁止 three 重新 compose 相机矩阵')
  assert.equal(renderer.setSizeCalls.length, 0, '融合模式下绝不能调用 setSize（会清空 Cesium 画面）')

  console.log('✔ three 融合相机矩阵与几何严格自洽')
}

/* ============ 2. 多视锥与深度前置条件 ============ */
{
  const { instance } = createHarness({ depth: 'canvas-blit' })
  assert.equal(instance.fusionMode, 'single-context')
  assert.equal(instance.depthMode, 'canvas-blit')
  assert.equal(instance._depthEnabled, true)
  //融合模式不应再创建"伪造遮挡"的模拟球
  assert.equal(instance.sphere, undefined, '融合模式不应创建 ECEF 模拟球')
  assert.equal(instance.sphere3, undefined, '融合模式不应创建地板补偿球')
  assert.equal(instance.children.length, 1, '场景根下只应保留 syncGroup')

  const status = instance.getFusionStatus()
  assert.equal(status.fusion, 'single-context')
  assert.equal(status.depth, 'canvas-blit')
  assert.equal(status.precision, 'double')
  assert.equal(status.webgl2, true)
  console.log('✔ 融合模式初始化与运行时状态正确')
}

/* ============ 3. 帧驱动：postRender 单点出帧 + 防递归 ============ */
{
  const { instance, renderer, scene } = createHarness()

  // 没有注册回调时，一次 update 只应产生一次 three 绘制
  instance.update()
  assert.equal(renderer.renderCount, 1, 'update() 应通过 postRender 触发一次 three 绘制')
  // 没有可用状态缓存时走兜底分支，同样只能留合法对象，不能是 undefined
  assert.ok(scene.context._currentRenderState, '兜底分支不能把状态缓存置成 undefined')

  // 帧回调里再次调用 scene.update()（历史 demo 的写法）不能递归
  instance.addFrameCallback(() => {
    instance.update()
  })
  instance.update()
  assert.equal(renderer.renderCount, 2, '帧回调内的 update() 必须被拦截，不能递归出帧')

  instance.removeFrameCallback(() => {})
  assert.equal(instance._frameCallbacks.length, 1, '移除未注册的回调不应影响已有回调')
  console.log('✔ 融合帧驱动与递归保护正确')
}

/* ============ 4. overlay 模式保持历史行为 ============ */
{
  const { instance, renderer } = createHarness({ fusion: 'overlay' })
  assert.equal(instance.fusionMode, 'overlay')
  assert.equal(instance.depthMode, 'none')
  assert.ok(instance.sphere, 'overlay 模式仍需保留模拟球')
  assert.ok(instance.sphere3, 'overlay 模式仍需保留地板补偿球')

  instance.update()
  assert.equal(renderer.renderCount, 1, 'overlay 模式仍由 update() 直接绘制')
  // overlay 的 three canvas 必须被撑到和 Cesium 一样大，
  // 否则停在默认 300x150，内容全画在左上角一小块里（首页士兵"消失"就是这么来的）
  assert.deepEqual(
    renderer.setSizeCalls,
    [[1200, 800]],
    'overlay 模式必须按 Cesium canvas 的 CSS 尺寸设置 three canvas'
  )
  console.log('✔ overlay 模式行为未变')
}

/* ============ 5. 渲染状态交接：绝不能把状态缓存弄成 undefined ============ */
{
  const { instance, scene } = createHarness({ depth: 'canvas-blit' })
  const context: any = scene.context

  // 记录 gl 调用，用来确认"全量重放"确实发生了
  const calls: any = {}
  const cache: any = {}
  const gl: any = new Proxy(cache, {
    get(target, prop: any) {
      if (typeof prop === 'symbol') return undefined
      //让 blit 的错误码检查通过，否则会被误判为 blit 失败而自动降级
      if (prop === 'getError') return () => 0
      if (prop === 'NO_ERROR') return 0
      if (!target[prop]) {
        target[prop] = (...args: any[]) => {
          ;(calls[prop] || (calls[prop] = [])).push(args)
        }
      }
      return target[prop]
    }
  })

  // 造一份"刚被 Cesium 下发过"的合法状态（与 Context 构造函数用的是同一个默认状态）
  const RenderStateApi: any = (Cesium as any).RenderState
  // headless 下没有真实 GL，ContextLimits 的 lineWidth 上限是 0，会让 RenderState 校验直接抛
  const ContextLimits: any = (Cesium as any).ContextLimits
  ContextLimits._minimumAliasedLineWidth = 0
  ContextLimits._maximumAliasedLineWidth = 100
  const realRS: any = RenderStateApi.fromCache()
  const realPS: any = {
    context,
    viewport: { x: 0, y: 0, width: 1200, height: 800 },
    scissorTest: undefined,
    blendingEnabled: undefined
  }
  context._gl = gl
  context.uniformState = {}
  context._clearColor = { red: 0, green: 0, blue: 0, alpha: 0 }
  context._clearDepth = 1
  context._clearStencil = 0
  context._currentRenderState = realRS
  context._currentPassState = realPS
  context._currentFramebuffer = undefined

  // 走完整的一帧：postRender -> three 绘制 -> 交还 GL 状态
  scene._view = { globeDepth: { framebuffer: { _framebuffer: {} } } }
  instance.update()
  assert.ok(!instance._frameErrorLogged, '融合帧不应抛错（错误会被 postRender 保护吞掉）')
  assert.equal(instance._depthEnabled, true, '深度 blit 不应被判为失败而降级')

  // ① 缓存必须仍是合法对象。历史 bug：置 undefined 后下一帧 Context.clear
  //    在 RenderState.partialApply 里读 previousRenderState.id 直接抛错，整个渲染循环停摆
  assert.ok(context._currentRenderState, '_currentRenderState 不能被置成 undefined')
  assert.equal(typeof context._currentRenderState.id, 'number', '状态缓存必须带 id（partialApply 的缓存键）')
  assert.ok(context._currentPassState, '_currentPassState 不能被置成 undefined')

  // ② 状态必须真的被全量重放过，否则下一帧 Cesium 会带着 three 的 blend/depth 画地球
  assert.ok(calls.frontFace && calls.frontFace.length >= 1, '应重新下发 frontFace')
  assert.ok(calls.depthRange && calls.depthRange.length >= 1, '应重新下发 depthRange')
  assert.ok(calls.colorMask && calls.colorMask.length >= 1, '应重新下发 colorMask')
  assert.ok(calls.depthMask && calls.depthMask.length >= 1, '应重新下发 depthMask')
  assert.ok(calls.viewport && calls.viewport.length >= 1, '应重新下发 viewport')

  // ③ 模拟下一帧 Context.clear 的调用形状：previous 直接取自缓存，必须不抛
  assert.doesNotThrow(() => {
    RenderStateApi.partialApply(
      gl,
      context._currentRenderState,
      realRS,
      context._currentPassState,
      realPS,
      true
    )
  })

  // ④ 对照：确认"置 undefined"确实会抛 reading 'id'，这条回归测试才有意义
  assert.throws(
    () => RenderStateApi.partialApply(gl, undefined, realRS, realPS, realPS, true),
    /reading 'id'/,
    '置 undefined 应当复现 Cannot read properties of undefined (reading "id")'
  )

  console.log('✔ 渲染状态交接不会破坏 Cesium 状态缓存')
}

/* ============ 6. 哥伦布视图（首页 heatmap3d 的用法） ============ */
{
  const { instance } = createHarness({
    fusion: 'overlay',
    mode: Cesium.SceneMode.COLUMBUS_VIEW,
    morphTime: 0
  })

  assert.equal(instance.isColumbusViewMode(), true)
  // CV 的 morphTime 就是 0，不能被当成"模式切换动画中间态"而跳过 three 渲染
  assert.equal(instance.isThreeRenderable(), true, 'CV 模式必须允许渲染 three')

  const origin = instance.getSceneOriginPosition()
  const cvCenter = instance.cartesianToCVWorld(
    Cesium.Cartesian3.fromDegrees(CENTER[0], CENTER[1], 0)
  )
  assert.ok(distance(origin, cvCenter) < 1e-9, 'CV 下场景原点必须是 center 的 CV 世界坐标')

  // CV 下对象定位：scene 坐标 = CV 世界坐标 - CV 原点
  const target: [number, number, number] = [104.046, 30.68, 0]
  const obj = new THREE.Object3D()
  instance.add(obj)
  instance.setObjectPosition(obj, target)
  const cvTarget = instance.cartesianToCVWorld(
    Cesium.Cartesian3.fromDegrees(target[0], target[1], target[2])
  )
  const expected = new THREE.Vector3(
    cvTarget.x - origin.x,
    cvTarget.y - origin.y,
    cvTarget.z - origin.z
  )
  const actual = obj.getWorldPosition(new THREE.Vector3())
  assert.ok(
    distance(actual, expected) < 1e-6,
    'CV 下对象场景坐标应为 CV(目标) - CV(原点)，实际偏差 ' +
      distance(actual, expected).toExponential(2)
  )
  console.log('✔ 哥伦布视图的坐标链路与渲染开关正确')
}

console.log('✔ three 融合模式全部测试通过')
