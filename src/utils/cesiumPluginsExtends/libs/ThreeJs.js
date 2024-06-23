import { initThreeScene } from './ThreeScene'
let Cesium = null
let THREE = null
/**
 * @typedef {Object}  threeObj - three实例对象
 * @property {Scene} scene  - 场景对象
 * @property {WebGLRenderer} renderer - webgl渲染对象
 * @property {PerspectiveCamera} camera - 相机对象
 */
/**
 * 接入three的融合模块
 * 【注意】cesium 需要关闭自带的循环渲染（useDefaultRenderLoop: false）
 * @class
 * @param {object} viewer - cesium 实例
 * @param {object}  cesiumGlobal - cesium 全局对象
 * @exports ThreeJs
 */
function ThreeJs(viewer, cesiumGlobal, defaultStatic, threeConf) {
  if (viewer && threeConf) {
    const { threeGlobal, containerId, threeContainerId } = threeConf
    Cesium = cesiumGlobal
    THREE = threeGlobal
    this._viewer = viewer
    this._containerId = containerId
    this._threeContainerId = threeContainerId
    this._Scene = initThreeScene({ THREE, Cesium, viewer })
    this._initContainer()
  }
}

ThreeJs.prototype = {
  /**
   * 初始化容器
   * @private
   */
  _initContainer: function () {
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
   * @param {number} options.fov - Camera frustum vertical field of view. Default 45.
   *
   * @param {number} options.aspect - Camera frustum aspect ratio. Default window.innerWidth/window.innerHeight.
   *
   * @param {number} options.near  - Camera frustum near plane. Default  1.
   *
   * @param {number} options.far - Camera frustum far plane. Default 10000000.
   * @param {Array} options.center - Camera center coordinate. Default [104.081701757991, 30.627042558105988].
   * @param {Array} options.axesHelper - Enabled axes Helper. Default false.
   * @param {Array} options.enableLighting - Enabled light. Default true.
   * @param {Array} options.threeHabit - Enabled threejs Habit(Left click to modify pitch). Default true.
   * @example
   * import { ThreeJs } from 'cesium_dev_kit'
   * const threeObj = new ThreeJs({
   *      cesiumGlobal: Cesium,
   *     threeGlobal: THREE,
   *     containerId: 'cesiumContainer',
   *     threeContainerId: 'threeContainer',
   *   })
   *   const { scene, camera } = threeObj.threeJs.initThree({ center, axesHelper: true, threeHabit: false });
   * @returns {threeObj}
   */
  initThree: function (options) {
    var fov = options.fov || 45,
      width = window.innerWidth,
      height = window.innerHeight,
      aspect = options.aspect || width / height,
      near = options.near || 1,
      far = options.far || 10 * 1000 * 1000

    this._three = {
      renderer: null,
      camera: null,
      scene: null
    }

    this._three.camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
    this._three.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      logarithmicDepthBuffer: true,
      stencil: true,
      depth: true
    })
    this._three.renderer.outputEncoding = THREE.sRGBEncoding
    this._three.renderer.shadowMap.enabled = true
    this._three.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this._three.scene = new this._Scene({
      cesiumDom: this._containerId,
      threeHabit: this._objHasOwnProperty(options, 'threeHabit', true),
      enableLighting: this._objHasOwnProperty(options, 'enableLighting', true),
      axesHelper: this._objHasOwnProperty(options, 'axesHelper', false),
      camera: this._three.camera,
      renderer: this._three.renderer,
      lngLat: options.center || [104.081701757991, 30.627042558105988]
    })
    if (this.threeContainer) {
      this.threeContainer.appendChild(this._three.renderer.domElement)
    }
    return this._three
  },
  loop(callback) {
    const _loop = function () {
      let time = requestAnimationFrame(_loop)
      callback && callback(time)
    }
    _loop()
  },
  /**
   * 判断对象是否有某个属性
   * @private
   * @param {object} obj 对象
   * @param {string} field  属性字段
   * @param {string} defVal  默认返回
   * @returns {string}
   */
  _objHasOwnProperty(obj, field, defVal) {
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
  destroyThreeJS() {
    this._three.scene.dispose()
  }
}
export { ThreeJs }
