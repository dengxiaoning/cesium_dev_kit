let Cesium = null
let dfSt = undefined
/**
 * 图元拓展模块
 * @param {*} viewer
 */
function Primitive(viewer, cesiumGlobal, defaultStatic) {
  if (viewer) {
    this._viewer = viewer
    dfSt = defaultStatic
    Cesium = cesiumGlobal
    this._installPrimitives()
  }
}

Primitive.prototype = {
  /**
   * 安装拓展图元
   */
  _installPrimitives: function () {
    this._installProbingPrimitive()

    this._installTexturePrimitive()

    this._installWaterPrimitive()

    this._installPointsPrimitive()

    this._installShadowPrimitive()

    this._installArrowPolylinePrimitive()

    this._installXyzAxisPrimitive()

    this._installTetrahedronPrimitive()

    this._installCustomPrimitive()
  },
  /**
   * 自定义图元
   */
  _installCustomPrimitive: function () {
    // function CustomPrimitive(options) {
    // }
  },
  /**
   * 光锥图元
   */
  _installTetrahedronPrimitive: function () {
    try {
      var Cartesian3 = Cesium.Cartesian3,
        ComponentDatatype = Cesium.ComponentDatatype,
        PrimitiveType = Cesium.PrimitiveType,
        BoundingSphere = Cesium.BoundingSphere,
        GeometryAttribute = Cesium.GeometryAttribute,
        GeometryPipeline = Cesium.GeometryPipeline,
        Geometry = Cesium.Geometry,
        defined = Cesium.defined,
        RenderState = Cesium.RenderState,
        ShaderSource = Cesium.ShaderSource,
        ShaderProgram = Cesium.ShaderProgram,
        DrawCommand = Cesium.DrawCommand,
        Pass = Cesium.Pass,
        Appearance = Cesium.Appearance,
        BufferUsage = Cesium.BufferUsage,
        Color = Cesium.Color,
        VertexArray = Cesium.VertexArray,
        buildModuleUrl = Cesium.buildModuleUrl,
        Matrix4 = Cesium.Matrix4,
        Matrix3 = Cesium.Matrix3,
        Texture = Cesium.Texture,
        Resource = Cesium.Resource,
        Transforms = Cesium.Transforms,
        defaultValue = Cesium.defaultValue,
        _viewer = this._viewer,
        defaultStatic =
          this.getDfSt(['primitive', 'TetrahedronPrimitive']) ||
          'static/data/images/Textures/fence.png'

      const TetrahedronPrimitive = function (options) {
        this.show = true
        this._command = undefined
        this._enuMatrix = undefined
        this._scaleMatrix = undefined
        this._localPosition = options.position
        this._createCommand = createCommand
        this._angle = 0
        this._distance = defaultValue(options.distance, 1)
        this._setInterval = undefined
        this._viewer = _viewer
        this._speed = defaultValue(options.speed, 1.0)
        this._color = defaultValue(options.color, new Color(1.0, 1.0, 0.0, 0.8))
        this._scale = defaultValue(options.scale, new Cartesian3(10, 10, 15))
        this._texture = undefined
        this._imageUrl = defaultStatic
        this._modelMatrix = computeModelMatrix(this)
        this._height = computeHeight(this)
        createTexture(this)
      }

      TetrahedronPrimitive.prototype.update = function (frameState) {
        if (!this.show) {
          return
        }
        if (!defined(this._command)) {
          this._command = this._createCommand(frameState.context, this)
          // this._command.pickId = 'v_pickColor'
        }
        if (defined(this._command)) {
          frameState.commandList.push(this._command)
        }
      }
      TetrahedronPrimitive.prototype.isDestroyed = function () {
        return false
      }
      TetrahedronPrimitive.prototype.destroy = function () {
        if (defined(this._command)) {
          this._command.shaderProgram =
            this._command.shaderProgram && this._command.shaderProgram.destroy()
        }
        return destroyObject(this)
      }
      //开启动画
      TetrahedronPrimitive.prototype.startAnimate = function () {
        let that = this
        this._setInterval = setInterval(animateFunc, 5)

        function animateFunc() {
          that._angle = that._angle + 0.01
          Math.sin(that._angle) > 0
            ? (that._height = 0.01)
            : (that._height = -0.01)
          let translation = new Cesium.Cartesian3(0, 0, that._height)
          Matrix4.multiplyByTranslation(
            that._modelMatrix,
            translation,
            that._modelMatrix
          )
          let rotationZ = Matrix4.fromRotationTranslation(
            Matrix3.fromRotationZ(Cesium.Math.toRadians(that._speed))
          )
          Matrix4.multiply(that._modelMatrix, rotationZ, that._modelMatrix)
        }
      }
      //关闭动画
      TetrahedronPrimitive.prototype.closeAnimate = function () {
        clearInterval(this._setInterval)
      }

      //创建command
      const createCommand = function (context, tetrahedronPrimitive) {
        var translucent = false
        var closed = true
        var vs = creaateVertexShader()
        var fs = createFragmentShader()
        // 借用一下Appearance.getDefaultRenderState
        var rawRenderState = Appearance.getDefaultRenderState(
          translucent,
          closed,
          undefined
        )
        var renderState = RenderState.fromCache(rawRenderState)
        var vertexShaderSource = new ShaderSource({
          sources: [vs]
        })
        var fragmentShaderSource = new ShaderSource({
          sources: [fs]
        })
        var uniformMap = {
          color: function () {
            return tetrahedronPrimitive._color
          },
          myImage: function () {
            if (defined(tetrahedronPrimitive._texture)) {
              return tetrahedronPrimitive._texture
            } else {
              return tetrahedronPrimitive._viewer.scene.context.defaultTexture
            }
          }
        }
        let attributeLocations = {
          position: 0,
          textureCoordinates: 1
        }
        var shaderProgram = ShaderProgram.fromCache({
          context: context,
          vertexShaderSource: vertexShaderSource,
          fragmentShaderSource: fragmentShaderSource,
          attributeLocations: attributeLocations
        })
        return new DrawCommand({
          vertexArray: createVertexArray(context),
          primitiveType: PrimitiveType.TRIANGLES,
          renderState: renderState,
          shaderProgram: shaderProgram,
          uniformMap: uniformMap,
          owner: this,
          pass: Pass.TRANSLUCENT,
          modelMatrix: tetrahedronPrimitive._modelMatrix
        })
      }

      //创建vertexArray
      const createVertexArray = function (context) {
        let attributeLocations = {
          position: 0,
          textureCoordinates: 1
        }
        var positionsAndIndice = cereatePositionsAndIndice()
        var geometry = new Geometry({
          attributes: {
            position: new GeometryAttribute({
              // 使用double类型的position进行计算
              // componentDatatype : Cesium.ComponentDatatype.DOUBLE,
              componentDatatype: ComponentDatatype.FLOAT,
              componentsPerAttribute: 3,
              values: positionsAndIndice.positions
            }),
            textureCoordinates: new GeometryAttribute({
              componentDatatype: ComponentDatatype.FLOAT,
              componentsPerAttribute: 2,
              values: positionsAndIndice.sts
            })
          },
          // Workaround Internet Explorer 11.0.8 lack of TRIANGLE_FAN
          indices: positionsAndIndice.indices,
          primitiveType: PrimitiveType.TRIANGLES,
          boundingSphere: BoundingSphere.fromVertices(
            positionsAndIndice.positions
          )
        })
        //计算geometry的法向量
        var geometryNormal = GeometryPipeline.computeNormal(geometry)
        var vertexArray = VertexArray.fromGeometry({
          context: context,
          geometry: geometryNormal,
          attributeLocations: attributeLocations,
          bufferUsage: BufferUsage.STATIC_DRAW
        })

        return vertexArray
      }

      //创建顶点数组与索引
      const cereatePositionsAndIndice = function () {
        var positions = new Float64Array(5 * 3)
        // position 0
        positions[0] = 0.0
        positions[1] = 1.0
        positions[2] = 0.0

        // position 1
        positions[3] = -1.0
        positions[4] = 0.0
        positions[5] = 0.0

        // position 2
        positions[6] = 0.0
        positions[7] = -1.0
        positions[8] = 0.0

        // position 3
        positions[9] = 1.0
        positions[10] = 0.0
        positions[11] = 0.0

        // position 4
        positions[12] = 0.0
        positions[13] = 0.0
        positions[14] = -1.0
        var indices = new Uint16Array(6 * 3)
        // back triangle
        indices[0] = 4
        indices[1] = 2
        indices[2] = 3

        // left triangle
        indices[3] = 4
        indices[4] = 3
        indices[5] = 0

        // right triangle
        indices[6] = 4
        indices[7] = 0
        indices[8] = 1

        // bottom triangle
        indices[9] = 4
        indices[10] = 1
        indices[11] = 2
        // bottom triangle
        indices[12] = 1
        indices[13] = 2
        indices[14] = 3

        // bottom triangle
        indices[15] = 1
        indices[16] = 3
        indices[17] = 0

        // 1.3 定义纹理数组
        var sts = new Float32Array([
          0.0,
          0.0,
          1.0,
          0.0,
          1.0,
          1.0,
          0.0,
          1.0,
          0.5,
          0.5
        ])
        return {
          indices: indices,
          positions: positions,
          sts: sts
        }
      }

      //创建顶点着色器
      const creaateVertexShader = function () {
        var vertexShader = `#version 300 es
                    in vec3 position;
                    in vec3 normal;
                    in vec2 st;
                    in float batchId;
                    out vec3 v_positionEC;
                    out vec3 v_normalEC;
                    out vec2 v_st;
                    out vec4 v_pickColor;
                    void main()
                    {
                        v_positionEC = (czm_modelView * vec4(position, 1.0)).xyz;
                        v_normalEC = czm_normal * normal;
                        v_st = st;
                        // v_pickColor = czm_batchTable_pickColor(batchId);
                        gl_Position = czm_modelViewProjection * vec4(position, 1.0);
                    }
                    `
        return vertexShader
      }

      //创建片源着色器
      const createFragmentShader = function () {
        var fragmentShader = `#version 300 es
                     precision mediump float;
                     in vec3 v_positionEC;
                     in vec3 v_normalEC;
                     in vec2 v_st;
                     uniform vec4 color;
                     in vec4 v_pickColor;
                     uniform sampler2D myImage;
                    void main()
                    {
                        vec3 positionToEyeEC = -v_positionEC;
                        vec3 normalEC = normalize(v_normalEC);
                    #ifdef FACE_FORWARD
                        normalEC = faceforward(normalEC, vec3(0.0, 0.0, 1.0), -normalEC);
                    #endif
                        czm_materialInput materialInput;
                        materialInput.normalEC = normalEC;
                        materialInput.positionToEyeEC = positionToEyeEC;
                        materialInput.st = v_st;
                        vec2 st = materialInput.st;
                        czm_material material = czm_getDefaultMaterial(materialInput);
                        float dt_a11 = fract(czm_frameNumber / 100.0) * 3.14159265 * 2.0;
                        float dt_a12 = sin(dt_a11);
                        float vst=smoothstep(0.7, 1.0, dt_a12)+0.4;
                        vec4 colorImage = texture(myImage, vec2(fract(st.s- czm_frameNumber*0.003), st.t));
                        material.alpha =mix(0.1,1.0,clamp((1.0-st.t) * color.a,0.0,1.0)) +(1.0-sign(st.t-czm_frameNumber*0.001))*0.2*(1.0-colorImage.r)+0.4;
                        material.diffuse =(1.0-colorImage.a)*vec3(1.0,2.0,1.0)+colorImage.rgb*vec3(1.0,2.0,1.0);
                    #ifdef FLAT
                        out_FragColor = vec4(material.diffuse + material.emission, material.alpha);
                    #else
                      out_FragColor = czm_phong(normalize(positionToEyeEC), material, czm_lightDirectionEC);
                    #endif
                    }
                    `
        return fragmentShader
      }

      //创建纹理
      const createTexture = function (tetrahedronPrimitive) {
        Resource.createIfNeeded(tetrahedronPrimitive._imageUrl)
          .fetchImage()
          .then(function (image) {
            var vTexture
            var context = tetrahedronPrimitive._viewer.scene.context
            if (defined(image.internalFormat)) {
              vTexture = new Texture({
                context: context,
                pixelFormat: image.internalFormat,
                width: image.naturalWidth,
                height: image.naturalHeight,
                source: {
                  arrayBufferView: image.bufferView
                }
              })
            } else {
              vTexture = new Texture({
                context: context,
                source: image
              })
            }
            tetrahedronPrimitive._texture = vTexture
          })
      }

      //计算矩阵
      const computeModelMatrix = function (tetrahedronPrimitive) {
        let enuMatrix = Transforms.eastNorthUpToFixedFrame(
          tetrahedronPrimitive._localPosition
        )
        let scaleMatrix = Matrix4.fromScale(tetrahedronPrimitive._scale)
        let modelMatrix = Matrix4.multiply(
          enuMatrix,
          scaleMatrix,
          new Matrix4()
        )
        tetrahedronPrimitive._scaleMatrix = scaleMatrix
        tetrahedronPrimitive._enuMatrix = enuMatrix
        return modelMatrix
      }

      //计算高度
      const computeHeight = function (tetrahedronPrimitive) {
        let point = Cartesian3.fromElements(
          0,
          0,
          tetrahedronPrimitive._distance,
          new Cesium.Cartesian3()
        )
        let enuPoint = Cesium.Matrix4.multiplyByPoint(
          tetrahedronPrimitive._enuMatrix,
          point,
          new Cartesian3()
        )
        let upPositionEC = Matrix4.multiplyByPoint(
          tetrahedronPrimitive._viewer.scene.camera._viewMatrix,
          enuPoint,
          new Cartesian3()
        )
        let upPositionPC = Matrix4.multiplyByPoint(
          tetrahedronPrimitive._viewer.scene.camera.frustum.projectionMatrix,
          upPositionEC,
          new Cartesian3()
        )
        return Cartesian3.normalize(upPositionPC, new Cartesian3()).z
      }

      Cesium.Scene.TetrahedronPrimitive = TetrahedronPrimitive
    } catch (error) {
      console.log(error)
    }
  },
  _installXyzAxisPrimitive: function () {
    function XyzAxisPrimitive(option) {
      this._viewer = option.viewer

      this._model = option.model

      this._matrix = option.matrix

      this._radius = undefined

      this._layer = new Cesium.CustomDataSource('xyz-axis')

      this._viewer.dataSources.add(this._layer)

      this._handler = new Cesium.ScreenSpaceEventHandler(
        this._viewer.scene.canvas
      )

      this._xyzState = false
      this._xyzPid = undefined

      this._builds()
    }

    XyzAxisPrimitive.prototype = {
      _builds() {
        this._createAxisXYZ()
        this._bindHandler()
      },
      remove() {
        this._layer._primitives.removeAll()
        this._handler.distory()
      },
      _createAxisXYZ: function () {
        this._model.readyPromise.then((m) => {
          const center1 = Cesium.Matrix4.getTranslation(
            m.modelMatrix,
            new Cesium.Cartesian3()
          )
          const boundingShpere = m.boundingSphere
          const radius = boundingShpere.radius
          const axisZ = new Cesium.ArrowPolylinePrimitive({
            id: 'axisZ',
            color: Cesium.Color.RED,
            position: center1,
            width: 3,
            headWidth: 5,
            length: radius * 2 + 50,
            headLength: 10
          })
          const axisX = new Cesium.ArrowPolylinePrimitive({
            id: 'axisX',
            color: Cesium.Color.GREEN,
            position: center1,
            width: 3,
            headWidth: 5,
            length: radius * 2 + 50,
            headLength: 10
          })
          const axisY = new Cesium.ArrowPolylinePrimitive({
            id: 'axisY',
            color: Cesium.Color.BLUE,
            position: center1,
            width: 3,
            headWidth: 5,
            length: radius * 2 + 50,
            headLength: 10
          })

          const mx = Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(90))
          this._rotationX = Cesium.Matrix4.fromRotationTranslation(mx)
          Cesium.Matrix4.multiply(
            axisX.geometryInstances[0].modelMatrix,
            this._rotationX,
            axisX.geometryInstances[0].modelMatrix
          )
          Cesium.Matrix4.multiply(
            axisX.geometryInstances[1].modelMatrix,
            this._rotationX,
            axisX.geometryInstances[1].modelMatrix
          )
          const my = Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(90))
          this._rotationY = Cesium.Matrix4.fromRotationTranslation(my)
          Cesium.Matrix4.multiply(
            axisY.geometryInstances[0].modelMatrix,
            this._rotationY,
            axisY.geometryInstances[0].modelMatrix
          )
          Cesium.Matrix4.multiply(
            axisY.geometryInstances[1].modelMatrix,
            this._rotationY,
            axisY.geometryInstances[1].modelMatrix
          )
          this._layer._primitives.add(axisZ)
          this._layer._primitives.add(axisX)
          this._layer._primitives.add(axisY)

          this._radius = boundingShpere.radius
          this._createAxisSphere()
        })
      },
      _createAxisSphere: function () {
        const position = []
        for (let i = 0; i <= 360; i += 3) {
          const sin = Math.sin(Cesium.Math.toRadians(i))
          const cos = Math.cos(Cesium.Math.toRadians(i))
          const x = this._radius * cos
          const y = this._radius * sin
          position.push(new Cesium.Cartesian3(x, y, 0))
        }

        const axisSphereZ = this._createAxisSpheres(
          'axisSphereZ',
          position,
          this._matrix,
          Cesium.Color.RED
        )
        this._layer._primitives.add(axisSphereZ)
        const axisSphereY = this._createAxisSpheres(
          'axisSphereY',
          position,
          this._matrix,
          Cesium.Color.GREEN
        )
        this._layer._primitives.add(axisSphereY)
        Cesium.Matrix4.multiply(
          axisSphereY.geometryInstances.modelMatrix,
          this._rotationY,
          axisSphereY.geometryInstances.modelMatrix
        )
        const axisSphereX = this._createAxisSpheres(
          'axisSphereX',
          position,
          this._matrix,
          Cesium.Color.BLUE
        )
        this._layer._primitives.add(axisSphereX)
        Cesium.Matrix4.multiply(
          axisSphereX.geometryInstances.modelMatrix,
          this._rotationX,
          axisSphereX.geometryInstances.modelMatrix
        )
      },
      _createAxisSpheres: function (id, position, matrix, color) {
        const geometry = new Cesium.PolylineGeometry({
          positions: position,
          width: 10
        })
        const instnce = new Cesium.GeometryInstance({
          geometry: geometry,
          id: id,
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(color)
          }
        })
        return new Cesium.Primitive({
          geometryInstances: instnce,
          appearance: new Cesium.PolylineColorAppearance({
            translucent: false
          }),
          modelMatrix: matrix
        })
      },
      _updateAxis(cartesian) {
        if (this._layer) {
          let primitives = this._layer._primitives._primitives
          for (let i = 1, j = primitives.length; i < j; i++) {
            let primitive = primitives[i]
            const translation = Cesium.Matrix4.fromTranslation(
              new Cesium.Cartesian3(cartesian.x, cartesian.y, cartesian.z)
            )
            Cesium.Matrix4.multiply(
              primitive.modelMatrix,
              translation,
              primitive.modelMatrix
            )
          }
        }
        const translation = Cesium.Matrix4.fromTranslation(
          new Cesium.Cartesian3(cartesian.x, cartesian.y, cartesian.z)
        )
        Cesium.Matrix4.multiply(
          this._model.modelMatrix,
          translation,
          this._model.modelMatrix
        )
      },
      _updateAxisSphere(angel) {
        if (this._layer) {
          let primitives = this._layer._primitives._primitives
          for (let i = 1, j = primitives.length; i < j; i++) {
            let primitive = primitives[i]
            const rotation = Cesium.Matrix4.fromRotationTranslation(angel)
            Cesium.Matrix4.multiply(
              primitive.modelMatrix,
              rotation,
              primitive.modelMatrix
            )
          }
        }
        const rotation = Cesium.Matrix4.fromRotationTranslation(angel)
        Cesium.Matrix4.multiply(
          this._model.modelMatrix,
          rotation,
          this._model.modelMatrix
        )
      },
      _bindHandler() {
        //拖动
        this._handler.setInputAction((click) => {
          if (this._xyzState && this._xyzPid) {
            switch (this._xyzPid) {
              case 'axisX-line':
                this._updateAxis({
                  x: -1,
                  y: 0,
                  z: 0
                })
                break
              case 'axisY-line':
                this._updateAxis({
                  x: 0,
                  y: -1,
                  z: 0
                })
                break
              case 'axisZ-line':
                this._updateAxis({
                  x: 0,
                  y: 0,
                  z: -1
                })
                break
              case 'axisX-arrow':
                this._updateAxis({
                  x: 1,
                  y: 0,
                  z: 0
                })
                break
              case 'axisY-arrow':
                this._updateAxis({
                  x: 0,
                  y: 1,
                  z: 0
                })
                break
              case 'axisZ-arrow':
                this._updateAxis({
                  x: 0,
                  y: 0,
                  z: 1
                })
                break
              case 'axisSphereX':
                this._updateAxisSphere(
                  Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(1))
                )
                break
              case 'axisSphereY':
                this._updateAxisSphere(
                  Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(1))
                )
                break
              case 'axisSphereZ':
                this._updateAxisSphere(
                  Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(1))
                )
                break
            }
          }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

        //拾取
        this._handler.setInputAction((click) => {
          let pickObj = viewer.scene.pick(click.position)
          if (pickObj && pickObj.id) {
            ;(this._xyzPid = pickObj.id), (this._xyzState = true)
          }
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN)

        //结束
        this._handler.setInputAction(() => {
          ;(this._xyzState = false), (this._xyzPid = undefined)
        }, Cesium.ScreenSpaceEventType.LEFT_UP)
      }
    }
    Cesium.Scene.XyzAxisPrimitive = XyzAxisPrimitive
  },
  /**
   * 箭头线
   */
  _installArrowPolylinePrimitive: function () {
    function ArrowPolylinePrimitive(option = {}) {
      this._color = option.color || Cesium.Color.RED
      this._width = option.width || 3
      this._headWidth = option.headWidth || 2 * this._width
      this._length = option.length || 300
      this._headLength = option.headLength || 10
      this._inverse = option.inverse || false
      this.position = option.position
      const id = option.id
      //这里用的是圆锥几何对象，当topRadius和bottomRadius相同时，它就是一个圆柱
      const line = Cesium.CylinderGeometry.createGeometry(
        new Cesium.CylinderGeometry({
          length: this._length,
          topRadius: this._width,
          bottomRadius: this._width
        })
      )
      const arrow = Cesium.CylinderGeometry.createGeometry(
        new Cesium.CylinderGeometry({
          length: this._headLength,
          topRadius: 0,
          bottomRadius: this._headWidth
        })
      )
      let offset = (this._length + this._headLength) / 2
      if (this._inverse) {
        offset = -offset
      }

      translate(arrow, [0, 0, offset])

      return new Cesium.Primitive({
        modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(this.position),
        geometryInstances: [
          new Cesium.GeometryInstance({
            id: id + '-line',
            geometry: line
          }),
          new Cesium.GeometryInstance({
            id: id + '-arrow',
            geometry: arrow
          })
        ],
        appearance: new Cesium.MaterialAppearance({
          material: Cesium.Material.fromType('Color', {
            color: this._color
          })
        })
      })
    }

    /**
     * 按上面的方法画出的箭头在线的中间，我们需要把它平移到线的一端
     */
    let translate = function (geometry, offset) {
      const scratchOffset = new Cesium.Cartesian3()
      if (offset.length) {
        scratchOffset.x = offset[0]
        scratchOffset.y = offset[1]
        scratchOffset.z = offset[2]
      } else {
        Cesium.Cartesian3.clone(offset, scratchOffset)
      }

      for (let i = 0; i < geometry.attributes.position.values.length; i += 3) {
        geometry.attributes.position.values[i] += scratchOffset.x
        geometry.attributes.position.values[i + 1] += scratchOffset.y
        geometry.attributes.position.values[i + 2] += scratchOffset.z
      }
    }
    Cesium.Scene.ArrowPolylinePrimitive = ArrowPolylinePrimitive
  },
  /**
   * 阴影图元
   */
  _installShadowPrimitive: function () {
    const ViewshedLineVS =
      'ttribute vec3 position;\n\
            uniform mat4 u_modelViewMatrix;\n\
            void main()\n\
            {\n\
            gl_Position = czm_projection* u_modelViewMatrix* vec4(position.xyz,1.0);\n\
            }\n\
            '
    const ViewshedLineFS =
      'uniform vec4 u_bgColor;\n\
            void main()\n\
            {\n\
              out_FragColor = u_bgColor;\n\
            }\n\
            '

    function ShadowPrimitive(options) {
      options = Cesium.defaultValue(options, Cesium.defaultValue.EMPTY_OBJECT)
      var scene = options.scene
      if (!Cesium.defined(scene)) {
        throw new Cesium.DeveloperError('scene is required.')
      }
      this._scene = scene
      // options.context is an undocumented option
      var context = scene._context

      // includeStart('debug', pragmas.debug);
      if (!Cesium.defined(context)) {
        throw new Cesium.DeveloperError('context is required.')
      }

      if (!Cesium.defined(options.viewerPosition)) {
        throw new Cesium.DeveloperError('this view position is required.')
      }
      this._viewerPosition = options.viewerPosition

      this._positions = undefined
      this._indices = undefined
      this._drawLineCommand = undefined
      this._depthCamera = new Cesium.Camera(scene)
      this._depthCamera.position = this._viewerPosition

      this._direction = 0
      this._pitch = 0
      this._horizontalFov = Cesium.defaultValue(options.horizontalFov, 60)
      this._verticalFov = Cesium.defaultValue(options.verticalFov, 45)

      this._cameraUpdated = false
      this._targetPoint = this._viewerPosition.clone()

      var t = new Cesium.Cartesian3(0, 0, 100)
      var matrix_ENU = Cesium.Transforms.eastNorthUpToFixedFrame(
        this._viewerPosition
      )
      //Cesium.Matrix4.inverse(matrix_ENU, matrix_ENU),
      Cesium.Matrix4.multiplyByPoint(matrix_ENU, t, this._targetPoint)

      this._distance = 100
      this._cameraUpdated = false
      ;(this._modelMatrix = new Cesium.Matrix4()),
        (this._shadowMap = new Cesium.ShadowMap({
          context: context,
          enabled: true,
          lightCamera: this._depthCamera,
          cascadesEnabled: false
        }))
      //this._shadowMap.debugShow=true;

      this.show = true

      this._invisiblyColor = Cesium.Color.RED
      this._visiblyColor = Cesium.Color.GREEN
      this._shadowMap.useCustomColor = true
      this.shadowMap._customColor = {
        invisibly: Cesium.Color.RED,
        visibly: Cesium.Color.GREEN
      }

      this._initialize = function () {
        ;(this._positions = new Float32Array(633)),
          (this._indices = new Uint16Array(408))
        var indices = this._indices,
          r = 0
        ;(indices[r++] = 0),
          (indices[r++] = 1),
          (indices[r++] = 0),
          (indices[r++] = 21),
          (indices[r++] = 0),
          (indices[r++] = 85),
          (indices[r++] = 0),
          (indices[r++] = 105)
        for (var i = 0, n = 0; n < 5; ++n) {
          i++
          for (var a = 0; a < 20; ++a) (indices[r++] = i++), (indices[r++] = i)
        }
        i++
        for (var s = 0; s < 20; ++s)
          for (var l = 0; l < 5; ++l)
            (indices[r++] = i), (indices[r++] = 5 + i++)
        this._initialized = true
      }
      //this._initialize();

      this._debugLightFrustum = undefined

      this._debugShow = true
    }

    Object.defineProperties(ShadowPrimitive.prototype, {
      shadowMap: {
        get: function () {
          return this._shadowMap
        }
      },
      debugLightFrustum: {
        get: function () {
          return this._debugLightFrustum
        }
      },
      debugShow: {
        get: function () {
          return this._debugShow
        },
        set: function (bShow) {
          this.shadowMap.debugShow = bShow
          this._debugShow = bShow
        }
      },
      invisiblyColor: {
        get: function () {
          return this._invisiblyColor
        },
        set: function (color) {
          this._invisiblyColor = color
          var shadowMap = this.shadowMap
          shadowMap._customColor.invisibly = color
        }
      },
      visiblyColor: {
        get: function () {
          return this._visiblyColor
        },
        set: function (color) {
          this._visiblyColor = color
          var shadowMap = this.shadowMap
          shadowMap._customColor.visibly = color
        }
      },
      viewerPosition: {
        get: function () {
          return this._viewerPosition
        },
        set: function (position) {
          ;(this._viewerPosition = position), (this._cameraUpdated = !1)
        }
      },
      direction: {
        get: function () {
          return this._direction
        },
        set: function (direction) {
          ;(this._direction = direction), (this._cameraUpdated = !1)
        }
      },
      pitch: {
        get: function () {
          return this._pitch
        },
        set: function (pitch) {
          ;(this._pitch = pitch), (this._cameraUpdated = !1)
        }
      },
      horizontalFov: {
        get: function () {
          return this._horizontalFov
        },
        set: function (e) {
          ;(this._horizontalFov = e),
            (this._cameraUpdated = !1),
            (this._hintLineUpdated = !1)
        }
      },
      verticalFov: {
        get: function () {
          return this._verticalFov
        },
        set: function (e) {
          ;(this._verticalFov = e),
            (this._cameraUpdated = !1),
            (this._hintLineUpdated = !1)
        }
      },
      distance: {
        get: function () {
          return this._distance
        },
        set: function (distance) {
          ;(this._distance = distance), (this._cameraUpdated = !1)
        }
      }
    })

    ShadowPrimitive.prototype.setDebugFrustumEffect = function (
      bShowPlane,
      bShowOutline
    ) {
      if (!this.debugShow) return
      var planesPrimitives = this.debugLightFrustum._planesPrimitives
      var outlinePrimitives = this.debugLightFrustum._outlinePrimitives
      planesPrimitives.forEach(function (plane) {
        plane.show = bShowPlane
      })
      outlinePrimitives.forEach(function (outline) {
        outline.show = bShowOutline
      })
    }

    ShadowPrimitive.prototype.update = function (frameState) {
      if (!this.show) return
      if (!this._cameraUpdated) {
        this._updateCamera()
        //更新debug
        if (this.debugShow) {
          if (!Cesium.defined(this.debugLightFrustum)) {
            this._debugLightFrustum = new Cesium.DebugCameraPrimitive({
              camera: this._depthCamera,
              color: Cesium.Color.YELLOW,
              updateOnChange: true
            })
            this.setDebugFrustumEffect(false, true)
          }
        }
      }
      var frustumSplitsFar = frameState.frustumSplits[1]
      frameState.frustumSplits[1] = this._distance
      this._debugLightFrustum.update(frameState)
      frameState.frustumSplits[1] = frustumSplitsFar
      //if(!this._initialized)this._initialize();
      //if (!this._hintLineUpdated)this._updateHintLine(frameState);
      frameState.shadowMaps.push(this.shadowMap)
    }

    ShadowPrimitive.prototype._updateCamera = function () {
      ;(this._depthCamera.frustum.near = 0.001 * this._distance),
        (this._depthCamera.frustum.far = this._distance),
        (this._depthCamera.frustum.fov = Cesium.Math.toRadians(
          Math.max(this._horizontalFov, this._verticalFov)
        )),
        (this._depthCamera.frustum.aspectRatio =
          this._horizontalFov / this._verticalFov),
        this._depthCamera.setView({
          destination: this._viewerPosition,
          orientation: {
            heading: Cesium.Math.toRadians(this._direction),
            pitch: Cesium.Math.toRadians(this._pitch)
          }
        }),
        (this._modelMatrix = this._depthCamera.inverseViewMatrix)
      this._cameraUpdated = !0
    }
    ShadowPrimitive.prototype.setPoseByTargetPoint = function (point) {
      this.distance = Cesium.Cartesian3.distance(this._viewerPosition, point)
      var t = new Cesium.Cartesian3(),
        matrix_ENU = Cesium.Transforms.eastNorthUpToFixedFrame(
          this._viewerPosition
        )
      Cesium.Matrix4.inverse(matrix_ENU, matrix_ENU),
        Cesium.Matrix4.multiplyByPoint(matrix_ENU, point, t),
        Cesium.Cartesian3.normalize(t, t),
        (this.direction = Cesium.Math.toDegrees(Math.atan2(t.x, t.y))),
        (this.pitch = Cesium.Math.toDegrees(Math.asin(t.z)))
    }

    ShadowPrimitive.prototype._updateHintLine = function (frameState) {
      var i,
        a,
        s,
        d,
        p = this._positions,
        m = Cesium.Math.toRadians(this._horizontalFov),
        v = Cesium.Math.toRadians(this._verticalFov),
        b = Math.tan(0.5 * m),
        S = Math.tan(0.5 * v)
      ;(a = this._distance * b), (d = this._distance * S), (i = -a), (s = -d)
      var w = new Cesium.Cartesian3(i, s, -this._distance),
        x = new Cesium.Cartesian3(a, d, 0)
      Cesium.Matrix4.multiplyByPoint(this._modelMatrix, w, w),
        Cesium.Matrix4.multiplyByPoint(this._modelMatrix, x, x)
      var boundingSphere = Cesium.BoundingSphere.fromCornerPoints(w, x)
      if (
        frameState.cullingVolume.computeVisibility(boundingSphere) ===
        Intersect.OUTSIDE
      )
        return void (this._valid = !1)
      this._valid = !0
      var P = 0
      ;(p[P++] = 0), (p[P++] = 0), (p[P++] = 0)
      for (var D, I, M = Math.PI - 0.5 * m, R = m / 4, L = 0; L < 5; ++L) {
        D = M + L * R
        for (
          var B = d / (this._distance / Math.cos(D)),
            F = Math.atan(B),
            U = -F,
            V = F / 10,
            z = 0;
          z < 21;
          ++z
        )
          (I = U + z * V),
            (p[P++] = this._distance * Math.cos(I) * Math.sin(D)),
            (p[P++] = this._distance * Math.sin(I)),
            (p[P++] = this._distance * Math.cos(I) * Math.cos(D))
      }
      R = m / 20
      for (var G = 0; G < 21; ++G) {
        D = M + G * R
        for (
          var B = d / (this._distance / Math.cos(D)),
            F = Math.atan(B),
            U = -F,
            V = F / 2,
            H = 0;
          H < 5;
          ++H
        )
          (I = U + H * V),
            (p[P++] = this._distance * Math.cos(I) * Math.sin(D)),
            (p[P++] = this._distance * Math.sin(I)),
            (p[P++] = this._distance * Math.cos(I) * Math.cos(D))
      }
      var context = frameState.context,
        indexBuffer = Cesium.Buffer.createIndexBuffer({
          context: context,
          typedArray: new Uint32Array(this._indices),
          usage: Cesium.BufferUsage.STATIC_DRAW,
          indexDatatype: IndexDatatype.UNSIGNED_INT
        }),
        vertexBuffer = Cesium.Buffer.createVertexBuffer({
          context: context,
          typedArray: Cesium.ComponentDatatype.createTypedArray(
            Cesium.ComponentDatatype.FLOAT,
            this._positions
          ),
          usage: Cesium.BufferUsage.STATIC_DRAW
        }),
        attributes = []
      attributes.push({
        index: 0,
        vertexBuffer: vertexBuffer,
        componentDatatype: Cesium.ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
        normalize: !1
      })
      var vertexArray = new Cesium.VertexArray({
        context: context,
        attributes: attributes,
        indexBuffer: indexBuffer
      })
      if (Cesium.defined(this._drawLineCommand))
        this._drawLineCommand.vertexArray.destroy(),
          (this._drawLineCommand.vertexArray = vertexArray),
          (this._drawLineCommand.modelMatrix = this._modelMatrix),
          (this._drawLineCommand.boundingVolume = boundingSphere)
      else {
        var shaderProgram = Cesium.ShaderProgram.fromCache({
            context: context,
            vertexShaderSource: ViewshedLineVS,
            fragmentShaderSource: ViewshedLineFS
          }),
          renderState = Cesium.RenderState.fromCache({
            depthTest: {
              enabled: !0
            }
          }),
          _this = this,
          uniformMap = {
            u_bgColor: function () {
              return _this._lineColor
            },
            u_modelViewMatrix: function () {
              return context.uniformState.modelView
            }
          }
        this._drawLineCommand = new Cesium.DrawCommand({
          boundingVolume: boundingSphere,
          modelMatrix: _this._modelMatrix,
          primitiveType: Cesium.PrimitiveType.LINES,
          vertexArray: vertexArray,
          shaderProgram: shaderProgram,
          castShadows: !1,
          receiveShadows: !1,
          uniformMap: uniformMap,
          renderState: renderState,
          pass: Cesium.Pass.OPAQUE
        })
      }
      this._hintLineUpdated = true
    }

    Cesium.Scene.ShadowPrimitive = ShadowPrimitive
  },
  /**
   * 图元点
   */
  _installPointsPrimitive: function () {
    /**
     *
     * @param {*} options
     */
    function PointsPrimitive(options) {
      if (options && options.viewer && options.Cartesians) {
        this._vertexShader = this.getVSPolylie()
        this._fragmentShader = this.getFSPolyline()
        this._geometry = null
        this._appearance = null
        this._viewer = options.viewer

        this.build(options)
      }
    }

    PointsPrimitive.prototype = {
      build: function (options) {
        if (options.Cartesians && options.Cartesians.length >= 2) {
          var postionsTemp = []
          var colorsTemp = []
          var indicesTesm = []
          if (
            options.Colors &&
            options.Colors.length === options.Cartesians.length * 4
          ) {
            for (var i = 0; i < options.Cartesians.length; i++) {
              postionsTemp.push(options.Cartesians[i].x)
              postionsTemp.push(options.Cartesians[i].y)
              postionsTemp.push(options.Cartesians[i].z)
            }
            colorsTemp = options.Colors
          } else {
            for (var j = 0; j < options.Cartesians.length; j++) {
              postionsTemp.push(options.Cartesians[j].x)
              postionsTemp.push(options.Cartesians[j].y)
              postionsTemp.push(options.Cartesians[j].z)
              //
              colorsTemp.push(0.0)
              colorsTemp.push(0.0)
              colorsTemp.push(1.0)
              colorsTemp.push(1.0)
            }
          }
          for (var e = 0; e < options.Cartesians.length; e++) {
            indicesTesm.push(e)
          }
          this.positionArr = new Float64Array(postionsTemp)
          this.colorArr = new Float32Array(colorsTemp)
          this.indiceArr = new Uint16Array(indicesTesm)
        } else {
          var p1 = Cesium.Cartesian3.fromDegrees(0, 0, -10)
          var p2 = Cesium.Cartesian3.fromDegrees(0, 0.001, -10)
          this.positionArr = new Float64Array([
            p1.x,
            p1.y,
            p1.z,
            p2.x,
            p2.y,
            p2.z
          ])
          //默认蓝色
          this.colorArr = new Float32Array([
            0.0,
            0.0,
            1.0,
            1.0,
            0.0,
            0.0,
            1.0,
            1.0
          ])
          this.indiceArr = new Uint16Array([0, 1])
        }

        this._geometry = this.createGeometry(
          this.positionArr,
          this.colorArr,
          this.indiceArr
        )
        this._appearance = this.createAppearence(
          this._fragmentShader,
          this._vertexShader
        )

        this.primitive = this._viewer.scene.primitives.add(
          new Cesium.Primitive({
            geometryInstances: new Cesium.GeometryInstance({
              geometry: this._geometry
            }),
            appearance: this._appearance,
            asynchronous: false
          })
        )
      },
      getVSPolylie: function () {
        return 'in vec3 position3DHigh; \
                in vec3 position3DLow;\
                in vec4 color;\
                out vec4 v_color;\
                in float batchId;\
                void main()\
                {\
                    vec4 p = czm_computePosition();\
                    v_color =color;\
                    p = czm_modelViewProjectionRelativeToEye * p;\
                    gl_Position = p;\
                    gl_PointSize=4.0;\
                }\
                '
      },
      getFSPolyline: function () {
        return 'in vec4 v_color; \
                void main()\
                {\
                      float d = distance(gl_PointCoord, vec2(0.5,0.5));\
                      if(d < 0.5){\
                        out_FragColor = v_color;\
                      }else{\
                        discard;\
                      }\
                }\
                '
      },
      createAppearence: function (fs, vs) {
        return new Cesium.Appearance({
          renderState: {
            blending: Cesium.BlendingState.PRE_MULTIPLIED_ALPHA_BLEND,
            depthTest: {
              enabled: true
            },
            depthMask: true
          },
          fragmentShaderSource: fs,
          vertexShaderSource: vs
        })
      },
      createGeometry: function (positions, colors, indices) {
        return new Cesium.Geometry({
          attributes: {
            position: new Cesium.GeometryAttribute({
              componentDatatype: Cesium.ComponentDatatype.DOUBLE,
              componentsPerAttribute: 3,
              values: positions
            }),
            color: new Cesium.GeometryAttribute({
              componentDatatype: Cesium.ComponentDatatype.FLOAT,
              componentsPerAttribute: 4,
              values: colors
            })
          },
          indices: indices,
          primitiveType: Cesium.PrimitiveType.POINTS,
          boundingSphere: Cesium.BoundingSphere.fromVertices(positions)
        })
      },
      remove: function () {
        if (this.primitive != null) {
          this._viewer.scene.primitives.remove(this.primitive)
          this.primitive = null
        }
      },
      updateCartesianPosition: function (cartesians) {
        if (this.primitive != null) {
          this._viewer.scene.primitives.remove(this.primitive)
          if (cartesians && cartesians.length < 2) {
            return
          }
          if (cartesians.length === this.positionArr.length / 3) {
            var p1 = cartesians[0]
            var p2 = cartesians[1]
            this.positionArr = new Float64Array([
              p1.x,
              p1.y,
              p1.z,
              p2.x,
              p2.y,
              p2.z
            ])
            this._geometry = this.createGeometry(
              this.positionArr,
              this.colorArr,
              this.indiceArr
            )
          } else {
            //默认蓝色
            var postionsTemp = []
            var colorsTemp = []
            var indicesTesm = []
            for (var i = 0; i < cartesians.length; i++) {
              postionsTemp.push(cartesians[i].x)
              postionsTemp.push(cartesians[i].y)
              postionsTemp.push(cartesians[i].z)

              colorsTemp.push(0.0)
              colorsTemp.push(0.0)
              colorsTemp.push(1.0)
              colorsTemp.push(1.0)
            }
            for (var j = 0; j < cartesians.length; j++) {
              indicesTesm.push(j)
            }
            this.positionArr = new Float64Array(postionsTemp)
            this.colorArr = new Float32Array(colorsTemp)
            this.indiceArr = new Uint16Array(indicesTesm)

            geometry = this.createGeometry(
              this.positionArr,
              this.colorArr,
              this.indiceArr
            )
            appearance = this.createAppearence(
              this._fragmentShader,
              this._vertexShader
            )
          }

          this.primitive = this._viewer.scene.primitives.add(
            new Cesium.Primitive({
              geometryInstances: new Cesium.GeometryInstance({
                geometry: this._geometry
              }),
              appearance: this._appearance,
              asynchronous: false
            })
          )
        } else {
          return
        }
      },
      updateCartesianPositionColor: function (cartesians, colors) {
        if (colors.length !== cartesians.length * 4) {
          return
        }
        if (this.primitive != null) {
          viewer.scene.primitives.remove(this.primitive)
          if (cartesians && cartesians.length < 2) {
            return
          }
          if (cartesians.length === this.positionArr.length / 3) {
            var p1 = cartesians[0]
            var p2 = cartesians[1]
            this.positionArr = new Float64Array([
              p1.x,
              p1.y,
              p1.z,
              p2.x,
              p2.y,
              p2.z
            ])

            this.colorArr = new Float32Array(colors)

            geometry = CreateGeometry(
              this.positionArr,
              this.colorArr,
              this.indiceArr
            )
          } else {
            var postionsTemp = []
            var indicesTesm = []

            for (var i = 0; i < cartesians.length; i++) {
              postionsTemp.push(cartesians[i].x)
              postionsTemp.push(cartesians[i].y)
              postionsTemp.push(cartesians[i].z)
            }
            for (var i = 0; i < cartesians.length; i++) {
              indicesTesm.push(i)
            }
            this.positionArr = new Float64Array(postionsTemp)
            this.colorArr = new Float32Array(colors)
            this.indiceArr = new Uint16Array(indicesTesm)

            this._geometry = this.createGeometry(
              this.positionArr,
              this.colorArr,
              this.indiceArr
            )
            this._appearance = this.createAppearence(
              this._fragmentShader,
              this._vertexShader
            )
          }

          this.primitive = viewer.scene.primitives.add(
            new Cesium.Primitive({
              geometryInstances: new Cesium.GeometryInstance({
                geometry: this._geometry
              }),
              appearance: this._appearance,
              asynchronous: false
            })
          )
        } else {
          return
        }
      }
    }

    Cesium.Scene.PointsPrimitive = PointsPrimitive
  },
  /**
   * 水面效果
   */
  _installWaterPrimitive: function () {
    /**
     *
     * @param {*} options
     */
    const WaterPrimitive = function (opt) {
      this._positions = opt.positions
      this._url =
        opt.img ||
        this.getDfSt(['primitive', 'WaterPrimitive']) ||
        'static/data/images/Textures/waterNormals.jpg'
      this._frequency = opt.frequency || 1000.0
      this._animationSpeed = opt.animationSpeed || 0.01
      this._amplitude = opt.amplitude || 10.0
      this._extrudedHeight = opt.extrudedHeight || 0

      this._fs = this.getFS()
    }

    WaterPrimitive.prototype.build = function () {
      this._geometry = this._createGeometry()

      this._appearance = this._createAppearence()

      this.primitive = this._viewer.scene.primitives.add(
        new Cesium.Primitive({
          allowPicking: false,
          geometryInstances: new Cesium.GeometryInstance({
            geometry: this._geometry
          }),
          appearance: this._appearance,
          asynchronous: false
        })
      )
    }

    WaterPrimitive.prototype._createAppearence = function () {
      return new Cesium.EllipsoidSurfaceAppearance({
        material: new Cesium.Material({
          fabric: {
            type: 'Water',
            uniforms: {
              normalMap: this._url,
              frequency: this._frequency,
              animationSpeed: this._animationSpeed,
              amplitude: this._amplitude
            }
          }
        }),
        fragmentShaderSource: this._fs
      })
    }

    WaterPrimitive.prototype._createGeometry = function () {
      return new Cesium.PolygonGeometry({
        polygonHierarchy: new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArrayHeights(this._positions)
        ),
        extrudedHeight: this._extrudedHeight,
        perPositionHeight: true
      })
    }

    WaterPrimitive.prototype.getFS = function () {
      return 'in vec3 v_positionMC;\n\
                in vec3 v_positionEC;\n\
                in vec2 v_st;\n\
                \n\
                void main()\n\
                {\n\
                    czm_materialInput materialInput;\n\
                    vec3 normalEC = normalize(czm_normal3D * czm_geodeticSurfaceNormal(v_positionMC, vec3(0.0), vec3(1.0)));\n\
                #ifdef FACE_FORWARD\n\
                    normalEC = faceforward(normalEC, vec3(0.0, 0.0, 1.0), -normalEC);\n\
                #endif\n\
                    materialInput.s = v_st.s;\n\
                    materialInput.st = v_st;\n\
                    materialInput.str = vec3(v_st, 0.0);\n\
                    materialInput.normalEC = normalEC;\n\
                    materialInput.tangentToEyeMatrix = czm_eastNorthUpToEyeCoordinates(v_positionMC, materialInput.normalEC);\n\
                    vec3 positionToEyeEC = -v_positionEC;\n\
                    materialInput.positionToEyeEC = positionToEyeEC;\n\
                    czm_material material = czm_getMaterial(materialInput);\n\
                #ifdef FLAT\n\
                    out_FragColor = vec4(material.diffuse + material.emission, material.alpha);\n\
                #else\n\
                    out_FragColor = czm_phong(normalize(positionToEyeEC), material);\n\
                    out_FragColor.a = 0.5;\n\
                #endif\n\
                }\n\
                '
    }

    Primitive.prototype.updateDegreesPosition = function (
      _degreesArrayHeights,
      _extrudedHeight
    ) {
      if (this.primitive != null) {
        this._viewer.scene.primitives.remove(this.primitive)
        if (_degreesArrayHeights && _degreesArrayHeights.length < 3) {
          return
        }
        var geometry = this._createGeometry(
          _degreesArrayHeights,
          _extrudedHeight ? _extrudedHeight : 0
        )

        this.primitive = this._viewer.scene.primitives.add(
          new Cesium.Primitive({
            allowPicking: false,
            geometryInstances: new Cesium.GeometryInstance({
              geometry: geometry
            }),
            appearance: this._appearance,
            asynchronous: false
          })
        )
      } else {
        return
      }
    }

    Cesium.Scene.WaterPrimitive = WaterPrimitive
  },
  /**
   * 纹理图 视频图像
   */
  _installTexturePrimitive: function () {
    /**
     *
     * @param {*} options
     */
    function TexturePrimitive(options) {
      this._vertexShader = this.getVS()
      this._fragmentShader = this.getFS()
      this._materialShader = this.getMS()

      this._url = options.url
      this._cartesians = options.cartesians
      this._id = options.id || ''
    }

    // 构建
    TexturePrimitive.prototype.build = function () {
      var postionsTemp = [],
        stsTemp = [0, 0, 1, 0, 1, 1, 0, 1], //纹理坐标，调整纹理坐标顺序即可完成贴图的旋转
        // var stsTemp = [1,1,0,1,0,0,1,0];
        indicesTesm = [0, 1, 2, 0, 2, 3] //索引数组

      for (var i = 0; i < this._cartesians.length; i++) {
        postionsTemp.push(this._cartesians[i].x)
        postionsTemp.push(this._cartesians[i].y)
        postionsTemp.push(this._cartesians[i].z)
      }

      this._positionArr = new Float32Array(postionsTemp)
      this._sts = new Uint8Array(stsTemp)
      this._indiceArr = new Uint16Array(indicesTesm)
      //通过坐标数组，索引数组，纹理坐标数组创建多边形
      this._geometry = this._createGeometry()
      this._appearance = this._createAppearence()

      this.primitive = this._viewer.scene.primitives.add(
        new Cesium.Primitive({
          geometryInstances: new Cesium.GeometryInstance({
            geometry: this._geometry,
            id: this._id
          }),
          appearance: this._appearance,
          asynchronous: false
        })
      )
    }
    // 生成几何
    TexturePrimitive.prototype._createGeometry = function () {
      var sess = new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        values: this._sts
      })
      return new Cesium.Geometry({
        attributes: {
          position: new Cesium.GeometryAttribute({
            componentDatatype: Cesium.ComponentDatatype.DOUBLE,
            componentsPerAttribute: 3,
            values: this._positions
          }),
          st: sess
        },
        indices: this._indices, //索引指标，指示创建三角形的顺序
        primitiveType: Cesium.PrimitiveType.TRIANGLES,
        boundingSphere: Cesium.BoundingSphere.fromVertices(positions)
      })
    }
    //生成外观
    TexturePrimitive.prototype._createAppearence = function () {
      return new Cesium.Appearance({
        material: new Cesium.Material({
          fabric: {
            uniforms: {
              image: this._url
            },
            source: this._materialShader
          }
        }),
        aboveGround: true,
        faceForward: true,
        flat: true,
        translucent: false,
        renderState: {
          blending: Cesium.BlendingState.PRE_MULTIPLIED_ALPHA_BLEND,
          depthTest: {
            enabled: true
          },
          depthMask: true
        },
        fragmentShaderSource: this._fragmentShader,
        vertexShaderSource: this._vertexShader
      })
    }

    TexturePrimitive.prototype.getVS = function () {
      return 'in vec3 position3DHigh;\
                in vec3 position3DLow;\
                in vec2 st;\
                in float batchId;\
                out vec2 v_st;\
                void main()\
                {\
                    vec4 p = czm_computePosition();\
                    v_st=st;\
                    p = czm_modelViewProjectionRelativeToEye * p;\
                    gl_Position = p;\
                }\
                '
    }

    TexturePrimitive.prototype.getFS = function () {
      return 'in vec2 v_st;\
                void main()\
                {\
                    czm_materialInput materialInput;\
                    czm_material material=czm_getMaterial(materialInput,v_st);\
                    vec4 color=vec4(material.diffuse + material.emission,material.alpha);\
                    if(color.x==1.0&&color.y==1.0&&color.z==1.0&&color.w==1.0) color=vec4(vec3(0.0,0.0,0.0),0.0);\
                    out_FragColor =color;\
                }\
                '
    }

    TexturePrimitive.prototype.getMS = function () {
      return 'czm_material czm_getMaterial(czm_materialInput materialInput,vec2 v_st)\
                    {\
                        vec4 color = texture(image, v_st);\
                        czm_material material = czm_getDefaultMaterial(materialInput);\
                        material.diffuse= color.rgb;\
                        material.alpha=color.a;\
                        return material;\
                    }\
                    '
    }

    Cesium.Scene.TexturePrimitive = TexturePrimitive
  },
  /**
   * 卫星雷达波
   */
  _installProbingPrimitive: function () {
    var DEF_OPT = {
      color: new Cesium.Color(1.0, 0.0, 1.0, 0.8),
      repeat: 30.0,
      offset: 0.0,
      thickness: 0.3,
      center: Cesium.Cartesian3.fromDegrees(116.39, 39.9),
      length: 400000.0,
      bottom: 1000,
      top: 0.0
    }
    var viewer = this._viewer

    /**
     *
     * @param {*} option
     */
    function ProbingPrimitive(option) {
      this._viewer = viewer
      this._length = option.length || DEF_OPT.length
      this._center = option.center || DEF_OPT.center
      this._color = option.color || DEF_OPT.color
      this._repeat = option.repeat || DEF_OPT.repeat
      this._offset = option.offset || DEF_OPT.offset
      this._thickness = option.thickness || DEF_OPT.thickness
      this._bottom = option.bottom || DEF_OPT.bottom
      this._top = option.top || DEF_OPT.top
      this._radar = undefined

      this.build()
    }

    ProbingPrimitive.prototype.build = function () {
      var cylinderGeometry = new Cesium.CylinderGeometry({
          length: this._length,
          topRadius: this._top,
          bottomRadius: this._bottom,
          vertexFormat:
            Cesium.MaterialAppearance.MaterialSupport.TEXTURED.vertexFormat
        }),
        redCone = new Cesium.GeometryInstance({
          geometry: cylinderGeometry,
          modelMatrix: this.getModelMatrix()
        }),
        appearance = new Cesium.MaterialAppearance({
          material: this.getMaterial(),
          faceForward: false,
          closed: true
        }),
        $this = this
      this._radar = this._viewer.scene.primitives.add(
        new Cesium.Primitive({
          geometryInstances: [redCone],
          appearance: appearance
        })
      )
      //监听渲染事件 动态修改雷达材质中的offset变量 从而实现动态效果
      this._viewer.scene.preUpdate.addEventListener(function () {
        var offset = $this._radar.appearance.material.uniforms.offset
        offset -= 0.001
        if (offset > 1.0) {
          offset = 0.0
        }
        $this._radar.appearance.material.uniforms.offset = offset
      })
    }

    ProbingPrimitive.prototype.getModelMatrix = function () {
      return Cesium.Matrix4.multiplyByTranslation(
        //转换矩阵
        Cesium.Transforms.eastNorthUpToFixedFrame(this._center), //矩阵
        new Cesium.Cartesian3(0.0, 0.0, this._length * 0.5), //要转换的笛卡尔坐标
        new Cesium.Matrix4() //返回新的矩阵
      )
    }

    ProbingPrimitive.prototype.updateModelMatrix = function () {}

    ProbingPrimitive.prototype.getMaterial = function () {
      var materialSource = `uniform vec4 color; 
            uniform float repeat; 
            uniform float offset; 
            uniform float thickness;

            czm_material czm_getMaterial(czm_materialInput materialInput){
                czm_material material = czm_getDefaultMaterial(materialInput);
                float sp = 1.0/repeat;
                vec2 st = materialInput.st;
                float dis = distance(st, vec2(0.5));
                float m = mod(dis + offset, sp);
                float a = step(sp*(1.0-thickness), m); 

                material.diffuse = color.rgb;
                material.alpha = a * color.a;
                return material;
            }`

      return new Cesium.Material({
        fabric: {
          type: 'radarPrimitive',
          uniforms: {
            //动态传递参数
            color: this._color,
            repeat: this._repeat,
            offset: this._offset,
            thickness: this._thickness
          },
          source: materialSource
        },
        translucent: false
      })
    }

    ProbingPrimitive.prototype.remove = function () {
      if (this._radar) {
        this._viewer.scene.primitives.remove(this._radar)
      }
    }

    Cesium.Scene.ProbingPrimitive = ProbingPrimitive
  }
}
export { Primitive }
