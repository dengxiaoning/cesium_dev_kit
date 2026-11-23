import { initThreeScene } from './ThreeScene'
import type { ThreeFusionMode, ThreePrecisionMode } from './ThreeScene'
import { createScopedConstructor, attachDestroy, registerCleanup } from './Base'

/**
 * 深度共享方式（对外选项）
 * - `none`：不共享深度，three 内容永远绘制在 Cesium 之上（L1 行为）
 * - `canvas-blit`：把 Cesium 离屏 FBO 的深度 blit 到画布深度缓冲（默认）
 * - `shader-copy`：预留，当前回退为 `canvas-blit`
 */
export type ThreeDepthOption = 'none' | 'canvas-blit' | 'shader-copy'

/* ===== 由原 JSDoc @typedef 生成的类型 ===== */

/** three 实例对象（initThree 的返回值） */
export interface threeObj {
  /** three 场景对象 */
  scene: any
  /** three 的 WebGLRenderer */
  renderer: any
  /** three 的透视相机 */
  camera: any
}

/** three 对象（THREE.Object3D：模型 / 网格 / Group 等）。three 不自带 TS 类型声明，这里用宽松结构占位 */
export interface ThreeObject3D {
  /** three 对象的任意属性，如 position / rotation / scale / children */
  [key: string]: any
}

/** initThree 的参数 */
export interface ThreeInitOptions {
  /** 相机垂直视角（度），默认 45；single-context 模式下由 Cesium 投影矩阵接管 */
  fov?: number
  /** 相机宽高比，默认取容器宽高比 */
  aspect?: number
  /** 近裁剪面（米），默认 1；single-context 模式下每帧跟随 Cesium frustum */
  near?: number
  /** 远裁剪面（米），默认 10000000；single-context 模式下每帧跟随 Cesium frustum */
  far?: number
  /** 场景中心经纬度 `[lng, lat]`，默认 `[104.0817, 30.6270]` */
  center?: number[]
  /** 是否显示坐标轴辅助线，默认 false */
  axesHelper?: boolean
  /** 是否启用光照，默认 true */
  enableLighting?: boolean
  /** 是否启用 three 操作习惯（左键改俯仰角），默认 true */
  threeHabit?: boolean
  /** 融合模式：`overlay` 双 Canvas 叠加（默认）；`single-context` 复用 Cesium 的 canvas 与 WebGL 上下文 */
  fusion?: ThreeFusionMode
  /** 深度共享方式，仅 single-context 有效，默认 `canvas-blit` */
  depth?: ThreeDepthOption
  /** 相机矩阵精度策略，默认 `double` */
  precision?: ThreePrecisionMode
  /** 其它自定义字段 */
  [key: string]: unknown
}

/** ThreeJs 实例类型 */
export interface ThreeJsInstance {
  _viewer: any
  _containerId: any
  _threeContainerId: any
  _Scene: any
  /** 初始化容器 */
  _initContainer(): any,
  /** 初始化three */
  initThree(options?: ThreeInitOptions): threeObj,
  loop(callback?: () => void): void,
  /** 设置 three 对象(模型/网格等)在地球上显示的位置 */
  setPosition(object?: ThreeObject3D, position?: number[]): any,
  /** 获取 three 对象当前所在的地理位置 */
  getPosition(object?: ThreeObject3D): number[],
  /** 判断对象是否有某个属性 */
  _objHasOwnProperty(obj?: any, field?: any, defVal?: any): any,
  /** three对象销毁 */
  destroyThreeJS(): void,
  cesiumContainer: any
  threeContainer: any
  _three: threeObj
  /** requestAnimationFrame 句柄 */
  _rafId: number | null
  /** 构造时指定的默认融合模式 */
  _fusion?: ThreeFusionMode
  /** 构造时指定的默认深度模式 */
  _depth?: ThreeDepthOption
  /** 构造时指定的默认精度策略 */
  _precision?: ThreePrecisionMode
  /** 融合运行时状态（诊断用） */
  getFusionStatus(): any
  /** 单上下文可用性检查 */
  _assertFusionSupported(): boolean
}

