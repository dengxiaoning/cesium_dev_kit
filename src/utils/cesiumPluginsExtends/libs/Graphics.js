import SuperGif from 'libgif'
let Cesium = null
let dfSt = undefined
/**
 * 图形模块
 * 用于向地图加载各种实体对象
 * @class
 * @augments  module:Base
 * @param {object} params
 * @param {object} params.viewer - cesium 实例
 * @param {object} params.cesiumGlobal - cesium 全局对象
 * @param {Array} params.defaultStatic - 静态资源
 * @exports  Graphics
 */
function Graphics(viewer, cesiumGlobal, defaultStatic) {
  if (viewer) {
    Cesium = cesiumGlobal
    dfSt = defaultStatic
    this._graphicsLayer = new Cesium.CustomDataSource('graphicsLayer')
    viewer && viewer.dataSources.add(this._graphicsLayer)
  }
}

Graphics.prototype = {
  /**
   *获取点图形
   * @function
   * @param {object} options
   * @param {object} options.color - 点颜色
   * @param {number} options.pixelSize - 点大小
   * @param {number} options.outlineColor  - 边线颜色
   * @param {number} options.outlineWidth - 边线宽
   * @example
   *  import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.getPointGraphics({
   *     color:Cesium.Color.GREEN,
   *      pixelSize:5,
   *      outlineColor:Cesium.Color.WHITE,
   *      outlineWidth:1
   * })
   * @returns  {PointGraphics}  返回PointGraphics实例
   */
  getPointGraphics: function (options) {
    options = options || {}
    if (options) {
      return new Cesium.PointGraphics({
        color: options.color || Cesium.Color.GREEN,
        pixelSize: options.pixelSize || 5,
        outlineColor: options.outlineColor || Cesium.Color.WHITE,
        outlineWidth: options.outlineWidth || 1
      })
    }
  },
  /**
   *获取线图形
   * @function
   * @param {object} options
   * @param {Cartesian3} options.positions - 绘制线图形的坐标数组
   * @param {object} options.material - 配置线段材质
   * @param {number} options.width - 线宽
   * @param {boolean} options.clampToGround - 是否贴地
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.getLineGraphics({
   *     positions:Cesium.Cartesian3.fromDegreesArray([
          104.09816110606057,
          30.659821965447698,
          104.1120972824757,
          30.65330300319938,
          104.10758419863926,
          30.64592470850288,
          104.09351691196979,
          30.652434826507452,
          104.09816110606057,
          30.659821965447698
        ]),
   *      material:Cesium.Color.RED.withAlpha(0.2),
   *      clampToGround:false,
   *      width:1
   * })
   * @returns {PolylineGraphics}   返回PolylineGraphics实例
   */
  getLineGraphics: function (options) {
    options = options || {}
    if (options && options.positions) {
      return new Cesium.PolylineGraphics({
        show: true,
        positions: options.positions,
        material: options.material || Cesium.Color.YELLOW,
        width: options.width || 1,
        arcType :Cesium.ArcType.GEODESIC,
        clampToGround: this._objHasOwnProperty(options, 'clampToGround', false)
      })
    }
  },
  /**
   *获取面图形
   * @function
   * @param {object} options
   * @param {Cartesian3} options.positions - 绘制线图形的坐标数组
   * @param {object} options.material - 配置线段材质
   * @param {boolean} options.clampToGround - 是否贴地
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.getPolygonGraphics({
   *     positions:Cesium.Cartesian3.fromDegreesArray([
          104.09816110606057,
          30.659821965447698,
          104.1120972824757,
          30.65330300319938,
          104.10758419863926,
          30.64592470850288,
          104.09351691196979,
          30.652434826507452,
          104.09816110606057,
          30.659821965447698
        ]),
   *      material:Cesium.Color.RED.withAlpha(0.2),
   *      clampToGround:false
   * })
   * @returns  {PolygonGraphics}   返回PolygonGraphics实例
   */
  getPolygonGraphics: function (options) {
    options = options || {}
    if (options && options.positions) {
      return new Cesium.PolygonGraphics({
        hierarchy: {
          positions: options.positions
        },
        material: options.material || Cesium.Color.RED.withAlpha(0.2),
        clampToGround: options.clampToGround || false
      })
    }
  },
  /**
   *获取标签图形
   * @function
   * @param {object} options
   * @param {string} options.l_text - 标签文字
   * @param {string} options.l_font - 字体
   * @param {string} options.l_fillColor - 颜色
   * @param {string} options.l_style - 风格
   * @param {number} options.l_outlineColor - 外边线颜色
   * @param {number} options.l_outlineWidth - 外边线宽度
   * @param {boolean} options.l_showBackground - 是否显示背景颜色
   * @param {object} options.l_backgroundColor - 背景颜色
   * @param {string} options.l_verticalOrigin - 垂直方向
   * @param {Cesium.Cartesian2} options.l_pixelOffset - 偏移
   * @param {Cesium.HeightReference} options.l_heightReference - 高程参照设置
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.getLabelGraphics({
        l_text:"你好",
        l_font : "14px sans-serif",
        l_fillColor : Cesium.Color.GOLD,
        l_style : Cesium.LabelStyle.FILL_AND_OUTLINE,
        l_outlineWidth : 2,
        l_showBackground: false,
        l_backgroundColor : new Cesium.Color(0.165, 0.165, 0.165, 0.8),
        l_verticalOrigin : Cesium.VerticalOrigin.BOTTOM,
        l_pixelOffset: new Cesium.Cartesian2(0, -30),
        l_heightReference: Cesium.HeightReference.RELATIVE_TO_TERRAIN
   * })
   * @returns  {LabelGraphics} 返回LabelGraphics实例
   */
  getLabelGraphics: function (options) {
    options = options || {}
    if (options && options.l_text) {
      return new Cesium.LabelGraphics({
        //文字标签
        text: options.l_text,
        font: options.l_font || '14px sans-serif',
        fillColor: options.l_fillColor || Cesium.Color.GOLD,
        style: options.l_style || Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineColor: options.l_outlineColor || Cesium.Color.GOLD,
        outlineWidth: options.l_outlineWidth || 2,
        showBackground: options.l_showBackground || false,
        backgroundColor:
          options.l_backgroundColor ||
          new Cesium.Color(0.165, 0.165, 0.165, 0.8),
        verticalOrigin:
          options.l_verticalOrigin || Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: options.l_pixelOffset || new Cesium.Cartesian2(0, -30),
        heightReference:options.l_heightReference!=undefined?options.l_heightReference:Cesium.HeightReference.NONE
      })
    }
  },
  /**
   *获取广告牌图形
   * @function
   * @param {object} options
   * @param {string} options.b_img - 背景图地址
   * @param {number} options.b_width - 宽度
   * @param {number} options.b_height - 高度
   * @param {boolean} options.b_clampToGround - 贴地
   * @param {number} options.b_scale - 缩放比例
   * @param {string} options.b_scaleByDistance - 缩放远近距离
   * @param {Cesium.Cartesian2} options.b_pixelOffset - 偏移
   * @param {Cesium.Cartesian2} options.b_eyeOffset - 视角偏移设置
   * @param {Cesium.HeightReference} options.b_heightReference - 高程参照设置
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.getBillboardGraphics({
       b_img: "images/bill.png",
        b_width: 35,
        b_height : 35,
        b_clampToGround : true,
        b_scale : 1,
        b_pixelOffset :new Cesium.Cartesian2(0, -20),
        b_scaleByDistance : new Cesium.NearFarScalar(1.5e2, 0.7, 1.5e7, 0.5),
        b_eyeOffset: new Cesium.Cartesian2(0, -20),
        b_heightReference: Cesium.HeightReference.RELATIVE_TO_TERRAIN
   * })
   * @returns {BillboardGraphics}   返回BillboardGraphics实例
   */
  getBillboardGraphics: function (options) {
    options = options || {}
    if (options && options.b_img) {
      return new Cesium.BillboardGraphics({
        image: options.b_img,
        width: options.b_width || 35,
        height: options.b_height || 35,
        clampToGround: options.b_clampToGround || true,
        scale: options.b_scale || 1,
         eyeOffset : options.b_eyeOffset!=undefined?options.b_eyeOffset: Cesium.Cartesian3.ZERO,
        pixelOffset: options.b_pixelOffset || new Cesium.Cartesian2(0, -20),
        scaleByDistance: options.b_scaleByDistance || undefined,
        heightReference:options.b_heightReference!=undefined?options.b_heightReference:Cesium.HeightReference.NONE
      })
    }
  },
  /**
   * 获取路径
   * @function
   * @param {object} options
   * @param {number} options.resolution - 采样频率
   * @param {number} options.glowPower - 发光强度
   * @param {object} options.color - 颜色
   * @param {number} options.width - 宽度
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.getPathGraphics({
          resolution:1,
          glowPower:0.1,
          color:Cesium.Color.YELLOW,
          width:24
   * })
   * @returns {PathGraphics}   返回PathGraphics实例
   */
  getPathGraphics: function (options) {
    options = options || {}
    if (options) {
      return new Cesium.PathGraphics({
        resolution: options.resolution || 1,
        //设置航线样式，线条颜色，内发光粗细，航线宽度等
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: options.glowPower || 0.1,
          color: options.color || Cesium.Color.YELLOW
        }),
        width: options.width || 30
      })
    }
  },
  /**
   * 获取模型
   * @function
   * @param {object} options
   * @param {string} options.m_url - 模型url
   * @param {string} options.url - 模型url
   * @param {number} options.m_scale - 缩放比例
   * @param {number} options.scale - 缩放比例
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.getModelGraphics({
          url:"model/person.gltf",
          scale:2
   * })
   * @returns {ModelGraphics}   返回ModelGraphics实例
   */
  getModelGraphics: function (options) {
    options = options || {}
    if (options) {
      return new Cesium.ModelGraphics({
        uri: options.m_url || options.url,
        scale: options.m_scale || options.scale || 10,
        clampAnimations: true
      })
    }
  },
  /**
   * 获取椭圆
   * @function
   * @param {object} options
   * @param {number} options.e_semiMajorAxis - 长半轴
   * @param {number} options.e_semiMinorAxis - 短半轴
   * @param {object} options.e_metarial - 材质
   * @param {boolean} options.e_outline - 是否显示外边线
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.getEllipseGraphics({
          e_semiMajorAxis:1000080.0,
          e_semiMinorAxis:1000000.0,
          e_metarial:Cesium.Color.RED.withAlpha(0.5),
          e_outline:true
   * })
   * @returns {EllipseGraphics}   返回EllipseGraphics实例
   */
  getEllipseGraphics: function (options) {
    options = options || {}
    if (options) {
      return new Cesium.EllipseGraphics({
        semiMajorAxis: options.e_semiMajorAxis || 1000000.0,
        semiMinorAxis: options.e_semiMinorAxis || 1000000.0,
        metarial: options.e_metarial || Cesium.Color.RED.withAlpha(0.5),
        outline: this._objHasOwnProperty(options, 'e_outline', true)
      })
    }
  },
  /**
   * 获取球
   * @function
   * @param {object} options
   * @param {number} options.radii - 半径
   * @param {number} options.innerRadii - 内球半径
   * @param {number} options.maximumCone - 椭圆最大角度
   * @param {number} options.stackPartitions - 垂直分段数
   * @param {number} options.slicePartitions - 平行分段数
   * @param {number} options.outlineWidth -外边线宽度
   * @param {object} options.outlineColor - 外边线颜色
   * @param {boolean} options.outline - 是否显示外边线
   * @param {boolean} options.fill - 是否填充
   * @param {boolean} options.material - 材质
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.getEllipsoidGraphics({
        radii: 1000000.0, //单位 米
        innerRadii: 50000.0,
        maximumCone: Cesium.Math.PI_OVER_TWO,
        stackPartitions:   56,
        slicePartitions:   56,
        outlineWidth:   2.0,
        outlineColor:  Cesium.Color.YELLOW,
        outline:   true,
        fill:   true,
        material:  Cesium.Color.RED.withAlpha(0.1),
   * })
   * @returns {EllipsoidGraphics}  返回EllipsoidGraphics实例
   */
  getEllipsoidGraphics: function (options) {
    options = options || {}
    if (options) {
      var r = options.radii || 1000000.0 //默认100公里
      return new Cesium.EllipsoidGraphics({
        radii: new Cesium.Cartesian3(r, r, r), //单位 米
        innerRadii: this._objHasOwnProperty(
          options,
          'innerRadii',
          new Cesium.Cartesian3(r / 1.5, r / 1.5, r / 1.5)
        ),
        maximumCone: options.maximumCone || Cesium.Math.PI_OVER_TWO,
        stackPartitions: options.stackPartitions || 56,
        slicePartitions: options.slicePartitions || 56,
        outlineWidth: options.outlineWidth || 2.0,
        outlineColor: options.outlineColor || Cesium.Color.YELLOW,
        outline: this._objHasOwnProperty(options, 'outline', true),
        fill: this._objHasOwnProperty(options, 'fill', true),
        material: options.material || Cesium.Color.RED.withAlpha(0.1)
        //heightReference:Cesium.HeightReference.NONE,
      })
    }
  },
  /**
   * 获取盒子图形
   * @function
   * @param {object} options
   * @param {boolean} options.show - 是否显示
   * @param {object} options.dimensions - 盒子长宽高
   * @param {object} options.distanceDisplayCondition - 显示条件
   * @param {object} options.outlineColor - 外边线颜色
   * @param {boolean} options.outline - 是否显示外边线
   * @param {boolean} options.fill - 是否填充
   * @param {boolean} options.material - 材质
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.getBoxGraphics({
        show:true,
        dimensions:new Cesium.Cartesian3(400000.0, 300000.0, 500000.0),
        outlineColor:  Cesium.Color.YELLOW,
        outline:   true,
        fill:   true,
        material:Cesium.Color.RED.withAlpha(0.5),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(2000.0, 4000.0)
   * })
   * @returns {BoxGraphics} 返回BoxGraphics实例
   */
  getBoxGraphics: function (options) {
    options = options || {}
    if (options) {
      return new Cesium.BoxGraphics({
        show: this._objHasOwnProperty(options, 'show', true),
        fill: this._objHasOwnProperty(options, 'fill', true),
        dimensions: options.dimensions || new Cesium.Cartesian3(0, 0, 0),
        material: options.material,
        outline: this._objHasOwnProperty(options, 'outline', true),
        outlineColor: options.outlineColor || Cesium.Color.BLACK,
        distanceDisplayCondition: options.distanceDisplayCondition || undefined
      })
    }
  },
  /**
   * 获取面板图形
   * @function
   * @param {object} options
   * @param {object} options.plane - 面板垂直方向
   * @param {object} options.dimensions - 面板长宽高
   * @param {boolean} options.material - 材质
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.getPlaneGraphics({
   *    plane: new Cesium.Plane(Cesium.Cartesian3.UNIT_Y, 0.0),
        dimensions:new Cesium.Cartesian2(170.0, 130.0),
        material:Cesium.Color.BLUE
   * })
   * @returns {PlaneGraphics} 返回PlaneGraphics实例
   */
  getPlaneGraphics: function (options) {
    options = options || {}
    if (options) {
      return new Cesium.PlaneGraphics({
        plane: options.plane || new Cesium.Plane(Cesium.Cartesian3.UNIT_Y, 0.0),
        dimensions: options.dimensions || new Cesium.Cartesian2(170.0, 130.0),
        material: options.material || Cesium.Color.BLUE
      })
    }
  },
  /**
   * 获取锥体图形
   * @function
   * @param {object} options
   * @param {number} options.length - 长度
   * @param {number} options.topRadius - 顶部半径
   * @param {number} options.bottomRadius - 底部半径
   * @param {boolean} options.material - 材质
   * @param {number} options.slices - 垂直分段数量
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.getCylinderGraphics({
        length:   500 / 2,
        topRadius:   130,
        bottomRadius:   20,
        material: new Cesium.Color(0, 1, 1, 0.4),
        slices: 128,
   * })
   * @returns {CylinderGraphics} 返回CylinderGraphics实例
   */
  getCylinderGraphics: function (options) {
    options = options || {}
    if (options) {
      return new Cesium.CylinderGraphics({
        HeightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        length: options.length || 500 / 2,
        topRadius: options.topRadius || 0,
        bottomRadius: options.bottomRadius || 0,
        material: options.material || new Cesium.Color(0, 1, 1, 0.4),
        slices: options.slices || 128
      })
    }
  },
  /**
   * 创建点信息
   * @function
   * @param {object} options
   * @param {Array} options.positions - 坐标数组
   * @param {string} options.name - 图形名称
   * @param {string} options.oid - 原始id
   * @param {boolean} options.material - 材质
   * @param {boolean} options.point - 标识是point图形
   * @see {@link  module:Graphics#getPointGraphics|getPointGraphics}
   * @param {object} options.billboard - 绘制billboard图形的参数
   * @see {@link module:Graphics#getBillboardGraphics|getBillboardGraphics} 
   * @param {object} options.label - 绘制label图形的参数
   * @see {@link module:Graphics#getLabelGraphics|getLabelGraphics}
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.createPointsGraphics({
   *    name:'cylinderObj',
   *    oid:'cylinderID',
        positions: [Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 400.0)],
        billboard: {
          b_img: 'static/data/images/Textures/billboard2.png',
          b_width: 40,
          b_height: 25,
          b_scale: 1.5,
          b_scaleByDistance: new Cesium.NearFarScalar(1.5e2, 2.0, 1.5e7, 0.5),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        },
        label: {
          l_text: '中科较大',
          l_fillColor: Cesium.Color.YELLOW,
          l_outlineColor: Cesium.Color.KHAKI,
        }
   * })
   * @returns {Array} 返回实例数组
   */
  createPointsGraphics: function (options) {
    if (options && options.positions) {
      let points = []
      for (let i in options.positions) {
        let position = options.positions[i]
        let entity = this.createGraphics()
        entity.name = options.name || ''
        entity.oid = options.oid || 'point'
        entity.position = position
        if (options.point) entity.point = this.getPointGraphics()
        if (options.billboard)
          entity.billboard = this.getBillboardGraphics(options.billboard)
        if (options.label) entity.label = this.getLabelGraphics(options.label)
        points.push(this._graphicsLayer.entities.add(entity))
      }
      return points
    }
  },
  /**
   * 创建线
   * @function
   * @param {object} options
   * @param {Cartesian3} options.positions - 坐标数组
   * @param {string} options.name - 图形名称
   * @param {string} options.oid - 原始id
   * @param {object} options.material - 配置线段材质
   * @param {number} options.width - 线宽
   * @param {boolean} options.clampToGround - 是否贴地
   * @param {object} options.label - 绘制label图形的参数
   * @see {@link module:Graphics#getLineGraphics|getLineGraphics}
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.createLineGraphics({
   *    name:'pLine',
   *    oid:'pLineID',
        positions: Cesium.Cartesian3.fromDegreesArray([
          104.09816110606057,
          30.659821965447698,
          104.1120972824757,
          30.65330300319938,
          104.10758419863926,
          30.64592470850288,
          104.09351691196979,
          30.652434826507452,
          104.09816110606057,
          30.659821965447698
        ]),
        show: true,
        material:  Cesium.Color.YELLOW,
        width:1,
        clampToGround: false,
   * })
   * @returns {PolylineGraphics} 返回PolylineGraphics实例
   */
  createLineGraphics: function (options) {
    if (options && options.positions) {
      var entity = this.createGraphics()
      entity.name = options.name || ''
      entity.oid = options.oid || 'line'
      entity.position = options.positions
      entity.polyline = this.getLineGraphics(options)

      return this._graphicsLayer.entities.add(entity)
    }
  },
  /**
   * 创建面
   * @function
   * @param {object} options
   * @param {Cartesian3} options.positions - 坐标数组
   * @param {object} options.material - 配置线段材质
   * @param {boolean} options.clampToGround - 是否贴地
   * @param {boolean} options.clampToS3M - 是否贴s3m模型
   * @see {@link module:Graphics#getPolygonGraphics|getPolygonGraphics}
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.createPolygonGraphics({
   *      positions:Cesium.Cartesian3.fromDegreesArray([
          104.09816110606057,
          30.659821965447698,
          104.1120972824757,
          30.65330300319938,
          104.10758419863926,
          30.64592470850288,
          104.09351691196979,
          30.652434826507452,
          104.09816110606057,
          30.659821965447698
        ]),
   *      material:Cesium.Color.RED.withAlpha(0.2),
   *      clampToGround:false,
   *      clampToS3M:false
   * })
   * @returns {PolygonGraphics} 返回PolygonGraphics实例
   */
  createPolygonGraphics: function (options) {
    options = options || {}
    if (options) {
      var entity = this.createGraphics()
      entity.polygon = this.getPolygonGraphics(options)
      entity.clampToS3M = this._objHasOwnProperty(options, 'clampToS3M', false)

      return this._graphicsLayer.entities.add(entity)
    }
  },
  /**
   * 创建Box
   * @function
   * @param {object} options
   * @param {Cartesian3} options.position - 坐标数组
   * @param {boolean} options.show - 是否显示
   * @param {string} options.name - 名称
   * @param {object} options.dimensions - 盒子长宽高
   * @param {object} options.distanceDisplayCondition - 显示条件
   * @param {object} options.outlineColor - 外边线颜色
   * @param {boolean} options.outline - 是否显示外边线
   * @param {boolean} options.fill - 是否填充
   * @param {boolean} options.material - 材质
   * @see {@link module:Graphics#getBoxGraphics|getBoxGraphics}
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.createBoxGraphics({
   *     name: 'boxG',
   *     position:Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 200),
   *      material:Cesium.Color.RED.withAlpha(0.2),
   *      clampToGround:false,
   *      clampToS3M:false
   * })
   * @returns {BoxGraphics} 返回BoxGraphics实例
   */
  createBoxGraphics: function (options) {
    options = options || {}
    if (options) {
      var entity = this.createGraphics()

      entity.position = options.position
      entity.name = options.name || 'box_graphic'
      entity.box = this.getBoxGraphics(options.box)
      return this._graphicsLayer.entities.add(entity)
    }
  },
  /**
   * 创建模型
   * @function
   * @param {object} options
   * @param {Cartesian3} options.position - 坐标数组
   * @param {string} options.m_url - 模型url
   * @param {string} options.url - 模型url
   * @param {number} options.m_scale - 缩放比例
   * @param {number} options.scale - 缩放比例
   * @see {@link module:Graphics#getModelGraphics|getModelGraphics}
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.createModelGraphics({
   *     position:Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 200),
          url:"model/person.gltf",
          scale:2
   * })
   * @returns {ModelGraphics} 返回ModelGraphics实例
   */
  createModelGraphics: function (options) {
    if (options && options.position) {
      /** @inheritdoc */
      var entity = this.createGraphics()
      entity.model = this.getModelGraphics(options)
      entity.position = options.position
      return this._graphicsLayer.entities.add(entity)
    }
  },
  /**
   * 创建地面指示
   * @function
   * @param {object} options
   * @param {Cartesian3} options.positions - 坐标数组
   * @param {number} options.height - 高度
   * @param {number} options.width - 宽度
   * @param {object} options.material - 材质
   * @param {boolean} options.outline - 是否显示外边线
   * @param {number} options.extrudedHeight - 拉伸高度
   * @param {string} options.cornerType - 转角类型
   * @see {@link WarnLinkMaterialProperty|WarnLinkMaterialProperty}
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.craeteCorridorGraphics({
   *     positions: Cesium.Cartesian3.fromDegreesArray(
   *            110.16018735617934, 31.036076859828338, 
   *            110.17845812703679,31.033686527335444,
   *            110.19261040403379, 31.02892781958261, 
   *            110.20775152895165,31.02475678594998,
   *            110.2247484728178,31.019315371809977, 
   *            110.24033095328579,31.017866033294506),
        width: 1500.0,
        height: 0,
        extrudedHeight: 50，
        cornerType: Cesium.CornerType.MITERED,
        outline: false,
        material:Cesium.Color.BLUE.withAlpha(0.4)
   * })
   * @returns {corridor} 返回corridor实例
   */
  craeteCorridorGraphics: function (options) {
    if (options && options.positions) {
      let { positions, height, width, material, ...rest } = options
      /** @inheritdoc */
      var entity = this.createGraphics()
      height = height === undefined ? 6.0 : height
      width = width === undefined ? 15.0 : width
      entity.corridor = {
        positions: positions,
        height: height,
        width: width,
        ...rest,
        material:
          material ||
          new Cesium.Scene.WarnLinkMaterialProperty({
            freely: 'cross',
            color: Cesium.Color.YELLOW,
            duration: 1000,
            count: 1.0,
            direction: '+'
          })
      }

      return this._graphicsLayer.entities.add(entity)
    }
  },
  /**
   * 构建动态线
   * @function
   * @param {object} options
   * @param {Cartesian3} options.positions - 坐标数组
   * @param {object} options.material - 材质
   * @param {number} options.width - 宽度
   * @param {boolean} options.clampToGround - 是否贴地
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.craeteDynamicPolyLineGraphics({
   *     positions:Cesium.Cartesian3.fromDegreesArray([
          104.09816110606057,
          30.659821965447698,
          104.1120972824757,
          30.65330300319938,
          104.10758419863926,
          30.64592470850288,
          104.09351691196979,
          30.652434826507452,
          104.09816110606057,
          30.659821965447698
        ]),
          material: Cesium.Color.CHARTREUSE,
          width:5,
          clampToGround:false
   * })
   * @returns {polyline} 返回polyline实例
   */
  craeteDynamicPolyLineGraphics: function (options) {
    if (options && options.positions) {
      /** @inheritdoc */
      var entity = this.createGraphics()
      entity.polyline = {
        show: true,
        positions: [],
        material: options.material || Cesium.Color.CHARTREUSE,
        width: options.width || 5,
        clampToGround: this._objHasOwnProperty(options, 'clampToGround', false)
      }

      entity.polyline.positions = new Cesium.CallbackProperty(function () {
        return options.positions
      }, false)

      return this._graphicsLayer.entities.add(entity)
    }
  },
  /**
   * 构建动态椎体
   * @function
   * @param {object} options
   * @param {CylinderGraphics} options.cylinder - 椎体对象
   * @param {entity} options.entity - entity实体
   * @param {number} options.width - 宽度
   * @param {boolean} options.clampToGround - 是否贴地
   * @see {@link module:Graphics#getCylinderGraphics|getCylinderGraphics}
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.craeteDynamicCylinderGraphics({
   *      entity: new Cesium.Entity({positions:Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 200)}),
   *      cylinder:{
                  length:   500 / 2,
                  topRadius:   130,
                  bottomRadius:   20,
                  material: new Cesium.Color(0, 1, 1, 0.4),
                  slices: 128,
   *         }
   * })
   * @returns {cylinder} 返回cylinder实例
   */
  craeteDynamicCylinderGraphics: function (options) {
    var param = {}
    if (options && options.cylinder) {
      var entity = options.entity,
        cylinder = options.cylinder,
        $this = this
      param.cylinder = this.getCylinderGraphics(cylinder)
      param.position = new Cesium.CallbackProperty(function () {
        var positions = entity.position.getValue(
          $this._viewer.clock.currentTime
        )
        var cartographic = $this._viewer.scene.globe.ellipsoid.cartesianToCartographic(
          positions
        )
        var lat = Cesium.Math.toDegrees(cartographic.latitude),
          lng = Cesium.Math.toDegrees(cartographic.longitude)
        // hei = parseFloat(cartographic.height / 4)
        return Cesium.Cartesian3.fromDegrees(lng, lat, 0)
      }, false)

      param.cylinder.length = new Cesium.CallbackProperty(function () {
        var positions = entity.position.getValue(
          $this._viewer.clock.currentTime
        )
        var cartographic = $this._viewer.scene.globe.ellipsoid.cartesianToCartographic(
          positions
        )
        return cartographic.height * 2
      }, false)

      return param
    }
  },
  /**
   * 创建渐变锥体
   * @function
   * @param {object} options
   * @param {Cartesian3} options.position - 坐标数组
   * @param {string} options.color - 颜色
   * @param {number} options.duration - 持续时长
   * @param {number} options.length - 长度
   * @param {number} options.topRadius - 顶部半径
   * @param {number} options.bottomRadius - 底部半径
   * @param {number} options.slices - 垂直分段数量
   * @see {@link module:Graphics#getCylinderGraphics|getCylinderGraphics}
   * @see {@link CircleFadeMaterialProperty|CircleFadeMaterialProperty}
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.createFadeCylinderGraphics({
   *      position:Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 200),
          length:   500 / 2,
          topRadius:   130,
          bottomRadius:   20,
          color: new Cesium.Color(0, 1, 1, 0.4),
          slices: 128,
          duration:5
   * })
   * @returns {cylinder} 返回cylinder实例
   */
  createFadeCylinderGraphics: function (options) {
    options = options || {}
    if (options && options.position) {
      let entity = this.createGraphics()
      entity.position = options.position
      options.material = new Cesium.Scene.CircleFadeMaterialProperty({
        color: options.color || Cesium.Color.fromCssColorString('#02ff00'),
        duration: options.duration || 2000
      })
      entity.cylinder = this.getCylinderGraphics(options)

      return this._drawLayer.entities.add(entity)
    }
  },
  /**
   *  创建旋转圆柱
   * @function
   * @param {object} options
   * @param {Cartesian3} options.position - 坐标数组
   * @param {number} options.length - 长度
   * @param {number} options.topRadius - 顶部半径
   * @param {number} options.bottomRadius - 底部半径
   * @param {number} options.slices - 垂直分段数量
   * @param {string} options.img - 材质图片
   * @param {object} options.material - 材质(与图片二选一)
   * @see {@link module:Graphics#setGraphicsRotate|setGraphicsRotate}
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.craeteRotateCylinderGraphics({
   *      position:Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 200),
          length:   500,
          topRadius:  500,
          bottomRadius:   500,,
          material:  new Cesium.ImageMaterialProperty({
            image:"static/data/images/file/cc2.png",
            transparent: true,
            repeat: {x: 1,y: -1},
          }),
          slices: 128,
   * })
   * @returns {cylinder} 返回cylinder实例
   */
  craeteRotateCylinderGraphics: function (options) {
    if (options && options.position) {
      var cylinderEntity = this.createGraphics()
      cylinderEntity.cylinder = {
        HeightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        length: options.length || 500,
        topRadius: options.topRadius || 500,
        bottomRadius: options.bottomRadius || 500,
        material:
          options.material ||
          new Cesium.ImageMaterialProperty({
            image:
              options.img ||
              this.getDfSt(['graphic', 'craeteRotateCylinderGraphics']) ||
              'static/data/images/file/cc2.png',
            transparent: true,
            repeat: {
              x: 1,
              y: -1
            }
          }),
        slices: options.slices || 128
      }
      cylinderEntity.position = options.position

      this.setGraphicsRotate({
        entity: cylinderEntity,
        position: this.transformCartesianToWGS84(options.position),
        rotateAmount: 4
      })
      return this._graphicsLayer.entities.add(cylinderEntity)
    }
  },
  /**
   *  创建闪烁圆
   * @function
   * @param {object} options
   * @param {Cartesian3} options.position - 坐标数组
   * @param {number} options.alp - 频率
   * @param {boolean} options.flog - 显示雾气效果
   * @param {number} options.height - 高度
   * @param {number} options.semiMinorAxis - 短半轴
   * @param {number} options.semiMajorAxis - 长半轴
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.craeteDynamicBlinkCircleGraphics({
   *      position:Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 200),
          semiMinorAxis: 2000.0,
          semiMajorAxis:  2000.0,
          height:  10,
          alp:2,
          flog:true
   * })
   * @returns {ellipse} 返回ellipse实例
   */
  craeteDynamicBlinkCircleGraphics: function (options) {
    if (options && options.position) {
      var entity = this.createGraphics(),
        alp = options.alp || 1,
        flog = this._objHasOwnProperty(options, 'flog', true)
      entity.position = options.position
      entity.ellipse = {
        semiMinorAxis: options.semiMinorAxis || 2000.0,
        semiMajorAxis: options.semiMajorAxis || 2000.0,
        height: options.height || 10,
        material: new Cesium.ColorMaterialProperty(
          new Cesium.CallbackProperty(function () {
            if (flog) {
              alp = alp - 0.05
              if (alp <= 0) {
                flog = false // hide
              }
            } else {
              alp = alp + 0.05
              if (alp >= 1) {
                flog = true // show
              }
            }
            return Cesium.Color.RED.withAlpha(alp)
          }, false)
        )
      }
      return this._graphicsLayer.entities.add(entity)
    }
  },
  /**
   *  创建动态旋转圆
   * @function
   * @param {object} options
   * @param {object} options.center - 中心坐标数组
   * @param {number} options.radius - 半径
   * @param {number} options.rotateAmount - 旋转频率
   * @param {number} options.height - 高度
   * @param {number} options.scale - 外圆缩放比例
   * @param {number} options.scale2 - 内圆缩放比例
   * @param {string} options.imge - 材质图片
   * @param {object} options.material - 材质(与图片二选一)
   * @see {@link module:Base#transformWGS84ToCartesian|transformWGS84ToCartesian}
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.craeteDynamicCricleGraphics({
   *      center:{ lng: 104.081701757991, lat: 30.627042558105988, alt: 1 },,
   *      imge: "static/data/images/Textures/circle_bg.png",
          radius : 800,
          rotateAmount: 0.05,
          height : 1,
          scale:1500,
          scale2:800
   * })
   * @returns {ellipse} 返回ellipse实例
   */
  craeteDynamicCricleGraphics: function (options) {
    if (options && options.center) {
      var entity = this.createGraphics(),
        $this = this,
        _center = options.center,
        _radius = options.radius || 800,
        _rotateAmount = options.rotateAmount || 0.05,
        _stRotation = 0,
        _height = options.height || 1,
        heading = 0,
        pitch = 0,
        roll = 0,
        _scale = options.scale || null,
        _scale2 = options.scale2 || null,
        _material =
          options.material ||
          new Cesium.ImageMaterialProperty({
            image:
              options.imge ||
              this.getDfSt(['graphic', 'craeteDynamicCricleGraphics']) ||
              'static/data/images/Textures/circle_bg.png',
            transparent: true
          })

      entity.position = new Cesium.CallbackProperty(function () {
        return $this.transformWGS84ToCartesian(_center)
      }, false)

      entity.orientation = new Cesium.CallbackProperty(function () {
        return Cesium.Transforms.headingPitchRollQuaternion(
          $this.transformWGS84ToCartesian(_center),
          new Cesium.HeadingPitchRoll(
            Cesium.Math.toRadians(heading),
            Cesium.Math.toRadians(pitch),
            Cesium.Math.toRadians(roll)
          )
        )
      }, false)
      let bg_scale = _radius,
        flag = false
      var updateScalerAxis = () => {
        if (_radius >= _scale || _radius <= bg_scale) {
          flag = !flag
        }
        flag ? (_radius += 2) : (_radius -= 2)
      }
      var updateScalerAxis2 = () => {
        _scale2 >= _radius ? (_radius += 2) : (_radius = bg_scale)
      }
      entity.ellipse = {
        material: _material,
        height: _height,
        semiMajorAxis: new Cesium.CallbackProperty(function () {
          return _radius
        }, false),
        semiMinorAxis: new Cesium.CallbackProperty(function () {
          return _radius
        }, false),
        stRotation: new Cesium.CallbackProperty(function () {
          if (_rotateAmount > 0) {
            _stRotation += _rotateAmount
            if (_stRotation >= 360) {
              _stRotation = 0
            }
          }
          if (_scale) updateScalerAxis()
          if (_scale2) updateScalerAxis2()
          return _stRotation
        }, false)
      }
      return this._graphicsLayer.entities.add(entity)
    }
  },
  /**
   *  动态渐变墙
   * @function
   * @param {object} options
   * @param {Cartesian3} options.positions - 坐标数组
   * @param {number} options.alp - 透明比例 0~1
   * @param {number} options.num - 渐变步长
   * @param {number} options.speed - 速度 0~1
   * @param {object} options.color - 颜色
   * @param {string} options.img - 材质图片
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.craeteDynamicShadeWallGraphics({
   *     positions: Cesium.Cartesian3.fromDegreesArray(
   *            110.16018735617934, 31.036076859828338, 
   *            110.17845812703679,31.033686527335444,
   *            110.19261040403379, 31.02892781958261, 
   *            110.20775152895165,31.02475678594998,
   *            110.2247484728178,31.019315371809977, 
   *            110.24033095328579,31.017866033294506),
   *      img: "static/data/images/Textures/circle_bg.png",
          alp:1,
          num :20,
          color: Cesium.Color.RED,
          speed:0.003;
   * })
   * @returns {wall} 返回wall实例
   */
  craeteDynamicShadeWallGraphics: function (options) {
    if (options && options.positions) {
      var alp = options.alp || 1,
        num = options.num || 20,
        color = options.color || Cesium.Color.RED,
        speed = options.speed || 0.003

      var wallEntity = this.createGraphics()
      wallEntity.wall = {
        positions: options.positions,
        material: new Cesium.ImageMaterialProperty({
          image:
            options.img ||
            this.getDfSt(['graphic', 'craeteDynamicShadeWallGraphics']) ||
            'static/data/images/Textures/fence.png',
          transparent: true,
          color: new Cesium.CallbackProperty(function () {
            if (num % 2 === 0) {
              alp -= speed
            } else {
              alp += speed
            }

            if (alp <= 0.1) {
              num++
            } else if (alp >= 1) {
              num++
            }
            return color.withAlpha(alp)
          }, false)
        })
      }
      return this._graphicsLayer.entities.add(wallEntity)
    }
  },
  /**
   *  自定义标牌气泡框
   * @function
   * @param {object} options
   * @param {Cartesian3} options.position - 坐标数组
   * @param {number} options.height - 高度
   * @param {number} options.width - 宽度
   * @param {string} options.text - 文字
   * @param {string} options.image - 气泡窗图片
   * @param {Cartesian2} options.b_pixelOffset - 偏移
    * @param {number} options.b_scale - 缩放比例
    * @param {function} options.callback - 回调返回entity
   * @see {@link module:Graphics#getBillboardGraphics|getBillboardGraphics} 
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.createCustomDefBillboardGraphics({
   *      position: Cesium.Cartesian3.fromDegrees(110.16018735617934, 31.036076859828338),
   *      image: "static/data/images/Textures/circle_bg.png",
          width : 150;
          height:80;
          text: "建工集团",
          b_pixelOffset:new Cesium.Cartesian2(80, -35),
          b_scale : 1.5,
   * })
   */
  createCustomDefBillboardGraphics: function (options) {
    if (options && options.position) {
      var $this = this,
        img = document.createElement('img')
      img.src =
        options.image ||
        this.getDfSt(['graphic', 'createCustomDefBillboardGraphics']) ||
        'static/data/images/file/div1.png'

      // 绘制canvas
      const drawCompanyTip = function (options) {
        if (!options.image) return
        var canvas = document.createElement('canvas')
        canvas.width = options.width || 150
        canvas.height = options.height || 80
        var context = canvas.getContext('2d')
        context.drawImage(options.image, 0, 0)
        var dom = options.text
        context.font = '15px bold 宋体'
        context.fillStyle = '#f4fff0'
        context.fillText(dom, 55, 36)
        return canvas
      }

      img.onload = function () {
        options.image = img
        var entity = $this._graphicsLayer.entities.add({
          position: options.position,
          billboard: {
            image: drawCompanyTip(options),
            scaleByDistance: new Cesium.NearFarScalar(1.5e2, 0.7, 1.5e7, 0.5),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset:
              options.b_pixelOffset || new Cesium.Cartesian2(80, -35),
            width: 140,
            height: 100,
            scale: options.b_scale || 1.5,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            imageSubRegion: {
              x: 0,
              y: 0,
              width: 200,
              height: 150
            }
          }
        })
        if (typeof options.callback === 'function') {
          options.callback(entity)
        }
      }
    }
  },
  /**
   * 旋转面
   * @function
   * @param {object} options
   * @param {Cartesian3} options.positions - 坐标数组
   * @param {Cartesian2} options.dimensions - 长宽高
   * @param {string} options.image - 图片
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.craeteRotatePlaneGraphics({
   *      positions: Cesium.Cartesian3.fromDegreesArray([
          104.09816110606057,
          30.659821965447698,
          104.1120972824757,
          30.65330300319938,
          104.10758419863926,
          30.64592470850288),
   *      image: "static/data/images/Textures/circle_bg.png",
          dimensions:new Cesium.Cartesian2(200.0, 150.0),
   * })
   * @returns {plane} 返回plane实例
   */
  craeteRotatePlaneGraphics: function (options) {
    if (options && options.center && options.positions) {
      var entity = this.createGraphics(),
        index = 0,
        positions = options.positions,
        _position = positions[0]
      entity.position = new Cesium.CallbackProperty(function () {
        if (index == 0) {
          ;(_position = positions[0]), (index += 1)
        } else if (index < positions.length - 1) {
          ;(_position = positions[index]), (index += 1)
        } else if (index == positions.length - 1) {
          ;(_position = positions[index]), (index = 0)
        }
        return _position
      }, false)
      entity.plane = {
        // plane: new Cesium.CallbackProperty(function () {
        //     var normaB = Cesium.Cartesian3.normalize(Cesium.Cartesian3.subtract(_center, _position, new Cesium.Cartesian3()), new Cesium.Cartesian3())
        //     _plane = new Cesium.Plane(Cesium.Cartesian3.normalize(Cesium.Cartesian3.add(normaB, _center, new Cesium.Cartesian3()), new Cesium.Cartesian3()), 0.0)

        //     _plane = Cesium.Plane.fromPointNormal(coefficients, result)
        //     return _plane;
        // }, false),
        plane: new Cesium.Plane(Cesium.Cartesian3.UNIT_Y, 0.0),
        dimensions: options.dimensions || new Cesium.Cartesian2(200.0, 150.0),
        material: new Cesium.ImageMaterialProperty({
          image: options.image
        })
      }

      return this._graphicsLayer.entities.add(entity)
    }
  },
  /**
   * 视频投放
   * @function
   * @param {object} options
   * @param {Cartesian3} options.position - 坐标数组
   * @param {Cartesian2} options.dimensions - 长宽高
   * @param {HTMLElement} options.videoElement - video绑定dom
     * @param {Cartesian3} options.normal - 垂直方向
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.createVideoPlaneGraphics({
        position: Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 200),
        videoElement: videoDom,
        dimensions: new Cesium.Cartesian2(400.0, 200.0),
   * })
   * @returns {plane} 返回plane实例
   */
  createVideoPlaneGraphics: function (options) {
    if (options && options.position) {
      var entity = this.createGraphics()
      entity.position = options.position
      entity.plane = {
        plane: new Cesium.Plane(
          options.normal || Cesium.Cartesian3.UNIT_Y,
          0.0
        ),
        dimensions: options.dimensions || new Cesium.Cartesian2(200.0, 150.0),
        material: new Cesium.ImageMaterialProperty({
          image: options.videoElement
        })
      }
      return this._graphicsLayer.entities.add(entity)
    }
  },
  /**
   * gif 图片投影
   * @function
   * @param {object} options
   * @param {Cartesian3} options.position - 坐标数组
   * @param {Cartesian2} options.dimensions - 长宽高
   * @param {string} options.url - 图片
   * @param {Cartesian3} options.normal - 垂直方向
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.createGifBillboardGraphics({
        position: Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 200),
        url: 'static/data/file/scene1.gif'
   * })
   * @returns {billboard} 返回entity实例
   */
  createGifBillboardGraphics: function (options) {
    if (SuperGif && options && options.position) {
      var gif = [],
        url = options.url,
        i = 0,
        speed = 6

      // 遍历gif的每一帧
      const parseGifImages = function (url, imageArr) {
        var img = document.createElement('img')
        img.src = url
        img.setAttribute('rel:animated_src', url) // gif库需要img标签配置下面两个属性
        img.setAttribute('rel:auto_play', '0')
        document.body.appendChild(img)
        // 新建gif实例
        var rub = new SuperGif({
          gif: img
        })
        return new Promise((resolve) => {
          rub.load(() => {
            for (let i = 1; i <= rub.get_length(); i++) {
              rub.move_to(i) // 遍历gif实例的每一帧
              imageArr.push(rub.get_canvas().toDataURL())
            }
            resolve(imageArr)
            // document.body.removeChild(img)
          })
        })
      }

      parseGifImages(url, gif)
      return this._graphicsLayer.entities.add({
        position: options.position,
        billboard: {
          verticalOrigin: Cesium.VerticalOrigin.BASELINE,
          image: new Cesium.CallbackProperty(function () {
            if (gif.length) {
              // 解析每一帧
              if (i < speed * (gif.length - 1)) {
                i++
              } else {
                i = 0
              }
              return gif[Math.floor(i / speed)]
            } else {
              return url //因为loadGif是异步的，在解析完成之前先使用原图
            }
          }, false),
          scale: 0.2
        }
      })
    }
  },
  /**
   * 设置图形旋转
   * @function
   * @param {object} options
   * @param {object} options.position - wgs84坐标
   * @param {Entity} options.entity - 实体对象
   * @param {number} options.rotateAmount - 旋转比例
   * @see {@link module:Base#transformWGS84ToCartesian|transformWGS84ToCartesian}
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * });
   * const billboardGraphics =  graphicObj.graphics.getBillboardGraphics({
       b_img: "images/bill.png",
        b_width: 35,
        b_height : 35,
        b_clampToGround : true,
        b_scale : 1,
        b_pixelOffset :new Cesium.Cartesian2(0, -20),
        b_scaleByDistance : new Cesium.NearFarScalar(1.5e2, 0.7, 1.5e7, 0.5),
   * });
   * graphicObj.graphics.setGraphicsRotate({
        entity:billboardGraphics ,
        position: { lng: 104.081701757991, lat: 30.627042558105988, alt: 1 },
        rotateAmount: 4,
   * })
   */
  setGraphicsRotate: function (options) {
    if (options && options.entity && options.rotateAmount) {
      var entity = options.entity,
        rotateAmount = options.rotateAmount,
        _position = options.position,
        $this = this
      _position.heading = 0
      _position.pitch = 0
      _position.roll = 0
      entity.position = new Cesium.CallbackProperty(function () {
        return $this.transformWGS84ToCartesian(_position)
      }, false)

      entity.orientation = new Cesium.CallbackProperty(function () {
        if (rotateAmount > 0) {
          _position.heading += rotateAmount
          if (_position.heading === 360) {
            _position.heading = 0
          }
        }
        return Cesium.Transforms.headingPitchRollQuaternion(
          $this.transformWGS84ToCartesian(_position),
          new Cesium.HeadingPitchRoll(
            Cesium.Math.toRadians(_position.heading),
            Cesium.Math.toRadians(_position.pitch),
            Cesium.Math.toRadians(_position.roll)
          )
        )
      }, false)
    }
  },
  /**
   * 图形浮动
   * @function
   * @param {object} options
   * @param {Cartesian3} options.position - 坐标数组
   * @param {Entity} options.entity - 实体对象
   * @param {number} options.maxHeiht - 最大高度
   * @param {number} options.minHeiht - 最小高度
   * @param {Cartesian} options.cartesians - 原始位置
   * @param {Cartesian} options.speed - 速度
   * @see {@link module:Base#transformWGS84ToCartesian|transformWGS84ToCartesian}
   * @see {@link module:Base#transformCartesianToWGS84|transformCartesianToWGS84}
   * @see {@link module:Base#transformCartesianArrayToWGS84Array|transformCartesianArrayToWGS84Array}
   * @see {@link module:Base#transformWGS84ArrayToCartesianArray|transformWGS84ArrayToCartesianArray}
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * const billboardGraphics =  graphicObj.graphics.getBillboardGraphics({
       b_img: "images/bill.png",
        b_width: 35,
        b_height : 35,
        b_clampToGround : true,
        b_scale : 1,
        b_pixelOffset :new Cesium.Cartesian2(0, -20),
        b_scaleByDistance : new Cesium.NearFarScalar(1.5e2, 0.7, 1.5e7, 0.5),
   * });
   * graphicObj.graphics.setGraphicsRotate({
         entity: billboardGraphics,
         cartesians: Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 200),
         minHeiht : 5,
         maxHeiht:100,
         speed:0.06,
   * })
   */
  setGraphicsFloat: function (options) {
    if (options && options.entity && options.maxHeiht) {
      try {
        var entity = options.entity,
          minHeiht = options.minHeiht || 5,
          maxHeiht = options.maxHeiht || 100,
          cartesians = options.cartesians,
          speed = options.speed || 0.06,
          $this = this,
          bg_minHeiht = minHeiht,
          flag = false
        if (cartesians.length) {
          entity.positions = new Cesium.CallbackProperty(function () {
            var positions = $this.transformCartesianArrayToWGS84Array(
              cartesians
            )
            for (var i in positions) {
              var position = positions[i]
              if (minHeiht >= maxHeiht || minHeiht <= bg_minHeiht) {
                flag = !flag
              }
              flag ? (minHeiht += speed) : (minHeiht -= speed)
              position.alt = minHeiht
            }
            return $this.transformWGS84ArrayToCartesianArray(positions)
          }, false)
        } else {
          entity.position = new Cesium.CallbackProperty(function () {
            var position = $this.transformCartesianToWGS84(cartesians)
            if (minHeiht >= maxHeiht || minHeiht <= bg_minHeiht) {
              flag = !flag
            }
            flag ? (minHeiht += speed) : (minHeiht -= speed)
            position.alt = minHeiht
            return $this.transformWGS84ToCartesian(position)
          }, false)
        }
      } catch (error) {
        console.log(error)
      }
    }
  },
  /**
   * canvas 贴图
   * @function
   * @param {object} options
   * @param {Cartesian3} options.positions - 坐标数组
   * @param {string} options.img - 图片
   * @param {number} options.cwidth - 宽度
   * @param {number} options.cheight - 高度
   * @param {function} options.callback - 回调
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.createCanvasGraphics({
         positions:Cesium.Cartesian3.fromDegreesArray(
   *            110.16018735617934, 31.036076859828338, 
   *            110.17845812703679,31.033686527335444,
   *            110.19261040403379, 31.02892781958261, 
   *            110.20775152895165,31.02475678594998,
   *            110.2247484728178,31.019315371809977, 
   *            110.24033095328579,31.017866033294506)
           img : "images/ysCesium/logo.png"
         cwidth : 500,
         cheight:200,
         speed:0.06,
         callback:res=>{console.log(res)}
   * })
   *@returns {rectangle} 返回rectangle实例
   */
  createCanvasGraphics: function (options) {
    if (options && options.positions) {
      const drawCanvasImage = function () {
        var i = 0
        var canvas = document.createElement('canvas')
        var ctx = canvas.getContext('2d')
        var img = new Image()
        img.src = options.img || '../../images/ysCesium/logo.png'
        ctx.clearRect(0, 0, options.cwidth, options.cheight)
        if (i <= options.cwidth) {
          ctx.drawImage(img, i, 0)
        } else {
          i = 0
          i += 3
          return canvas
        }
      }

      this._graphicsLayer.entities.add({
        rectangle: {
          coordinates: options.positions,
          material: new Cesium.ImageMaterialProperty({
            image: new Cesium.CallbackProperty(drawCanvasImage, false),
            transparent: true
          })
        }
      })

      if (typeof options.callback === 'function') {
        options.callback()
      }
    }
  },
  /**
   * 创建扇形
   * @function
   * @param {object} options
   * @param {Object} options.viewer - cesium 视图对象
   * @param {Material} options.custMaterial - 自定义材质
   * @param {Number} options.speed - 运动速度
   * @param {Number} options.longitude - 纬度
   * @param {Number} options.latitude - 经度
   * @param {Number} options.alt - 高度(z轴)
   * @param {String} options.direction - 扫描方向（"-"顺时针，"+"逆时针）
   * @example
   * import { Graphics } from 'cesium_dev_kit'
   * const graphicObj = new Graphics({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * graphicObj.graphics.createFanShape({
        viewer: this.viewer,
        longitude: 104.06417395476578,
        latitude: 30.636185094244944,
        alt: 700,
        speed: 2.0,
        direction: '+',
        custMaterial: Cesium.Color.AQUAMARINE.withAlpha(0.5)
   * })
   * @returns {wall} 返回wall实例
   * 
   */
  createFanShape: function ({
    viewer,
    longitude,
    latitude,
    alt,
    custMaterial,
    speed = 0,
    direction = '+'
  }) {
    if (viewer) {
      var entity = this.createGraphics()
      var heading = 0
      var positionArr = this._calcPoints(longitude, latitude, alt, heading)
      entity.wall = {
        positions: new Cesium.CallbackProperty(() => {
          return Cesium.Cartesian3.fromDegreesArrayHeights(positionArr)
        }, false),
        material: custMaterial || Cesium.Color.AQUAMARINE.withAlpha(0.5)
      }

      // 执行动画效果
      viewer.clock.onTick.addEventListener(() => {
        if (speed > 0) {
          heading += speed
          positionArr = this._calcPoints(
            longitude,
            latitude,
            alt,
            direction + heading
          )
        }
      })

      return this._graphicsLayer.entities.add(entity)
    }
  },
  /**
   * 根据两个点 开始角度、夹角度 求取立面的扇形
   * @private
   * @param {Array} x1 第一个点x轴
   * @param {Array} y1 第一个点y轴
   * @param {Array} x2 第二个点x轴
   * @param {Array} y2 第二个点y轴
   * @param {number} fx 扇形起始角度
   * @param {number} angle 扇形角度
   * @returns {object} entity
   */
  _computeCirclularFlight(x1, y1, x2, y2, fx, angle) {
    let positionArr = []
    positionArr.push(x1)
    positionArr.push(y1)
    positionArr.push(0)

    var radius = Cesium.Cartesian3.distance(
      Cesium.Cartesian3.fromDegrees(x1, y1),
      Cesium.Cartesian3.fromDegrees(x2, y2)
    )

    for (let i = fx; i <= fx + angle; i++) {
      let h = radius * Math.sin((i * Math.PI) / 180.0)
      let r = Math.cos((i * Math.PI) / 180.0)

      let x = (x2 - x1) * r + x1
      let y = (y2 - y1) * r + y1

      positionArr.push(x)
      positionArr.push(y)
      positionArr.push(h)
    }

    return positionArr
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
   * 根据第一个点 偏移距离 角度 求取第二个点的坐标
   * @private
   * @param {Array} x1  x轴
   * @param {Array} y1  y轴
   * @param {number} radius 弧度
   * @param {number} heading 朝向
   * @returns {object} entity
   */
  _calcPoints(x1, y1, radius, heading) {
    var m = Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartesian3.fromDegrees(x1, y1)
    )

    var rx = radius * Math.cos((heading * Math.PI) / 180.0)
    var ry = radius * Math.sin((heading * Math.PI) / 180.0)

    var translation = Cesium.Cartesian3.fromElements(rx, ry, 0)

    var d = Cesium.Matrix4.multiplyByPoint(
      m,
      translation,
      new Cesium.Cartesian3()
    )

    var c = Cesium.Cartographic.fromCartesian(d)

    var x2 = Cesium.Math.toDegrees(c.longitude)
    var y2 = Cesium.Math.toDegrees(c.latitude)

    return this._computeCirclularFlight(x1, y1, x2, y2, 0, 90)
  }
}
export { Graphics }
