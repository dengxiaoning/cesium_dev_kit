/**
 * @description D3Kit 拓展包
 *
 * 分析模块
 * @param {*} viewer
 */
function Analysis(viewer) {
  if (viewer) {
    this._analysisLayer = new Cesium.CustomDataSource('analysisLayer')

    viewer && viewer.dataSources.add(this._analysisLayer)
  }
}

Analysis.prototype = {
  /**
   * 创建通视分析
   * @param {*} options
   */
  createVisibilityAnalysis: function (options) {
    options = options || {}
    var $this = this
    $this.drawLineGraphics({
      type: 'straightLine',
      clampToGround: false,
      callback: function (line, lineObj) {
        var _visibilityAnalysis = new VisibilityAnalysis({
          positions: line,
          that: $this
        })

        if ($this._graphicsLayer) $this._graphicsLayer.entities.remove(lineObj)

        if (typeof options.callback === 'function') {
          options.callback(_visibilityAnalysis)
        }
      }
    })
  },
  /**
   * 创建环视分析
   * @param {*} options
   */
  createLookAroundAnalysis: function (options) {
    options = options || {}
    if (this._viewer && options) {
      var $this = this
      $this.drawCircleGraphics({
        callback: function (result, obj) {

          $this._drawLayer.entities.remove(obj)

          let _lookAroundAnalysis = new LookAroundAnalysis({
            that: $this,
            radius: result.radius,
            center: result.center
          })

          if (typeof options.callback === 'function') {

            options.callback(_lookAroundAnalysis)
          }
        }
      })
    }
  },
  /**
   * 创建可视域分析
   * @param {*} options
   */
  createVisualFieldAnalysis: function (options) {
    options = options || {}
    if (this._viewer && options) {
      var $this = this,
        _shadowPrimitive = null
      $this.bindHandelEvent(
        function click(event, _handlers) {
          var position = $this._viewer.scene.pickPosition(event.position)
          if (!position) return false
          if (!Cesium.defined(_shadowPrimitive)) {
            // 创建shadowPrimitve
            _shadowPrimitive = new Cesium.ShadowPrimitive({

              scene: $this._viewer.scene,
              viewerPosition: position
            })

            $this._analysisLayer._primitives.add(_shadowPrimitive)
          } else {

            _handlers.destroy()
            _handlers = null
          }
        },
        function move(event) {

          var position = $this._viewer.scene.pickPosition(event.endPosition)
          if (!position) return false
          if (_shadowPrimitive) _shadowPrimitive.setPoseByTargetPoint(position)
        })
    }
  },
  /**
   * 地形开挖分析
   * @param {*} options
   */
  createClipPlanAnalysis: function (options) {
    options = options || {}
    if (this._viewer && options) {
      var $this = this
      var _height = options.height || 30,
        _splitNum = options.splitNum || 50,
        _wallImg = options.wallImg || '/static/data/images/file/excavate_side_min.jpg',
        _bottomImg = options.bottomImg || '/static/data/images/file/excavate_bottom_min.jpg'
      $this.drawPolygonGraphics({
        callback: function (polygon, polygonObj) {

          $this._drawLayer.entities.remove(polygonObj)

          let terrainClipPlan = new Cesium.TerrainClipPlan($this._viewer, {
            height: _height,
            splitNum: _splitNum,
            wallImg: _wallImg,
            bottomImg: _bottomImg
          })
          terrainClipPlan.updateData($this.transformWGS84ArrayToCartesianArray(polygon))

          if (typeof options.callback === 'function') {

            options.callback(terrainClipPlan)
          }
        }
      })
    }
  },
  /**
   * 创建淹没分析
   * @param {*} options
   */
  createSubmergedAnalysis: function (options) {
    options = options || {}
    if (this._viewer && options) {
      var $this = this,
        _maxH = options.maxH || 15,
        _speed = options.speed || 1,
        _interval = options.interval || 10
      $this.drawPolygonGraphics({
        height: 1,
        callback: function (polygon, polygonObj) {
          if (!$this._viewer.scene.globe.depthTestAgainstTerrain) {
            alert('请开启深度检测')
            return false
          }
          if (polygonObj) {
            setTimeout(() => {

              polygonObj.polygon.heightReference = 'CLAMP_TO_GROUND'
              polygonObj.polygon.material = '/static/data/images/file/water.png'
              var h = 0.0
              polygonObj.polygon.extrudedHeight = h
              var st = setInterval(function () {
                h = h + _speed
                if (h >= _maxH) {
                  h = _maxH
                  clearTimeout(st)
                }
                polygonObj.polygon.extrudedHeight = h
              }, _interval)

            }, 2000)
          }
        }
      })
    }
  },
  /**
   * 创建坡度分析
   * @param {*} options
   */
  createSlopeAnalysis: function (options) {
    options = options || {}
    if (!echarts) {

      alert('需要引入echarts库')
      return false
    }
    if (this._viewer && options) {
      $this.drawLineGraphics({
        type: 'straightLine',
        clampToGround: false,
        callback: function (line, lineObj) {
          var _slopeAnalysis = new SlopeAnalysis({
            positions: line,
            that: $this
          })

          if ($this._graphicsLayer) $this._graphicsLayer.entities.remove(lineObj)

          if (typeof options.callback === 'function') {
            options.callback(_slopeAnalysis)
          }
        }
      })
    }
  },
  /**
   * 方量分析
   * @param {*} options
   */
  createCutVolumeAnalysis: function (options) {
    options = options || {}
    if (this._viewer && options) {
      var $this = this
      $this.drawWallGraphics({
        callback: function (wall) {

          var _cutVolumeAnalysis = new CutVolumeAnalysis({

            positions: $this.transformWGS84ArrayToCartesianArray(wall, 100),
            that: $this
          })

          if (typeof options.callback === 'function') {
            options.callback(_cutVolumeAnalysis)
          }
        }
      })
    }
  }
}