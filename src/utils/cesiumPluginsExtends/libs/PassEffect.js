let Cesium = null;
/**
 * 后期效果模块
 * @param {*} viewer
 */
function PassEffect(viewer, cesiumGlobal) {
  if (viewer) {
    this._viewer = viewer;
    Cesium = cesiumGlobal;
  }
}

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
  },
  // 光锥扫描
  lighitCentrumScanEffect: function (data) {
    //生成分割点
    const point = this.createLightScan_getCirclePoints(data.circle[0], data.circle[1], data.circle[2], data.circle[3]);
    //生成 entityCList 圆锥
    const entityCList = this.createLightScan_entityCList(this._viewer, point, data)
    for (let i = 0; i < entityCList.length; i++) {
      if (i !== entityCList.length - 1) {
        this.createLightScan_changeOnePosition(data, entityCList[i], [point[i].x, point[i].y, point[i + 1].x, point[i + 1].y]) //中间arr 代表的是点的坐标
      } else {
        this.createLightScan_changeOnePosition(data, entityCList[i], [point[i].x, point[i].y, point[0].x, point[0].y])
      }
    }
    return entityCList
  },
  createLightScan_getCirclePoints: function (r, ox, oy, count) {
    let point = []; //结果
    let radians = (Math.PI / 180) * Math.round(360 / count), //弧度
      i = 0;
    for (; i < count; i++) {
      let x = ox + r * Math.sin(radians * i),
        y = oy + r * Math.cos(radians * i);
      point.unshift({
        x: x,
        y: y
      }); //为保持数据顺时针
    }
    return point
  },
  //改变每个面的位置
  createLightScan_changeOnePosition: function (data, entity, arr) {
    const positionList = data.positionList;
    let x, y, x0, y0, X0, Y0, n = 0,
      a = 0; //x代表差值 x0代表差值等分后的值，X0表示每次回调改变的值。a表示回调的循环窜次数，n表示扫描的坐标个数
    function f(i) {
      x = positionList[i + 1][0] - positionList[i][0]; //差值
      y = positionList[i + 1][1] - positionList[i][1]; //差值
      x0 = x / data.number; //将差值等分500份
      y0 = y / data.number;
      a = 0;
    }
    f(n);
    entity.polygon.hierarchy = new Cesium.CallbackProperty(function () { //回调函数
      if ((Math.abs(X0) >= Math.abs(x)) && (Math.abs(Y0) >= Math.abs(y))) { //当等分差值大于等于差值的时候 就重新计算差值和等分差值  Math.abs
        n = n + 1;
        if (n === positionList.length - 1) {
          n = 0;
        }
        arr[0] = arr[0] + X0;
        arr[1] = arr[1] + Y0;
        arr[2] = arr[2] + X0;
        arr[3] = arr[3] + Y0;
        f(n); //重新赋值 x y x0 y0
      }
      X0 = a * x0; //将差值的等份逐渐递增。直到大于差值 会有精度丢失,所以扩大再加 x0=x0+0.0001
      Y0 = a * y0; //将差值的等份逐渐递增。直到大于差值 会有精度丢失,所以扩大再加
      a++;
      return new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArrayHeights(
        [
          data.observer[0], data.observer[1], data.observer[2],
          arr[0] + X0, arr[1] + Y0, 0,
          arr[2] + X0, arr[3] + Y0, 0
        ]))
    }, false)
  },
  //生成 entityCList面--形成圆锥
  createLightScan_entityCList: function (viewer, point, data) {
    const lon = data.observer[0],
      lat = data.observer[1],
      h = data.observer[2];
    const entityCList = [];
    //创建 面
    for (let i = 0; i < point.length; i++) {
      let hierarchy;
      if (i === (point.length - 1)) {
        hierarchy = new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArrayHeights(
          [
            lon, lat, h,
            point[i].x, point[i].y, 0,
            point[0].x, point[0].y, 0
          ]))
      } else {
        hierarchy = new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArrayHeights(
          [
            lon, lat, h,
            point[i].x, point[i].y, 0,
            point[i + 1].x, point[i + 1].y, 0
          ]))
      }

      const entityC = viewer.entities.add({
        name: "三角形",
        polygon: {
          hierarchy: hierarchy,
          outline: false,
          perPositionHeight: true, //允许三角形使用点的高度
          material: data.material
        }
      });
      entityCList.push(entityC);
    }

    return entityCList
  }
}
export {
  PassEffect
}