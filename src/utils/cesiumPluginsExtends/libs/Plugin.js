let Cesium = null
let dfSt = undefined
var PI = 3.1415926535897932384626
var a$1 = 6378245.0
var ee = 0.00669342162296594323

/**
 * @enum {number}
 */
const styleType = {
  FIRST: 0,
  SECOND: 1
};
/**
 *  @typedef {Object}  cluserColorsType -聚合圈颜色区间配置 
 *  @property {number} value  - 聚合数量 
 *  @property {string} color  - rgb颜色 
 */

/**
 * @typedef {Object}   clusterLayerStyleOptionsType -聚合图层样式参数类型 
 * @property {number} pixelRange  - 聚合范围
 * @property {number} minimumClusterSize  - 最小聚合数
 * @property {string} image  - 聚合图标
 * @property {string} selectImage - 选中图标
 * @property {number}  scale - 缩放比例
 * @property {styleType}[type=0] - 聚合样式
 * @property {Array<cluserColorsType>} cluserColors - 聚合圈颜色区间配置
 */

/**
* @typedef {Object}   clusterDataType -聚合数据类型 
* @property {string} id - 数据id
* @property  {Array} position - 坐标
* @property {string|object} otherProperty - 其它附加属性
*
 */

/**
* @typedef {Object}   barLableType - 柱状label类型 
* @property {string}[font=bold 24px Arial] - 字体大小
* @property  {Cesium.Color}[fillColor=Cesium.Color.WHITE] - 填充颜色
* @property {boolean}[showBackground=true] - 显示背景
* @property {Cesium.VerticalOrigin}[verticalOrigin=Cesium.VerticalOrigin.BOTTOM] - 居中方式
* @property {Cesium.Cartesian2}[pixelOffset=new Cesium.Cartesian2(0, 0)] - 偏移
 */

/**
* @typedef {Object}   barBillboardType - 柱状billboard类型 
* @property {number}[width=25] - 图标宽度
* @property  {number}[height=25] - 图标高度
* @property {Cesium.Cartesian2}[pixelOffset=new Cesium.Cartesian2(-35, 0)] - 偏移像素
 */

/**
 * @typedef {Object}  barLayerStyleOptionsType - 柱状图层样式参数类型 
 * @property {number} duration  - 柱状拉伸频率
 * @property {boolean} loop  - 是否循环拉伸
 * @property {number} boxWidth  - 柱状宽度
 * @property {number} boxDepth - 柱状深度
 * @property {boolean}  icon - 是否显示ICON
 * @property {styleType} iconUrlArr - ICON数组（当数据中iconUrl 为空默认使用该数据作为icon图标）
 * @property {boolean}  labelShow - 是否显示label
 * @property {barLableType} label - label配置
 * @property {barBillboardType} billboard - billboard 配置
 */

/**
 * @typedef {Object}  barDataType - 柱状数据 
 * @property {string} name  - 名称
 * @property {string|Cesium.Color} color  - 颜色
 * @property {string} iconUrl  - icon地址
 * @property {string} count - 值（可为任何值，需对应numField名称）
 * @property {Array}  center - 中心坐标
 */

/**
* @typedef {Object}   barLayerDataType -柱状图层参数 
* @property {barDataType} barData - 绘制柱状所需的数据
* @property  {string}[numField=count] - number数据取值的字段
* @property {number} multiple - 柱状拉伸的倍数（numField * multiple 得到拉伸高度）
*
 */


/**
 * @typedef {Object}  queryOptionsType - 路线查询参数类型
 * @property {string} url  - 服务地址(可选)
 * @property {string} key  - 查询服务的key(可选)
 * @property {Array<number>} origin  - 起点坐标
 * @property {Array<number>} destination - 终点坐标 [102.223,92.843]
 * @property {Array<Arra<number>>} avoidpolygons - 避让区域(可选)
 */

/**
 * 外部插件模块
 * @class
 * @param {object} viewer - cesium 实例
 * @param {object}  cesiumGlobal - cesium 全局对象
 * @exports Plugin
 */
function Plugin(viewer, cesiumGlobal, defaultStatic) {
  if (viewer) {
    this._viewer = viewer
    Cesium = cesiumGlobal
    dfSt = defaultStatic
    this._queryRouteKey = '8dc49b1fa65a79d306ef12dae4229842'
    this._pluginLayer = new Cesium.CustomDataSource('pluginLayer')

    viewer && viewer.dataSources.add(this._pluginLayer)

    this._installPlugin()
  }
}
/**
 * @readonly
 * @enum {Object}
 *@memberof routeQueryType -路线查询类型
 *@property {Enum} DRIVE - 驾车
 *@property {Enum} WALK - 步行
 *@property {Enum} CYCLE - 骑行
 */
