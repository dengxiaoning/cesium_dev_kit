import { RectangularSensor } from './shaders/RectangularSensor'
import { RectangularSensorFS } from './shaders/RectangularSensorFS'
import { RectangularSensorScanPlaneFS } from './shaders/RectangularSensorScanPlaneFS'
import { RectangularSensorVS } from './shaders/RectangularSensorVS'
let Cesium = null

function initRectangular(cesiumObj) {
  Cesium = cesiumObj
  try {
    var BoundingSphere = Cesium.BoundingSphere
    var Cartesian3 = Cesium.Cartesian3
    var Color = Cesium.Color
    var combine = Cesium.combine
    var ComponentDatatype = Cesium.ComponentDatatype
    var defaultValue = Cesium.defaultValue
    var defined = Cesium.defined
    var DeveloperError = Cesium.DeveloperError
    var Matrix4 = Cesium.Matrix4
    var PrimitiveType = Cesium.PrimitiveType
    var Buffer = Cesium.Buffer
    var BufferUsage = Cesium.BufferUsage
    var DrawCommand = Cesium.DrawCommand
    var Pass = Cesium.Pass
    var RenderState = Cesium.RenderState
    var ShaderProgram = Cesium.ShaderProgram
    var ShaderSource = Cesium.ShaderSource
    var VertexArray = Cesium.VertexArray
    var BlendingState = Cesium.BlendingState
    var CullFace = Cesium.CullFace
    var Material = Cesium.Material
    var SceneMode = Cesium.SceneMode
    var VertexFormat = Cesium.VertexFormat
    var CesiumMath = Cesium.Math
    var Matrix3 = Cesium.Matrix3
    var Matrix4 = Cesium.Matrix4
    var JulianDate = Cesium.JulianDate
    var Event = Cesium.Event
    var sin = Math.sin
    var cos = Math.cos
    var tan = Math.tan
    var atan = Math.atan
    var asin = Math.asin

    var attributeLocations = {
      position: 0,
      normal: 1
    }

    const RectangularSensorPrimitive = function (options) {
      var self = this

      options = defaultValue(options, defaultValue.EMPTY_OBJECT)

      /**
       * 是否显示
       */
      this.show = defaultValue(options.show, true)

      /**
       * 切分程度
       */
      this.slice = defaultValue(options.slice, 32)

      /**
       * 传感器的模型矩阵
       */
      this.modelMatrix = Matrix4.clone(options.modelMatrix, new Matrix4())
      this._modelMatrix = new Matrix4()
      this._computedModelMatrix = new Matrix4()
      this._computedScanPlaneModelMatrix = new Matrix4()

      /**
       * 传感器的半径
       */
      this.radius = defaultValue(options.radius, Number.POSITIVE_INFINITY)
      this._radius = undefined

      /**
       * 传感器水平半角
       */
      this.xHalfAngle = defaultValue(options.xHalfAngle, 0)
      this._xHalfAngle = undefined

      /**
       * 传感器垂直半角
       */
      this.yHalfAngle = defaultValue(options.yHalfAngle, 0)
      this._yHalfAngle = undefined

      /**
       * 线的颜色
       */
      this.lineColor = defaultValue(options.lineColor, Color.WHITE)

      /**
       * 是否显示扇面的线
       */
      this.showSectorLines = defaultValue(options.showSectorLines, true)

      /**
       * 是否显示扇面和圆顶面连接的线
       */
      this.showSectorSegmentLines = defaultValue(
        options.showSectorSegmentLines,
        true
      )

      /**
       * 是否显示侧面
       */
      this.showLateralSurfaces = defaultValue(options.showLateralSurfaces, true)

      /**
       * 目前用的统一材质
       * @type {Material}
       */
      this.material = defined(options.material)
        ? options.material
        : Material.fromType(Material.ColorType)
      this._material = undefined
      this._translucent = undefined

      /**
       * 侧面材质
       * @type {Material}
       */
      this.lateralSurfaceMaterial = defined(options.lateralSurfaceMaterial)
        ? options.lateralSurfaceMaterial
        : Material.fromType(Material.ColorType)
      this._lateralSurfaceMaterial = undefined
      this._lateralSurfaceTranslucent = undefined

      /**
       * 是否显示圆顶表面
       */
      this.showDomeSurfaces = defaultValue(options.showDomeSurfaces, true)

      /**
       * 圆顶表面材质
       * @type {Material}
       */
      this.domeSurfaceMaterial = defined(options.domeSurfaceMaterial)
        ? options.domeSurfaceMaterial
        : Material.fromType(Material.ColorType)
      this._domeSurfaceMaterial = undefined

      /**
       * 是否显示圆顶面线
       */
      this.showDomeLines = defaultValue(options.showDomeLines, true)

      /**
       * 是否显示与地球相交的线
       */
      this.showIntersection = defaultValue(options.showIntersection, true)

      /**
       * 与地球相交的线的颜色
       */
      this.intersectionColor = defaultValue(
        options.intersectionColor,
        Color.WHITE
      )

      /**
       * 与地球相交的线的宽度（像素）
       */
      this.intersectionWidth = defaultValue(options.intersectionWidth, 5.0)

      /**
       * 是否穿过地球
       */
      this.showThroughEllipsoid = defaultValue(
        options.showThroughEllipsoid,
        false
      )
      this._showThroughEllipsoid = undefined

      /**
       * 是否显示扫描面
       */
      this.showScanPlane = defaultValue(options.showScanPlane, true)

      /**
       * 扫描面颜色
       */
      this.scanPlaneColor = defaultValue(options.scanPlaneColor, Color.WHITE)

      /**
       * 扫描面模式 垂直vertical/水平horizontal
       */
      this.scanPlaneMode = defaultValue(options.scanPlaneMode, 'horizontal')

      /**
       * 扫描速率
       */
      this.scanPlaneRate = defaultValue(options.scanPlaneRate, 10)

      this._scanePlaneXHalfAngle = 0
      this._scanePlaneYHalfAngle = 0

      //时间计算的起点
      this._time = JulianDate.now()

      this._boundingSphere = new BoundingSphere()
      this._boundingSphereWC = new BoundingSphere()

      //扇面 sector
      this._sectorFrontCommand = new DrawCommand({
        owner: this,
        primitiveType: PrimitiveType.TRIANGLES,
        boundingVolume: this._boundingSphereWC
      })
      this._sectorBackCommand = new DrawCommand({
        owner: this,
        primitiveType: PrimitiveType.TRIANGLES,
        boundingVolume: this._boundingSphereWC
      })
      this._sectorVA = undefined

      //扇面边线 sectorLine
      this._sectorLineCommand = new DrawCommand({
        owner: this,
        primitiveType: PrimitiveType.LINES,
        boundingVolume: this._boundingSphereWC
      })
      this._sectorLineVA = undefined

      //扇面分割线 sectorSegmentLine
      this._sectorSegmentLineCommand = new DrawCommand({
        owner: this,
        primitiveType: PrimitiveType.LINES,
        boundingVolume: this._boundingSphereWC
      })
      this._sectorSegmentLineVA = undefined

      //弧面 dome
      this._domeFrontCommand = new DrawCommand({
        owner: this,
        primitiveType: PrimitiveType.TRIANGLES,
        boundingVolume: this._boundingSphereWC
      })
      this._domeBackCommand = new DrawCommand({
        owner: this,
        primitiveType: PrimitiveType.TRIANGLES,
        boundingVolume: this._boundingSphereWC
      })
      this._domeVA = undefined

      //弧面线 domeLine
      this._domeLineCommand = new DrawCommand({
        owner: this,
        primitiveType: PrimitiveType.LINES,
        boundingVolume: this._boundingSphereWC
      })
      this._domeLineVA = undefined

      //扫描面 scanPlane/scanRadial
      this._scanPlaneFrontCommand = new DrawCommand({
        owner: this,
        primitiveType: PrimitiveType.TRIANGLES,
        boundingVolume: this._boundingSphereWC
      })
      this._scanPlaneBackCommand = new DrawCommand({
        owner: this,
        primitiveType: PrimitiveType.TRIANGLES,
        boundingVolume: this._boundingSphereWC
      })

      this._scanRadialCommand = undefined

      this._colorCommands = []

      this._frontFaceRS = undefined
      this._backFaceRS = undefined
      this._sp = undefined

      this._uniforms = {
        u_type: function () {
          return 0 //面
        },
        u_xHalfAngle: function () {
          return self.xHalfAngle
        },
        u_yHalfAngle: function () {
          return self.yHalfAngle
        },
        u_radius: function () {
          return self.radius
        },
        u_showThroughEllipsoid: function () {
          return self.showThroughEllipsoid
        },
        u_showIntersection: function () {
          return self.showIntersection
        },
        u_intersectionColor: function () {
          return self.intersectionColor
        },
        u_intersectionWidth: function () {
          return self.intersectionWidth
        },
        u_normalDirection: function () {
          return 1.0
        },
        u_lineColor: function () {
          return self.lineColor
        }
      }

      this._scanUniforms = {
        u_xHalfAngle: function () {
          return self._scanePlaneXHalfAngle
        },
        u_yHalfAngle: function () {
          return self._scanePlaneYHalfAngle
        },
        u_radius: function () {
          return self.radius
        },
        u_color: function () {
          return self.scanPlaneColor
        },
        u_showThroughEllipsoid: function () {
          return self.showThroughEllipsoid
        },
        u_showIntersection: function () {
          return self.showIntersection
        },
        u_intersectionColor: function () {
          return self.intersectionColor
        },
        u_intersectionWidth: function () {
          return self.intersectionWidth
        },
        u_normalDirection: function () {
          return 1.0
        },
        u_lineColor: function () {
          return self.lineColor
        }
      }
    }

    RectangularSensorPrimitive.prototype.update = function (frameState) {
      var mode = frameState.mode
      if (!this.show || mode !== SceneMode.SCENE3D) {
        return
      }
      var createVS = false
      var createRS = false
      var createSP = false

      var xHalfAngle = this.xHalfAngle
      var yHalfAngle = this.yHalfAngle

      if (xHalfAngle < 0.0 || yHalfAngle < 0.0) {
        throw new DeveloperError(
          'halfAngle must be greater than or equal to zero.'
        )
      }
      if (xHalfAngle == 0.0 || yHalfAngle == 0.0) {
        return
      }
      if (this._xHalfAngle !== xHalfAngle || this._yHalfAngle !== yHalfAngle) {
        this._xHalfAngle = xHalfAngle
        this._yHalfAngle = yHalfAngle
        createVS = true
      }

      var radius = this.radius
      if (radius < 0.0) {
        throw new DeveloperError(
          'this.radius must be greater than or equal to zero.'
        )
      }
      var radiusChanged = false
      if (this._radius !== radius) {
        radiusChanged = true
        this._radius = radius
        this._boundingSphere = new BoundingSphere(Cartesian3.ZERO, this.radius)
      }

      var modelMatrixChanged = !Matrix4.equals(
        this.modelMatrix,
        this._modelMatrix
      )
      if (modelMatrixChanged || radiusChanged) {
        Matrix4.clone(this.modelMatrix, this._modelMatrix)
        Matrix4.multiplyByUniformScale(
          this.modelMatrix,
          this.radius,
          this._computedModelMatrix
        )
        BoundingSphere.transform(
          this._boundingSphere,
          this.modelMatrix,
          this._boundingSphereWC
        )
      }

      var showThroughEllipsoid = this.showThroughEllipsoid
      if (this._showThroughEllipsoid !== this.showThroughEllipsoid) {
        this._showThroughEllipsoid = showThroughEllipsoid
        createRS = true
      }

      var material = this.material
      if (this._material !== material) {
        this._material = material
        createRS = true
        createSP = true
      }
      var translucent = material.isTranslucent()
      if (this._translucent !== translucent) {
        this._translucent = translucent
        createRS = true
      }

      if (this.showScanPlane) {
        var time = frameState.time
        var timeDiff = JulianDate.secondsDifference(time, this._time)
        if (timeDiff < 0) {
          this._time = JulianDate.clone(time, this._time)
        }
        var percentage = Math.max(
          (timeDiff % this.scanPlaneRate) / this.scanPlaneRate,
          0
        )
        var angle

        if (this.scanPlaneMode == 'horizontal') {
          angle = 2 * yHalfAngle * percentage - yHalfAngle
          var cosYHalfAngle = cos(angle)
          var tanXHalfAngle = tan(xHalfAngle)

          var maxX = atan(cosYHalfAngle * tanXHalfAngle)
          this._scanePlaneXHalfAngle = maxX
          this._scanePlaneYHalfAngle = angle
          Cesium.Matrix3.fromRotationX(
            this._scanePlaneYHalfAngle,
            matrix3Scratch
          )
        } else {
          angle = 2 * xHalfAngle * percentage - xHalfAngle
          var tanYHalfAngle = tan(yHalfAngle)
          var cosXHalfAngle = cos(angle)

          var maxY = atan(cosXHalfAngle * tanYHalfAngle)
          this._scanePlaneXHalfAngle = angle
          this._scanePlaneYHalfAngle = maxY
          Cesium.Matrix3.fromRotationY(
            this._scanePlaneXHalfAngle,
            matrix3Scratch
          )
        }

        Cesium.Matrix4.multiplyByMatrix3(
          this.modelMatrix,
          matrix3Scratch,
          this._computedScanPlaneModelMatrix
        )
        Matrix4.multiplyByUniformScale(
          this._computedScanPlaneModelMatrix,
          this.radius,
          this._computedScanPlaneModelMatrix
        )
      }

      if (createVS) {
        createVertexArray(this, frameState)
      }
      if (createRS) {
        createRenderState(this, showThroughEllipsoid, translucent)
      }
      if (createSP) {
        createShaderProgram(this, frameState, material)
      }
      if (createRS || createSP) {
        createCommands(this, translucent)
      }

      var commandList = frameState.commandList
      var passes = frameState.passes
      var colorCommands = this._colorCommands
      if (passes.render) {
        for (var i = 0, len = colorCommands.length; i < len; i++) {
          var colorCommand = colorCommands[i]
          commandList.push(colorCommand)
        }
      }
    }

    // Object.defineProperties(RectangularSensorPrimitive.prototype, {
    //   definitionChanged: {
    //     get: function () {
    //       return _definitionChanged
    //     }
    //   },

    //   show: createPropertyDescriptor('show'),
    //   radius: createPropertyDescriptor('radius'),
    //   xHalfAngle: createPropertyDescriptor('xHalfAngle'),
    //   yHalfAngle: createPropertyDescriptor('yHalfAngle'),
    //   lineColor: createPropertyDescriptor('lineColor'),
    //   showSectorLines: createPropertyDescriptor('showSectorLines'),
    //   showSectorSegmentLines: createPropertyDescriptor(
    //     'showSectorSegmentLines'
    //   ),
    //   showLateralSurfaces: createPropertyDescriptor('showLateralSurfaces'),
    //   material: createMaterialPropertyDescriptor('material'),
    //   showDomeSurfaces: createPropertyDescriptor('showDomeSurfaces'),
    //   showDomeLines: createPropertyDescriptor('showDomeLines '),
    //   showIntersection: createPropertyDescriptor('showIntersection'),
    //   intersectionColor: createPropertyDescriptor('intersectionColor'),
    //   intersectionWidth: createPropertyDescriptor('intersectionWidth'),
    //   showThroughEllipsoid: createPropertyDescriptor('showThroughEllipsoid'),
    //   showScanPlane: createPropertyDescriptor('showScanPlane'),
    //   scanPlaneColor: createPropertyDescriptor('scanPlaneColor'),
    //   scanPlaneMode: createPropertyDescriptor('scanPlaneMode'),
    //   scanPlaneRate: createPropertyDescriptor('scanPlaneRate')
    // })

    var matrix3Scratch = new Matrix3()
    var nScratch = new Cartesian3()

    //region -- VertexArray --

    /**
     * 计算zoy面和zoy面单位扇形位置
     * @param primitive
     * @returns {{zoy: Array, zox: Array}}
     */
    const computeUnitPosiiton = function (primitive, xHalfAngle, yHalfAngle) {
      var slice = primitive.slice

      //以中心为角度
      var cosYHalfAngle = cos(yHalfAngle)
      var tanYHalfAngle = tan(yHalfAngle)
      var cosXHalfAngle = cos(xHalfAngle)
      var tanXHalfAngle = tan(xHalfAngle)

      var maxY = atan(cosXHalfAngle * tanYHalfAngle)
      var maxX = atan(cosYHalfAngle * tanXHalfAngle)

      //ZOY面单位圆
      var zoy = []
      for (var i = 0; i < slice; i++) {
        var phi = (2 * maxY * i) / (slice - 1) - maxY
        zoy.push(new Cartesian3(0, sin(phi), cos(phi)))
      }
      //zox面单位圆
      var zox = []
      for (var i = 0; i < slice; i++) {
        var phi = (2 * maxX * i) / (slice - 1) - maxX
        zox.push(new Cartesian3(sin(phi), 0, cos(phi)))
      }

      return {
        zoy: zoy,
        zox: zox
      }
    }

    /**
     * 计算扇面的位置
     * @param unitPosition
     * @returns {Array}
     */
    const computeSectorPositions = function (primitive, unitPosition) {
      var xHalfAngle = primitive.xHalfAngle,
        yHalfAngle = primitive.yHalfAngle,
        zoy = unitPosition.zoy,
        zox = unitPosition.zox
      var positions = []

      //zoy面沿y轴逆时针转xHalfAngle
      var matrix3 = Matrix3.fromRotationY(xHalfAngle, matrix3Scratch)
      positions.push(
        zoy.map(function (p) {
          return Matrix3.multiplyByVector(matrix3, p, new Cesium.Cartesian3())
        })
      )
      //zox面沿x轴顺时针转yHalfAngle
      var matrix3 = Matrix3.fromRotationX(-yHalfAngle, matrix3Scratch)
      positions.push(
        zox
          .map(function (p) {
            return Matrix3.multiplyByVector(matrix3, p, new Cesium.Cartesian3())
          })
          .reverse()
      )
      //zoy面沿y轴顺时针转xHalfAngle
      var matrix3 = Matrix3.fromRotationY(-xHalfAngle, matrix3Scratch)
      positions.push(
        zoy
          .map(function (p) {
            return Matrix3.multiplyByVector(matrix3, p, new Cesium.Cartesian3())
          })
          .reverse()
      )
      //zox面沿x轴逆时针转yHalfAngle
      var matrix3 = Matrix3.fromRotationX(yHalfAngle, matrix3Scratch)
      positions.push(
        zox.map(function (p) {
          return Matrix3.multiplyByVector(matrix3, p, new Cesium.Cartesian3())
        })
      )
      return positions
    }

    /**
     * 创建扇面顶点
     * @param context
     * @param positions
     * @returns {*}
     */
    const createSectorVertexArray = function (context, positions) {
      var planeLength =
        Array.prototype.concat.apply([], positions).length - positions.length
      var vertices = new Float32Array(2 * 3 * 3 * planeLength)

      var k = 0
      for (var i = 0, len = positions.length; i < len; i++) {
        var planePositions = positions[i]
        var n = Cartesian3.normalize(
          Cartesian3.cross(
            planePositions[0],
            planePositions[planePositions.length - 1],
            nScratch
          ),
          nScratch
        )
        for (
          var j = 0, planeLength = planePositions.length - 1;
          j < planeLength;
          j++
        ) {
          vertices[k++] = 0.0
          vertices[k++] = 0.0
          vertices[k++] = 0.0
          vertices[k++] = -n.x
          vertices[k++] = -n.y
          vertices[k++] = -n.z

          vertices[k++] = planePositions[j].x
          vertices[k++] = planePositions[j].y
          vertices[k++] = planePositions[j].z
          vertices[k++] = -n.x
          vertices[k++] = -n.y
          vertices[k++] = -n.z

          vertices[k++] = planePositions[j + 1].x
          vertices[k++] = planePositions[j + 1].y
          vertices[k++] = planePositions[j + 1].z
          vertices[k++] = -n.x
          vertices[k++] = -n.y
          vertices[k++] = -n.z
        }
      }

      var vertexBuffer = Buffer.createVertexBuffer({
        context: context,
        typedArray: vertices,
        usage: BufferUsage.STATIC_DRAW
      })

      var stride = 2 * 3 * Float32Array.BYTES_PER_ELEMENT

      var attributes = [
        {
          index: attributeLocations.position,
          vertexBuffer: vertexBuffer,
          componentsPerAttribute: 3,
          componentDatatype: ComponentDatatype.FLOAT,
          offsetInBytes: 0,
          strideInBytes: stride
        },
        {
          index: attributeLocations.normal,
          vertexBuffer: vertexBuffer,
          componentsPerAttribute: 3,
          componentDatatype: ComponentDatatype.FLOAT,
          offsetInBytes: 3 * Float32Array.BYTES_PER_ELEMENT,
          strideInBytes: stride
        }
      ]

      return new VertexArray({
        context: context,
        attributes: attributes
      })
    }

    /**
     * 创建扇面边线顶点
     * @param context
     * @param positions
     * @returns {*}
     */
    const createSectorLineVertexArray = function (context, positions) {
      var planeLength = positions.length
      var vertices = new Float32Array(3 * 3 * planeLength)

      var k = 0
      for (var i = 0, len = positions.length; i < len; i++) {
        var planePositions = positions[i]
        vertices[k++] = 0.0
        vertices[k++] = 0.0
        vertices[k++] = 0.0

        vertices[k++] = planePositions[0].x
        vertices[k++] = planePositions[0].y
        vertices[k++] = planePositions[0].z
      }

      var vertexBuffer = Buffer.createVertexBuffer({
        context: context,
        typedArray: vertices,
        usage: BufferUsage.STATIC_DRAW
      })

      var stride = 3 * Float32Array.BYTES_PER_ELEMENT

      var attributes = [
        {
          index: attributeLocations.position,
          vertexBuffer: vertexBuffer,
          componentsPerAttribute: 3,
          componentDatatype: ComponentDatatype.FLOAT,
          offsetInBytes: 0,
          strideInBytes: stride
        }
      ]

      return new VertexArray({
        context: context,
        attributes: attributes
      })
    }

    /**
     * 创建扇面圆顶面连接线顶点
     * @param context
     * @param positions
     * @returns {*}
     */
    const createSectorSegmentLineVertexArray = function (context, positions) {
      var planeLength =
        Array.prototype.concat.apply([], positions).length - positions.length
      var vertices = new Float32Array(3 * 3 * planeLength)

      var k = 0
      for (var i = 0, len = positions.length; i < len; i++) {
        var planePositions = positions[i]

        for (
          var j = 0, planeLength = planePositions.length - 1;
          j < planeLength;
          j++
        ) {
          vertices[k++] = planePositions[j].x
          vertices[k++] = planePositions[j].y
          vertices[k++] = planePositions[j].z

          vertices[k++] = planePositions[j + 1].x
          vertices[k++] = planePositions[j + 1].y
          vertices[k++] = planePositions[j + 1].z
        }
      }

      var vertexBuffer = Buffer.createVertexBuffer({
        context: context,
        typedArray: vertices,
        usage: BufferUsage.STATIC_DRAW
      })

      var stride = 3 * Float32Array.BYTES_PER_ELEMENT

      var attributes = [
        {
          index: attributeLocations.position,
          vertexBuffer: vertexBuffer,
          componentsPerAttribute: 3,
          componentDatatype: ComponentDatatype.FLOAT,
          offsetInBytes: 0,
          strideInBytes: stride
        }
      ]

      return new VertexArray({
        context: context,
        attributes: attributes
      })
    }

    /**
     * 创建圆顶面顶点
     * @param context
     */
    const createDomeVertexArray = function (context) {
      var geometry = Cesium.EllipsoidGeometry.createGeometry(
        new Cesium.EllipsoidGeometry({
          vertexFormat: VertexFormat.POSITION_ONLY,
          stackPartitions: 32,
          slicePartitions: 32
        })
      )

      var vertexArray = VertexArray.fromGeometry({
        context: context,
        geometry: geometry,
        attributeLocations: attributeLocations,
        bufferUsage: BufferUsage.STATIC_DRAW,
        interleave: false
      })
      return vertexArray
    }

    /**
     * 创建圆顶面连线顶点
     * @param context
     */
    const createDomeLineVertexArray = function (context) {
      var geometry = Cesium.EllipsoidOutlineGeometry.createGeometry(
        new Cesium.EllipsoidOutlineGeometry({
          vertexFormat: VertexFormat.POSITION_ONLY,
          stackPartitions: 32,
          slicePartitions: 32
        })
      )

      var vertexArray = VertexArray.fromGeometry({
        context: context,
        geometry: geometry,
        attributeLocations: attributeLocations,
        bufferUsage: BufferUsage.STATIC_DRAW,
        interleave: false
      })
      return vertexArray
    }

    /**
     * 创建扫描面顶点
     * @param context
     * @param positions
     * @returns {*}
     */
    const createScanPlaneVertexArray = function (context, positions) {
      var planeLength = positions.length - 1
      var vertices = new Float32Array(3 * 3 * planeLength)

      var k = 0
      for (var i = 0; i < planeLength; i++) {
        vertices[k++] = 0.0
        vertices[k++] = 0.0
        vertices[k++] = 0.0

        vertices[k++] = positions[i].x
        vertices[k++] = positions[i].y
        vertices[k++] = positions[i].z

        vertices[k++] = positions[i + 1].x
        vertices[k++] = positions[i + 1].y
        vertices[k++] = positions[i + 1].z
      }

      var vertexBuffer = Buffer.createVertexBuffer({
        context: context,
        typedArray: vertices,
        usage: BufferUsage.STATIC_DRAW
      })

      var stride = 3 * Float32Array.BYTES_PER_ELEMENT

      var attributes = [
        {
          index: attributeLocations.position,
          vertexBuffer: vertexBuffer,
          componentsPerAttribute: 3,
          componentDatatype: ComponentDatatype.FLOAT,
          offsetInBytes: 0,
          strideInBytes: stride
        }
      ]

      return new VertexArray({
        context: context,
        attributes: attributes
      })
    }

    const createVertexArray = function (primitive, frameState) {
      var context = frameState.context

      var unitSectorPositions = computeUnitPosiiton(
        primitive,
        primitive.xHalfAngle,
        primitive.yHalfAngle
      )
      var positions = computeSectorPositions(primitive, unitSectorPositions)

      //显示扇面
      if (primitive.showLateralSurfaces) {
        primitive._sectorVA = createSectorVertexArray(context, positions)
      }

      //显示扇面线
      if (primitive.showSectorLines) {
        primitive._sectorLineVA = createSectorLineVertexArray(
          context,
          positions
        )
      }

      //显示扇面圆顶面的交线
      if (primitive.showSectorSegmentLines) {
        primitive._sectorSegmentLineVA = createSectorSegmentLineVertexArray(
          context,
          positions
        )
      }

      //显示弧面
      if (primitive.showDomeSurfaces) {
        primitive._domeVA = createDomeVertexArray(context)
      }

      //显示弧面线
      if (primitive.showDomeLines) {
        primitive._domeLineVA = createDomeLineVertexArray(context)
      }

      //显示扫描面
      if (primitive.showScanPlane) {
        if (primitive.scanPlaneMode == 'horizontal') {
          var unitScanPlanePositions = computeUnitPosiiton(
            primitive,
            CesiumMath.PI_OVER_TWO,
            0
          )
          primitive._scanPlaneVA = createScanPlaneVertexArray(
            context,
            unitScanPlanePositions.zox
          )
        } else {
          var unitScanPlanePositions = computeUnitPosiiton(
            primitive,
            0,
            CesiumMath.PI_OVER_TWO
          )
          primitive._scanPlaneVA = createScanPlaneVertexArray(
            context,
            unitScanPlanePositions.zoy
          )
        }
      }
    }

    //endregion

    //region -- ShaderProgram --

    const createCommonShaderProgram = function (
      primitive,
      frameState,
      material
    ) {
      var context = frameState.context

      var vs = RectangularSensorVS
      var fs = new ShaderSource({
        sources: [RectangularSensor, material.shaderSource, RectangularSensorFS]
      })

      primitive._sp = ShaderProgram.replaceCache({
        context: context,
        shaderProgram: primitive._sp,
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: attributeLocations
      })

      var pickFS = new ShaderSource({
        sources: [
          RectangularSensor,
          material.shaderSource,
          RectangularSensorFS
        ],
        pickColorQualifier: 'uniform'
      })

      primitive._pickSP = ShaderProgram.replaceCache({
        context: context,
        shaderProgram: primitive._pickSP,
        vertexShaderSource: vs,
        fragmentShaderSource: pickFS,
        attributeLocations: attributeLocations
      })
    }

    const createScanPlaneShaderProgram = function (
      primitive,
      frameState,
      material
    ) {
      var context = frameState.context

      var vs = RectangularSensorVS
      var fs = new ShaderSource({
        sources: [
          RectangularSensor,
          material.shaderSource,
          RectangularSensorScanPlaneFS
        ]
      })

      primitive._scanePlaneSP = ShaderProgram.replaceCache({
        context: context,
        shaderProgram: primitive._scanePlaneSP,
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: attributeLocations
      })
    }

    const createShaderProgram = function (primitive, frameState, material) {
      createCommonShaderProgram(primitive, frameState, material)

      if (primitive.showScanPlane) {
        createScanPlaneShaderProgram(primitive, frameState, material)
      }
    }

    //endregion

    //region -- RenderState --

    const createRenderState = function (
      primitive,
      showThroughEllipsoid,
      translucent
    ) {
      if (translucent) {
        primitive._frontFaceRS = RenderState.fromCache({
          depthTest: {
            enabled: !showThroughEllipsoid
          },
          depthMask: false,
          blending: BlendingState.ALPHA_BLEND,
          cull: {
            enabled: true,
            face: CullFace.BACK
          }
        })

        primitive._backFaceRS = RenderState.fromCache({
          depthTest: {
            enabled: !showThroughEllipsoid
          },
          depthMask: false,
          blending: BlendingState.ALPHA_BLEND,
          cull: {
            enabled: true,
            face: CullFace.FRONT
          }
        })

        primitive._pickRS = RenderState.fromCache({
          depthTest: {
            enabled: !showThroughEllipsoid
          },
          depthMask: false,
          blending: BlendingState.ALPHA_BLEND
        })
      } else {
        primitive._frontFaceRS = RenderState.fromCache({
          depthTest: {
            enabled: !showThroughEllipsoid
          },
          depthMask: true
        })

        primitive._pickRS = RenderState.fromCache({
          depthTest: {
            enabled: true
          },
          depthMask: true
        })
      }
    }

    //endregion

    //region -- Command --

    const createCommand = function (
      primitive,
      frontCommand,
      backCommand,
      frontFaceRS,
      backFaceRS,
      sp,
      va,
      uniforms,
      modelMatrix,
      translucent,
      pass,
      isLine
    ) {
      if (translucent && backCommand) {
        backCommand.vertexArray = va
        backCommand.renderState = backFaceRS
        backCommand.shaderProgram = sp
        backCommand.uniformMap = combine(
          uniforms,
          primitive._material._uniforms
        )
        backCommand.uniformMap.u_normalDirection = function () {
          return -1.0
        }
        backCommand.pass = pass
        backCommand.modelMatrix = modelMatrix
        primitive._colorCommands.push(backCommand)
      }

      frontCommand.vertexArray = va
      frontCommand.renderState = frontFaceRS
      frontCommand.shaderProgram = sp
      frontCommand.uniformMap = combine(uniforms, primitive._material._uniforms)
      if (isLine) {
        frontCommand.uniformMap.u_type = function () {
          return 1
        }
      }
      frontCommand.pass = pass
      frontCommand.modelMatrix = modelMatrix
      primitive._colorCommands.push(frontCommand)
    }

    const createCommands = function (primitive, translucent) {
      primitive._colorCommands.length = 0

      var pass = translucent ? Pass.TRANSLUCENT : Pass.OPAQUE

      //显示扇面
      if (primitive.showLateralSurfaces) {
        createCommand(
          primitive,
          primitive._sectorFrontCommand,
          primitive._sectorBackCommand,
          primitive._frontFaceRS,
          primitive._backFaceRS,
          primitive._sp,
          primitive._sectorVA,
          primitive._uniforms,
          primitive._computedModelMatrix,
          translucent,
          pass
        )
      }
      //显示扇面线
      if (primitive.showSectorLines) {
        createCommand(
          primitive,
          primitive._sectorLineCommand,
          undefined,
          primitive._frontFaceRS,
          primitive._backFaceRS,
          primitive._sp,
          primitive._sectorLineVA,
          primitive._uniforms,
          primitive._computedModelMatrix,
          translucent,
          pass,
          true
        )
      }
      //显示扇面交接线
      if (primitive.showSectorSegmentLines) {
        createCommand(
          primitive,
          primitive._sectorSegmentLineCommand,
          undefined,
          primitive._frontFaceRS,
          primitive._backFaceRS,
          primitive._sp,
          primitive._sectorSegmentLineVA,
          primitive._uniforms,
          primitive._computedModelMatrix,
          translucent,
          pass,
          true
        )
      }
      //显示弧面
      if (primitive.showDomeSurfaces) {
        createCommand(
          primitive,
          primitive._domeFrontCommand,
          primitive._domeBackCommand,
          primitive._frontFaceRS,
          primitive._backFaceRS,
          primitive._sp,
          primitive._domeVA,
          primitive._uniforms,
          primitive._computedModelMatrix,
          translucent,
          pass
        )
      }
      //显示弧面线
      if (primitive.showDomeLines) {
        createCommand(
          primitive,
          primitive._domeLineCommand,
          undefined,
          primitive._frontFaceRS,
          primitive._backFaceRS,
          primitive._sp,
          primitive._domeLineVA,
          primitive._uniforms,
          primitive._computedModelMatrix,
          translucent,
          pass,
          true
        )
      }
      //显示扫描面
      if (primitive.showScanPlane) {
        createCommand(
          primitive,
          primitive._scanPlaneFrontCommand,
          primitive._scanPlaneBackCommand,
          primitive._frontFaceRS,
          primitive._backFaceRS,
          primitive._scanePlaneSP,
          primitive._scanPlaneVA,
          primitive._scanUniforms,
          primitive._computedScanPlaneModelMatrix,
          translucent,
          pass
        )
      }
    }
    // Cesium.Scene.RectangularSensorPrimitive = RectangularSensorPrimitive
    return RectangularSensorPrimitive
  } catch (error) {
    console.error(error)
  }

  //endregion
}

export { initRectangular }
