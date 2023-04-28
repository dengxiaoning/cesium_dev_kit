import SuperGif from 'libgif'
let Cesium = null;
let dfSt = undefined;
/**
 * 图形模块
 * 用于向地图加载各种实体对象
 * 
 * @param {*} viewer
 */
function Graphics(viewer, cesiumGlobal,defaultStatic) {

  if (viewer) {
    Cesium = cesiumGlobal;
    dfSt = defaultStatic;
    this._graphicsLayer = new Cesium.CustomDataSource('graphicsLayer')
    viewer && viewer.dataSources.add(this._graphicsLayer);
  }

}

Graphics.prototype = {
  //点
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
  //线
  getLineGraphics: function (options) {
    options = options || {}
    if (options && options.positions) {

      return new Cesium.PolylineGraphics({
        show: true,
        positions: options.positions,
        material: options.material || Cesium.Color.YELLOW,
        width: options.width || 1,
        clampToGround: options.clampToGround || false,
      })
    }
  },
  // 面
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
  //标签
  getLabelGraphics: function (options) {

    options = options || {}
    if (options && options.l_text) {

      return new Cesium.LabelGraphics({ //文字标签
        text: options.l_text,
        font: options.l_font || '14px sans-serif',
        fillColor: options.l_fillColor || Cesium.Color.GOLD,
        style: options.l_style || Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: options.l_outlineWidth || 2,
        showBackground: options.l_showBackground || false,
        backgroundColor: options.l_backgroundColor || new Cesium.Color(0.165, 0.165, 0.165, 0.8),
        verticalOrigin: options.l_verticalOrigin || Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: options.l_pixelOffset || new Cesium.Cartesian2(0, -30),
        //heightReference:Cesium.HeightReference.RELATIVE_TO_GROUND
      })
    }
  },
  //广告牌
  getBillboardGraphics: function (options) {

    options = options || {}
    if (options && options.b_img) {

      return new Cesium.BillboardGraphics({
        image: options.b_img,
        width: options.b_width || 35,
        height: options.b_height || 35,
        clampToGround: options.b_clampToGround || true,
        scale: options.b_scale || 1,
        // eyeOffset :new Cesium.Cartesian2(0, -20),
        pixelOffset: options.b_pixelOffset || new Cesium.Cartesian2(0, -20),
        scaleByDistance: options.b_scaleByDistance || undefined
        // heightReference:Cesium.HeightReference.RELATIVE_TO_GROUND
      })
    }
  },
  //路径
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
  //模型
  getModelGraphics: function (options) {

    options = options || {}
    if (options) {

      return new Cesium.ModelGraphics({
        uri: options.m_url,
        scale: options.m_scale || 28,
        minimumPixelSize: options.m_minimumPixelSize || 30,
        color: options.m_color || Cesium.Color.WHITE
      })
    }
  },
  //椭圆
  getEllipseGraphics: function (options) {

    options = options || {}
    if (options) {

      return new Cesium.EllipseGraphics({
        semiMajorAxis: options.e_semiMinorAxis || 1000000.0,
        semiMinorAxis: options.e_semiMinorAxis || 1000000.0,
        metarial: options.e_metarial || Cesium.Color.RED.withAlpha(0.5),
        outline: options.e_outline || true
      })
    }
  },
  //球
  getEllipsoidGraphics: function (options) {

    options = options || {}
    if (options) {
      var r = options.radii || 1000000.0 //默认100公里
      return new Cesium.EllipsoidGraphics({
        radii: new Cesium.Cartesian3(r, r, r), //单位 米
        // innerRadii : options.innerRadii || new Cesium.Cartesian3(r /1.5, r /1.5, r /1.5),
        maximumCone: options.maximumCone || Cesium.Math.PI_OVER_TWO,
        stackPartitions: options.stackPartitions || 56,
        slicePartitions: options.slicePartitions || 56,
        outlineWidth: options.outlineWidth || 2.0,
        outlineColor: options.outlineColor || Cesium.Color.YELLOW,
        outline: options.outline || true,
        fill: options.fill || true,
        material: options.material || Cesium.Color.RED.withAlpha(0.1)
        //heightReference:Cesium.HeightReference.NONE,
      })
    }
  },
  // box
  getBoxGraphics: function (options) {

    options = options || {show:true,outline:false,fill:true}
    if (options) {
      return new Cesium.BoxGraphics({
        show: options.show,
        fill: options.fill,
        dimensions:options.dimensions||new Cesium.Cartesian3(0, 0, 0),
        material: options.material,
        outline:  options.outline,
        outlineColor: options.outlineColor || Cesium.Color.BLACK,
        distanceDisplayCondition:options.distanceDisplayCondition||undefined
      })
    }
  },
  // 面
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
  // 锥体
  getCylinderGraphics: function (options) {
    options = options || {}
    if (options) {
      return new Cesium.CylinderGraphics({
        HeightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        length: options.length || 500 / 2,
        topRadius: options.topRadius || 0,
        bottomRadius: options.bottomRadius || 0,
        material: options.material || new Cesium.Color(0, 1, 1, .4),
        slices: options.slices || 128
      })
    }
  },
  //创建点信息
  createPointsGraphics: function (options) {

    if (options && options.positions) {
      let positions = []
      for (let i in options.positions) {
        let position = options.positions[i]
        let entity = this.createGraphics()
        entity.name = options.name || ''
        entity.oid = options.oid || 'point'
        entity.position = position
        if (options.point) entity.point = this.getPointGraphics()
        if (options.billboard) entity.billboard = this.getBillboardGraphics(options.billboard)
        if (options.label) entity.label = this.getLabelGraphics(options.label)
        positions.push(this._graphicsLayer.entities.add(entity))
      }
      return positions
    }
  },
  //创建线
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
  //创建面
  createPolygonGraphics: function (options) {

    options = options || {}
    if (options) {
      var entity = this.createGraphics()
      entity.polygon = this.getPolygonGraphics(options)
      entity.clampToS3M = options.clampToS3M || false

      return this._graphicsLayer.entities.add(entity)
    }
  },
  // 创建box
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
  //创建模型
  createModelGraphics: function (options) {

    if (options && options.position) {
      var entity = this.createGraphics()
      entity.model = this.getModelGraphics(options)
      entity.position = options.position
      return this._graphicsLayer.entities.add(entity)
    }
  },
  // 创建地面指示
  craeteCorridorGraphics: function (options) {

    if (options && options.positions) {
      var entity = this.createGraphics()
      entity.corridor = {
        positions: options.positions,
        height: options.height || 6.0,
        width: options.width || 15.0,
        material: options.material ||
          new Cesium.Scene.WarnLinkMaterialProperty({
            freely: 'cross',
            color: Cesium.Color.YELLOW,
            duration: 1000,
            count: 1.0,
            direction: '+'
          }),
      }

      return this._graphicsLayer.entities.add(entity)
    }
  },
  //构建动态线
  craeteDynamicPolyLineGraphics: function (options) {

    if (options && options.positions) {
      var entity = this.createGraphics()
      entity.polyline = {
        show: true,
        positions: [],
        material: options.material || Cesium.Color.CHARTREUSE,
        width: options.width || 5,
        clampToGround: options.clampToGround || false
      }

      entity.polyline.positions = new Cesium.CallbackProperty(function () {
        return options.positions
      }, false)

      return this._graphicsLayer.entities.add(entity)
    }
  },
  //动态椎体
  craeteDynamicCylinderGraphics: function (options) {
    var param = {};
    if (options && options.cylinder) {
      var entity = options.entity,
        cylinder = options.cylinder,
        $this = this
      param.cylinder = this.getCylinderGraphics(cylinder)
      param.position = new Cesium.CallbackProperty(function () {
        var positions = entity.position.getValue($this._viewer.clock.currentTime)
        var cartographic = $this._viewer.scene.globe.ellipsoid.cartesianToCartographic(positions)
        var lat = Cesium.Math.toDegrees(cartographic.latitude),
          lng = Cesium.Math.toDegrees(cartographic.longitude);
        // hei = parseFloat(cartographic.height / 4)
        return Cesium.Cartesian3.fromDegrees(lng, lat, 0)
      }, false)

      param.cylinder.length = new Cesium.CallbackProperty(function () {
        var positions = entity.position.getValue($this._viewer.clock.currentTime)
        var cartographic = $this._viewer.scene.globe.ellipsoid.cartesianToCartographic(positions)
        return cartographic.height * 2
      }, false)

      return param
    }
  },
  // 创建渐变锥体
  createFadeCylinderGraphics: function (options) {
    options = options || {}
    if (options && options.position) {

      let entity = this.createGraphics()
      entity.position = options.position
      options.material = new Cesium.Scene.CircleFadeMaterialProperty({
        color: options.color || Cesium.Color.fromCssColorString('#02ff00'),
        duration: options.duration || 2000,
      })
      entity.cylinder = this.getCylinderGraphics(options)

      return this._drawLayer.entities.add(entity)
    }
  },
  // 创建旋转圆柱
  craeteRotateCylinderGraphics: function (options) {

    if (options && options.position) {

      var cylinderEntity = this.createGraphics()
      cylinderEntity.cylinder = {
        HeightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
        length: options.length || 500,
        topRadius: options.topRadius || 500,
        bottomRadius: options.bottomRadius || 500,
        material: options.material || new Cesium.ImageMaterialProperty({
          image: options.img || this.getDfSt(['graphic','craeteRotateCylinderGraphics'])||'static/data/images/file/cc2.png',
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
  //闪烁圆
  craeteDynamicBlinkCircleGraphics: function (options) {

    if (options && options.position) {

      var entity = this.createGraphics(),
        alp = options.alp || 1,
        flog = options.flog || true
      entity.position = options.position
      entity.ellipse = {
        semiMinorAxis: options.semiMinorAxis || 2000.0,
        semiMajorAxis: options.semiMajorAxis || 2000.0,
        height: options.height || 10,
        material: new Cesium.ColorMaterialProperty(new Cesium.CallbackProperty(function () {
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
        }, false))
      }
      return this._graphicsLayer.entities.add(entity)
    }
  },
  //动态旋转圆
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
        _material = options.material || new Cesium.ImageMaterialProperty({
          image: options.imge || this.getDfSt(['graphic','craeteDynamicCricleGraphics'])||'static/data/images/Textures/circle_bg.png',
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
        flag ? _radius += 2 : _radius -= 2
      }
      var updateScalerAxis2 = () => {

        _scale2 >= _radius ? _radius += 2 : _radius = bg_scale
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
  //动态渐变墙
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
          image: options.img||this.getDfSt(['graphic','craeteDynamicShadeWallGraphics'])||'static/data/images/Textures/fence.png',
          transparent: true,
          color: new Cesium.CallbackProperty(function () {

            if ((num % 2) === 0) {
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
  // 默认自定义标牌气泡框
  createCustomDefBillboardGraphics: function (options) {

    if (options && options.position) {

      var $this = this,
        img = document.createElement('img')
      img.src = options.img || this.getDfSt(['graphic','createCustomDefBillboardGraphics'])||'static/data/images/file/div1.png'

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
            pixelOffset: options.b_pixelOffset || new Cesium.Cartesian2(80, -35),
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
          },
        })
        if (typeof options.callback === 'function') {

          options.callback(entity)
        }
      }
    }
  },
  // 旋转面
  craeteRotatePlaneGraphics: function (options) {

    if (options && options.center && options.positions) {

      var entity = this.createGraphics(),
        index = 0,
        positions = options.positions,
        _position = positions[0]
      entity.position = new Cesium.CallbackProperty(function () {

        if (index == 0) {
          _position = positions[0], index += 1
        } else if (index < positions.length - 1) {

          _position = positions[index], index += 1
        } else if (index == positions.length - 1) {

          _position = positions[index], index = 0
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

  // 视频投放
  createVideoPlaneGraphics: function (options) {

    if (options && options.position) {

      var entity = this.createGraphics()
      entity.position = options.position
      entity.plane = {
        plane: new Cesium.Plane(options.normal || Cesium.Cartesian3.UNIT_Y, 0.0),
        dimensions: options.dimensions || new Cesium.Cartesian2(200.0, 150.0),
        material: new Cesium.ImageMaterialProperty({
          image: options.videoElement
        })
      }
      return this._graphicsLayer.entities.add(entity)
    }
  },
  //gif 图片投影
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
            if (gif.length) { // 解析每一帧
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
  //图形旋转
  setGraphicsRotate: function (options) {

    if (options && options.entity && options.rotateAmount) {

      var entity = options.entity,
        rotateAmount = options.rotateAmount,
        _position = options.position,
        $this = this
      _position.heading = 0, _position.pitch = 0, _position.roll = 0
      entity.position = new Cesium.CallbackProperty(function () {
        return $this.transformWGS84ToCartesian(_position);
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
  // 图形浮动
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

            var positions = $this.transformCartesianArrayToWGS84Array(cartesians)
            for (var i in positions) {
              var position = positions[i]
              if (minHeiht >= maxHeiht || minHeiht <= bg_minHeiht) {
                flag = !flag
              }
              flag ? minHeiht += speed : minHeiht -= speed
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
            flag ? minHeiht += speed : minHeiht -= speed
            position.alt = minHeiht
            return $this.transformWGS84ToCartesian(position)
          }, false)
        }
      } catch (error) {
        console.log(error)
      }

    }
  },
  //canvas 贴图
  createCanvasGraphics: function (options) {

    if (options && options.positions) {

      const drawCanvasImage = function () {
        var i = 0;
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
  }
}
export {
  Graphics
}