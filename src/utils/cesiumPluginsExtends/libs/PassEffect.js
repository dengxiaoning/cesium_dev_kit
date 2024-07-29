let Cesium = null
import { Base } from "./Base";
import { Graphics } from './Graphics'
/**
 * 后期效果模块
 * @class
 * @param {object} viewer - cesium 实例
 * @param {object}  cesiumGlobal - cesium 全局对象
 * @exports PassEffect
 */
function PassEffect(viewer, cesiumGlobal) {
  if (viewer) {
    this._viewer = viewer
    // 继承base，避免公共方法无法使用
    Graphics.prototype = Object.create(Object.assign({}, Graphics.prototype, Base.prototype));
    Graphics.prototype.constructor = Graphics;
    this.$graphics = new Graphics(viewer, cesiumGlobal)
    Cesium = cesiumGlobal
  }
}

PassEffect.prototype = {
  /**
   * 圆形扩散效果
   * @function
   * @param {object} options
   * @param {Cartesian3} options.position - 坐标
   * @param {string} options.id - id
   * @param {number} options.radius - 半径
   * @param {Color} options.color - 颜色
   * @param {number} options.duration 持续时长
   * @param {string} options.circleMode - 类型，默认CircleScan扫描
   * @param {number} options.border - 边框
   * @example
   * import { PassEffect } from 'cesium_dev_kit'
   * const passEffectObj = new PassEffect({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * passEffectObj.passEffect.setCircleScanEffect({
        id: 'CircleScan',
        position: Cesium.Cartesian3.fromDegrees(104.08985268964015, 30.635443158056148, 10.0),
        color: Cesium.Color.MEDIUMTURQUOISE.withAlpha(0.5),
        duration: 5000,
        border: 10,
        radius: 2000
      })
   * @returns {postProcessStages}
   */
  setCircleScanEffect: function (options) {
    if (options && options.position) {
      var id = options.id || 'CircleScan' + parseInt(Math.random() * 1000),
        cartesian = options.position,
        radius = options.radius,
        color = options.color || Cesium.Color.RED,
        duration = options.duration || 1500,
        $this = this,
        circleMode = options.circleMode || 'CircleScan',
        border = options.border || 4.0

      var cartesian3Center = cartesian
      var cartesian4Center = new Cesium.Cartesian4(
        cartesian3Center.x,
        cartesian3Center.y,
        cartesian3Center.z,
        1
      )
      var position = this.transformCartesianToWGS84(cartesian)
      var cartesian3Center1 = this.transformWGS84ToCartesian({
        lng: position.lng,
        lat: position.lat,
        alt: position.alt + 500
      })
      var cartesian4Center1 = new Cesium.Cartesian4(
        cartesian3Center1.x,
        cartesian3Center1.y,
        cartesian3Center1.z,
        1
      )

      var _time = new Date().getTime()
      var _delegate = new Cesium.PostProcessStage({
        name: id,
        fragmentShader: this._getCircleScanShader({
          get: true,
          border: border
        }),
        uniforms: {
          u_scanCenterEC: function () {
            return Cesium.Matrix4.multiplyByVector(
              $this._viewer.camera._viewMatrix,
              cartesian4Center,
              new Cesium.Cartesian4()
            )
          },
          u_scanPlaneNormalEC: function () {
            var temp = Cesium.Matrix4.multiplyByVector(
              $this._viewer.camera._viewMatrix,
              cartesian4Center,
              new Cesium.Cartesian4()
            )
            var temp1 = Cesium.Matrix4.multiplyByVector(
              $this._viewer.camera._viewMatrix,
              cartesian4Center1,
              new Cesium.Cartesian4()
            )
            var _scratchCartesian3Normal = new Cesium.Cartesian3()
            _scratchCartesian3Normal.x = temp1.x - temp.x
            _scratchCartesian3Normal.y = temp1.y - temp.y
            _scratchCartesian3Normal.z = temp1.z - temp.z
            Cesium.Cartesian3.normalize(
              _scratchCartesian3Normal,
              _scratchCartesian3Normal
            )
            return _scratchCartesian3Normal
          },
          u_radius: function () {
            if (circleMode == 'CircleScan') {
              return (
                (radius * ((new Date().getTime() - _time) % duration)) /
                duration
              )
            } else {
              return radius
            }
          },
          u_scanColor: color
        }
      })

      this._viewer.scene.postProcessStages.add(_delegate)

      return _delegate
    }
  },
  /**
   * 雷达扫描
   * @function
   * @param {object} options
   * @param {Cartesian3} options.position - 坐标
   * @param {string} options.id - id
   * @param {number} options.radius - 半径
   * @param {Color} options.color - 颜色
   * @param {number} options.duration 持续时长
   * @param {number} options.border - 边框
   * @example
   * import { PassEffect } from 'cesium_dev_kit'
   * const passEffectObj = new PassEffect({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * passEffectObj.passEffect.setRadarScanEffect({
        id: 'radarScanA',
        position: Cesium.Cartesian3.fromDegrees(104.08985268964015, 30.635443158056148, 10.0),
        color: Cesium.Color.LIGHTGREEN.withAlpha(0.8),
        duration: 2000,
        radius: 1000,
        border: -1,
        width: 5.0
      })
   * @returns {postProcessStages}
   */
  setRadarScanEffect: function (options) {
    if (options && options.position) {
      var id = options.id || 'radarScan' + parseInt(Math.random() * 1000),
        cartesian = options.position,
        radius = options.radius,
        color = options.color || Cesium.Color.RED,
        duration = options.duration || 1500,
        $this = this,
        border = options.border || 1,
        width = options.width || 3.0

      var cartesian3Center = cartesian
      var cartesian4Center = new Cesium.Cartesian4(
        cartesian3Center.x,
        cartesian3Center.y,
        cartesian3Center.z,
        1
      )
      var position = this.transformCartesianToWGS84(cartesian)
      var cartesian3Center1 = this.transformWGS84ToCartesian({
        lng: position.lng,
        lat: position.lat,
        alt: position.alt + 500
      })
      var cartesian4Center1 = new Cesium.Cartesian4(
        cartesian3Center1.x,
        cartesian3Center1.y,
        cartesian3Center1.z,
        1
      )

      var cartesian3Center2 = this.transformWGS84ToCartesian({
        lng: position.lng + 0.001,
        lat: position.lat,
        alt: position.alt
      })
      var cartesian4Center2 = new Cesium.Cartesian4(
        cartesian3Center2.x,
        cartesian3Center2.y,
        cartesian3Center2.z,
        1
      )
      var _time = new Date().getTime()
      var _RotateQ = new Cesium.Quaternion()
      var _RotateM = new Cesium.Matrix3()
      var _scratchCartesian4Center = new Cesium.Cartesian4()
      var _scratchCartesian4Center1 = new Cesium.Cartesian4()
      var _scratchCartesian4Center2 = new Cesium.Cartesian4()
      var _scratchCartesian3Normal = new Cesium.Cartesian3()
      var _scratchCartesian3Normal1 = new Cesium.Cartesian3()
      var _delegate = new Cesium.PostProcessStage({
        name: id,
        fragmentShader: this._getRadarScanShader({
          border: border,
          width: width,
          get: true
        }),
        uniforms: {
          u_scanCenterEC: function () {
            return Cesium.Matrix4.multiplyByVector(
              $this._viewer.camera._viewMatrix,
              cartesian4Center,
              _scratchCartesian4Center
            )
          },
          u_scanPlaneNormalEC: function () {
            var temp = Cesium.Matrix4.multiplyByVector(
              $this._viewer.camera._viewMatrix,
              cartesian4Center,
              _scratchCartesian4Center
            )
            var temp1 = Cesium.Matrix4.multiplyByVector(
              $this._viewer.camera._viewMatrix,
              cartesian4Center1,
              _scratchCartesian4Center1
            )
            _scratchCartesian3Normal.x = temp1.x - temp.x
            _scratchCartesian3Normal.y = temp1.y - temp.y
            _scratchCartesian3Normal.z = temp1.z - temp.z
            Cesium.Cartesian3.normalize(
              _scratchCartesian3Normal,
              _scratchCartesian3Normal
            )
            return _scratchCartesian3Normal
          },

          u_scanLineNormalEC: function () {
            var temp = Cesium.Matrix4.multiplyByVector(
              $this._viewer.camera._viewMatrix,
              cartesian4Center,
              _scratchCartesian4Center
            )
            var temp1 = Cesium.Matrix4.multiplyByVector(
              $this._viewer.camera._viewMatrix,
              cartesian4Center1,
              _scratchCartesian4Center1
            )
            var temp2 = Cesium.Matrix4.multiplyByVector(
              $this._viewer.camera._viewMatrix,
              cartesian4Center2,
              _scratchCartesian4Center2
            )

            _scratchCartesian3Normal.x = temp1.x - temp.x
            _scratchCartesian3Normal.y = temp1.y - temp.y
            _scratchCartesian3Normal.z = temp1.z - temp.z

            Cesium.Cartesian3.normalize(
              _scratchCartesian3Normal,
              _scratchCartesian3Normal
            )

            _scratchCartesian3Normal1.x = temp2.x - temp.x
            _scratchCartesian3Normal1.y = temp2.y - temp.y
            _scratchCartesian3Normal1.z = temp2.z - temp.z

            var tempTime =
              ((new Date().getTime() - _time) % duration) / duration
            Cesium.Quaternion.fromAxisAngle(
              _scratchCartesian3Normal,
              tempTime * Cesium.Math.PI * 2,
              _RotateQ
            )
            Cesium.Matrix3.fromQuaternion(_RotateQ, _RotateM)
            Cesium.Matrix3.multiplyByVector(
              _RotateM,
              _scratchCartesian3Normal1,
              _scratchCartesian3Normal1
            )
            Cesium.Cartesian3.normalize(
              _scratchCartesian3Normal1,
              _scratchCartesian3Normal1
            )
            return _scratchCartesian3Normal1
          },
          u_radius: radius,
          u_scanColor: color
        }
      })

      this._viewer.scene.postProcessStages.add(_delegate)

      return _delegate
    }
  },
  /**
   * 卫星扫描
   * @function
   * @param {object} options
   * @param {Cartesian3} options.position - 坐标
   * @param {number} options.repeat - 重复比例10~60
   * @param {Color} options.color - 颜色
   * @param {number} options.length - 雷达高度
   * @param {number} options.thickness - 雷达边厚度0.1~0.9
   * @example
   * import { PassEffect } from 'cesium_dev_kit'
   * const passEffectObj = new PassEffect({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * passEffectObj.passEffect.satelliteScan({
   *      position: [116.39, 39.9],
   *      length: 40000.0,
   *      color: Cesium.Color.LIGHTGREEN.withAlpha(0.8),
   *      repeat: 40,
   *      thickness: 0.1
   *   })
   * @returns {Primitive}
   */
  satelliteScan: function (options) {
    if (options && options.position) {
      var Cartesian3 = Cesium.Cartesian3,
        GeometryInstance = Cesium.GeometryInstance,
        Primitive = Cesium.Primitive,
        MaterialAppearance = Cesium.MaterialAppearance,
        Material = Cesium.Material,
        Color = Cesium.Color,
        Matrix4 = Cesium.Matrix4,
        Transforms = Cesium.Transforms,
        MaterialAppearance = Cesium.MaterialAppearance,
        CylinderGeometry = Cesium.CylinderGeometry

      const position = options.position || [116.39, 39.9]
      //雷达的高度
      const length = options.length || 40000.0
      //   地面位置
      var positionOnEllipsoid = Cartesian3.fromDegrees(position[0], position[1])
      //  矩阵计算
      var modelMatrix = Matrix4.multiplyByTranslation(
        Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid),
        new Cartesian3(0.0, 0.0, length * 0.5),
        new Matrix4()
      )
      var cylinderGeometry = new CylinderGeometry({
        length: length,
        topRadius: 0.0,
        bottomRadius: length * 0.5,
        vertexFormat: MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat
      })
      //创建GeometryInstance
      var redCone = new GeometryInstance({
        geometry: cylinderGeometry,
        modelMatrix: modelMatrix
      })
      //  创建Primitive
      var radar = this._viewer.scene.primitives.add(
        new Primitive({
          geometryInstances: redCone,
          appearance: new MaterialAppearance({
            // 自定义纹理
            material: new Material({
              fabric: {
                uniforms: {
                  color: options.color || new Color(0.2, 1.0, 0.0, 1.0),
                  repeat: options.repeat || 30.0,
                  offset: 0.0,
                  thickness: options.thickness || 0.2
                },
                source: `
                  uniform vec4 color;
                  uniform float repeat;
                  uniform float offset;
                  uniform float thickness;
                  czm_material czm_getMaterial(czm_materialInput materialInput)
                  {
                    czm_material material = czm_getDefaultMaterial(materialInput);
                    float sp = 1.0/repeat;
                    vec2 st = materialInput.st;
                    float dis = distance(st, vec2(0.5));
                    float m = mod(dis + offset, sp);
                    float a = step(sp*(1.0-thickness), m);
                    material.diffuse = color.rgb;
                    material.alpha = a * color.a;
                    vec3 normalMC = material.normal;
                    if(normalMC.y < 0.0 && normalMC.z < 0.0)
                    { 
                      discard;
                    }
                    return material;
                  }`
              },
              translucent: true
            }),
            faceForward: false,
            closed: true,
            vertexShaderSource: `
              in vec3 position3DHigh;
              in vec3 position3DLow;
              in vec3 normal;
              in vec2 st;
              in float batchId;
              out vec3 v_positionEC;
              out vec3 v_normalEC;
              out vec2 v_st;
              void main()
              {
                vec4 p = czm_computePosition();
                v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates
                v_normalEC =  normal;                         // normal in world coordinates
                v_st = st;
                gl_Position = czm_modelViewProjectionRelativeToEye * p;
              }`
          })
        })
      )

      // 5 动态修改雷达材质中的offset变量，从而实现动态效果。
      this._viewer.scene.preUpdate.addEventListener(function () {
        var offset = radar.appearance.material.uniforms.offset
        offset -= 0.001
        if (offset > 1.0) {
          offset = 0.0
        }
        radar.appearance.material.uniforms.offset = offset
      })
      return radar
    }
  },
  /**
   * 光锥扫描
   * @function
   * @param {object} data
   * @param {Array} data.circle  - 第一个参数 0.003表示半径，
   * 第二个第三个分别表示底座圆心的坐标,第四个表示切割成多少个点。
   * 组成多少个面。越多会越卡 尽量实际项目不影响效果，越少越好
   * @param {Array} data.positionList - 坐标数组（类似polygon需要闭合）
   * @param {Material} data.material - 材质
   * @param {number} data.number - 扫描比例（数字越小速度越快）
   * @param {Array} data.observer - 观察点，也就是光源点
   * @example
   * import { PassEffect } from 'cesium_dev_kit'
   * const passEffectObj = new PassEffect({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * passEffectObj.passEffect.lighitCentrumScanEffect({
        circle: [0.003, 117, 35, 30],
         observer: [117.01, 35.01, 500],
          positionList: [ [117, 35],[117.01, 35],[117.01, 35.01], [117, 35.01],[117, 35]], 
          material: Cesium.Color.RED.withAlpha(0.5, 
          number: 100
      })
   * @returns {Array} 返回polygon实例数组
   */
  lighitCentrumScanEffect: function (data) {
    //生成分割点
    const point = this.createLightScan_getCirclePoints(
      data.circle[0],
      data.circle[1],
      data.circle[2],
      data.circle[3]
    )
    //生成 entityCList 圆锥
    const entityCList = this.createLightScan_entityCList(
      this._viewer,
      point,
      data
    )
    for (let i = 0; i < entityCList.length; i++) {
      if (i !== entityCList.length - 1) {
        this.createLightScan_changeOnePosition(data, entityCList[i], [
          point[i].x,
          point[i].y,
          point[i + 1].x,
          point[i + 1].y
        ]) //中间arr 代表的是点的坐标
      } else {
        this.createLightScan_changeOnePosition(data, entityCList[i], [
          point[i].x,
          point[i].y,
          point[0].x,
          point[0].y
        ])
      }
    }
    return entityCList
  },
  createLightScan_getCirclePoints: function (r, ox, oy, count) {
    let point = [] //结果
    let radians = (Math.PI / 180) * Math.round(360 / count), //弧度
      i = 0
    for (; i < count; i++) {
      let x = ox + r * Math.sin(radians * i),
        y = oy + r * Math.cos(radians * i)
      point.unshift({
        x: x,
        y: y
      }) //为保持数据顺时针
    }
    return point
  },
  //改变每个面的位置
  createLightScan_changeOnePosition: function (data, entity, arr) {
    const positionList = data.positionList
    let x,
      y,
      x0,
      y0,
      X0,
      Y0,
      n = 0,
      a = 0 //x代表差值 x0代表差值等分后的值，X0表示每次回调改变的值。a表示回调的循环窜次数，n表示扫描的坐标个数
    function f(i) {
      x = positionList[i + 1][0] - positionList[i][0] //差值
      y = positionList[i + 1][1] - positionList[i][1] //差值
      x0 = x / data.number //将差值等分500份
      y0 = y / data.number
      a = 0
    }
    f(n)
    entity.polygon.hierarchy = new Cesium.CallbackProperty(function () {
      //回调函数
      if (Math.abs(X0) >= Math.abs(x) && Math.abs(Y0) >= Math.abs(y)) {
        //当等分差值大于等于差值的时候 就重新计算差值和等分差值  Math.abs
        n = n + 1
        if (n === positionList.length - 1) {
          n = 0
        }
        arr[0] = arr[0] + X0
        arr[1] = arr[1] + Y0
        arr[2] = arr[2] + X0
        arr[3] = arr[3] + Y0
        f(n) //重新赋值 x y x0 y0
      }
      X0 = a * x0 //将差值的等份逐渐递增。直到大于差值 会有精度丢失,所以扩大再加 x0=x0+0.0001
      Y0 = a * y0 //将差值的等份逐渐递增。直到大于差值 会有精度丢失,所以扩大再加
      a++
      return new Cesium.PolygonHierarchy(
        Cesium.Cartesian3.fromDegreesArrayHeights([
          data.observer[0],
          data.observer[1],
          data.observer[2],
          arr[0] + X0,
          arr[1] + Y0,
          0,
          arr[2] + X0,
          arr[3] + Y0,
          0
        ])
      )
    }, false)
  },
  //生成 entityCList面--形成圆锥
  createLightScan_entityCList: function (viewer, point, data) {
    const lon = data.observer[0],
      lat = data.observer[1],
      h = data.observer[2]
    const entityCList = []
    //创建 面
    for (let i = 0; i < point.length; i++) {
      let hierarchy
      if (i === point.length - 1) {
        hierarchy = new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArrayHeights([
            lon,
            lat,
            h,
            point[i].x,
            point[i].y,
            0,
            point[0].x,
            point[0].y,
            0
          ])
        )
      } else {
        hierarchy = new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArrayHeights([
            lon,
            lat,
            h,
            point[i].x,
            point[i].y,
            0,
            point[i + 1].x,
            point[i + 1].y,
            0
          ])
        )
      }

      const entityC = viewer.entities.add({
        name: '三角形',
        polygon: {
          hierarchy: hierarchy,
          outline: false,
          perPositionHeight: true, //允许三角形使用点的高度
          material: data.material
        }
      })
      entityCList.push(entityC)
    }

    return entityCList
  },
  /**
   *创建火焰粒子
   * @param {object} options
   * @param {Cartesian3} options.position - 粒子显示位置
   * @param {string} options.fireImage - 粒子图片
   * @param {number} options.startScale - 粒子出生时的比例，相对于原始大小
   * @param {number} options.endScale - 粒子在死亡时的比例
   * @param {number} options.minimumParticleLife - 设置粒子寿命的可能持续时间的最小界限（以秒为单位），粒子的实际寿命将随机生成
   * @param {number} options.maximumParticleLife - 设置粒子寿命的可能持续时间的最大界限（以秒为单位），粒子的实际寿命将随机生成
   * @param {number} options.minimumSpeed  -置以米/秒为单位的最小界限，超过该最小界限，随机选择粒子的实际速度。
   * @param {number} options.maximumSpeed - 设置以米/秒为单位的最大界限，超过该最大界限，随机选择粒子的实际速度。
   * @param {number} options.particleSize - 以像素为单位缩放image的大小
   * @param {number} options.emissionRate - 每秒发射的粒子数
   * @param {Color} options.startColor - 粒子出生时的颜色
   * @param {Color} options.endColor - 当粒子死亡时的颜色
   * @param {Color} options.emitter - 粒子发射器，可选[BoxEmitter,CircleEmitter,ConeEmitter,SphereEmitter]
   * @example
   * import { PassEffect } from 'cesium_dev_kit'
   * const passEffectObj = new PassEffect({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * const fireParticle = passEffectObj.passEffect.createFireParticleSystem({
   *      position: Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 180.0)
   *      fireImage:'static/data/images/file/fire.png',
   *      startScale: 3,
   *      endScale: 1.5,
   *      minimumParticleLife: 1.5,
   *      maximumParticleLife: 1.8,
   *      minimumSpeed: 7,
   *      maximumSpeed: 9,
   *      particleSize: 2,
   *      emissionRate: 200,
   *      startColor: new Cesium.Color(1, 1, 1, 1),
   *      endColor: new Cesium.Color(0.5, 0, 0, 0),
   *      emitter:new Cesium.ConeEmitter(Cesium.Math.toRadians(45.0))
   * })
   *  // 添加到场景中区
   *   passEffectObj.viewer.scene.primitives.add(fireParticle);
   * @returns {ParticleSystem}
   */
  createFireParticleSystem(options) {
    if (options && options.position) {
      const cloneObj = Object.assign(
        {},
        {
          fireImage: 'static/data/images/file/fire.png',
          startScale: 3,
          endScale: 1.5,
          minimumParticleLife: 1.5,
          maximumParticleLife: 1.8,
          minimumSpeed: 7,
          maximumSpeed: 9,
          particleSize: 2,
          emissionRate: 200,
          startColor: new Cesium.Color(1, 1, 1, 1),
          endColor: new Cesium.Color(0.5, 0, 0, 0),
          emitter: new Cesium.ConeEmitter(Cesium.Math.toRadians(45.0))
        },
        options
      )
      const {
        fireImage,
        startScale,
        endScale,
        minimumParticleLife,
        maximumParticleLife,
        minimumSpeed,
        maximumSpeed,
        particleSize,
        emissionRate,
        position,
        startColor,
        endColor,
        emitter
      } = cloneObj
      const particleSystem = new Cesium.ParticleSystem({
        image: fireImage,
        startScale,
        endScale,
        minimumParticleLife,
        maximumParticleLife,
        minimumSpeed,
        maximumSpeed,
        emissionRate,
        startColor,
        endColor,
        emitter,
        imageSize: new Cesium.Cartesian2(particleSize, particleSize),
        lifetime: 16.0, // 多长时间的粒子系统将以秒为单位发射粒子
        loop: true,
        sizeInMeters: true,
        modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(position) // 4x4转换矩阵，可将粒子系统从模型转换为世界坐标
      })
      return particleSystem
    }
  }
}
export { PassEffect }