Plugin.routeQueryType = {
  DRIVE: 'drive',
  WALK: 'walk',
  CYCLE: 'cycle'
}
Plugin.prototype = {
  // 安装插件
  _installPlugin: function () {
    this._installCss3Renderer()
    this._installTerrainClipPlan()
    this._installClusterLayer()
    this._installBar3DLayer()
  },

  _installTerrainClipPlan: function () {
    /**
     *地形裁剪
     * @global
     * @param {viewer} t  - viewer
     * @param {object} i
     * @param {number} i.height - 高度
     * @param {number} i.splitNum - 裁剪大小
     * @param {string} i.wallImg - 四周贴图
     * @param {string} i.bottomImg - 底部贴图
     * @param {Cartesian3} i.positions - 裁剪位置信息
     * @example
     * import { Draw } from 'cesium_dev_kit'
     * const {viewer,draw} = new Draw({
     *    cesiumGlobal: Cesium,
         containerId: 'cesiumContainer'
      });
       var _height =   30,_splitNum =   50,
        _wallImg = "static/data/images/file/excavate_side_min.jpg",
        _bottomImg ="static/data/images/file/excavate_bottom_min.jpg";
    * draw.drawPolygonGraphics({
        callback: function (polygon, polygonObj) {
          draw._drawLayer.entities.remove(polygonObj);

          let terrainClipPlan = new Cesium.Scene.TerrainClipPlan(viewer, {
            height: _height,
            splitNum: _splitNum,
            wallImg: _wallImg,
            bottomImg: _bottomImg,
          });
          const cartesian3Coor = draw.transformWGS84ArrayToCartesianArray(polygon);
          terrainClipPlan.updateData(cartesian3Coor);
        }
      });
     */
    function TerrainClipPlan(t, i) {
      ;(this.viewer = t),
        (this.options = i || {}),
        (this._positions = i.positions),
        (this._height = this.options.height || 0),
        (this.bottomImg = i.bottomImg),
        (this.wallImg = i.wallImg),
        (this.splitNum = Cesium.defaultValue(i.splitNum, 50)),
        this._positions &&
          this._positions.length > 0 &&
          this.updateData(this._positions)
    }

    Object.defineProperties(TerrainClipPlan.prototype, {
      show: {
        get: function () {
          return this._show
        },
        set: function (e) {
          ;(this._show = e),
            this.viewer.scene.globe.clippingPlanes &&
              (this.viewer.scene.globe.clippingPlanes.enabled = e),
            this._switchExcavate(e)
        }
      },

      height: {
        get: function () {
          return this._height
        },
        set: function (e) {
          ;(this._height = e), this._updateExcavateDepth(e)
        }
      }
    })
    TerrainClipPlan.prototype.updateData = function (e) {
      // this.clear()
      var t = [],
        i = e.length - 1,
        a = new Cesium.Cartesian3(),
        n = Cesium.Cartesian3.subtract(e[0], e[1], a)
      ;(n = n.x > 0), (this.excavateMinHeight = 9999)
      for (var r = 0; r < i; r++) {
        var s = (r + 1) % i,
          l = Cesium.Cartesian3.midpoint(e[r], e[s], new Cesium.Cartesian3()),
          u = Cesium.Cartographic.fromCartesian(e[r]),
          c = this.viewer.scene.globe.getHeight(u) || u.height
        c < this.excavateMinHeight && (this.excavateMinHeight = c)
        var d,
          h = Cesium.Cartesian3.normalize(l, new Cesium.Cartesian3())
        ;(d = n
          ? Cesium.Cartesian3.subtract(e[r], l, new Cesium.Cartesian3())
          : Cesium.Cartesian3.subtract(e[s], l, new Cesium.Cartesian3())),
          (d = Cesium.Cartesian3.normalize(d, d))
        var f = Cesium.Cartesian3.cross(d, h, new Cesium.Cartesian3())
        f = Cesium.Cartesian3.normalize(f, f)
        var p = new Cesium.Plane(f, 0),
          m = Cesium.Plane.getPointDistance(p, l)
        t.push(new Cesium.ClippingPlane(f, m))
      }

      ;(this.viewer.scene.globe.clippingPlanes =
        new Cesium.ClippingPlaneCollection({
          planes: t,
          edgeWidth: 1,
          edgeColor: Cesium.Color.WHITE,
          enabled: !0
        })),
        this._prepareWell(e),
        this._createWell(this.wellData)
    }

    TerrainClipPlan.prototype.clear = function () {
      this.viewer.scene.globe.clippingPlanes &&
        ((this.viewer.scene.globe.clippingPlanes.enabled = !1),
        this.viewer.scene.globe.clippingPlanes.removeAll(),
        this.viewer.scene.globe.clippingPlanes.isDestroyed() ||
          this.viewer.scene.globe.clippingPlanes.destroy()),
        (this.viewer.scene.globe.clippingPlanes = void 0),
        this.bottomSurface &&
          this.viewer.scene.primitives.remove(this.bottomSurface),
        this.wellWall && this.viewer.scene.primitives.remove(this.wellWall),
        delete this.bottomSurface,
        delete this.wellWall,
        this.viewer.scene.render()
    }

    TerrainClipPlan.prototype._prepareWell = function (e) {
      var t = this.splitNum,
        i = e.length
      if (0 != i) {
        for (
          var a = this.excavateMinHeight - this.height,
            n = [],
            r = [],
            s = [],
            l = 0;
          l < i;
          l++
        ) {
          var u = l == i - 1 ? 0 : l + 1,
            c = Cesium.Cartographic.fromCartesian(e[l]),
            d = Cesium.Cartographic.fromCartesian(e[u]),
            h = [c.longitude, c.latitude],
            f = [d.longitude, d.latitude]

          0 == l &&
            (s.push(new Cesium.Cartographic(h[0], h[1])),
            r.push(Cesium.Cartesian3.fromRadians(h[0], h[1], a)),
            n.push(Cesium.Cartesian3.fromRadians(h[0], h[1], 0)))

          for (var p = 1; p <= t; p++) {
            var m = Cesium.Math.lerp(h[0], f[0], p / t),
              g = Cesium.Math.lerp(h[1], f[1], p / t)
            ;(l == i - 1 && p == t) ||
              (s.push(new Cesium.Cartographic(m, g)),
              r.push(Cesium.Cartesian3.fromRadians(m, g, a)),
              n.push(Cesium.Cartesian3.fromRadians(m, g, 0)))
          }
        }
        this.wellData = {
          lerp_pos: s,
          bottom_pos: r,
          no_height_top: n
        }
      }
    }

    TerrainClipPlan.prototype._createWell = function (e) {
      if (this.viewer.terrainProvider._layers) {
        var t = this
        this._createBottomSurface(e.bottom_pos)
        Cesium.sampleTerrainMostDetailed(
          this.viewer.terrainProvider,
          e.lerp_pos
        ).then(function (i) {
          for (var a = i.length, n = [], r = 0; r < a; r++) {
            var s = Cesium.Cartesian3.fromRadians(
              i[r].longitude,
              i[r].latitude,
              i[r].height
            )
            n.push(s)
          }
          t._createWellWall(e.bottom_pos, n)
        })
      } else {
        this._createBottomSurface(e.bottom_pos)
        this._createWellWall(e.bottom_pos, e.no_height_top)
      }
    }

    TerrainClipPlan.prototype._getMinHeight = function (e) {
      let minHeight = 5000000
      let minPoint = null
      for (let i = 0; i < e.length; i++) {
        let height = e[i]['z']
        if (height < minHeight) {
          minHeight = height
          minPoint = this._ellipsoidToLonLat(e[i])
        }
      }
      return minPoint.altitude
    }

    TerrainClipPlan.prototype._ellipsoidToLonLat = function (c) {
      let ellipsoid = this.viewer.scene.globe.ellipsoid
      let cartesian3 = new Cesium.Cartesian3(c.x, c.y, c.z)
      let cartographic = ellipsoid.cartesianToCartographic(cartesian3)
      let lat = Cesium.Math.toDegrees(cartographic.latitude)
      let lng = Cesium.Math.toDegrees(cartographic.longitude)
      let alt = cartographic.height
      return {
        longitude: lng,
        latitude: lat,
        altitude: alt
      }
    }
    TerrainClipPlan.prototype._createBottomSurface = function (e) {
      if (e.length) {
        let minHeight = this._getMinHeight(e)
        let positions = []
        for (let i = 0; i < e.length; i++) {
          let p = this._ellipsoidToLonLat(e[i])
          positions.push(p.longitude)
          positions.push(p.latitude)
          positions.push(minHeight)
        }

        let polygon = new Cesium.PolygonGeometry({
          polygonHierarchy: new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArrayHeights(positions)
          ),
          perPositionHeight: true
        })
        let geometry = Cesium.PolygonGeometry.createGeometry(polygon)

        var i = new Cesium.Material({
            fabric: {
              type: 'Image',
              uniforms: {
                image: this.bottomImg
              }
            }
          }),
          a = new Cesium.MaterialAppearance({
            translucent: !1,
            flat: !0,
            material: i
          })
        ;(this.bottomSurface = new Cesium.Primitive({
          geometryInstances: new Cesium.GeometryInstance({
            geometry: geometry
          }),
          appearance: a,
          asynchronous: !1
        })),
          this.viewer.scene.primitives.add(this.bottomSurface)
      }
    }

    TerrainClipPlan.prototype._createWellWall = function (e, t) {
      let minHeight = this._getMinHeight(e)
      let maxHeights = []
      let minHeights = []
      for (let i = 0; i < t.length; i++) {
        maxHeights.push(this._ellipsoidToLonLat(t[i]).altitude)
        minHeights.push(minHeight)
      }
      let wall = new Cesium.WallGeometry({
        positions: t,
        maximumHeights: maxHeights,
        minimumHeights: minHeights
      })
      let geometry = Cesium.WallGeometry.createGeometry(wall)
      var a = new Cesium.Material({
          fabric: {
            type: 'Image',
            uniforms: {
              image: this.wallImg
            }
          }
        }),
        n = new Cesium.MaterialAppearance({
          translucent: !1,
          flat: !0,
          material: a
        })
      ;(this.wellWall = new Cesium.Primitive({
        geometryInstances: new Cesium.GeometryInstance({
          geometry: geometry,
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(
              Cesium.Color.GREY
            )
          },
          id: 'PitWall'
        }),
        appearance: n,
        asynchronous: !1
      })),
        this.viewer.scene.primitives.add(this.wellWall)
    }
    TerrainClipPlan.prototype._switchExcavate = function (e) {
      e
        ? ((this.viewer.scene.globe.material =
            Cesium.Material.fromType('WaJue')),
          (this.wellWall.show = !0),
          (this.bottomSurface.show = !0))
        : ((this.viewer.scene.globe.material = null),
          (this.wellWall.show = !1),
          (this.bottomSurface.show = !1))
    }

    TerrainClipPlan.prototype._updateExcavateDepth = function (e) {
      this.bottomSurface &&
        this.viewer.scene.primitives.remove(this.bottomSurface),
        this.wellWall && this.viewer.scene.primitives.remove(this.wellWall)
      for (
        var t = this.wellData.lerp_pos, i = [], a = t.length, n = 0;
        n < a;
        n++
      )
        i.push(
          Cesium.Cartesian3.fromRadians(
            t[n].longitude,
            t[n].latitude,
            this.excavateMinHeight - e
          )
        )
      ;(this.wellData.bottom_pos = i),
        this._createWell(this.wellData),
        this.viewer.scene.primitives.add(this.bottomSurface),
        this.viewer.scene.primitives.add(this.wellWall)
    }

    Cesium.Scene.TerrainClipPlan = TerrainClipPlan
  },
  // 灯光扫描插件
  buildLightScanGraphics: function (data) {
    if (this._viewer && data) {
      var $this = this
      //生成 entityCList面--形成圆锥
      var createLightScan_entityCList = function (point, data) {
        var lon = data.observer[0],
          lat = data.observer[1],
          h = data.observer[2]
        var entityCList = []
        //创建 面
        for (var i = 0; i < point.length; i++) {
          var hierarchy
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

          var entityC = $this._pluginLayer.entities.add({
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
      }
      /**
       * 改变每个面的位置
       * @param {*} data
       * @param {*} entity
       * @param {*} arr
       */
      var createLightScan_changeOnePosition = function (data, entity, arr) {
        var positionList = data.positionList
        var x,
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
      }

      var _getCirclePoints = function (r, ox, oy, count) {
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
      }
      //生成分割点
      var point = _getCirclePoints(
        data.circle[0],
        data.circle[1],
        data.circle[2],
        data.circle[3]
      ) //生成分割点
      //生成 entityCList 圆锥
      var entityCList = createLightScan_entityCList(point, data) //生成 entityCList 圆锥

      for (var i = 0; i < entityCList.length; i++) {
        if (i !== entityCList.length - 1) {
          createLightScan_changeOnePosition(data, entityCList[i], [
            point[i].x,
            point[i].y,
            point[i + 1].x,
            point[i + 1].y
          ]) //中间arr 代表的是点的坐标
        } else {
          createLightScan_changeOnePosition(data, entityCList[i], [
            point[i].x,
            point[i].y,
            point[0].x,
            point[0].y
          ])
        }
      }
      return entityCList
    }
  },
  /**
   * 路径漫游
   * @function
   * @param {object} options
   * @param {object} options.name - 名称
   * @param {Array} options.paths - 路径
   * @param {PolylineGraphics} options.polyline - see {@link module:Graphics#getLineGraphics|getLineGraphics}
   * @param {ModelGraphics} options.model - see {@link module:Graphics#getModelGraphics|getModelGraphics}
   * @param {LabelGraphics} options.label - see {@link module:Graphics#getLabelGraphics|getLabelGraphics}
  * @param {LabelGraphics} options.billboard - see {@link module:Graphics#getBillboardGraphics|getBillboardGraphics}
   * @param {function} options.cameraOffset - 每一帧运行时回调
   * @example
   *  import { initCesium } from 'cesium_dev_kit'
   * const {plugin,material} = new initCesium({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   *  plugin.buildPathRoaming({
          name: '一品大街',
          paths: [{lng:110.16018735617934, lat:31.036076859828338, lat:0 },{lng:110.16018735617934, lat:31.036076859828338, lat:0 }],
          polyline: { // 配置漫游路径（不配置则不绘制）
            width: 40,
            material: material.getCustomMaterialWall({
              image: 'static/data/images/Textures/jsx4.png',
              freely: 'cross',
              direction: '-',  // 顺时针
              count: 12,
              color: Cesium.Color.RED,
              duration: 5000,
            }),
            clampToGround: true,
          },
          model: { // 配置漫游模型（不配置则不绘制）
            url: 'static/data/model/man/walk.gltf',
            scale: 10
          },
          cameraOffset: () => {
            // 配置漫游时相机偏移位置
            return new Cesium.HeadingPitchRange(
              Cesium.Math.toRadians(this.headingNum),
              Cesium.Math.toRadians(this.pitchNum),
              Number(this.rangeNum))
          }
        })
   * @returns {Entity}
   */
  buildPathRoaming: function (options) {
    if (this._viewer && options && options.paths) {
      var _paths = options.paths,
        _rEntity = this.createGraphics()
      // 添加图形
      var polyline = []
      for (var i = 0; i < _paths.length; i++) {
        var cartesian = Cesium.Cartesian3.fromDegrees(
          Number(_paths[i].lng),
          Number(_paths[i].lat),
          Number(_paths[i].alt)
        )
        polyline.push(cartesian)
      }
      _rEntity.position = this._createSampledPosition(polyline)
      _rEntity.name = options.name || '路径漫游'
      _rEntity.availability = new Cesium.TimeIntervalCollection([
        new Cesium.TimeInterval({
          start: this.startTime,
          stop: this.stopTime
        })
      ]) // 和时间轴关联

      _rEntity.orientation = this._sampleOrientation() //基于位置移动自动计算方向

      if (options.polyline) {
        const { width, material, clampToGround, ...resOpt } = options.polyline
        _rEntity.polyline = {
          positions: new Cesium.CallbackProperty(function () {
            return polyline
          }, false),
          width: width || 10,
          material:
            material ||
            new Cesium.PolylineGlowMaterialProperty({
              glowPower: 1,
              color: Cesium.Color.RED
            }),
          clampToGround: clampToGround || true,
          resOpt
        }
      }

      if (options.model) {
        _rEntity.model = this.getModelGraphics(options.model)
      }

      if (options.label) {
        _rEntity.label = this.getLabelGraphics(options)
      }
      if (options.billboard) {
        _rEntity.billboard = this.getBillboardGraphics(options)
      }
      this.droneEntity = _rEntity
      this._beginRoamTrace(options)
      return this._viewer.entities.add(_rEntity)
    }
  },
  _beginRoamTrace(options) {
    // 再绘制的每一帧中监听实体位置修改相机xyzw值
    this._viewer.clock.onTick.addEventListener(() => {
      if (this._viewer.clock.shouldAnimate) {
        let currentTime = this._viewer.clock.currentTime
        // 当前实体的位置
        let position = this.droneEntity.position.getValue(currentTime)
        //  当前实体的朝向
        let orientation = this.droneEntity.orientation.getValue(currentTime)
        if (position && orientation) {
          //计算相机的四维矩阵
          let transform = Cesium.Matrix4.fromRotationTranslation(
            Cesium.Matrix3.fromQuaternion(orientation),
            position
          )
          this._viewer.camera.lookAtTransform(transform, options.cameraOffset())
        }
      }
    })
  },
  _createSampledPosition(positions) {
    // 起始时间
    this.startTime = Cesium.JulianDate.now()
    // 结束时间（长度*60）计算总时长
    this.stopTime = Cesium.JulianDate.addSeconds(
      this.startTime,
      positions.length * 60,
      new Cesium.JulianDate()
    )
    // 设置时钟开始时间
    this._viewer.clock.startTime = this.startTime.clone()
    // 设置始终停止时间
    this._viewer.clock.stopTime = this.stopTime.clone()
    // 设置时钟当前时间
    this._viewer.clock.currentTime = this.startTime.clone()
    //循环执行,即为2，到达终止时间，重新从起点时间开始
    this._viewer.clock.clockRange = Cesium.ClockRange.CLAMPED
    // 创建取样对象
    let property = new Cesium.SampledPositionProperty()
    // 设置到达每一个位置点所需要的时间（秒）
    for (let j = 0; j < positions.length; j++) {
      let time = Cesium.JulianDate.addSeconds(
        this.startTime,
        j * 60,
        new Cesium.JulianDate()
      )
      let position = positions[j]
      property.addSample(time, position)
    }
    return property
  },
  _sampleOrientation() {
    let positionA
    let positionB
    let orientationCurr
    return new Cesium.CallbackProperty((currentTime) => {
      let position = this.droneEntity.position.getValue(currentTime)
      //下一帧的位置，计算出一秒钟六十帧的时间时所处位置
      positionB = this.droneEntity.position.getValue(
        Cesium.JulianDate.addSeconds(
          currentTime,
          1 / 60,
          new Cesium.JulianDate()
        )
      )
      if (position && positionB) {
        positionA = position
        //向量AB差获得朝向
        const vector2 = Cesium.Cartesian3.subtract(
          positionB,
          positionA,
          new Cesium.Cartesian3()
        )
        //归一化获得单位向量（方向）
        const normal = Cesium.Cartesian3.normalize(
          vector2,
          new Cesium.Cartesian3()
        )
        //将位置和速度转换为旋转矩阵
        const rotationMatrix3 =
          Cesium.Transforms.rotationMatrixFromPositionVelocity(
            positionA,
            normal,
            Cesium.Ellipsoid.WGS84
          )
        // 使用旋转矩阵转换思维矩阵设置实体真实朝向与位置
        orientationCurr = Cesium.Quaternion.fromRotationMatrix(rotationMatrix3)
      }
      return orientationCurr
    }, false)
  },
  /*
   * 拓展css3的动画 html元素
   */
  _installCss3Renderer: function () {
    if (this._viewer) {
      var viewer = this._viewer
      /**
       * 全局类：
       * 通过html标签构建信息框
       * @class
       * @param {Array} elements
       * @param {string} elements.id - dom ID
       * @param {string}[elements.parentEleId=info-warp] - 挂载信息框容器的ID
       * @param {Array} elements.position - 坐标
       * @param {string} elements.element - 字符串html 标签
       * @param {Array}[elements.offset=[0,0]] - 偏移
       * @param {boolean} isBackHide - 是否超出视野隐藏
       * @example
       *  new Cesium.Scene.Css3Renderer([{
              id: 'box4',
              parentEleId: 'info-warp',
              position: [104.08985268964015, 30.635443158056148, 50.0],
              element: `<div class="ys-css3-box ex-box" id="box4"><div class="close__box__btn">X</div>xxx 信息点</div>`,
              offset: [10, 10]
            }], true);
       */
      function Css3Renderer(elements, isBackHide) {
        this._scratch = new Cesium.Cartesian2()
        this._viewer = viewer;
        this._scene = viewer.scene;
        this._camera = viewer.camera;

        this._container = null
        this._elements = elements
        this._isBackHide = isBackHide
        
        this._parentEleId =
        elements.length>0?elements[0]['parentEleId']||'info-warp' : 'info-warp'

        this.init()
      }
      Css3Renderer.prototype.init = function () {
        var container = document.createElement('div')
        container.className = `ys-css3-container`
        const _parentEleId = this._parentEleId
        // document.body.appendChild(container)
        const parentNode = document.getElementById(_parentEleId)
          parentNode.appendChild(container)
        this._container = container
        
        // 如果elements中缺少position就把他抛弃了
        this._elements = this._elements.filter(e=>e.position)
        this._elements.forEach(function (e) {
          container.insertAdjacentHTML('beforeend', e.element)
        })
       function getElementsByClass(className, parentElement = document) {
            return parentElement.querySelectorAll(`.${className}`);
        }


        var $this = this
        this._scene.preRender.addEventListener(function () {
          var boxElements = getElementsByClass('close__box__btn');
          // 遍历所有元素并绑定点击事件
          boxElements.forEach(function(element) {
              element.addEventListener('click', function () {
                  if (parentNode.contains(container)) {
                    parentNode.removeChild(container)
                  }
                });
            });
          //
          for (var i = 0; i < container.children.length; i++) {
            var p = Cesium.Cartesian3.fromDegrees(
              $this._elements[i].position[0],
              $this._elements[i].position[1],
              $this._elements[i].position[2] || 0
            )
            var canvasPosition = $this._scene.cartesianToCanvasCoordinates(
              p,
              $this._scratch
            )
            const offsetX = $this._elements[i].offset ? $this._elements[i].offset[0] : 0;
            const offsety = $this._elements[i].offset ? $this._elements[i].offset[1] : 0;
            if (Cesium.defined(canvasPosition)) {
              container.children[i].style.left =
                parseFloat(canvasPosition.x) +
                parseFloat(offsetX) +
                'px'
              container.children[i].style.top =
                parseFloat(canvasPosition.y) +
                parseFloat(offsety) +
                'px'
              if ($this._isBackHide) {
                var j = $this._camera.position,
                  n =
                    $this._scene.globe.ellipsoid.cartesianToCartographic(
                      j
                    ).height
                if (
                  !((n += 1 * $this._scene.globe.ellipsoid.maximumRadius),
                  Cesium.Cartesian3.distance(j, p) > n)
                ) {
                  container.children[i].style.display = 'block'
                } else {
                  container.children[i].style.display = 'none'
                }
              }
            }
          }
        })
      }
      /**
       * 根据Id 移除信息框中元素
       * @function
       * @param {string} id - 需移除dom 元素的id
       * @example
       * const css3Render = new Cesium.Scene.Css3Renderer([{
              id: 'box4',
              parentEleId: 'info-warp',
              position: [104.08985268964015, 30.635443158056148, 50.0],
              element: `<div class="ys-css3-box ex-box" id="box4"><div class="close__box__btn">X</div>xxx 信息点</div>`,
              offset: [10, 10]
            }], true);

            setTimeout(()=>{css3Render.remove("box4")},2000)
       */
      Css3Renderer.prototype.remove = function (id) {
        this._elements = this._elements.filter(function (e) {
          e.id !== id
        })
        this._container.removeChild(document.getElementById(id))
      }
      Css3Renderer.prototype.removeChild = function () {
          const parentNode = document.getElementById(this._parentEleId)
             if (parentNode.contains(this._container)) {
                    parentNode.removeChild(this._container)
             }
      }
       /**
       * 关闭信息框
       * @function
       * @example
       * const css3Render = new Cesium.Scene.Css3Renderer([{
              id: 'box4',
              parentEleId: 'info-warp',
              position: [104.08985268964015, 30.635443158056148, 50.0],
              element: `<div class="ys-css3-box ex-box" id="box4"><div class="close__box__btn">X</div>xxx 信息点</div>`,
              offset: [10, 10]
            }], true);

            setTimeout(()=>{css3Render.close()},1000)
       */
      Css3Renderer.prototype.close = function () {
        const parentNode = document.getElementById(this._parentEleId)
           if (parentNode.contains(this._container)) {
                  parentNode.removeChild(this._container)
           }
      }
      Css3Renderer.prototype.append = function (object) {
        this._elements.push(object)
        this._container.insertAdjacentHTML('beforeend', object.element)
      }

      Css3Renderer.prototype.removeEntityLayer = function (id) {
        this._viewer.entities.removeById(id + '_1')
        this._viewer.entities.removeById(id + '_2')
        this._viewer.entities.removeById(id + '_3')
        this.remove(id)
      }
      /**
       * 新增layer实例
       * @function
       * @param {object} object
       * @param {string} object.id
       * @param {Array} object.position - 坐标
       * @param {string} elements.parentEleId - 挂载信息框容器的ID
       * @param {string} object.element - html 标签字符串
       * @param {Array} object.offset - 偏移
       * @param {boolean} object.boxShow - 是否构建box 实例
       * @param {boolean} object.circleShow - 是否构建椭圆实例
       * @example
       * let css3Renderer = new Cesium.Scene.Css3Renderer([], true);
          css3Renderer.addEntityLayer({
            position: [104.06417395476578, 30.636185094244944, 30.0],//高度为 boxHeightMax
            element: `<div class='ysc-dynamic-layer ys-css3-box'>
                  <div class='line'></div>
                  <div class='main' style="font-size:20px">
                            <div class="" style="color:#ff9800">信息点</div>
                          <div class=""> 鑫鑫大厦 </div>
                    </div>
              </div>`,
            offset: [10, -250],
            boxShow: false,
            circleShow: false,
          })
          @description 注意：如果想指定挂载dom 需要 在new Cesium.Scene.Css3Renderer(),指定parentEleId，如 new Cesium.Scene.Css3Renderer([{ parentEleId: 'entityLayer-BOX', }], true);
       */
      Css3Renderer.prototype.addEntityLayer = function (object) {
        var lon = object.position[0],
          lat = object.position[1],
          sStartFlog = false,
          $this = this,
          s1 = 0.001,
          s2 = s1,
          s3 = s1,
          s4 = s1
        setTimeout(function (sStartFlog) {
          sStartFlog = true
        }, 300)
        var rotation = Cesium.Math.toRadians(30)
        var rotation2 = Cesium.Math.toRadians(30)

        //构建entity
        var height = object.boxHeight || 300,
          heightMax = object.boxHeightMax || 400,
          heightDif = object.boxHeightDif || 10
        var goflog = true
        //添加正方体
        if (object.boxShow) {
          this._viewer.entities.add({
            id: object.id + '_1',
            name: '立方体盒子',
            position: new Cesium.CallbackProperty(function () {
              height = height + heightDif
              if (height >= heightMax) {
                height = heightMax
              }
              return Cesium.Cartesian3.fromDegrees(lon, lat, height / 2)
            }, false),
            box: {
              dimensions: new Cesium.CallbackProperty(function () {
                height = height + heightDif
                if (height >= heightMax) {
                  height = heightMax
                  if (goflog) {
                    //需要增加判断 不然它会一直执行; 导致对div的dom操作 会一直重复
                    goflog = false
                    $this.append(object, true)
                  }
                }
                return new Cesium.Cartesian3(
                  object.boxSide || 100,
                  object.boxSide || 100,
                  height
                )
              }, false),
              material:
                object.boxMaterial || Cesium.Color.DEEPSKYBLUE.withAlpha(0.5)
            }
          })
        } else {
          // 只要弹出框
          setTimeout(function () {
            $this.append(object, true)
          }, 100)
        }
        if (object.circleShow) {
          object.circleSize = object.circleSize || 120
          //添加底座 一 外环
          this._viewer.entities.add({
            id: object.id + '_2',
            name: '椭圆',
            position: Cesium.Cartesian3.fromDegrees(lon, lat),
            ellipse: {
              // semiMinorAxis : object.circleSize, //直接这个大小 会有一个闪白的材质 因为cesium材质默认是白色 所以我们先将大小设置为0
              // semiMajorAxis : object.circleSize,
              semiMinorAxis: new Cesium.CallbackProperty(function () {
                if (sStartFlog) {
                  s1 = s1 + object.circleSize / 20
                  if (s1 >= object.circleSize) {
                    s1 = object.circleSize
                  }
                }
                return s1
              }, false),
              semiMajorAxis: new Cesium.CallbackProperty(function () {
                if (sStartFlog) {
                  s2 = s2 + object.circleSize / 20
                  if (s2 >= object.circleSize) {
                    s2 = object.circleSize
                  }
                }
                return s2
              }, false),
              material:
                this.getDfSt(['plugin', 'Css3Renderer_one']) ||
                'static/data/images/Textures/circle2.png',
              rotation: new Cesium.CallbackProperty(function () {
                rotation += 0.05
                return rotation
              }, false),
              stRotation: new Cesium.CallbackProperty(function () {
                rotation += 0.05
                return rotation
              }, false),
              zIndex: 2
            }
          })
          //添加底座二 内环
          this._viewer.entities.add({
            id: object.id + '_3',
            name: '椭圆',
            position: Cesium.Cartesian3.fromDegrees(lon, lat),
            ellipse: {
              semiMinorAxis: new Cesium.CallbackProperty(function () {
                if (sStartFlog) {
                  s3 = s3 + object.circleSize / 20
                  if (s3 >= object.circleSize / 2) {
                    s3 = object.circleSize / 2
                  }
                }
                return s3
              }, false),
              semiMajorAxis: new Cesium.CallbackProperty(function () {
                if (sStartFlog) {
                  s4 = s4 + object.circleSize / 20
                  if (s4 >= object.circleSize / 2) {
                    s4 = object.circleSize / 2
                  }
                }
                return s4
              }, false),
              material:
                this.getDfSt(['plugin', 'Css3Renderer_two']) ||
                'static/data/images/Textures/circle1.png',
              rotation: new Cesium.CallbackProperty(function () {
                rotation2 -= 0.03
                return rotation2
              }, false),
              stRotation: new Cesium.CallbackProperty(function () {
                rotation2 -= 0.03
                return rotation2
              }, false),
              zIndex: 3
            }
          })
        }
      }
      Cesium.Scene.Css3Renderer = Css3Renderer
    }
  },
  /*
  * 拓展聚合图层
  */
  _installClusterLayer: function () {
    if (this._viewer) {
      const _viewer = this._viewer;
      const defaultStyle = {
        pixelRange: 40,
        minimumClusterSize: 5,
        image: "data:image/png;base64,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MAwABSh1ZkDGA+JDfpOR+l+ZrpQSEGQAb/LldpdBgoI8ZxXd56909O3T8wlkgpGMFVwcO9g1MHNvKH/fN703/TtH/AsVA0CByjhd2GlgNl3woJuvUsLdlfAGDQR8VtDzw2n9FTYZq7etABUkXg5coKyBMtPIXHHsC2gGpCtm+mfn48VtPJ/hbbEHk+lzM0tAJTnHv4AxABQwY83z7TDV2sDKGVR5M1XobJU7qFI7M4n0Y9BHZA8acrrvFp7uK2zsAhQB35mBNGdKnr6yzvua9+eg17M9NxzOLoZ9rp8j/gWOGUARSM2a81cmZ+udLb0PqtRBrXxQQPDtDDLspLNLogf9WPmLAgNAsTCTMh6QyLqNVM5saXlQtyBbvz4wG8jQtRjY9msc8S8e7AIUkYvThV3pPYLPBAQZbYo/6OcYHbryLwYVDWYARcRY81yHNSjoGvH3bjSEAb/ADx9iW+AdWxh41IN+/TzdV2SYARShjIOCQSJv9cFpvkWMGUAR8g0Kelvv4L756GT7HFnQk5W/KDEAFCt7ULA7cApuJtb5/CHODxjqZ3DQr6gxABSpizMFfbP9VObW2vvacLODdLBxX9u/DlS0GACKmD1T0HEnnaG06EPdZrDZh5J9cKZf0eMgYAkY0eXDaYMN7mW6KCiJtToA8fLeIscMoBQkrQtuEkPa1tu6D7fyC1O1sfKXBgaAEpAaD1gz8ESGxC5bi+6VeXwgAZVsBZUEBoASYY0H6BF565dsg4BBrw9nMNBUrVzTr3RwDKDEZBwPGKz19y70EfQz7+FXcpgBlBp7PMA9Mu+6bNjDeVrPFSB8pwuZ+pcgBoASY6XnhnJX1KAKnulU38AG7l+Z+pckdgFKlKsrMNjiIE6BMwv1qP+dTP1LETOAUjXcrkCaf4AwoT+LqX+JYgAoUfapQd0VGOyc/2AzA5n6lzR2AUpc4FkB5yIi2XUYq7ZxgY8Sxgyg1CUDluX2Lh6aKQuwrzikEsYAUOIudgUy8a7uM/BOpv5jAAPAmGDKvP2E9WPQ4iHpuQADryV4jf/YwAAwBliX7KbnBmSbBpz+OVvGQCWFg4BjiHpgqR4QVC1ZBwENbNLn/Nn3HyOYAYwlSaSygIDX0ul/MrkWNGYwAIwh1hWDBtoHnvCOB6CNA39jCwPAWJNMLSHmnRXIGX9jEgPAGGNnAUa7/wIhYyNb/7GHAWAsShoD/Xz7Yh+e9hujGADGIPsWY47Vg0ww9R+jGADGLGs9f7laMKEjQDuIaGxRG5a2qA1LloOIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIgo5/4fgca0NGwEH+0AAAAASUVORK5CYII=",
        selectImage: 'data:image/png;base64,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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHL+JwHeg+eol/LPAAAAAElFTkSuQmCC',
        scale: 0.7,
        type: 0,
        cluserColors: [
          {
            value: 40,
            color: "rgb(255,0,0)"
          },
          {
            value: 30,
            color: "rgb(255,0,255)"
          },
          {
            value: 20,
            color: "rgb(255,255,0)"
          },
          {
            value: 10,
            color: "rgb(0,255,255)"
          },
          {
            value: 1,
            color: "rgb(0,255,0)"
          }
        ]
      }
      /**
       * Merges two objects, giving the last one precedence
       * @param {Object} target
       * @param {(Object|Array)} source
       * @returns {Object}
       */
      function objectMerge(target, source) {
        if (typeof target !== 'object') {
          target = {}
        }
        if (Array.isArray(source)) {
          return source.slice()
        }
        Object.keys(source).forEach(property => {
          const sourceProperty = source[property]
          if (typeof sourceProperty === 'object') {
            target[property] = objectMerge(target[property], sourceProperty)
          } else {
            target[property] = sourceProperty
          }
        })
        return target
      }
      /**
       * 全局类：
       * 聚合图层管理
       * @class
       * @param {clusterLayerStyleOptionsType} options - 聚合样式配置、
       * @example
       * const clusterLayer = new Cesium.Scene.ClusterLayer({style:1})
       */
      function ClusterLayer (options = {}) {
        this.style = objectMerge(defaultStyle, options || {});
        this.layer = null;
        this.unClusterLayer = null;
        this.lastCluster = [];
        this.cluserCanvasImages = {};
        this._init();
      }
      ClusterLayer.prototype._init = function() {
        this.layer = new Cesium.CustomDataSource("clusterLayer");
        this.unClusterLayer = new Cesium.CustomDataSource("unClusterLayer");
        _viewer.dataSources.add(this.unClusterLayer)
        this.layer.clustering.enabled = true;
        this.layer.clustering.pixelRange = this.style.pixelRange;
        this.layer.clustering.minimumClusterSize = this.style.minimumClusterSize;
        this.setCanvasClusterEvent();
      }
      /**
       * 添加聚合图层
       * @function
       * @param {Array<clusterDataType>} data - 聚合数据
       * @example
       * 
       * const clusterLayer = new Cesium.Scene.ClusterLayer({style:1})
       * clusterLayer.addDataToLayer([])
       */
      ClusterLayer.prototype.addDataToLayer = function(data) {
        data.forEach(item => {
          const entity = new Cesium.Entity({
            id: item.id ? item.id : Math.random().toString(36).substring(2),
            props: item,
            position: Cesium.Cartesian3.fromDegrees(item.position[0], item.position[1]),
            billboard: {
              image: this.style.image,
              scale: this.style.scale,
              disableDepthTestDistance: Number.POSITIVE_INFINITY
            }
          });
          if (data.otherProperty && data.otherProperty !== null && data.otherProperty !== undefined) {
            entity.otherProperty = data.otherProperty
          }
          entity.layer = this.layer;
          this.layer.entities.add(entity);
        });

      }
      /**
       * 手动触发聚合图层刷新
       * @function
       * @param {number}[delay=2000] - 延迟刷新时间
       * @example
       * 
       * const clusterLayer = new Cesium.Scene.ClusterLayer({style:1})
       * clusterLayer.manualRaiseClusterEvent()
       */
      ClusterLayer.prototype.manualRaiseClusterEvent = function (delay=2000) { 
        setTimeout(() => {
          this.layer.clustering._cluster(1)
         }, delay);
      }
      ClusterLayer.prototype.setCanvasClusterEvent=function() {
        this.layer.clustering.clusterEvent.addEventListener((clusteredEntities, feature) => {
           if(this.unClusterLayer)this.unClusterLayer.entities.removeAll()
           feature.label.show = false;
           feature.layer = this.layer;
           feature.billboard.show = true;
           feature.billboard.id = feature.label.id;
           feature.billboard.verticalOrigin = Cesium.VerticalOrigin.BOTTOM;
           feature.billboard.disableDepthTestDistance = Number.POSITIVE_INFINITY;
           let image = null;
           switch (this.style.type) {
             case 0:
               image = this.getCluserCanvasImage(clusteredEntities.length);
               break;
             case 1:
               image = this.getCluserCanvasImage2(clusteredEntities.length);
               break;
           }
           feature.billboard.image = image;
         });
      }
      /**
       *  手动解散选中的聚合点
       * @function
       * @param {object}pickedObj - 点击选中的实体对象
       * @example
       * 
       * const clusterLayer = new Cesium.Scene.ClusterLayer({style:1})
          const  selectGraphic =null;
          
          viewer.screenSpaceEventHandler.setInputAction((e) => {
              const pickedObj = viewer.scene.pick(e.position);
              if (selectGraphic) {
                clusterLayer.setSelectById(selectGraphic.id, false);
                selectGraphic = null;
              }
              if (pickedObj && pickedObj.id) {
                if (pickedObj.id instanceof Cesium.Entity) {
                  //选中单个
                  if (pickedObj.id.layer && pickedObj.id.layer.name === "clusterLayer") {
                    selectGraphic = pickedObj.id;
                  clusterLayer.setSelectById(selectGraphic.id, true);
                    // TODO ANYTHING
                  }
                } else if (pickedObj.id instanceof Array) {
                  // 选中聚合
                  if (pickedObj.id[0].layer && pickedObj.id[0].layer.name === "clusterLayer") {
                  clusterLayer.unClusterFn(pickedObj)
                  }
                }
              }
            }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
       */
       ClusterLayer.prototype.unClusterFn =function(pickedObj) {
        pickedObj.primitive.show = false;
         pickedObj.id.forEach(b => {
              this.unClusterLayer.entities.add(b)
         })
      }
      ClusterLayer.prototype.getCluserCanvasImage = function(num) {
        if (this.cluserCanvasImages[num]) {
          return this.cluserCanvasImages[num];
        }
        //创建cavas
        let canvas = document.createElement("canvas");
        //canvas大小
        let size = 12 * (num + "").length + 50;
        canvas.width = canvas.height = size;
        //获取canvas 上下文
        let ctx = canvas.getContext("2d");
        //绘制
        ctx.beginPath();
        ctx.globalAlpha = 0.5;
        (ctx.fillStyle = this.getCluseColor(num)),
          ctx.arc(size / 2, size / 2, size / 2 - 5, 0, 2 * Math.PI),
          ctx.fill(),
          ctx.beginPath(),
          (ctx.globalAlpha = 0.8),
          (ctx.fillStyle = this.getCluseColor(num)),
          ctx.arc(size / 2, size / 2, size / 2 - 10, 0, 2 * Math.PI),
          ctx.fill(),
          (ctx.font = "20px alpht"),
          (ctx.globalAlpha = 1),
          (ctx.fillStyle = "rgb(255,255,255)");
        let offset = size / 2 - (12 * num.toString().length) / 2;
        ctx.fillText(num, offset, size / 2 + 7);
        this.cluserCanvasImages[num] = canvas;
        return canvas;
      }
     
      ClusterLayer.prototype.getCluserCanvasImage2 = function(num) {
        if (this.cluserCanvasImages[num]) {
          return this.cluserCanvasImages[num];
        }
        //创建cavas
        let canvas = document.createElement("canvas");
        //canvas大小
        let size = 12 * (num + "").length + 50;
        canvas.width = canvas.height = size;
        //获取canvas 上下文
        let ctx = canvas.getContext("2d");
        //绘制
        ctx.translate(size / 2, size / 2);
        ctx.fillStyle = this.getCluseColor(num);
     
        const angle = Math.PI / 2;
        const dltAngle = Math.PI / 6;
        let startAngle = 0;
        let endAngle = 0;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.globalAlpha = 0.5;
          startAngle = endAngle + dltAngle;
          endAngle = startAngle + angle;
          ctx.arc(0, 0, size / 2 - 5, startAngle, endAngle);
          ctx.closePath();
          ctx.fill();
        }
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.globalAlpha = 1.0;
        ctx.arc(0, 0, size / 4, 0, 2 * Math.PI), ctx.fill();
     
        ctx.translate(-size / 2, -size / 2);
        ctx.font = "20px alpht";
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgb(255,255,255)";
        let offset = size / 2 - (12 * num.toString().length) / 2;
        ctx.fillText(num, offset, size / 2 + 7);
        this.cluserCanvasImages[num] = canvas;
        return canvas;
      }
     
      ClusterLayer.prototype.getCluseColor = function(num) {
        for (let i = 0; i < this.style.cluserColors.length; i++) {
          let item = this.style.cluserColors[i];
          if (num >= item.value) {
            return item.color;
          }
        }
      }
      ClusterLayer.prototype.updateStyle = function(style) {
        this.style = objectMerge(this.style, style);
        this.layer.clustering.pixelRange = this.style.pixelRange;
        this.layer.clustering.minimumClusterSize = this.style.minimumClusterSize;
      }
     
      ClusterLayer.prototype.setType = function(type) {
        this.style.type = type;
      }
      /**
       * 设置聚合图标选中样式
       * @function
       * @param {number} id - 聚合实体id
       * @param {boolean} enabled - 是否选中
       * @example
       * 
       * const clusterLayer = new Cesium.Scene.ClusterLayer({style:1})
          const  selectGraphic =null;
          
        viewer.screenSpaceEventHandler.setInputAction((e) => {
            const pickedObj = viewer.scene.pick(e.position);
            if (selectGraphic) {
              clusterLayer.setSelectById(selectGraphic.id, false);
              selectGraphic = null;
            }
          }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
       */
      ClusterLayer.prototype.setSelectById = function(id, enabled) {
        if (this.layer) {
          const entity = this.layer.entities.getById(id);
          entity && (entity.billboard.image = enabled ? this.style.selectImage : this.style.image);
        }
      }
      /**
       * 根据id 查询entity
       * @function
       * @param {number} id - 聚合实体id
       * @example
       * 
       * const clusterLayer = new Cesium.Scene.ClusterLayer({style:1})
        const  selectGraphic =null;
          
        viewer.screenSpaceEventHandler.setInputAction((e) => {
            const pickedObj = viewer.scene.pick(e.position);
            if (pickedObj && pickedObj.id) {
              if (pickedObj.id instanceof Cesium.Entity) {
                //选中单个
                if (pickedObj.id.layer && pickedObj.id.layer.name === "clusterLayer") {
                  selectGraphic = pickedObj.id;
                  const ent =  clusterLayer.getEntityById(selectGraphic.id);
                  console.log(ent)
                }
              }
            }
          }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
       * @returns {Cesium.Entity} entiy
       */
      ClusterLayer.prototype.getEntityById= function(id) {
        const entity = this.layer.entities.getById(id);
        return entity;
      }
      /**
       * 移除所有聚合点
       * @function
       * @example
       * 
       * const clusterLayer = new Cesium.Scene.ClusterLayer({style:1})
         clusterLayer.clear();
       */
      ClusterLayer.prototype.clear = function() {
        this.cluserCanvasImages = {};
        if (this.layer) {
          this.layer.entities.removeAll();
        }
      }
      Cesium.Scene.ClusterLayer = ClusterLayer;
    }
  },
   /*
  * 拓展3d柱状图层
  */
  _installBar3DLayer: function () {
    if (this._viewer) {
      const _viewer = this._viewer;
      /**
       * Merges two objects, giving the last one precedence
       * @param {Object} target
       * @param {(Object|Array)} source
       * @returns {Object}
       */
      function objectMerge(target, source) {
        if (typeof target !== 'object') {
          target = {}
        }
        if (Array.isArray(source)) {
          return source.slice()
        }
        Object.keys(source).forEach(property => {
          const sourceProperty = source[property]
          if (typeof sourceProperty === 'object') {
            target[property] = objectMerge(target[property], sourceProperty)
          } else {
            target[property] = sourceProperty
          }
        })
        return target
      }
      const effort = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAFCElEQVR4AexWWUjuVRCfz12v+5L7mqKmoqaCae744oJL+qKiSQgRET710Ms1CALlopIP6oNJoiCICylCoJQhKmIppKLmVi647+un2PzO9f/xrZp1I4r78c2ZOefMnPmdOXPm/PXoX/69BvDfikBFRYVlXV3dIPM7UHV19XF9ff1QS0vLj5WVlTdVVVXyhoaG35+SVn8qAo2NjWWtra0dJiYm27u7u0kREREEsrS0tDg6OopbW1t718XFRT8gIMBgc3PTrba2dpeBHjQ1Nf3S1tbW8hCgRwHU1NTMbmxsNC4sLLx3eXlpHBcXJ5wDAPfJ1taWcnJyKDk5mXx8fMjU1JSOj4/t2Kn1zc1N0MrKShEDOuvu7n6LxzT+DwJg9OOHh4cBcObp6Un29vYUGBhI+C0tLdHOzg4BEEcCQzQ8PCx08vPzKTc3lzIyMqigoICMjIzMtre3vxNKao1OAO3t7c/n5+cjo6KiKDw8nDjM5OzsrDDnOXJ3dyfJ+cTEBO3v71NMTIxiDMrsnMLCwoij6NrZ2ZmPMWXSCYDP+n0+V+EcO729vSVEQTI+PT0lV1dXqSsAQt/KykoxJgmwMzMzI7b5SBqTuE4ArOzs4eFB19fXdHJyIvT39vawEyFfXFzQs2fPhIxma2uLbGxsIGolJycnrOOvPqkVAF8xS3ZgzIlHzc3NNDg4KOxGRkaot7eXenp6iOdFwokJHQ2OBYRpgON8egOyMmkA6Orqem5tbb0rk8mIuTjTzMxMKi0tJSRXQkKCcI5FFhcXwXQSbsn09LSYBwC5XK7Pm3tbDNw3KgD6+vqcVldXPzM2NjYsLi6mlJQUCg4OFslnaGgoQuzv70/x8fGkp6dHrHu/zEvGDl4K9y2iJOUE1xAxam5u7iCE+0YFACfbxxwmIzhgEPcqmgzJhqQ6Pz+nmZkZoYDryYkrZKm5uroSdULqg7OdKbhEKgB4B++gsCBckoI2fnBwQAivo6MjjY2NERLQy8tL1AXIsEFNWF9f1wDAhcoM8xKpAEDlcnBQiZC425IyOJwPDAyII4iOjhZ3HknZ399PvAGRoFxDCGfv6+tLQUFBMFOQgYHBgwBkrKBQhoBEa+ab0NHRQSBOUkI+JCUlESKQnp5OsbGxojyj+qFqhoaGUlpamijPWEOZuDCZKfdVIsDF5pIfF+V5CgkJocTERELygSBnZWURigsUkVzYJRyjVIPzo0Rubm6YVhDyBR2uHXPgEqkA4MlulFyUVEkBDnC+AALCgyPNPYVLG+PkHlW2UwFwdnb2Ql9f/255eVlZ55XIfLvIwsJCnpqaeqS8oAqA8vLy3zh0P09NTRHKrrLi35ERfv5OIL6C++rrqADAJJ9zKlfAk8nJSXRfCc3OzhJAcI7Uqi+oAYCf033O7s+R/VIdVzd6Sh+OAYBfziUu5V+q22oAgAIrvvDz8+sGABDG/iqNj4+L3dvZ2X2hbQ2tAKBYWFiY4+3t/QMAjI6O7vDYxN3d3a/Mt5lfMX/0z59jNDc3R1yQerlGfK3NQCcAKJeUlCSycR8/PB9w/Y/kMPoxd2Ruwl84RqzjwNXTlwFFyGSyJObZzEuYf8JPecPQ0BA+WpaKiooyWVfr/0EAsGDjjOzs7G8hK1NkZKScwezyR8siA/qJP9e+Z97D/BvmXyUkJHzI4KvKysreVLZTlx8FoG7wlH5eXt6nj+n/owAec475/z8A7PIh+gMAAP//rzDbCQAAAAZJREFUAwDEKgBfgUOdbAAAAABJRU5ErkJggg==";
      const applaud = "data:image/png;base64,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";
      const likeImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAADK0lEQVR4AdSWXUhTYRjHt1lK7eSmsyzNpbVZmYGLvBiU7SJlE2cXijd9SkVGSXXTVZQpInSRECGBSDgwpDApByGiWyEOolxYSpmIUtqXWXO6TWmz/5sxd96Z7p1t0fj/9n6cPef5v+/Oec4RCf7x57808ACb9gW8A2VgWWLdATGy5XfV1Nj6DAa3IjExB+OHIGixGlhLMqnT0rZsl8s3vW1oUEs5LgVz10FQCsqAb6by4mI7xheAAjCL1UA8naG0oEAdLRb3Yl4HmMVqIEEkFI7TWQqzssYwdxAwi9mAhOPI1c9LdEKvX4+JjYBZrAZkioSECTrLNrmcGCCsoY8tNWY1EJeekuKhTxrDcRKhUDiJeXJHoAlctAFSWGYRTnMbc7lgnUqpjETrp9VRUR8xmQ9KwRFwAGiACmwGMrAC8EQbuGLNyHlBky2Nz0DU/Ty1WkSuevT9lJ2Z+UGjUu3fpVQWoUCVbJDJLmFnbqyKimpcGRFhxsXbLxQIRhBIFolmTqK5Zv47ZkVkBg05WqjRWFqqqsiKyNCP5ooKjam6et/z2to9pECNNjXtHjcadzpaW1Nn2tuT3CZTbHNl5WiESFTiG+xnwPfg3+4bLZavbo+nw/e8YTVwp62N3Cm3gjKA/w/yDWXrN3Z0WBzT0zsQ9QR4FfAOzAoEkDeOubNVLv/1IEMg7zoK2AAClyWT1foZJ3gKzMCrgA1g/yFvHHPncl1dLIKuAZ4CNsCLYhzcNZm6p1wuUsCa6NCwGFAmJUUjMamGyWh5CouBlq4uUqbfIPMQ4CksBirq68nKL/Iy/x6E3EC5wdD5w+0eRr4FX15DbuDV4KAbyckrGxp/hdyAyWqV+KednwmpgaKyssdjNht5lN+cT8nv+RmY8bgH+D+ZG2ElUple3wN6Y/X6Pmle3mvQL8nNHQCD0TrdEKfTDXNa7XuxVjtCuGc2xyF6L3gJFhRt4Gpq9yNF8jOjwJe27596sJLz43b7OXD2m91+xjY5eRqcmnA4ToLjdqezeMrpPIaCc9jhch0iIGM66AR/FG2AvK2QkktzFGcgNZwVhC0u2sDivw7i6FIhPwEAAP//c8uOZAAAAAZJREFUAwAS2vhBEdJeLwAAAABJRU5ErkJggg=="
      const defaultStyle = {
        duration: 2000,
        loop: false,
        boxWidth: 40000,
        boxDepth: 40000,
        icon: true,
        iconUrlArr:[],
        labelShow:true,
        label: {
          font: 'bold 24px Arial',
          fillColor: Cesium.Color.WHITE,
          showBackground: true,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(0, 0)
        },
        billboard: {
          width: 25,
          height: 25,
          pixelOffset: new Cesium.Cartesian2(-35, 0)
        },
      }
      /**
       * 全局类：
       *  三维柱状图层管理
       * @class
       * @param {barLayerStyleOptionsType} options - 柱状样式配置、
       * @example
       * const barLayer = new Cesium.Scene.ThreeDimensionalBar({label: {font: 'bold 16px Arial' }})
       */
      function ThreeDimensionalBar (options) {
        this.barLayer = null;
        this.config = objectMerge(defaultStyle, options || {});
        this._init()
      }
      ThreeDimensionalBar.prototype._init = function () {
        this.barLayer = new Cesium.CustomDataSource("threeDimensionalBarLayer");
        _viewer.dataSources.add(this.barLayer);
      }
      ThreeDimensionalBar.prototype._findWeight =function(arr) {
        const max = Math.max(...arr)
        const min = Math.min(...arr);
        return { max, min };
      }
      ThreeDimensionalBar.prototype._limitNumberWithinRange =function(num, min, max) {
        const MIN = min || 1;
        const MAX = max || 20;
        const parsed = parseInt(num)
        return Math.min(Math.max(parsed, MIN), MAX)
      }
      /**
       * 添加3D柱状图层
       * @function
       * @param {barLayerDataType} options - 聚合数据
       * @example
       * 
       * const barLayer = new Cesium.Scene.ThreeDimensionalBar({label: {font: 'bold 16px Arial' }})
       * barLayer.addDataToLayer(options)
       */
      ThreeDimensionalBar.prototype.addDataToLayer = function (options) {
        const { barData, numField = 'count', multiple } = options;
        const { max, min } = this._findWeight(barData.map(e => e[numField]))
      
        let iconUrlArr = this.config.iconUrlArr
        // 位移数组
        if (iconUrlArr.length > 0&&iconUrlArr.length<3) {
          if (iconUrlArr.length < 2) {
            iconUrlArr[1]=iconUrlArr[0]
            iconUrlArr[2]=iconUrlArr[0]
          } else if (iconUrlArr.length < 3) {
            iconUrlArr[2]=iconUrlArr[0]
          }
        }

        const maxNum = (max - min) / 2
        barData.forEach((item, index) => {
          const num = item[numField]
          let iconUrl = null;
          // 判断icon是否显示，如果显示，iconUrl 为空就自动计算
          if (this.config.icon) {
            if (!item.iconUrl) {
              iconUrl = num >= max ?iconUrlArr[0]||likeImg : num >= num * (maxNum / num / 100) ?iconUrlArr[1]||applaud : iconUrlArr[2]||effort;
            } else {
              iconUrl =item.iconUrl
            }
          }
          const weightVal = num > maxNum ? num * (maxNum / num / 100) : ((maxNum - num) / 100) * 5;
          let weightNum = 1;
          if (Cesium.defined(multiple)) {
            weightNum=multiple
          } else {
            weightNum=this._limitNumberWithinRange(weightVal, min, maxNum)
          }
          this._add3DBarWithIcon({
            id: item.name + index,
            value: num,
            color: item.color,
            imgSrc: iconUrl,
            position: item.center,
            weight: weightNum
          })
        })
      }
      /**
       * 移除3D柱状图层
       * @function
       * @example
       * 
       * const barLayer = new Cesium.Scene.ThreeDimensionalBar({label: {font: 'bold 16px Arial' }})
       * barLayer.clear()
       */
      ThreeDimensionalBar.prototype.clear = function () {
        if (this.barLayer) {
          this.barLayer.entities.removeAll();
        }
      }
      // 三维立体柱子
      ThreeDimensionalBar.prototype._add3DBarWithIcon = function({ id, value, color, imgSrc, position,weight=1}) {
        const _self = this;
        // 先移除同位置的广告牌，避免被遮挡
        const existIcon = _self.barLayer.entities.getById(id + '-icon')
        if (existIcon) _self.barLayer.entities.remove(existIcon)
      
      
        const width = _self.config.boxWidth //40000
        const depth = _self.config.boxDepth //40000
        const maxHeight = value*weight // 柱子高度与数值挂钩
        let minHeight = 0 // 初始高度
        let currentHeight = 0;
        let barMaterial = null;
        if (color instanceof Cesium.Color) {
          barMaterial = color
        } else {
          barMaterial=Cesium.Color.fromCssColorString(color).withAlpha(0.85)
        }

        // 柱状实体
        _self.barLayer.entities.add({
          id: id + '-bar',
          name: '3DBar',
          position: new Cesium.CallbackProperty(function () {
            return Cesium.Cartesian3.fromDegrees(position[0], position[1], currentHeight / 2)
          }, false),
          box: {
            dimensions: new Cesium.CallbackProperty(function () {
              return new Cesium.Cartesian3(width, depth, currentHeight)
            }, false),
            material:barMaterial,
            outline: false
          },
          show: true // 确保动画过程中实体可见
        })

        let labelBc = null;
        if (color instanceof Cesium.Color) {
          labelBc = color
        } else {
          labelBc=Cesium.Color.fromCssColorString(color).withAlpha(0.7)
        }
        // 顶部数字label
        if (_self.config.labelShow) {
          _self.barLayer.entities.add({
            id: id + '-label',
            position: new Cesium.CallbackProperty(function () {
              return Cesium.Cartesian3.fromDegrees(position[0],  position[1],currentHeight + 3000)
            }, false),
            label: {
              text: value + '',
              backgroundColor: labelBc,
              ..._self.config.label
            },
            show: true
          })
        }
      
      
        // 顶部的Icon 图标
        if (_self.config.icon) {
          _self.barLayer.entities.add({
            id: id + '-icon',
            position:new Cesium.CallbackProperty(function () {
              return  Cesium.Cartesian3.fromDegrees(position[0], position[1],currentHeight + 22000)
            }, false),
            billboard: {
              image: imgSrc,
              ..._self.config.billboard
            },
            show: true
          })
        }
      
        // 使用requestAnimationFrame实现柱子动画
        function animate() {
          currentHeight = minHeight += _self.config.duration;
          if (_self.config.loop) {
            requestAnimationFrame(animate)
          }else  if (minHeight <  maxHeight) {
            requestAnimationFrame(animate)
          }
        }
        animate()
      }
      Cesium.Scene.ThreeDimensionalBar = ThreeDimensionalBar;
    }
  },
  transformJD(lng, lat) {
    var ret =
      300.0 +
      lng +
      2.0 * lat +
      0.1 * lng * lng +
      0.1 * lng * lat +
      0.1 * Math.sqrt(Math.abs(lng))
    ret +=
      ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) *
        2.0) /
      3.0
    ret +=
      ((20.0 * Math.sin(lng * PI) + 40.0 * Math.sin((lng / 3.0) * PI)) * 2.0) /
      3.0
    ret +=
      ((150.0 * Math.sin((lng / 12.0) * PI) +
        300.0 * Math.sin((lng / 30.0) * PI)) *
        2.0) /
      3.0
    return ret
  },
  transformWD(lng, lat) {
    var ret =
      -100.0 +
      2.0 * lng +
      3.0 * lat +
      0.2 * lat * lat +
      0.1 * lng * lat +
      0.2 * Math.sqrt(Math.abs(lng))
    ret +=
      ((20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) *
        2.0) /
      3.0
    ret +=
      ((20.0 * Math.sin(lat * PI) + 40.0 * Math.sin((lat / 3.0) * PI)) * 2.0) /
      3.0
    ret +=
      ((160.0 * Math.sin((lat / 12.0) * PI) +
        320 * Math.sin((lat * PI) / 30.0)) *
        2.0) /
      3.0
    return ret
  },
  gcj2wgs(arrdata) {
    var lng = Number(arrdata[0])
    var lat = Number(arrdata[1])
    var dlat = this.transformWD(lng - 105.0, lat - 35.0)
    var dlng = this.transformJD(lng - 105.0, lat - 35.0)
    var radlat = (lat / 180.0) * PI
    var magic = Math.sin(radlat)
    magic = 1 - ee * magic * magic
    var sqrtmagic = Math.sqrt(magic)
    dlat = (dlat * 180.0) / (((a$1 * (1 - ee)) / (magic * sqrtmagic)) * PI)
    dlng = (dlng * 180.0) / ((a$1 / sqrtmagic) * Math.cos(radlat) * PI)
    var mglat = lat + dlat
    var mglng = lng + dlng
    var jd = lng * 2 - mglng
    var wd = lat * 2 - mglat
    jd = Number(jd.toFixed(6))
    wd = Number(wd.toFixed(6))
    return [jd, wd]
  },
  wgs2gcj(arrdata) {
    var lng = Number(arrdata[0])
    var lat = Number(arrdata[1])
    var dlat = this.transformWD(lng - 105.0, lat - 35.0)
    var dlng = this.transformJD(lng - 105.0, lat - 35.0)
    var radlat = (lat / 180.0) * PI
    var magic = Math.sin(radlat)
    magic = 1 - ee * magic * magic
    var sqrtmagic = Math.sqrt(magic)
    dlat = (dlat * 180.0) / (((a$1 * (1 - ee)) / (magic * sqrtmagic)) * PI)
    dlng = (dlng * 180.0) / ((a$1 / sqrtmagic) * Math.cos(radlat) * PI)
    var mglat = lat + dlat
    var mglng = lng + dlng
    mglng = Number(mglng.toFixed(6))
    mglat = Number(mglat.toFixed(6))
    return [mglng, mglat]
  },
  transformData(start, end, route) {
    var _this = this
    var paths = route.paths // 所有路径
    var allroute = []

    var _loop = function _loop(i) {
      var path = paths[i]
      var lnglats = []
      var instructions = []
      var distance = path.distance

      for (var j = 0; j < path.steps.length; j++) {
        // 单个路径的坐标数组
        var item = path.steps[j]
        var instruction = path.steps[j].instruction
        var polyline = item.polyline
        polyline = polyline.split(';')
        polyline.forEach(function (element) {
          element = element.split(',')
          element = _this.gcj2wgs(element)
          lnglats.push([element[0], element[1]])
        })
        instructions.push(instruction)
      } // 加上起点和终点
      lnglats.unshift(start)
      lnglats.push(end)
      allroute.push({
        lnglats: lnglats,
        instructions: instructions,
        distance: distance
      })
    }

    for (var i = 0; i < paths.length; i++) {
      _loop(i)
    }

    return allroute
  },
  /**
   * 驾车路线查询
   * @private
   * @param {queryOptionsType} options
   * @param {Function} successCB - 成功回调
   * @param {Function} errorCB - 失败回调
   */
  _queryDrivingRoute(url, options, successCB, errorCB) {
    options = options || {}

    if (!options.origin) {
      alert('缺少起点坐标！')
      return
    }

    if (!options.destination) {
      alert('缺少终点坐标！')
      return
    }
    var queryKey = options.key || this._queryRouteKey
    delete options.key
    var origin = options.origin
    var gcj_origin = this.wgs2gcj(origin)
    gcj_origin = gcj_origin[0] + ',' + gcj_origin[1]
    delete options.origin

    var destination = options.destination
    var gcj_destination = this.wgs2gcj(destination)
    gcj_destination = gcj_destination[0] + ',' + gcj_destination[1]
    delete options.destination
    var avoidpolygons = '' // 避让区域

    if (options.avoidpolygons) {
      for (var i = 0; i < options.avoidpolygons.length; i++) {
        var avoidpolygon = options.avoidpolygons[i]
        var firstLnglat = ''
        var polygonstr = ''

        for (var j = 0; j < avoidpolygon.length; j++) {
          var lnglat = avoidpolygon[j]
          lnglat = this.wgs2gcj(lnglat)
          polygonstr += lnglat[0] + ',' + lnglat[1] + ','
          if (j == 0) firstLnglat = lnglat[0] + ',' + lnglat[1]
        }

        polygonstr = polygonstr + firstLnglat

        if (i == options.avoidpolygons.length - 1) {
          avoidpolygons += polygonstr
        } else {
          avoidpolygons += polygonstr + '|'
        }
      }
    }

    delete options.avoidpolygons

    var params = {
      key: queryKey,
      origin: gcj_origin,
      destination: gcj_destination,
      strategy: 0,
      avoidpolygons: avoidpolygons,
      show_fields: 'polyline'
    }
    params = Object.assign(params, options || {})
    var that = this
    let reqParams = ''
    // 参数拼接
    Object.keys(params).map((k) => {
      if (!reqParams) {
        reqParams += `?${k}=${params[k]}`
      } else {
        reqParams += `&${k}=${params[k]}`
      }
    })
    fetch(url + reqParams)
      .then(function (response) {
        return response.json()
      })
      .then(function (res) {
        if (res.status != '1' || res.infocode != '10000') {
          console.log('查询失败！')
          errorCB && errorCB(res)
          return
        }

        var allroute = that.transformData(origin, destination, res.route)
        successCB && successCB(allroute)
      })
  },
  /**
   * 驾车/步行/骑行路线查询
   * @param { Enum} type  - 类型[drive:驾车，walk:步行，cycle:骑行] {@link module:Plugin#routeQueryType|routeQueryType}
   * @param {queryOptionsType} options
   * @param {Function} successCB - 成功回调
   * @param {Function} errorCB - 失败回调
   * @example
   *  import { initCesium } from 'cesium_dev_kit'
   * const {plugin,material} = new initCesium({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   *
   * const queryParams = {
   *    url: "https://restapi.amap.com/v5/direction/driving",
   *    key: '8dc49b1fa65a79d306ef12dae4229842',
   *     origin: [102.736485445,29.87345],
   *    destination:[110.160187, 31.036076],
   *  }
   * plugin.queryPathPlan('drive', queryParams, restArr => {
   *     // 拿到结果转换后调用绘制路线
   *    this.createPath(restArr)
   *  }, err => { console.error(err) })
   */
  queryPathPlan(type, options, successCB, errorCB) {
    let queryUrl
    if (type === Plugin.routeQueryType.DRIVE) {
      queryUrl = options.url || 'https://restapi.amap.com/v5/direction/driving'
      delete options.url
      this._queryDrivingRoute(queryUrl, options, successCB, errorCB)
    } else if (type === Plugin.routeQueryType.WALK) {
      queryUrl = options.url || 'https://restapi.amap.com/v3/direction/walking'
      delete options.url
      this._queryWalkCycleRoute(queryUrl, options, successCB, errorCB)
    } else if (type === Plugin.routeQueryType.CYCLE) {
      queryUrl =
        options.url || 'https://restapi.amap.com/v5/direction/bicycling'
      delete options.url
      this._queryWalkCycleRoute(queryUrl, options, successCB, errorCB)
    } else {
      alert('查询参数type 错误（walk:步行，cycle:骑行）！')
    }
  },
  _queryWalkCycleRoute(url, options, successCB, errorCB) {
    options = options || {}

    if (!options.origin) {
      alert('缺少起点坐标！')
      return
    }

    if (!options.destination) {
      alert('缺少终点坐标！')
      return
    }
    var queryKey = options.key || this._queryRouteKey
    delete options.key
    var origin = options.origin
    var gcj_origin = this.wgs2gcj(origin)
    gcj_origin = origin[0] + ',' + origin[1]
    delete options.origin

    var destination = options.destination
    var gcj_destination = this.wgs2gcj(destination)
    gcj_destination = destination[0] + ',' + destination[1]
    delete options.destination
    var params = {
      key: queryKey,
      origin: gcj_origin,
      destination: gcj_destination,
      show_fields: 'polyline'
    }
    params = Object.assign(params, options || {})
    var that = this
    let reqParams = ''
    var allroute
    // 参数拼接
    Object.keys(params).map((k) => {
      if (!reqParams) {
        reqParams += `?${k}=${params[k]}`
      } else {
        reqParams += `&${k}=${params[k]}`
      }
    })
    fetch(url + reqParams)
      .then(function (response) {
        return response.json()
      })
      .then(function (res) {
        // 兼容v3与v4版本
        if (res.hasOwnProperty('errcode')) {
          if (res.errcode != 0 || res.errmsg != 'OK') {
            console.log('查询失败！', res.errdetail)
            errorCB && errorCB(res)
            return
          }
          allroute = that.transformData(origin, destination, res.data)
          successCB && successCB(allroute)
        } else if (res.hasOwnProperty('status')) {
          if (res.status != '1' || res.infocode != '10000') {
            console.log('查询失败！', res.info)
            errorCB && errorCB(res)
            return
          }
          allroute = that.transformData(origin, destination, res.route)
          successCB && successCB(allroute)
        } else {
          console.log('查询失败,未知错误！')
          errorCB && errorCB(res)
          return
        }
      })
  }
}

export { Plugin }