/** ThreeJs 构造函数类型 */
export interface ThreeJsConstructor {
  new (viewer?: any, cesiumGlobal?: any, defaultStatic?: any, threeConf?: any): ThreeJsInstance
  prototype: ThreeJsInstance
}

/**
 * 接入three的融合模块
 * 【注意】cesium 需要关闭自带的循环渲染（useDefaultRenderLoop: false）
 * @class
 * @param {object} viewer - cesium 实例
 * @param {object}  cesiumGlobal - cesium 全局对象
 * @exports ThreeJs
 */
/**
 * 为每个实例创建独立闭包，避免模块级 Cesium/dfSt 及交互状态在多个 viewer 间共享。
 * 由 createScopedConstructor 在每次 new 时调用。
 */
export function createThreeJsModule() {
  let Cesium: any = null
  let THREE: any = null

const ThreeJs = function (this: ThreeJsInstance, viewer?: any, cesiumGlobal?: any, defaultStatic?: any, threeConf?: any) {
  if (viewer && threeConf) {
    const { threeGlobal, containerId, threeContainerId } = threeConf
    Cesium = cesiumGlobal
    THREE = threeGlobal
    this._viewer = viewer
    this._containerId = containerId
    this._threeContainerId = threeContainerId
    //构造函数级别的默认融合配置，可被 initThree 的 options 覆盖
    this._fusion = threeConf.fusion
    this._depth = threeConf.depth
    this._precision = threeConf.precision
    this._Scene = initThreeScene({ THREE, Cesium, viewer })
    this._initContainer()
    attachDestroy(this)
    registerCleanup(this, () => {
      this.destroyThreeJS()
    })
  }
} as unknown as ThreeJsConstructor

ThreeJs.prototype = {
  /**
   * 初始化容器
   * @private
   */
  _initContainer: function (this: ThreeJsInstance) {
    this.cesiumContainer = undefined
    this.threeContainer = undefined
    this.cesiumContainer = document.getElementById(this._containerId)
    this.threeContainer = document.getElementById(this._threeContainerId)

    //元素都已经创建默认集成
    if (!this.cesiumContainer) {
      alert('未获取到 cesiumContainer 容器!')
      return false
    } else {
      //是否符合
      if (this.cesiumContainer.style.position !== 'absolute') {
        // 重写样式
        this.cesiumContainer.style.position = 'absolute'
        this.cesiumContainer.style.top = 0
        this.cesiumContainer.style.left = 0
        this.cesiumContainer.style.height = '100%'
        this.cesiumContainer.style.width = '100%'
        this.cesiumContainer.style.margin = 0
        this.cesiumContainer.style.overflow = 'hidden'
        this.cesiumContainer.style.padding = 0
        this.cesiumContainer.style.fontFamily = 'sans-serif'
      }
    }
    //no create
    if (!this.threeContainer) {
      var body = document.getElementsByTagName('body')[0]
      if (body) {
        this.threeContainer = document.createElement('div')
        this.threeContainer.id = this._threeContainerId
        this.threeContainer.style.position = 'absolute'
        this.threeContainer.style.top = 0
        this.threeContainer.style.left = 0
        this.threeContainer.style.height = '100%'
        this.threeContainer.style.width = '100%'
        this.threeContainer.style.margin = 0
        this.threeContainer.style.overflow = 'hidden'
        this.threeContainer.style.padding = 0
        this.threeContainer.style.fontFamily = 'sans-serif'
        this.threeContainer.style.pointerEvents = 'none'
        body.appendChild(this.threeContainer)
      }
    }
  },
  /**
   * 初始化three
   * @function
   * @param {object} options
   * @param {number} [options.fov=45] - Camera frustum vertical field of view.（fusion 模式下由 Cesium 投影矩阵接管）
   * @param {number} [options.aspect=window.innerWidth/window.innerHeight] - Camera frustum aspect ratio.
   * @param {number} [options.near=1]  - Camera frustum near plane.（fusion 模式下每帧跟随 Cesium frustum）
   * @param {number} [options.far=10000000] - Camera frustum far plane.（fusion 模式下每帧跟随 Cesium frustum）
   * @param {Array} [options.center=[104.081701757991, 30.627042558105988]] - Camera center coordinate.
   * @param {Array} [options.axesHelper=false] - Enabled axes Helper.
   * @param {Array} [options.enableLighting=true] - Enabled light.
   * @param {Array} [options.threeHabit=true] - Enabled threejs Habit(Left click to modify pitch).
   * @param {'overlay'|'single-context'} [options.fusion='overlay'] - 融合模式。
   *   - `overlay`：双 Canvas 叠加（历史行为，零耦合）
   *   - `single-context`：three 复用 Cesium 的 canvas 与 WebGL 上下文，绘制挂在 scene.postRender
   * @param {'none'|'canvas-blit'|'shader-copy'} [options.depth] - 深度共享方式，仅 single-context 有效。
   *   默认 `canvas-blit`：把 Cesium 离屏 FBO 的深度 blit 到画布深度缓冲，从而实现相互遮挡。
   *   `shader-copy` 为预留值（当前回退到 `canvas-blit`），`none` 表示只共享上下文、不共享深度。
   * @param {'double'|'legacy'} [options.precision='double'] - 相机矩阵精度策略。
   *   `double` 复制 Cesium 投影矩阵并在 float64 里合成视图矩阵；`legacy` 为历史行为。
   * @example
   * import { ThreeJs } from 'cesium_dev_kit'
   * const threeObj = new ThreeJs({
   *     cesiumGlobal: Cesium,
   *     threeGlobal: THREE,
   *     containerId: 'cesiumContainer',
   *     threeContainerId: 'threeContainer',
   *   })
   *   const { scene, camera } = threeObj.threeJs.initThree({
   *     center,
   *     fusion: 'single-context',
   *     depth: 'canvas-blit'
   *   });
   * @returns {threeObj}
   */
  initThree: function (this: ThreeJsInstance, options?: ThreeInitOptions) {
    options = options || {}
    const viewer = this._viewer
    const cesiumScene = viewer.scene

    const fusion: ThreeFusionMode =
      options.fusion || this._fusion || 'overlay'
    const precision: ThreePrecisionMode =
      options.precision || this._precision || 'double'
    const depthOptionInput: ThreeDepthOption =
      options.depth || this._depth || (fusion === 'single-context' ? 'canvas-blit' : 'none')
    let depthOption: ThreeDepthOption = depthOptionInput
    if (depthOption === 'shader-copy') {
      //留字段但暂不实现：真机上 MSAA 无法 blit 时才会需要它
      console.warn(
        '[cesium_dev_kit] depth: "shader-copy" 尚未实现，已回退为 "canvas-blit"'
      )
      depthOption = 'canvas-blit'
    }

    //传入已有 context 时，antialias/alpha/depth/stencil 由 Cesium 创建上下文时决定，这里的值会被忽略
    const useSingleContext =
      fusion === 'single-context' && this._assertFusionSupported()

    let near = options.near || 1
    let far = options.far || 10 * 1000 * 1000
    const width = window.innerWidth
    const height = window.innerHeight
    const aspect = options.aspect || width / height
    const fov = options.fov || 45

    if (useSingleContext) {
      //跟随 Cesium 当前视锥，避免三的深度编码与 Cesium 不一致
      const frustum = viewer.camera.frustum
      near = frustum.near
      far = frustum.far
    }

    this._three = {
      renderer: null,
      camera: null,
      scene: null
    }

    this._three.camera = new THREE.PerspectiveCamera(fov, aspect, near, far)

    if (useSingleContext) {
      const context = cesiumScene.context
      this._three.renderer = new THREE.WebGLRenderer({
        canvas: cesiumScene.canvas,
        context: context._gl,
        alpha: true,
        stencil: true,
        depth: true,
        //对数深度必须与 Cesium 保持一致：两者公式同为 log2(1+w)/log2(far+1)，
        //near/far 对齐后可以直接共享同一深度缓冲，无需解码/重映射
        logarithmicDepthBuffer: cesiumScene.logarithmicDepthBuffer !== false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance'
      })
      const renderer = this._three.renderer
      //四个 autoClear 必须全关，否则 three 会把地球擦掉
      renderer.autoClear = false
      renderer.autoClearColor = false
      renderer.autoClearDepth = false
      renderer.autoClearStencil = false
    } else {
      this._three.renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        logarithmicDepthBuffer: true,
        stencil: true,
        depth: true
      })
    }

    const renderer = this._three.renderer
    //色彩空间：优先用新 API（r152+ 移除了 outputEncoding）
    if (THREE.SRGBColorSpace !== undefined && 'outputColorSpace' in renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace
    } else if (THREE.sRGBEncoding !== undefined) {
      renderer.outputEncoding = THREE.sRGBEncoding
    }
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this._three.scene = new this._Scene({
      cesiumDom: this._containerId,
      threeHabit: this._objHasOwnProperty(options, 'threeHabit', true),
      enableLighting: this._objHasOwnProperty(options, 'enableLighting', true),
      axesHelper: this._objHasOwnProperty(options, 'axesHelper', false),
      camera: this._three.camera,
      renderer: renderer,
      lngLat: options.center || [104.081701757991, 30.627042558105988],
      fusion: useSingleContext ? 'single-context' : 'overlay',
      depth: useSingleContext ? depthOption : 'none',
      precision: precision
    })

    if (!useSingleContext && this.threeContainer) {
      this.threeContainer.appendChild(renderer.domElement)
    }

    //深度共享的前提：单视锥。多视锥会在每个视锥之间 clearDepth，
    //帧末深度只剩最近一段（远段几何的深度已被清掉），任何深度比较都失去意义。
    if (useSingleContext && depthOption !== 'none') {
      if (cesiumScene.logarithmicDepthBuffer) {
        //log2(far/near)/log2(MAX_VALUE) < 1 => 恒为单视锥，且对数深度下没有精度损失
        cesiumScene.logarithmicDepthFarToNearRatio = Number.MAX_VALUE
      }
      if (cesiumScene.msaaSamples > 1) {
        console.info(
          '[cesium_dev_kit] 深度共享已启用，但 scene.msaaSamples = ' +
            cesiumScene.msaaSamples +
            '；若出现 blit 失败可将其设为 1。'
        )
      }
    }

    return this._three
  },

  /**
   * 单上下文可用性检查
   * @private
   */
  _assertFusionSupported: function (this: ThreeJsInstance) {
    const scene = this._viewer && this._viewer.scene
    if (!scene || !scene.context || !scene.context._gl) {
      console.warn('[cesium_dev_kit] 未取到 Cesium 的 WebGL 上下文，回退到双 Canvas 模式')
      return false
    }
    if (scene.context.webgl2 !== true) {
      console.warn(
        '[cesium_dev_kit] Three.js r163+ 需要 WebGL2，当前 Cesium 上下文不是 WebGL2，' +
          '请给 Cesium 传 contextOptions: { requestWebgl2: true }；本次回退到双 Canvas 模式'
      )
      return false
    }
    return true
  },

  loop(this: ThreeJsInstance, callback?: any) {
    const threeScene = this._three && this._three.scene
    const fused = !!threeScene && threeScene.fusionMode === 'single-context'

    if (fused) {
      //融合模式：回调交给 postRender 驱动，不再另起一条 rAF 与 Cesium 竞争
      if (typeof callback === 'function') {
        threeScene.addFrameCallback(callback)
      }
      const viewer = this._viewer
      const useDefaultRenderLoop =
        viewer && typeof viewer.useDefaultRenderLoop === 'boolean'
          ? viewer.useDefaultRenderLoop
          : !!(viewer && viewer.cesiumWidget && viewer.cesiumWidget.useDefaultRenderLoop)

      //Cesium 自带循环时什么都不用做；关掉了默认循环才由这里驱动
      if (!useDefaultRenderLoop && !this._rafId) {
        const tick = () => {
          this._rafId = requestAnimationFrame(tick)
          threeScene.update()
        }
        this._rafId = requestAnimationFrame(tick)
      }
      return
    }

    const _loop = (time?: number) => {
      this._rafId = requestAnimationFrame(_loop)
      callback && callback(time)
    }
    this._rafId = requestAnimationFrame(_loop)
  },

  /**
   * 融合运行时状态（诊断用）
   * @function
   * @returns {object|null}
   */
  getFusionStatus(this: ThreeJsInstance) {
    const threeScene = this._three && this._three.scene
    if (!threeScene || typeof threeScene.getFusionStatus !== 'function') return null
    return threeScene.getFusionStatus()
  },
  /**
   * 设置 three 对象(模型/网格等)在地球上显示的位置
   * 【注意】需要先调用 initThree 并且对象已通过 scene.add 添加到场景
   * @function
   * @param {object} object - three 对象（THREE.Object3D）
   * @param {Array|Cartesian3|Cartographic} position - [lng, lat, height](经纬度:度,高度:米) 或 Cesium.Cartesian3/Cartographic
   * @example
   * const { scene, camera } = threeObj.threeJs.initThree({ center });
   * const loader = new GLTFLoader();
   * loader.load('model.glb', (gltf) => {
   *   scene.add(gltf.scene);
   *   threeObj.threeJs.setPosition(gltf.scene, [104.081701757991, 30.627042558105988, 0]);
   * })
   * @returns {ThreeJs}
   */
  setPosition(this: ThreeJsInstance, object?: ThreeObject3D, position?: number[]) {
    if (!this._three || !this._three.scene) {
      console.error('ThreeJs.setPosition: please call initThree first.')
      return this
    }
    this._three.scene.setObjectPosition(object, position)
    return this
  },
  /**
   * 获取 three 对象当前所在的地理位置
   * @function
   * @param {object} object - three 对象（THREE.Object3D）
   * @returns {Array} [lng, lat, height] 经纬度:度,高度:米
   */
  getPosition(this: ThreeJsInstance, object?: ThreeObject3D) {
    if (!this._three || !this._three.scene) {
      console.error('ThreeJs.getPosition: please call initThree first.')
      return null
    }
    return this._three.scene.getObjectPosition(object)
  },
  /**
   * 判断对象是否有某个属性
   * @private
   * @param {object} obj 对象
   * @param {string} field  属性字段
   * @param {string} defVal  默认返回
   * @returns {string}
   */
  _objHasOwnProperty(this: ThreeJsInstance, obj?: any, field?: any, defVal?: any) {
    return obj.hasOwnProperty(field) ? obj[field] : defVal
  },
  /**
   * three对象销毁
   * @function
   * @example
   * import { ThreeJs } from 'cesium_dev_kit'
   * const threeObj = new ThreeJs({
   *      cesiumGlobal: Cesium,
   *     threeGlobal: THREE,
   *     containerId: 'cesiumContainer',
   *     threeContainerId: 'threeContainer',
   *   })
   * threeObj.threeJs.destroyThreeJS();
   */
  destroyThreeJS(this: ThreeJsInstance) {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
    if (this._three && this._three.scene && typeof this._three.scene.dispose === 'function') {
      this._three.scene.dispose()
    }
  }
} as unknown as ThreeJsInstance
  return ThreeJs
}

export const ThreeJs = createScopedConstructor(createThreeJsModule) as unknown as ThreeJsConstructor
