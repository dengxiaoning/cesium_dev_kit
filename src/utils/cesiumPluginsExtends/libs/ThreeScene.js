function initThreeScene({ THREE, Cesium, viewer }) {
  function cesium2threeBufferGeometry(geometry, result) {
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
  class Scene extends THREE.Scene {
    constructor(options = {}) {
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

      //经纬度区间
      this.lngLat =
        options.lngLat && options.lngLat.length > 1
          ? options.lngLat
          : [114.23, 31.55]

      //相机朝向
      this.cameraCenter = new THREE.Vector3(0, 0, 0)

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
      const sphere = new THREE.Mesh(geometry, material)
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

      const syncGroup = new THREE.Group()
      super.add(syncGroup)
      this.syncGroup = syncGroup

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
      const sphere3 = new THREE.Mesh(geometry3, material3)
      sphere3.rotateX((90 * Math.PI) / 180)
      sphere3.position.z = this.ellipsoid.minimumRadius
      this.sphere3 = sphere3

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
      syncGroup.add(sphere3)
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
    }

    renderCesium() {
      this.cesiumViewer.render()
      return this
    }

    renderThree() {
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

    updateCameraMatrix() {
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

      this.renderer.setSize(width, height)

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
    cartesianToCVWorld(cartesian) {
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
        this.sphere.visible = false
        this.sphere3.visible = false
        return this
      }

      //3D 模式恢复模拟球
      this.sphere.visible = true
      this.sphere3.visible = true

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
      this.updateSunMatrix()
      this.updateGroupMatrixWorld()
      this.updateCameraMatrix()
      //2D 模式及模式切换动画过程中跳过 three 渲染,避免与 cesium 显示不一致
      if (this.isThreeRenderable()) {
        this.renderThree()
      } else {
        //清空画布,避免残留切换前的内容
        this.renderer.clear()
      }
      this.renderCesium()
    }

    add(object) {
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

    remove(object) {
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

    traverse(callback) {
      callback(this.childrenGroup)
      const children = this.childrenGroup.children

      for (let i = 0, l = children.length; i < l; i++) {
        children[i].traverse(callback)
      }
    }

    traverseVisible(callback) {
      if (this.visible === false || this.childrenGroup.visible === false) return
      callback(this.childrenGroup)
      const children = this.childrenGroup.children

      for (let i = 0, l = children.length; i < l; i++) {
        children[i].traverseVisible(callback)
      }
    }

    toJSON(meta) {
      const isRootObject = meta === undefined || typeof meta === 'string'
      const output = {}

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

      const object = {}
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

      function extractFromCache(cache) {
        const values = []

        for (const key in cache) {
          const data = cache[key]
          delete data.metadata
          values.push(data)
        }

        return values
      }
    }
    dispose() {
      this.update = () => {}
      this.renderCesium = () => {}
      this.renderThree = () => {}
      this.updateSunMatrix = () => {}
      this.updateCameraMatrix = () => {}
      this.updateGroupMatrixWorld = () => {}
      this.cesiumViewer.destroy()
      // super.dispose()
    }

    cartesian3ToVector(cart) {
      return new THREE.Vector3(cart.x, cart.y, cart.z)
    }

    /**
     * 坐标统一转 Cartesian3
     * @private
     * @param {Array|Cartesian3|Cartographic} position - [lng, lat, height](经纬度:度,高度:米) | Cesium.Cartesian3 | Cesium.Cartographic
     * @returns {Cartesian3}
     */
    positionToCartesian(position) {
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
    positionToWorldVector(position) {
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
    setObjectPosition(object, position) {
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
    getObjectPosition(object) {
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
