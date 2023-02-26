/**
 * 通视分析
 * @param {*} params
 */
function VisibilityAnalysis(params) {

  if (params && params.positions) {
    var positions = params.positions,
      that = params.that,
      points = [],
      lines = [],
      pickedObjs = [],
      position1 = that.transformWGS84ToCartesian(positions[0]),
      position2 = that.transformWGS84ToCartesian(positions[1])
    points = that.createPointsGraphics({
      point: true,
      positions: [position1, position2]
    })

    var results = that.getIntersectObj(position1, position2, points, true) //碰撞检测

    if (results.length === 0) {

      alert('没有取到相交点 , 请检查是否开启深度检测。')
      return false
    }

    //显示相交对象 高亮
    const showIntersections = function () {
      for (let i = 0; i < results.length; ++i) {
        var object = results[i].object
        if (object) {
          if (object instanceof Cesium.Cesium3DTileFeature) {

            pickedObjs.push(object)
            object.oldColor = object.color.clone()
            object.color = Cesium.Color.fromAlpha(Cesium.Color.YELLOW, object.color.alpha)
          } else if (object.id instanceof Cesium.Entity) {
            var entity = object.id
            pickedObjs.push(entity)
            var color = entity.polygon.material.color.getValue()
            entity.polygon.oldColor = color.clone()
            entity.polygon.material = Cesium.Color.fromAlpha(Cesium.Color.YELLOW, color.alpha)
          }
        }
        //相交点
        points.push(that._analysisLayer.entities.add({
          position: results[i].position,
          ellipsoid: {
            radii: new Cesium.Cartesian3(0.8, 0.8, 0.8),
            material: Cesium.Color.RED
          }
        }))
      }
    }

    // 计算分析结果
    const computesResult = function () {

      //分析一下是否都有position
      for (let index = results.length - 1; index >= 0; index--) {
        const element = results[index]
        if (!Cesium.defined(element.position)) {
          results.splice(index, 1)
        }
      }
      if (!Cesium.defined(results[0].position)) {
        throw new Cesium.DeveloperError('position is undefined')
      }
      var pickPos1 = results[0].position
      var dis = Cesium.Cartesian3.distance(pickPos1, position2)
      var bVisibility = dis < 5 ? true : false //
      var arrowPositions = [position1, results[0].position]
      //通视线
      var greenLine = that._analysisLayer.entities.add({
        polyline: {
          positions: arrowPositions,
          width: 10,
          arcType: Cesium.ArcType.NONE,
          material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.GREEN)
        }
      })
      lines.push(greenLine)
      //不通视
      if (!bVisibility) {
        var unArrowPositions = [results[0].position, position2]
        var redLine = that._analysisLayer.entities.add({
          polyline: {
            positions: unArrowPositions,
            width: 10,
            arcType: Cesium.ArcType.NONE,
            material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.RED)
          }
        })

        lines.push(redLine)
      }
      showIntersections()
      var rad1 = Cesium.Cartographic.fromCartesian(position1)
      var rad2 = Cesium.Cartographic.fromCartesian(position2)
      var degree1 = {
        longitude: rad1.longitude / Math.PI * 180,
        latitude: rad1.latitude / Math.PI * 180,
        height: rad1.height
      }
      var degree2 = {
        longitude: rad2.longitude / Math.PI * 180,
        latitude: rad2.latitude / Math.PI * 180,
        height: rad2.height
      }

      var length_ping = Math.sqrt(Math.pow(position1.x - position2.x, 2) + Math.pow(position1.y - position2.y, 2) + Math.pow(position1.z - position2.z, 2))
      var length_h = Math.abs(degree2.height - degree1.height)
      var length = Math.sqrt(Math.pow(length_ping, 2) + Math.pow(length_h, 2))

      var visTxt = bVisibility ? '是' : '否'
      var text =
        '起点坐标: ' + ('   (' + degree1.longitude.toFixed(6)) + '\u00B0' + ',' + (degree1.latitude.toFixed(6)) + '\u00B0' + ',' + degree1.height.toFixed(2) + ')' +
        '\n终点坐标: ' + ('   (' + degree2.longitude.toFixed(6)) + '\u00B0' + ',' + (degree2.latitude.toFixed(6)) + '\u00B0' + ',' + degree2.height.toFixed(2) + ')' +
        '\n垂直距离: ' + '   ' + length_h.toFixed(2) + 'm' +
        '\n水平距离: ' + '   ' + length_ping.toFixed(2) + 'm' +
        '\n空间距离: ' + '   ' + length.toFixed(2) + 'm' +
        '\n是否可视: ' + '   ' + visTxt

      if (points && points[0]) {
        points[0].label = {
          text: text,
          showBackground: true,
          font: '14px monospace',
          fillColor: Cesium.Color.YELLOW,
          pixelOffset: {
            x: 0,
            y: -20
          },
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT
        }
      }
    }

    computesResult() // 计算相交结果
  }

  VisibilityAnalysis.prototype.remove = function () {}
}