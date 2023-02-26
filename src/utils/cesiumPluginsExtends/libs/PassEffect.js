/**
 * 后期效果模块
 * @param {*} viewer
 */
function PassEffect() {}

PassEffect.prototype = {
  // 圆形扩散效果 自定义
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
  // 雷达扫描 自定义
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
  }

}