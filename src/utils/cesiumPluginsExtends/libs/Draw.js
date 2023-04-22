let Cesium = null;
import{Graphics} from './Graphics'
/**
 * 画笔模块
 * @param {*} viewer
 */
function Draw(viewer, cesiumGlobal) {

  if (viewer) {
    Cesium = cesiumGlobal;
    this._drawLayer = new Cesium.CustomDataSource('drawLayer')
      this.$graphics = new Graphics(viewer,cesiumGlobal)
    viewer && viewer.dataSources.add(this._drawLayer)
  }
}

Draw.prototype = {
  /**
   * 画点
   * @param {*} options
   */
  drawPointGraphics: function (options) {
    options = options || {}
    options.style = options.style || {
      image: 'static/data/images/file/location4.png',
      width: 35,
      height: 40,
      clampToGround: true,
      scale: 1,
      pixelOffset: new Cesium.Cartesian2(0, -20),
    }

    if (this._viewer && options) {

      var _poiEntity = new Cesium.Entity(),
        position, positions = [],
        poiObj, $this = this,
        _handlers = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas)
      // left
      _handlers.setInputAction(function (movement) {

        var cartesian = $this._viewer.scene.camera.pickEllipsoid(movement.position, $this._viewer.scene.globe.ellipsoid)
        if (cartesian && cartesian.x) {
          position = cartesian

          positions.push(cartesian)
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
      // right
      _handlers.setInputAction(function (movement) {

        _handlers.destroy()
        _handlers = null

        if (typeof options.callback === 'function') {

          options.callback($this.transformCartesianArrayToWGS84Array(positions), poiObj)
        }
      }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)

      _poiEntity.billboard = options.style
      _poiEntity.position = new Cesium.CallbackProperty(function () {
        return position
      }, false)

      poiObj = this._drawLayer.entities.add(_poiEntity)
    }
  },
  /**
   * 画线 or 测距
   * @param {*} options
   */
  drawLineGraphics: function (options) {
    options = options || {}
    if (this._viewer && options) {

      var positions = [],
        _lineEntity = new Cesium.Entity(),
        $this = this,
        lineObj,
        _handlers = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas)
      // left
      _handlers.setInputAction(function (movement) {

        var cartesian = $this.getCatesian3FromPX(movement.position)
        if (cartesian && cartesian.x) {
          if (positions.length == 0) {
            positions.push(cartesian.clone())
          }
          if (options.measure) {
            _addInfoPoint(cartesian)
          }
          // 绘制直线 两个点
          if (positions.length == 2 && options.type === 'straightLine') {
            _handlers.destroy()
            _handlers = null
            if (typeof options.callback === 'function') {

              options.callback($this.transformCartesianArrayToWGS84Array(positions), lineObj)
            }
          }
          positions.push(cartesian)
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

      _handlers.setInputAction(function (movement) {

        var cartesian = $this.getCatesian3FromPX(movement.endPosition)
        if (positions.length >= 2) {
          if (cartesian && cartesian.x) {
            positions.pop()
            positions.push(cartesian)
          }
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
      // right
      _handlers.setInputAction(function (movement) {

        _handlers.destroy()
        _handlers = null

        var cartesian = $this.getCatesian3FromPX(movement.position)
        if (options.measure) {
          _addInfoPoint(cartesian)
        }
        if (typeof options.callback === 'function') {

          options.callback($this.transformCartesianArrayToWGS84Array(positions), lineObj)
        }
      }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)

      _lineEntity.polyline = {
        width: options.width || 5,
        material: options.material || Cesium.Color.BLUE.withAlpha(0.8),
        clampToGround: options.clampToGround || false,
        clampToS3M: options.clampToS3M || false
      }
      _lineEntity.polyline.positions = new Cesium.CallbackProperty(function () {
        return positions
      }, false)

      lineObj = this._drawLayer.entities.add(_lineEntity)

      //添加坐标点
      const _addInfoPoint = function (position) {
        var _labelEntity = new Cesium.Entity()
        _labelEntity.position = position
        _labelEntity.point = {
          pixelSize: 10,
          outlineColor: Cesium.Color.BLUE,
          outlineWidth: 5
        }
        _labelEntity.label = {
          text: ($this.getPositionDistance($this.transformCartesianArrayToWGS84Array(positions)) / 1000).toFixed(4) + '公里',
          show: true,
          showBackground: true,
          font: '14px monospace',
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(-20, -80) //left top
        }
        $this._drawLayer.entities.add(_labelEntity)
      }
    }

  },
  /**
   * 画面 or 测面积
   * @param {*} options
   */
  drawPolygonGraphics: function (options) {

    options = options || {}
    options.style = options.style || {
      width: 3,
      material: Cesium.Color.BLUE.withAlpha(0.8),
      clampToGround: true
    }
    if (this._viewer && options) {

      var positions = [],
        polygon = new Cesium.PolygonHierarchy(),
        _polygonEntity = new Cesium.Entity(),
        $this = this,
        polyObj = null,
        _handler = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas);
      const create = function () {
        _polygonEntity.polyline = options.style

        _polygonEntity.polyline.positions = new Cesium.CallbackProperty(function () {
          return positions
        }, false)

        _polygonEntity.polygon = {

          hierarchy: new Cesium.CallbackProperty(function () {
            return polygon
          }, false),

          material: Cesium.Color.WHITE.withAlpha(0.1),
          clampToGround: options.clampToGround || false
        }
        _polygonEntity.clampToS3M = true

        polyObj = $this._drawLayer.entities.add(_polygonEntity)
      }

      const _addInfoPoint = function (position) {
        var _labelEntity = new Cesium.Entity()
        _labelEntity.position = position
        _labelEntity.point = {
          pixelSize: 10,
          outlineColor: Cesium.Color.BLUE,
          outlineWidth: 5
        }
        _labelEntity.label = {
          text: ($this.getPositionsArea($this.transformCartesianArrayToWGS84Array(positions)) / 1000000.0).toFixed(4) + '平方公里',
          show: true,
          showBackground: true,
          font: '14px monospace',
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          pixelOffset: new Cesium.Cartesian2(-20, -50) //left top
        }
        $this._drawLayer.entities.add(_labelEntity)
      }

      // left
      _handler.setInputAction(function (movement) {

        var cartesian = $this.getCatesian3FromPX(movement.position)
        if (cartesian && cartesian.x) {
          if (positions.length == 0) {
            polygon.positions.push(cartesian.clone())
            positions.push(cartesian.clone())
          }
          positions.push(cartesian.clone())
          polygon.positions.push(cartesian.clone())

          if (!polyObj) create()
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
      // mouse
      _handler.setInputAction(function (movement) {

        var cartesian = $this.getCatesian3FromPX(movement.endPosition)
        if (positions.length >= 2) {
          if (cartesian && cartesian.x) {
            positions.pop()
            positions.push(cartesian)
            polygon.positions.pop()
            polygon.positions.push(cartesian)
          }
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

      // right
      _handler.setInputAction(function () {
        _handler.destroy()

        positions.push(positions[0])

        if (options.height) { //立体
          _polygonEntity.polygon.extrudedHeight = options.height
          _polygonEntity.polygon.material = Cesium.Color.BLUE.withAlpha(0.5)
        }
        if (options.measure) { // 量测
          _addInfoPoint(positions[0])
        }
        if (typeof options.callback === 'function') {

          options.callback($this.transformCartesianArrayToWGS84Array(positions), polyObj)
        }
      }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)


    }

  },
  /**
   * 画矩形
   * @param {*} options
   */
  drawRectangleGraphics: function (options) {
    options = options || {}
    options.style = options.style || {
      width: 3,
      material: Cesium.Color.BLUE.withAlpha(0.5),
      clampToGround: true
    }
    if (this._viewer && options) {

      var _positions = [],
        _rectangleEntity = new Cesium.Entity(),
        _coordinates = new Cesium.Rectangle(),
        $this = this,
        rectangleObj,
        _handler = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas)
      // left
      _handler.setInputAction(function (movement) {

        var cartesian = $this.getCatesian3FromPX(movement.position)
        if (cartesian && cartesian.x) {

          if (_positions.length == 0) {

            _positions.push(cartesian.clone())
          } else {
            _handler.destroy()

            _positions.push(cartesian.clone())

            _coordinates = Cesium.Rectangle.fromCartesianArray([..._positions, cartesian], Cesium.Ellipsoid.WGS84)

            if (typeof options.callback === 'function') {

              options.callback($this.transformCartesianArrayToWGS84Array(_positions), rectangleObj)
            }
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
      // mouse
      _handler.setInputAction(function (movement) {

        var cartesian = $this.getCatesian3FromPX(movement.endPosition)

        if (cartesian) {

          _coordinates = Cesium.Rectangle.fromCartesianArray([..._positions, cartesian], Cesium.Ellipsoid.WGS84)

        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

      _rectangleEntity.rectangle = options.style

      if (options.height) _rectangleEntity.rectangle.extrudedHeight = options.height
      _rectangleEntity.rectangle.coordinates = new Cesium.CallbackProperty(function () {
        return _coordinates
      }, false)
      rectangleObj = this._drawLayer.entities.add(_rectangleEntity)
    }
  },
  /**
   * 画圆
   * @param {*} options
   */
  drawCircleGraphics: function (options) {
    options = options || {}
    options.style = options.style || {
      width: 3,
      material: Cesium.Color.BLUE.withAlpha(0.5),
      clampToGround: true
    }
    if (this._viewer && options) {

      var _center = undefined,
        _circleEntity = new Cesium.Entity(),
        $this = this,
        circleObj, _radius = 1,
        _handler = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas)

      // 计算半径
      const computeRadius = function (src, dest) {
        let srcCartographic = Cesium.Cartographic.fromCartesian(src)
        let destCartographic = Cesium.Cartographic.fromCartesian(dest)
        let geodesic = new Cesium.EllipsoidGeodesic()
        geodesic.setEndPoints(srcCartographic, destCartographic)
        let s = geodesic.surfaceDistance
        _radius = Math.sqrt( //开平方
          Math.pow(s, 2) +
          Math.pow(destCartographic.height - srcCartographic.height, 2)
        )
      }

      //
      const drawGraphics = function () {

        _circleEntity.ellipse = options.style
        _circleEntity.ellipse.semiMajorAxis = new Cesium.CallbackProperty(function () {
          return _radius
        }, false)
        _circleEntity.ellipse.semiMinorAxis = new Cesium.CallbackProperty(function () {
          return _radius
        }, false)
        _circleEntity.position = new Cesium.CallbackProperty(function () {
          return _center
        }, false)

        _circleEntity.point = {
          pixelSize: 5,
          outlineColor: Cesium.Color.RED,
          outlineWidth: 3
        }

        if (options.height) _circleEntity.ellipse.extrudedHeight = options.height

        circleObj = $this._drawLayer.entities.add(_circleEntity)
      }

      // left
      _handler.setInputAction(function (movement) {

        var cartesian = $this.getCatesian3FromPX(movement.position)

        if (cartesian && cartesian.x) {
          if (!_center) {

            _center = cartesian

            drawGraphics()

          } else {

            computeRadius(_center, cartesian)

            _handler.destroy()

            if (typeof options.callback === 'function') {

              options.callback({
                center: _center,
                radius: _radius
              }, circleObj)
            }
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
      // mouse
      _handler.setInputAction(function (movement) {

        var cartesian = $this._viewer.scene.camera.pickEllipsoid(movement.endPosition, $this._viewer.scene.globe.ellipsoid)
        if (_center && cartesian && cartesian.x) {

          computeRadius(_center, cartesian)
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    }
  },
  /**
   * 画三角量测
   * @param {*} options
   */
  drawTrianglesGraphics: function (options) {
    options = options || {}
    options.style = options.style || {
      width: 3,
      material: Cesium.Color.BLUE.withAlpha(0.5)
    }
    if (this._viewer && options) {

      var _trianglesEntity = new Cesium.Entity(),
        _tempLineEntity = new Cesium.Entity(),
        _tempLineEntity2 = new Cesium.Entity(),
        _positions = [],
        _tempPoints = [],
        _tempPoints2 = [],
        $this = this,
        _handler = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas)

      // 高度
      const _getHeading = function (startPosition, endPosition) {
        if (!startPosition && !endPosition) return 0
        if (Cesium.Cartesian3.equals(startPosition, endPosition)) return 0
        let cartographic = Cesium.Cartographic.fromCartesian(startPosition)
        let cartographic2 = Cesium.Cartographic.fromCartesian(endPosition)
        return (cartographic2.height - cartographic.height).toFixed(2)
      }

      // 偏移点
      const _computesHorizontalLine = function (positions) {
        let cartographic = Cesium.Cartographic.fromCartesian(positions[0])
        let cartographic2 = Cesium.Cartographic.fromCartesian(positions[1])
        return Cesium.Cartesian3.fromDegrees(
          Cesium.Math.toDegrees(cartographic.longitude),
          Cesium.Math.toDegrees(cartographic.latitude),
          cartographic2.height
        )
      }

      // left
      _handler.setInputAction(function (movement) {

        var position = $this.getCatesian3FromPX(movement.position)
        if (!position) return false
        if (_positions.length == 0) {
          _positions.push(position.clone())
          _positions.push(position.clone())
          _tempPoints.push(position.clone())
          _tempPoints.push(position.clone())
        } else {
          _handler.destroy()
          if (typeof options.callback === 'function') {

            options.callback({
              e: _trianglesEntity,
              e2: _tempLineEntity,
              e3: _tempLineEntity2
            })
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
      // mouse
      _handler.setInputAction(function (movement) {

        var position = $this.getCatesian3FromPX(movement.endPosition)
        if (position && _positions.length > 0) {
          //直线
          _positions.pop()
          _positions.push(position.clone())
          let horizontalPosition = _computesHorizontalLine(_positions)
          //高度
          _tempPoints.pop()
          _tempPoints.push(horizontalPosition.clone())
          //水平线
          _tempPoints2.pop(), _tempPoints2.pop()
          _tempPoints2.push(position.clone())
          _tempPoints2.push(horizontalPosition.clone())
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

      // create entity

      //直线
      _trianglesEntity.polyline = {
        positions: new Cesium.CallbackProperty(function () {
          return _positions
        }, false),
        ...options.style
      }
      _trianglesEntity.position = new Cesium.CallbackProperty(function () {
        return _positions[0]
      }, false)
      _trianglesEntity.point = {
        pixelSize: 5,
        outlineColor: Cesium.Color.BLUE,
        outlineWidth: 5
      }
      _trianglesEntity.label = {
        text: new Cesium.CallbackProperty(function () {
          return '直线:' + $this.getPositionDistance($this.transformCartesianArrayToWGS84Array(_positions)) + '米'
        }, false),
        show: true,
        showBackground: true,
        font: '14px monospace',
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(50, -100) //left top
      }
      //高度
      _tempLineEntity.polyline = {
        positions: new Cesium.CallbackProperty(function () {
          return _tempPoints
        }, false),
        ...options.style
      }
      _tempLineEntity.position = new Cesium.CallbackProperty(function () {
        return _tempPoints2[1]
      }, false)
      _tempLineEntity.point = {
        pixelSize: 5,
        outlineColor: Cesium.Color.BLUE,
        outlineWidth: 5
      }
      _tempLineEntity.label = {
        text: new Cesium.CallbackProperty(function () {
          return '高度:' + _getHeading(_tempPoints[0], _tempPoints[1]) + '米'
        }, false),
        show: true,
        showBackground: true,
        font: '14px monospace',
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(-20, 100) //left top
      }
      //水平
      _tempLineEntity2.polyline = {
        positions: new Cesium.CallbackProperty(function () {
          return _tempPoints2
        }, false),
        ...options.style
      }
      _tempLineEntity2.position = new Cesium.CallbackProperty(function () {
        return _positions[1]
      }, false)
      _tempLineEntity2.point = {
        pixelSize: 5,
        outlineColor: Cesium.Color.BLUE,
        outlineWidth: 5
      }
      _tempLineEntity2.label = {
        text: new Cesium.CallbackProperty(function () {
          return '水平距离:' + $this.getPositionDistance($this.transformCartesianArrayToWGS84Array(_tempPoints2)) + '米'
        }, false),
        show: true,
        showBackground: true,
        font: '14px monospace',
        horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(-150, -20) //left top
      }
      this._drawLayer.entities.add(_tempLineEntity2)
      this._drawLayer.entities.add(_tempLineEntity)
      this._drawLayer.entities.add(_trianglesEntity)
    }
  },
  /**
   * 画围栏
   * @param {*} options
   */
  drawWallGraphics: function (options) {
    options = options || {}
    options.style = options.style || {
      material: Cesium.Color.BLUE.withAlpha(0.5),
      outline: true,
      outlineColor: Cesium.Color.WHITE
    }
    if (this._viewer && options) {
      var $this = this
      this.drawPolygonGraphics({
        callback: function (polygon, polygonObj) {

          var wallEntity = $this._drawLayer.entities.add({
            wall: {
              positions: $this.transformWGS84ArrayToCartesianArray(polygon),
              ...options.style
            }
          })
          if (typeof options.callback === 'function') {

            options.callback(polygon, wallEntity)
          }
        }
      })
    }
  },
  /**
   * 绘制球体
   * @param {*} options
   */
  drawEllipsoidGraphics: function (options) {
    options = options || {}
    options.style = options.style || {}
    if (this._viewer && options) {
      var $this = this
      this.drawCircleGraphics({
        callback: function (result, obj) {

          var entity = $this.createGraphics()
          entity.ellipsoid = $this.$graphics.getEllipsoidGraphics({
            radii: result.radius
          })
          entity.position = result.center

          $this._drawLayer.entities.remove(obj)

          var ellipsoidObj = $this._drawLayer.entities.add(entity)

          if (typeof options.callback === 'function') {

            options.callback({
              center: result.center,
              radius: result.radius
            }, ellipsoidObj)
          }
        }
      })
    }
  },
  /**
   * 绘制圆柱体 or 圆锥
   * @param {*} options
   */
  drawCylinderGraphics: function (options) {
    options = options || {}
    options.style = options.style || {}
    if (this._viewer && options) {
      var $this = this
      this.drawCircleGraphics({
        callback: function (result, obj) {

          var cylinderObj = $this._drawLayer.entities.add({
            position: result.center,
            cylinder: {
              length: result.radius * 2 || options.length,
              topRadius: options.topRadius || result.radius,
              bottomRadius: options.bottomRadius || result.radius,
              material: Cesium.Color.BLUE.withAlpha(0.5),
              outline: true,
              outlineColor: Cesium.Color.WHITE,
            },
          })
          $this._drawLayer.entities.remove(obj)

          if (typeof options.callback === 'function') {

            options.callback({
              center: result.center,
              radius: result.radius
            }, cylinderObj)
          }
        }
      })
    }
  },
  /**
   * 绘制走廊
   * @param {*} options
   */
  drawCorridorGraphics: function (options) {
    options = options || {}
    options.style = options.style || {}
    if (this._viewer && options) {
      var $this = this
      $this.drawLineGraphics({
        callback: function (line, lineObj) {
          var entity = $this.createGraphics()
          entity.corridor = {
            positions: $this.transformWGS84ArrayToCartesianArray(line),
            height: options.height || 1,
            width: options.width || 100,
            cornerType: Cesium.CornerType.BEVELED,
            extrudedHeight: options.extrudedHeight || 1,
            material: Cesium.Color.BLUE.withAlpha(0.5),
            outline: true, // height required for outlines to display
            outlineColor: Cesium.Color.WHITE
          }

          $this._drawLayer.entities.remove(lineObj)

          var corridorObj = $this._drawLayer.entities.add(entity)

          if (typeof options.callback === 'function') {

            options.callback(line, corridorObj)
          }
        }
      })
    }
  },

  /**
   * 绘制管道
   * @param {*} options
   * {
   * color:颜色，
   * style：样式，
   * circleRadius：圆形管道半径
   * arms：五角管道指数
   * rOuter：五角管道外圆半径
   * rInner：五角管道内圆半径
   * }
   */
  drawPolylineVolumeGraphics: function (options) {
    options = options || {};
    options.style = options.style || {};
    const circleRadius = options.circleRadius || 20,
      arms = options.arms || 7,
      rOuter = options.rOuter || 150,
      rInner = options.rInner || 75;
    if (this._viewer && options) {
      var $this = this
      $this.drawLineGraphics({
        callback: function (line, lineObj) {
          var entity = $this.createGraphics();
          let shapeVal = options.shape === 'fivePoint' ?
            $this.computeStar2d(arms, rOuter, rInner) :
            $this.computeCircleShap(circleRadius);
          entity.polylineVolume = {
            positions: $this.transformWGS84ArrayToCartesianArray(line),
            shape: shapeVal,
            cornerType: Cesium.CornerType.MITERED,
            material: options.color||Cesium.Color.RED,
          }
          $this._drawLayer.entities.remove(lineObj)

          var polylineVolumeObj = $this._drawLayer.entities.add(entity)

          if (typeof options.callback === 'function') {

            options.callback(line, polylineVolumeObj)
          }
        }
      })
    }
  }
}
export {
  Draw
}