/** 融合模式 */
export type ThreeFusionMode = 'overlay' | 'single-context'

/** 深度共享方式 */
export type ThreeDepthMode = 'none' | 'canvas-blit'

/** 相机矩阵精度策略 */
export type ThreePrecisionMode = 'double' | 'legacy'

/** initThreeScene 实例类型 */
export interface initThreeSceneInstance {
  type: string
  options: any
  cesiumViewer: any
  ellipsoid: any
  camera: any
  cameraOffset: any
  renderer: any
  lngLat: any
  cameraCenter: any
  sphere: any
  syncGroup: any
  sphere3: any
  childrenGroup: any
  sunUp: any
  sunLightColor: any
  sunLightIntensity: number
  sun: any
  _enableLighting: any
  enableLighting: any
  addImageryProvider: any
  isColumbusViewMode: any
  cartesian3ToVector: any
  cartesianToCVWorld: any
  getSceneOriginPosition: any
  up: any
  updateSunMatrix: any
  updateGroupMatrixWorld: any
  updateCameraMatrix: any
  isThreeRenderable: any
  renderThree: any
  renderCesium: any
  visible: any
  uuid: any
  name: any
  castShadow: any
  receiveShadow: any
  frustumCulled: any
  renderOrder: any
  userData: any
  layers: any
  matrix: any
  matrixAutoUpdate: any
  background: any
  environment: any
  fog: any
  update: any
  positionToCartesian: any
  updateMatrixWorld: any
  positionToWorldVector: any
  /** 融合模式：overlay=双 Canvas 叠加；single-context=共用 Cesium 的 canvas 与 WebGL 上下文 */
  fusionMode: ThreeFusionMode
  /** 深度共享方式 */
  depthMode: ThreeDepthMode
  /** 相机矩阵精度策略 */
  precisionMode: ThreePrecisionMode
  /** 由 Cesium 的 postRender 驱动的融合帧（仅 single-context 模式） */
  _renderFusedFrame: any
  /** 注册每帧回调（在融合帧内、three 渲染之前执行） */
  addFrameCallback: any
  /** 移除每帧回调 */
  removeFrameCallback: any
  /** 同步 three 的视口到 Cesium 的 drawingBuffer 尺寸 */
  syncViewport: any
  /** 当前 drawingBuffer 尺寸（设备像素） */
  getDrawingBufferSize: any
  /** 融合模式运行时状态，便于排查问题 */
  getFusionStatus: any
}

/** initThreeScene 构造函数类型 */
export interface initThreeSceneConstructor {
  new (...args: any[]): initThreeSceneInstance
  prototype: initThreeSceneInstance
}

function initThreeScene({ THREE, Cesium, viewer }: any) {
  function cesium2threeBufferGeometry(geometry: any, result?: any) {
    if (!result) result = new THREE.BufferGeometry()
    const attributes = geometry.attributes

    for (const name in attributes) {
      if (attributes.hasOwnProperty(name) && attributes[name]) {
        var attribute = attributes[name]
        var array = attribute.values

        if (array instanceof Float64Array) {
          array = new Float32Array(array)
        }

        const attribute3js = new THREE.BufferAttribute(
          array,
          attribute.componentsPerAttribute,
          attribute.normalize
        )
        result.setAttribute(name, attribute3js)
      }
    }

    if (attributes.st) {
      result.attributes.uv = result.attributes.st
      result.deleteAttribute('st')
    }

    if (geometry.indices) {
      const attribute3js = new THREE.BufferAttribute(geometry.indices, 1, false)
      result.setIndex(attribute3js)
    }

    if (geometry.boundingSphere) {
      const bs = geometry.boundingSphere
      if (!result.boundingSphere) result.boundingSphere = new THREE.Sphere()
      result.boundingSphere.center.copy(bs.center)
      result.boundingSphere.radius = bs.radius
    }

    return result
  }

  /* ==================================================================
   * Cesium 渲染状态缓存的交接
   *
   * three 在 postRender 里画完会留下自己的 blend / depth / cull / viewport，
   * 而 Cesium 的 applyRenderState 只下发"与缓存不同"的部分，所以必须让缓存重新可信，
   * 否则下一帧会带着 three 的状态去画地球（花屏、丢深度、阴影全黑）。
   *
   * 唯一不能做的事：把 _currentRenderState 置成 undefined。
   * RenderState.partialApply 第一行就是
   *   renderState._applyFunctions[previousRenderState.id]
   * 于是下一帧 Context.clear 直接抛
   *   TypeError: Cannot read properties of undefined (reading 'id')
   * 并且 Cesium 的渲染循环就此停摆（Rendering has stopped）。
   * ================================================================== */

  /** 毒化状态的 id，仅用作 _applyFunctions 的分组键，值本身没有语义 */
  const CESIUM_POISON_STATE_ID = '__cesium_dev_kit_fusion_state__'

  /** 毒化状态（全局唯一，字段永不变更，可安全共享） */
  let poisonRenderState: any = null
  let poisonPassState: any = null

  /**
   * 构造"上一次状态"的毒化对象。
   *
   * partialApply 会把 previousState 的每个字段与即将下发的新状态逐项比较，
   * 只有不同的项才会真正 gl.xxx 一次。这里把所有参与比较的字段都设为 NaN，
   * 因为 NaN !== 任何值恒成立，diff 结果必然是"全部重下发"。
   */
  function getPoisonRenderState() {
    if (poisonRenderState) return poisonRenderState
    poisonRenderState = {
      id: CESIUM_POISON_STATE_ID,
      _applyFunctions: {},
      frontFace: NaN,
      cull: { enabled: NaN, face: NaN },
      lineWidth: NaN,
      polygonOffset: { enabled: NaN, factor: NaN, units: NaN },
      scissorTest: { enabled: NaN, rectangle: null },
      depthRange: { near: NaN, far: NaN },
      depthTest: { enabled: NaN, func: NaN },
      colorMask: { red: NaN, green: NaN, blue: NaN, alpha: NaN },
      depthMask: NaN,
      stencilMask: NaN,
      stencilTest: {
        enabled: NaN,
        frontFunction: NaN,
        backFunction: NaN,
        reference: NaN,
        mask: NaN,
        frontOperation: { fail: NaN, zFail: NaN, zPass: NaN },
        backOperation: { fail: NaN, zFail: NaN, zPass: NaN }
      },
      sampleCoverage: { enabled: NaN, value: NaN, invert: NaN },
      blending: { enabled: NaN }
    }
    return poisonRenderState
  }

  /** partialApply 只从 passState 读 scissorTest / blendingEnabled / context 三个字段 */
  function getPoisonPassState() {
    if (poisonPassState) return poisonPassState
    poisonPassState = {
      scissorTest: { enabled: NaN, rectangle: null },
      blendingEnabled: NaN,
      context: {}
    }
    return poisonPassState
  }

  class Scene extends THREE.Scene {
    constructor(options: any = {}) {
      super()
      this.type = 'ThreeCesiumScene'

      if (!options.cesiumDom) {
        throw new Error('THREE.ThreeCesiumScene not found cesiumDom.')
      }
      if (
        !options.camera ||
        !(options.camera instanceof THREE.PerspectiveCamera)
      ) {
        throw new Error(
          'THREE.ThreeCesiumScene (not found cesiumDom) OR ( not THREE.PerspectiveCamera ).'
        )
      }
      if (!options.renderer) {
        throw new Error('THREE.ThreeCesiumScene not found THREE.WebGLRender.')
      }

      this.options = options

      //cesium视图
      this.cesiumViewer = viewer

      const doms =
        typeof options.cesiumDom === 'string'
          ? document.getElementById(options.cesiumDom)
          : options.cesiumDom
      const children = doms.children[0].children
      for (let i = 0; i < children.length; i++) {
        if (i === 0) continue
        children[i].style.zIndex = '100'
      }

      //cesium地球椭球体
      this.ellipsoid = this.cesiumViewer.scene.globe.ellipsoid

      //操作方式
      if (!!options.threeHabit) {
        // 倾斜视图 鼠标左键旋转
        this.cesiumViewer.scene.screenSpaceCameraController.tiltEventTypes = [
          Cesium.CameraEventType.LEFT_DRAG
        ]

        // 缩放设置 重新设置缩放成员
        this.cesiumViewer.scene.screenSpaceCameraController.zoomEventTypes = [
          Cesium.CameraEventType.MIDDLE_DRAG,
          Cesium.CameraEventType.WHEEL,
          Cesium.CameraEventType.PINCH
        ]

        // 平移 添加鼠标右键  鼠标右键平移
        this.cesiumViewer.scene.screenSpaceCameraController.rotateEventTypes = [
          Cesium.CameraEventType.RIGHT_DRAG
        ]
      }

      //透视相机
      this.camera = options.camera
      this.cameraOffset = new THREE.Vector3()

      /* 渲染器必须开启 logarithmicDepthBuffer,stencil
            {
                alpha: true,
                antialias: true,
                logarithmicDepthBuffer: true,
                stencil:true
             }
            */
      this.renderer = options.renderer

      /* ---- 融合模式配置 ---- */
      // overlay: 双 Canvas 叠加（历史行为）
      // single-context: three 复用 Cesium 的 canvas 与 WebGL 上下文，three 的绘制挂在 scene.postRender
      this.fusionMode = options.fusion === 'single-context' ? 'single-context' : 'overlay'
      // 深度共享只在单上下文下有意义
      this.depthMode =
        this.fusionMode === 'single-context' && options.depth && options.depth !== 'none'
          ? 'canvas-blit'
          : 'none'
      this.precisionMode = options.precision === 'legacy' ? 'legacy' : 'double'

      this._frameCallbacks = []
      this._inFusedFrame = false
      this._depthEnabled = this.depthMode === 'canvas-blit'
      this._depthFailures = 0
      this._depthProbeFrames = 0
      this._depthWarned = false
      this._postRenderRemove = null
      this._matrixScratch = {
        sceneToEcef: new Cesium.Matrix4(),
        viewLocal: new Cesium.Matrix4()
      }

      //经纬度区间
      this.lngLat =
        options.lngLat && options.lngLat.length > 1
          ? options.lngLat
          : [114.23, 31.55]

      //相机朝向
      this.cameraCenter = new THREE.Vector3(0, 0, 0)

      //融合模式下深度由共享深度缓冲决定遮挡关系，
      //原「用几何体伪造遮挡」的模拟球（ECEF 椭球 + 地板补偿球）没有存在意义，直接跳过
      let sphere: any = null
      let sphere3: any = null

      if (this.fusionMode === 'overlay') {
        const ellipsoid = new Cesium.EllipsoidGeometry({
          vertexFormat: Cesium.VertexFormat.POSITION_ONLY,
          radii: new Cesium.Cartesian3(
            this.ellipsoid.maximumRadius - 1,
            this.ellipsoid.maximumRadius - 1,
            this.ellipsoid.minimumRadius - 1
          ),
          slicePartitions: 1024, //8132,
          stackPartitions: 1024
        })
        const geometry = cesium2threeBufferGeometry(
          Cesium.EllipsoidGeometry.createGeometry(ellipsoid)
        )

        //模拟球
        const material = new THREE.MeshBasicMaterial({
          color: '#ff00ff',
          blending: THREE.MultiplyBlending
        })
        sphere = new THREE.Mesh(geometry, material)
        if (options.axesHelper) sphere.add(new THREE.AxesHelper(8000000))
        super.add(sphere)
        this.sphere = sphere
        //模拟球地下
        // const sphere2 = sphere.clone()
        // sphere2.material = new THREE.MeshBasicMaterial({
        //   color: '#000',
        //   side: THREE.BackSide
        // })
        // super.add(sphere2)
      } else if (options.axesHelper) {
        super.add(new THREE.AxesHelper(500))
      }

      const syncGroup = new THREE.Group()
      super.add(syncGroup)
      this.syncGroup = syncGroup

      if (this.fusionMode === 'overlay') {
        //补偿地板覆盖
        const geometry3 = new THREE.SphereGeometry(
          this.ellipsoid.minimumRadius,
          512,
          256,
          0,
          Math.PI * 2,
          3.1,
          Math.PI - 3.1
        )
        const material3 = new THREE.MeshBasicMaterial({
          color: '#fff00f',
          blending: THREE.MultiplyBlending
        })
        sphere3 = new THREE.Mesh(geometry3, material3)
        sphere3.rotateX((90 * Math.PI) / 180)
        sphere3.position.z = this.ellipsoid.minimumRadius
        this.sphere3 = sphere3
      }

      const threeGroup = new THREE.Group()
      threeGroup.rotateX((-90 * Math.PI) / 180)
      threeGroup.position.z = -1

      this.syncGroup = syncGroup
      this.childrenGroup = threeGroup

      //日光系统

      this.sunUp = new THREE.Group()

      this.sunLightColor = new THREE.Color()
      this.sunLightIntensity = 1

      const light = this.cesiumViewer.scene.light

      this.sunLightColor.r = light.color.red
      this.sunLightColor.g = light.color.green
      this.sunLightColor.b = light.color.blue

      this.sunLightIntensity = light.intensity

      this.sun = new THREE.DirectionalLight(
        this.sunLightColor,
        this.sunLightIntensity
      )
      this.sun.castShadow = true
      this.sun.shadow.camera.far = Math.pow(10, 14)
      this.sun.position.set(0, 0, this.ellipsoid.maximumRadius * 2 + 1000)
      this.sun.target = this.childrenGroup
      this.sunUp.add(this.sun)

      // syncGroup.add(sphere2)
      if (sphere3) syncGroup.add(sphere3)
      syncGroup.add(threeGroup)
      syncGroup.add(this.sunUp)

      this._enableLighting = false

      Object.defineProperty(this, 'enableLighting', {
        get() {
          return this._enableLighting
        },
        set(v) {
          this.cesiumViewer.scene.globe.enableLighting = v
          this._enableLighting = v
          if (v) {
            this.sun.visible = true
            return
          }
          this.sun.visible = false
        }
      })

      if (
        options.enableLighting !== undefined &&
        options.enableLighting !== null
      ) {
        this.enableLighting = options.enableLighting
      }

      if (options.cesiumLayers && options.cesiumLayers.length > 0) {
        for (let i = 0; i < options.cesiumLayers.length; i++) {
          this.addImageryProvider(
            options.cesiumLayers[i].type,
            options.cesiumLayers[i].option
          )
        }
      }

      //单上下文模式：three 的绘制统一挂在 Cesium 的 postRender。
      //此时 Cesium 已完成整帧（含 resolveFramebuffers / context.endFrame），
      //画布颜色就位、framebuffer 已解绑，是"帧后渲染"最安全的挂载点。
      if (this.fusionMode === 'single-context') {
        this._installPostRender()
      }
    }

    /**
     * 挂载融合渲染钩子
     * @private
     */
    _installPostRender() {
      if (this._postRenderRemove) return
      const scene = this.cesiumViewer && this.cesiumViewer.scene
      if (!scene || !scene.postRender) return
      this._postRenderRemove = scene.postRender.addEventListener(() => {
        this._renderFusedFrame()
      })
    }

    /**
     * 结束一帧融合渲染（移除 postRender 监听）
     * @private
     */
    _uninstallPostRender() {
      if (typeof this._postRenderRemove === 'function') {
        this._postRenderRemove()
      }
      this._postRenderRemove = null
    }

    /**
     * 注册每帧回调。融合模式下回调在 three 绘制之前执行，适合做动画推进。
     * @param callback 回调函数，参数为当前时间戳
     * @returns 取消注册的函数
     */
    addFrameCallback(callback: any) {
      if (typeof callback !== 'function') return () => {}
      const list = this._frameCallbacks || (this._frameCallbacks = [])
      list.push(callback)
      return () => this.removeFrameCallback(callback)
    }

    /** 移除每帧回调 */
    removeFrameCallback(callback: any) {
      const list = this._frameCallbacks
      if (!list) return this
      const index = list.indexOf(callback)
      if (index !== -1) list.splice(index, 1)
      return this
    }

    /**
     * 融合模式下的一帧：
     * 1. 执行用户每帧回调（动画等）
     * 2. 同步场景根变换与相机（复制投影矩阵 + 双精度合成视图矩阵）
     * 3. 让 three 放弃对 GL 状态的假设，并同步视口
     * 4. 把 Cesium 离屏 FBO 的深度搬到画布深度缓冲（可选）
     * 5. 绘制 three
     * 6. 失效 Cesium 的状态缓存，避免下一帧花屏
     * @private
     */
    _renderFusedFrame() {
      if (this.fusionMode !== 'single-context') return
      //回调里可能再次调用 scene.update()，用标记防止递归
      if (this._inFusedFrame) return
      if (!this.renderer || this.cesiumViewer.isDestroyed()) return
      if (this._disposed) return

      this._inFusedFrame = true
      //只有在真的动过 gl 之后才需要把状态交还给 Cesium
      let glTouched = false
      const time =
        typeof performance !== 'undefined' && performance.now
          ? performance.now()
          : Date.now()
      try {
        const callbacks = this._frameCallbacks
        if (callbacks && callbacks.length) {
          for (let i = 0; i < callbacks.length; i++) {
            try {
              callbacks[i](time)
            } catch (err) {
              console.error('[cesium_dev_kit] three frame callback error:', err)
            }
          }
        }

        //2D 模式与模式切换动画期间跳过，避免与 cesium 显示不一致
        if (!this.isThreeRenderable()) return

        this.updateSunMatrix()
        this.updateGroupMatrixWorld()
        this.updateCameraMatrix()

        //three 在背后可能改动任意 GL 状态，这里让它的状态缓存全部失效；
        //reset() 同时会把 framebuffer 绑定回默认帧缓冲（即 Cesium 的 canvas）
        glTouched = true
        if (this.renderer.state && this.renderer.state.reset) {
          this.renderer.state.reset()
        }
        this.syncViewport()

        if (this._depthEnabled) {
          this._copyCesiumDepthToCanvas()
        }

        this.renderer.render(this, this.camera)
      } catch (err) {
        //postRender 不在 Cesium 的 tryAndCatch 保护范围内，这里必须自己兜住，
        //否则 three 的一次异常会让整个 Cesium 渲染循环停摆
        this._reportFrameError(err)
      } finally {
        this._inFusedFrame = false
        if (glTouched) this._restoreCesiumState()
        //requestRenderMode 下 postRender 只会按需触发；
        //既然用户注册了逐帧回调（动画），说明需要连续出帧
        const callbacks = this._frameCallbacks
        if (callbacks && callbacks.length) {
          const scene = this.cesiumViewer.scene
          if (scene.requestRenderMode && typeof scene.requestRender === 'function') {
            scene.requestRender()
          }
        }
      }
    }

    /**
     * 每帧异常只完整打印一次，避免刷爆控制台
     * @private
     */
    _reportFrameError(err: any) {
      if (this._frameErrorLogged) {
        this._frameErrorCount = (this._frameErrorCount || 0) + 1
        return
      }
      this._frameErrorLogged = true
      console.error('[cesium_dev_kit] three fused frame error:', err)
    }

    /**
     * 同步 three 视口到 Cesium 的 drawingBuffer（设备像素）。
     * 注意：融合模式下绝不能调用 renderer.setSize()，它会重置 canvas.width/height 并清空画面。
     */
    syncViewport() {
      if (this.fusionMode !== 'single-context' || !this.renderer) return this
      const size = this.getDrawingBufferSize()
      if (size.width > 0 && size.height > 0) {
        this.renderer.setViewport(0, 0, size.width, size.height)
      }
      this.renderer.setScissorTest(false)
      return this
    }

    /** 当前绘制缓冲尺寸（设备像素） */
    getDrawingBufferSize() {
      if (this.fusionMode === 'single-context') {
        const context = this.cesiumViewer.scene.context
        return {
          width: context.drawingBufferWidth,
          height: context.drawingBufferHeight
        }
      }
      const canvas = this.renderer && this.renderer.domElement
      if (!canvas) return { width: 0, height: 0 }
      return {
        width: canvas.clientWidth || canvas.width,
        height: canvas.clientHeight || canvas.height
      }
    }

    /**
     * 取本帧实际承载深度的离屏 FBO。
     * 开启后处理时整帧画在 sceneFramebuffer，否则在 globeDepth。
     * @private
     */
    _getDepthFramebuffer() {
      const scene = this.cesiumViewer.scene
      const view = scene._view
      if (!view) return null
      const env = scene._environmentState

      //OIT（顺序无关透明）会把深度挪到自己的累积缓冲，暂不支持
      if (env && env.useOIT) {
        this._disableDepth('当前启用了 OIT 半透明排序，深度不在可搬运的 FBO 上')
        return null
      }

      if (env && env.usePostProcess && view.sceneFramebuffer) {
        const fb = view.sceneFramebuffer.framebuffer
        if (fb && fb._framebuffer) return fb
      }
      if (view.globeDepth && view.globeDepth.framebuffer) {
        const fb = view.globeDepth.framebuffer
        if (fb && fb._framebuffer) return fb
      }
      return null
    }

    /**
     * 把 Cesium 离屏 FBO 的深度 blit 到画布深度缓冲。
     * 必须只有一个视锥（scene.logarithmicDepthFarToNearRatio = Number.MAX_VALUE），
     * 否则帧末深度只剩最近一段。
     * @private
     */
    _copyCesiumDepthToCanvas() {
      const scene = this.cesiumViewer.scene
      const context = scene.context
      const gl = context && context._gl
      if (!gl || typeof gl.blitFramebuffer !== 'function') {
        this._disableDepth('当前上下文不支持 blitFramebuffer')
        return
      }

      const framebuffer = this._getDepthFramebuffer()
      if (!framebuffer) {
        if (!this._depthWarned) {
          this._disableDepth('未找到承载深度的离屏 FBO（globeDepth / sceneFramebuffer 均为空）')
        }
        return
      }

      const width = context.drawingBufferWidth
      const height = context.drawingBufferHeight
      if (width <= 0 || height <= 0) return

      //只在最初几帧校验：深度格式/采样数不匹配是确定性失败，
      //每帧调 getError() 会拖住 GPU 管线，没有必要
      const probing = this._depthProbeFrames < 5
      if (probing) {
        //先清掉可能残留的错误码，才能判断本次 blit 是否真的成功
        gl.getError()
      }

      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer._framebuffer)
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)
      gl.blitFramebuffer(
        0,
        0,
        width,
        height,
        0,
        0,
        width,
        height,
        gl.DEPTH_BUFFER_BIT,
        gl.NEAREST
      )
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null)
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null)

      if (!probing) return
      this._depthProbeFrames++
      const error = gl.getError()
      if (error !== gl.NO_ERROR) {
        this._depthFailures++
        //偶发错误不急着降级，连续失败才判定为不可用
        if (this._depthFailures >= 3) {
          this._disableDepth(
            'blitFramebuffer 连续失败 code=' +
              error +
              '（常见原因：MSAA 采样数不一致或深度格式不匹配，可尝试 scene.msaaSamples = 1）'
          )
        }
      } else {
        this._depthFailures = 0
      }
    }

    /**
     * 把 GL 状态交还给 Cesium。
     *
     * three 在 postRender 里会改掉 blend / depth / cull / viewport / framebuffer，
     * 但 Cesium 的 applyRenderState 只下发"与自己缓存不同的部分"，
     * 所以这里把缓存描述的那个状态原样再全量下发一遍：gl 与缓存重新一致，
     * 缓存本身保持不变，下一帧的增量 diff 依旧是正确起点。
     *
     * 关键点：`_currentRenderState` 只能是一个合法状态对象，绝不能置成 undefined
     * （RenderState.partialApply 会直接读 `previousRenderState.id`）。
     * @private
     */
    _restoreCesiumState() {
      const scene = this.cesiumViewer && this.cesiumViewer.scene
      const context = scene && scene.context
      if (!context) return

      const gl = context._gl
      const renderState = context._currentRenderState
      const passState = context._currentPassState

      //帧缓冲：置 undefined 后 Cesium 下次一定会重新 bind（Cesium 自己在 endFrame 也这么干）
      context._currentFramebuffer = undefined

      //clear 相关值是 Context 私有缓存，three 可能改过 gl.clearColor/clearDepth/clearStencil，
      //置 NaN 让下一次 clear 无条件重新下发（Color.equals 用不等比较，NaN 必然不等）
      const clearColor = context._clearColor
      if (clearColor) {
        clearColor.red = NaN
        clearColor.green = NaN
        clearColor.blue = NaN
        clearColor.alpha = NaN
      }
      context._clearDepth = NaN
      context._clearStencil = NaN

      const CesiumRenderState = Cesium && Cesium.RenderState
      if (
        renderState &&
        passState &&
        CesiumRenderState &&
        typeof CesiumRenderState.partialApply === 'function'
      ) {
        try {
          //毒化状态当"上一次状态"，强制把 renderState/passState 全量重放一遍；
          //new 状态（renderState/passState）不变，所以重放后 gl 与缓存严格一致
          CesiumRenderState.partialApply(
            gl,
            getPoisonRenderState(),
            renderState,
            getPoisonPassState(),
            passState,
            true
          )
          return
        } catch (err) {
          //私有 API 签名变化时不能把整帧拖死，落到下面的兜底
        }
      }

      //兜底：留一个毒化状态，下一帧第一次 applyRenderState 会全量下发
      context._currentRenderState = getPoisonRenderState()
      context._currentPassState = getPoisonPassState()
    }

    /**
     * 关闭深度共享并给出一次原因提示
     * @private
     */
    _disableDepth(reason: string) {
      if (!this._depthEnabled) return
      this._depthEnabled = false
      this.depthMode = 'none'
      if (this._depthWarned) return
      this._depthWarned = true
      console.warn(
        '[cesium_dev_kit] Three.js 深度共享已关闭：' +
          reason +
          '。three 内容将始终绘制在 Cesium 之上（L1 单上下文行为）。'
      )
    }

    /**
     * 融合运行时状态，排查问题时一次打印
     */
    getFusionStatus() {
      const scene = this.cesiumViewer && this.cesiumViewer.scene
      if (!scene) return null
      const context = scene.context
      const view = scene._view
      return {
        fusion: this.fusionMode,
        depth: this._depthEnabled ? this.depthMode : 'none',
        precision: this.precisionMode,
        webgl2: !!context.webgl2,
        frustums: scene.numberOfFrustums,
        logDepth: !!scene.logarithmicDepthBuffer,
        msaaSamples: scene.msaaSamples,
        globeDepth: !!(view && view.globeDepth),
        drawingBuffer: [context.drawingBufferWidth, context.drawingBufferHeight],
        near: scene.camera.frustum.near,
        far: scene.camera.frustum.far
      }
    }

    renderCesium() {
      //与 cesium 默认渲染循环一致:先 resize 再 render。
      //关闭 useDefaultRenderLoop 后若只调 render,挂载瞬间 canvas 高度为 0 会导致
      //CesiumWidget._canRender 永远为 false(场景不再渲染、相机飞行也不会推进)
      if (!this.cesiumViewer.isDestroyed()) {
        this.cesiumViewer.resize()
      }
      this.cesiumViewer.render()
      return this
    }

    renderThree() {
      //融合模式的绘制由 postRender 统一驱动：那里会先做状态隔离与深度搬运。
      //直接调用 renderer.render 会绕过这些步骤，导致下一帧 Cesium 花屏。
      if (this.fusionMode === 'single-context') {
        return this
      }
      this.renderer.render(this, this.camera)
      return this
    }

    updateSunMatrix() {
      //哥伦布视图下太阳包围球为 ECEF 坐标,无法直接使用,保持默认的垂直光照
      if (this.isColumbusViewMode()) return this

      const cc = this.cesiumViewer.scene.sun._boundingVolume.center
      const c3 = this.cartesian3ToVector(cc)

      this.sunUp.lookAt(
        c3.x - this.cameraOffset.x,
        c3.y - this.cameraOffset.y,
        -(c3.z - this.cameraOffset.z)
      )

      return this
    }

    /**
     * 同步相机矩阵。
     * precision = 'double'（默认）：复制 Cesium 的投影矩阵，并在 float64 里合成视图矩阵，
     *   只在最后写入 three（float32 uniform）时降一次精度。
     * precision = 'legacy'：历史行为（用 fov/aspect 重建投影矩阵），保留给需要完全一致观感的旧项目。
     */
    updateCameraMatrix() {
      if (this.precisionMode === 'legacy') {
        return this._updateCameraMatrixLegacy()
      }
      return this._updateCameraMatrixExact()
    }

    /**
     * 精确同步：投影矩阵直接复制，视图矩阵在 double 里合成
     * @private
     */
    _updateCameraMatrixExact() {
      const cesiumCamera = this.cesiumViewer.camera
      const frustum = cesiumCamera.frustum
      const camera = this.camera

      //1) 投影矩阵：直接复制，保留 near/far、off-center(offset)、无限远投影等分支。
      //   现有实现用 fov+aspect 重建，把这三样全丢了，这才是坐标漂移的真正来源。
      camera.projectionMatrix.fromArray(frustum.projectionMatrix)
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()

      //2) 对数深度 uniform 用的是 camera.far（logDepthBufFC = 2/log2(far+1)），
      //   必须每帧跟随 Cesium 的当前视锥，否则深度编码与 Cesium 不一致。
      camera.near = frustum.near
      camera.far = frustum.far

      //3) 尺寸与宽高比。
      //   融合模式：共用 Cesium 的 canvas，只能改视口，绝不能 setSize（会清空 Cesium 画面）；
      //   overlay 模式：必须给 three 自己的 canvas 定尺寸，否则它会停在默认 300x150，
      //   three 内容全被画到左上角那一小块里——表现就是"模型/特效突然不见了"。
      if (this.fusionMode === 'single-context') {
        const size = this.getDrawingBufferSize()
        camera.aspect = size.height > 0 ? size.width / size.height : 1
      } else {
        const canvas = this.cesiumViewer.scene.canvas
        const width = canvas.clientWidth || canvas.width || 1
        const height = canvas.clientHeight || canvas.height || 1
        camera.aspect = width / height
        this.renderer.setSize(width, height)
      }
      if (typeof frustum.fovy === 'number') {
        camera.fov = Cesium.Math.toDegrees(frustum.fovy)
      }

      //4) 视图矩阵：scene -> ECEF 只是"平移 -O"，在 float64 里合成后一次降精度
      const sceneToEcef = this._getSceneToEcef()
      const viewLocal = Cesium.Matrix4.multiply(
        cesiumCamera.viewMatrix,
        sceneToEcef,
        this._matrixScratch.viewLocal
      )

      camera.matrixWorldInverse.fromArray(viewLocal)
      camera.matrixWorld.copy(camera.matrixWorldInverse).invert()

      //5) 禁止 three 自己 recompose，否则 renderer.render 内部会覆盖上面手工写入的值
      camera.matrixAutoUpdate = false
      camera.matrixWorldAutoUpdate = false

      return this
    }

    /**
     * 场景坐标 -> Cesium 世界坐标（3D 为 ECEF，CV 为 CV 世界坐标）
     *
     * 关键：three 场景坐标就是「Cesium 世界坐标 - 场景原点」的纯平移，
     * 不存在额外旋转。原因是对象的定位链路：
     *   p_local = W⁻¹ · (P - O)      （setObjectPosition 里的 worldToLocal）
     *   p_scene = W · p_local = P - O （渲染时再乘回 W，W 自我抵消）
     * 所以 scene -> ECEF 的变换只有 T(O)，与 syncGroup 用 lookAt 还是 ENU 无关。
     * @private
     */
    _getSceneToEcef() {
      return Cesium.Matrix4.fromTranslation(
        this.getSceneOriginPosition(),
        this._matrixScratch.sceneToEcef
      )
    }

    /**
     * 历史版本：用 fov/aspect 重建投影矩阵（保留仅为兼容）
     * @private
     */
    _updateCameraMatrixLegacy() {
      //同步相机
      this.camera.fov = Cesium.Math.toDegrees(
        this.cesiumViewer.camera.frustum.fovy
      ) // ThreeJS FOV is vertical
      this.camera.updateProjectionMatrix()

      this.camera.matrixAutoUpdate = false
      const cvm = this.cesiumViewer.camera.viewMatrix
      const civm = this.cesiumViewer.camera.inverseViewMatrix
      this.camera.lookAt(this.cameraCenter)
      this.camera.matrixWorld.set(
        civm[0],
        civm[4],
        civm[8],
        civm[12] - this.cameraOffset.x,
        civm[1],
        civm[5],
        civm[9],
        civm[13] - this.cameraOffset.y,
        civm[2],
        civm[6],
        civm[10],
        civm[14] - this.cameraOffset.z,
        civm[3],
        civm[7],
        civm[11],
        civm[15]
      )
      this.camera.matrixWorldInverse.set(
        cvm[0],
        cvm[4],
        cvm[8],
        cvm[12] - this.cameraOffset.x,
        cvm[1],
        cvm[5],
        cvm[9],
        cvm[13] - this.cameraOffset.y,
        cvm[2],
        cvm[6],
        cvm[10],
        cvm[14] - this.cameraOffset.z,
        cvm[3],
        cvm[7],
        cvm[11],
        cvm[15]
      )

      const width = this.cesiumViewer.scene.canvas.clientWidth
      const height = this.cesiumViewer.scene.canvas.clientHeight
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()

      //融合模式下 setSize 会重置 canvas.width/height 并清空 Cesium 的画面，只能改视口
      if (this.fusionMode === 'single-context') {
        this.syncViewport()
      } else {
        this.renderer.setSize(width, height)
      }

      return this
    }

    /**
     * 当前是否为哥伦布视图模式(2.5D 投影)
     * @returns {boolean}
     */
    isColumbusViewMode() {
      return this.cesiumViewer.scene.mode === Cesium.SceneMode.COLUMBUS_VIEW
    }

    /**
     * three 内容是否可与 cesium 保持同步渲染
     * 2D 模式使用正交相机,无法与 three 透视相机同步;
     * 场景模式切换动画(morph)过程中坐标处于插值中间态,同样跳过 three 渲染
     * @returns {boolean}
     */
    isThreeRenderable() {
      const scene = this.cesiumViewer.scene
      if (scene.mode === Cesium.SceneMode.SCENE2D) return false
      //morphTime: 0=2D/哥伦布视图,1=3D,中间值表示正在切换
      return (
        Math.abs(scene.morphTime) < Cesium.Math.EPSILON6 ||
        Math.abs(scene.morphTime - 1) < Cesium.Math.EPSILON6
      )
    }

    /**
     * 场景原点(three 世界原点)对应的 cesium 世界坐标
     * 3D 模式为 ECEF 坐标;哥伦布视图为 CV 世界坐标(见 cartesianToCVWorld)
     * @returns {Cartesian3|THREE.Vector3}
     */
    getSceneOriginPosition() {
      if (this.isColumbusViewMode()) {
        return this.cartesianToCVWorld(
          Cesium.Cartesian3.fromDegrees(this.lngLat[0], this.lngLat[1], 0)
        )
      }
      return Cesium.Cartesian3.fromDegrees(this.lngLat[0], this.lngLat[1], 0)
    }

    /**
     * ECEF 坐标转哥伦布视图世界坐标
     * cesium 在 CV 模式下并非直接使用投影坐标渲染,而是将其轴序置换:
     * CV 世界坐标 = Camera.TRANSFORM_2D * mapProjection.project(cartographic)
     * 即 (高度, 投影东向, 投影北向) —— 对应着色器中的 position2D.zxy,
     * 也就是 CV 世界中 x 轴为向上方向
     * @param {Cartesian3} cartesian - ECEF 坐标
     * @returns {THREE.Vector3}
     */
    cartesianToCVWorld(cartesian: any) {
      const projected = this.cesiumViewer.scene.mapProjection.project(
        Cesium.Cartographic.fromCartesian(cartesian)
      )
      return new THREE.Vector3(projected.z, projected.x, projected.y)
    }

    updateGroupMatrixWorld() {
      if (this.isColumbusViewMode()) {
        // 哥伦布视图模式:three 世界坐标系即 cesium CV 世界坐标(投影坐标经轴序置换:
        // x=高度(向上), y=投影东向, z=投影北向,单位:米),原点平移到 center 的投影位置;
        // CV 中坐标轴方向恒定,无需逐帧 lookAt;
        // syncGroup 旋转 Rx(-90°)·Ry(-90°),配合 childrenGroup 自身的-90°,使:
        // 模型 +Y(头)指向世界 +X(直立)、+Z(面朝)指向世界 -Z(正南)、+X(右手)指向 +Y(正东),
        // 与 3D 模式(固定 up=(0,0,-1) lookAt)推导出的朝向一致
        this.cameraOffset.copy(this.getSceneOriginPosition())
        this.syncGroup.rotation.set(-Math.PI / 2, -Math.PI / 2, 0)
        this.syncGroup.updateMatrix()
        this.syncGroup.up.set(1, 0, 0)
        this.up.set(1, 0, 0)
        //ECEF 模拟球在 CV 坐标系下没有意义,隐藏
        if (this.sphere) this.sphere.visible = false
        if (this.sphere3) this.sphere3.visible = false
        return this
      }

      //3D 模式恢复模拟球(融合模式下不存在模拟球)
      if (this.sphere) this.sphere.visible = true
      if (this.sphere3) this.sphere3.visible = true

      // 得到面向模型的前向方向
      const center = this.cartesian3ToVector(
        Cesium.Cartesian3.fromDegrees(this.lngLat[0], this.lngLat[1], 0)
      )
      // 使用从左下到左上的方向作为上向量
      const topLeft = this.cartesian3ToVector(
        Cesium.Cartesian3.fromDegrees(this.lngLat[0], this.lngLat[1], 2)
      )
      const latDir = new THREE.Vector3().subVectors(center, topLeft).normalize()

      // 配置实体的位置和方向
      // this.syncGroup.position.copy(center)
      // 固定 up 向量后再 lookAt,保证首次调用与后续渲染帧计算出的朝向完全一致
      // (否则模型加载早于首帧渲染时(setObjectPosition 为首次调用),设置位置用的坐标系
      //  与渲染用的坐标系存在绕铅垂线的旋转差,模型会偏离目标坐标,且距离 center 越远偏移越大)
      this.syncGroup.up.set(0, 0, -1)
      this.syncGroup.lookAt(latDir)
      this.syncGroup.up.copy(latDir)
      this.syncGroup.updateMatrix()

      this.cameraOffset.copy(center)

      // this.sphere.position.set(0 - center.x, 0 - center.y, 0 - center.z)
      this.syncGroup.up.set(0, 0, -1)
      this.up.set(0, 0, -1)

      return this
    }

    update() {
      //融合模式：three 的绘制统一由 postRender 完成（见 _renderFusedFrame）。
      //这里只负责推进一帧 Cesium；viewer.render() 结束时会同步触发 postRender。
      //若当前正处在 postRender 内部（用户在帧回调里调用了 scene.update()），直接返回避免递归。
      if (this.fusionMode === 'single-context') {
        if (this._inFusedFrame) return this
        this.renderCesium()
        return this
      }

      this.updateSunMatrix()
      this.updateGroupMatrixWorld()
      // 先渲染 cesium，再用「本帧」的相机矩阵渲染 three。
      // 两张 canvas 是两个独立 DOM 节点，屏幕合成顺序由 z-index 决定、与调用顺序无关，
      // 所以这里的顺序可以自由选择：先 cesium 才能拿到本帧最新的相机矩阵，
      // 否则 three 永远用上一帧的相机（滞后一帧），相机一动贴地内容就整体上下漂浮。
      this.renderCesium()
      this.updateCameraMatrix()
      //2D 模式及模式切换动画过程中跳过 three 渲染,避免与 cesium 显示不一致
      if (this.isThreeRenderable()) {
        this.renderThree()
      } else {
        //清空画布,避免残留切换前的内容
        this.renderer.clear()
      }
    }

    add(object: any) {
      if (arguments.length > 1) {
        for (let i = 0; i < arguments.length; i++) {
          this.childrenGroup.add(arguments[i])
        }

        return this
      }

      if (object === this) {
        console.error(
          "THREE.Object3D.add: object can't be added as a child of itself.",
          object
        )
        return this
      }

      if (object && object.isObject3D) {
        if (object.parent !== null) {
          object.parent.remove(object)
        }

        object.parent = this.childrenGroup
        this.childrenGroup.children.push(object)
        object.dispatchEvent({ type: 'added' })
      } else {
        console.error(
          'THREE.Object3D.add: object not an instance of THREE.Object3D.',
          object
        )
      }

      return this
    }

    remove(object: any) {
      if (arguments.length > 1) {
        for (let i = 0; i < arguments.length; i++) {
          this.childrenGroup.remove(arguments[i])
        }

        return this
      }

      const index = this.childrenGroup.children.indexOf(object)

      if (index !== -1) {
        object.parent = null
        this.childrenGroup.children.splice(index, 1)
        object.dispatchEvent({ type: 'removed' })
      }

      return this
    }

    clear() {
      for (let i = 0; i < this.childrenGroup.children.length; i++) {
        const object = this.childrenGroup.children[i]
        object.parent = null
        object.dispatchEvent({ type: 'removed' })
      }

      this.childrenGroup.children.length = 0
      return this
    }

    traverse(callback: any) {
      callback(this.childrenGroup)
      const children = this.childrenGroup.children

      for (let i = 0, l = children.length; i < l; i++) {
        children[i].traverse(callback)
      }
    }

    traverseVisible(callback: any) {
      if (this.visible === false || this.childrenGroup.visible === false) return
      callback(this.childrenGroup)
      const children = this.childrenGroup.children

      for (let i = 0, l = children.length; i < l; i++) {
        children[i].traverseVisible(callback)
      }
    }

    toJSON(meta: any) {
      const isRootObject = meta === undefined || typeof meta === 'string'
      const output: any = {}

      if (isRootObject) {
        meta = {
          geometries: {},
          materials: {},
          textures: {},
          images: {},
          shapes: {},
          skeletons: {},
          animations: {},
          nodes: {},
          options: {}
        }
        output.metadata = {
          version: 4.5,
          type: 'Object',
          generator: 'Object3D.toJSON'
        }
      }

      const object: any = {}
      object.uuid = this.uuid
      object.type = this.type
      if (this.name !== '') object.name = this.name
      if (this.castShadow === true) object.castShadow = true
      if (this.receiveShadow === true) object.receiveShadow = true
      if (this.visible === false) object.visible = false
      if (this.frustumCulled === false) object.frustumCulled = false
      if (this.renderOrder !== 0) object.renderOrder = this.renderOrder
      if (JSON.stringify(this.userData) !== '{}')
        object.userData = this.userData
      object.layers = this.layers.mask
      object.matrix = this.matrix.toArray()
      if (this.matrixAutoUpdate === false) object.matrixAutoUpdate = false // object specific properties

      if (this.background) {
        if (this.background.isColor) {
          object.background = this.background.toJSON()
        } else if (this.background.isTexture) {
          object.background = this.background.toJSON(meta).uuid
        }
      }

      if (this.environment && this.environment.isTexture) {
        object.environment = this.environment.toJSON(meta).uuid
      }

      if (this.fog !== null) object.fog = this.fog.toJSON()

      if (this.options) {
        object.options = {}
        for (const key in this.options) {
          if (['camera', 'renderer'].includes(key)) continue
          object.options[key] = this.options[key]
        }
      }

      if (this.childrenGroup.children.length > 0) {
        object.children = []

        for (let i = 0; i < this.childrenGroup.children.length; i++) {
          object.children.push(
            this.childrenGroup.children[i].toJSON(meta).object
          )
        }
      }

      if (isRootObject) {
        const geometries = extractFromCache(meta.geometries)
        const materials = extractFromCache(meta.materials)
        const textures = extractFromCache(meta.textures)
        const images = extractFromCache(meta.images)
        const shapes = extractFromCache(meta.shapes)
        const skeletons = extractFromCache(meta.skeletons)
        const animations = extractFromCache(meta.animations)
        const nodes = extractFromCache(meta.nodes)
        if (geometries.length > 0) output.geometries = geometries
        if (materials.length > 0) output.materials = materials
        if (textures.length > 0) output.textures = textures
        if (images.length > 0) output.images = images
        if (shapes.length > 0) output.shapes = shapes
        if (skeletons.length > 0) output.skeletons = skeletons
        if (animations.length > 0) output.animations = animations
        if (nodes.length > 0) output.nodes = nodes
      }

      object.isGIS = true

      output.object = object

      return output

      function extractFromCache(cache: any) {
        const values: any[] = []

        for (const key in cache) {
          const data = cache[key]
          delete data.metadata
          values.push(data)
        }

        return values
      }
    }
    dispose() {
      //先摘掉 postRender 监听，否则销毁过程中 postRender 还会回调到半销毁的场景
      this._uninstallPostRender()
      this._frameCallbacks = []
      this._disposed = true
      ;(this as any).update = () => {}
      ;(this as any).renderCesium = () => {}
      ;(this as any).renderThree = () => {}
      ;(this as any)._renderFusedFrame = () => {}
      ;(this as any).updateSunMatrix = () => {}
      ;(this as any).updateCameraMatrix = () => {}
      ;(this as any).updateGroupMatrixWorld = () => {}
      this.cesiumViewer.destroy()
      // super.dispose()
    }

    cartesian3ToVector(cart: any) {
      return new THREE.Vector3(cart.x, cart.y, cart.z)
    }

    /**
     * 坐标统一转 Cartesian3
     * @private
     * @param {Array|Cartesian3|Cartographic} position - [lng, lat, height](经纬度:度,高度:米) | Cesium.Cartesian3 | Cesium.Cartographic
     * @returns {Cartesian3}
     */
    positionToCartesian(position: any) {
      //数组形式 [lng, lat, height] 经纬度为度,高度为米
      if (Array.isArray(position)) {
        return Cesium.Cartesian3.fromDegrees(
          position[0],
          position[1],
          position.length > 2 ? position[2] : 0
        )
      }

      if (position && typeof position === 'object') {
        //Cesium.Cartographic 经纬度为弧度
        if (
          typeof position.longitude === 'number' &&
          typeof position.latitude === 'number'
        ) {
          return Cesium.Cartesian3.fromRadians(
            position.longitude,
            position.latitude,
            position.height || 0
          )
        }

        //Cesium.Cartesian3(ECEF 直角坐标)
        if (
          typeof position.x === 'number' &&
          typeof position.y === 'number' &&
          typeof position.z === 'number'
        ) {
          return new Cesium.Cartesian3(position.x, position.y, position.z)
        }
      }

      throw new Error(
        'THREE.ThreeCesiumScene: invalid position, expect [lng, lat, height] | Cesium.Cartesian3 | Cesium.Cartographic.'
      )
    }

    /**
     * 坐标转 three 世界坐标(以 initThree 传入的 center 为原点,单位:米)
     * @function
     * @param {Array|Cartesian3|Cartographic} position - [lng, lat, height](经纬度:度,高度:米) | Cesium.Cartesian3 | Cesium.Cartographic
     * @returns {THREE.Vector3}
     */
    positionToWorldVector(position: any) {
      const cartesian = this.positionToCartesian(position)
      //场景原点坐标(center 对应的 cesium 世界坐标)
      const origin = this.getSceneOriginPosition()

      //哥伦布视图:先转成 CV 世界坐标(投影坐标经轴序置换)再计算偏移
      if (this.isColumbusViewMode()) {
        const cvPosition = this.cartesianToCVWorld(cartesian)
        return new THREE.Vector3(
          cvPosition.x - origin.x,
          cvPosition.y - origin.y,
          cvPosition.z - origin.z
        )
      }

      return new THREE.Vector3(
        cartesian.x - origin.x,
        cartesian.y - origin.y,
        cartesian.z - origin.z
      )
    }

    /**
     * 设置对象在地球上显示的位置(模型需先通过 scene.add 添加)
     * @function
     * @param {object} object - three 对象(THREE.Object3D)
     * @param {Array|Cartesian3|Cartographic} position - [lng, lat, height](经纬度:度,高度:米) | Cesium.Cartesian3 | Cesium.Cartographic
     * @example
     * scene.add(gltf.scene)
     * scene.setObjectPosition(gltf.scene, [104.081701757991, 30.627042558105988, 0])
     * @returns {Scene}
     */
    setObjectPosition(object: any, position: any) {
      if (!object || !object.isObject3D) {
        console.error(
          'THREE.ThreeCesiumScene.setObjectPosition: object must be an instance of THREE.Object3D.',
          object
        )
        return this
      }

      //同步场景原点朝向并刷新世界矩阵
      this.updateGroupMatrixWorld()
      this.updateMatrixWorld(true)

      const worldPosition = this.positionToWorldVector(position)
      object.position.copy(this.childrenGroup.worldToLocal(worldPosition))

      return this
    }

    /**
     * 获取对象当前所在的地理位置
     * @function
     * @param {object} object - three 对象(THREE.Object3D)
     * @returns {Array} [lng, lat, height] 经纬度:度,高度:米
     */
    getObjectPosition(object: any) {
      if (!object || !object.isObject3D) {
        console.error(
          'THREE.ThreeCesiumScene.getObjectPosition: object must be an instance of THREE.Object3D.',
          object
        )
        return null
      }

      this.updateGroupMatrixWorld()
      this.updateMatrixWorld(true)

      const origin = this.getSceneOriginPosition()
      const worldPosition = this.childrenGroup.localToWorld(object.position.clone())
      //绝对位置(three 世界坐标 + 场景原点偏移)
      const position = new Cesium.Cartesian3(
        worldPosition.x + origin.x,
        worldPosition.y + origin.y,
        worldPosition.z + origin.z
      )

      let cartographic
      if (this.isColumbusViewMode()) {
        //CV 世界坐标 (高度,东向,北向)置换回投影坐标 (东向,北向,高度) 再反投影
        cartographic = this.cesiumViewer.scene.mapProjection.unproject(
          new Cesium.Cartesian3(position.y, position.z, position.x)
        )
      } else {
        //3D 模式:ECEF 反算
        cartographic = Cesium.Cartographic.fromCartesian(position)
      }

      return [
        Cesium.Math.toDegrees(cartographic.longitude),
        Cesium.Math.toDegrees(cartographic.latitude),
        cartographic.height
      ]
    }
  }
  Scene.prototype.isScene = true
  Scene.prototype.isGIS = true

  return Scene
}

export { initThreeScene }
