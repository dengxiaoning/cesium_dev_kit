/**
 * 方量分析
 * @param {*} params
 */
function CutVolumeAnalysis(params) {

  if (params && params.positions && params.that) {

    var that = params.that,
      positions = params.positions,
      _debugShowSubTriangles = true,
      $this = this


    computeCutVolume()
  }

  /**
   * 计算多边形的重心点
   * @param {*} positions
   */
  function computeCentroidOfPolygon(positions) {
    var x = []
    var y = []

    for (var i = 0; i < positions.length; i++) {
      var cartographic = Cesium.Cartographic.fromCartesian(positions[i])

      x.push(cartographic.longitude)
      y.push(cartographic.latitude)
    }

    var x0 = 0.0,
      y0 = 0.0,
      x1 = 0.0,
      y1 = 0.0
    var signedArea = 0.0
    var a = 0.0
    var centroidx = 0.0,
      centroidy = 0.0

    for (i = 0; i < positions.length; i++) {
      x0 = x[i]
      y0 = y[i]

      if (i == positions.length - 1) {
        x1 = x[0]
        y1 = y[0]
      } else {
        x1 = x[i + 1]
        y1 = y[i + 1]
      }

      a = x0 * y1 - x1 * y0
      signedArea += a
      centroidx += (x0 + x1) * a
      centroidy += (y0 + y1) * a
    }

    signedArea *= 0.5
    centroidx /= (6.0 * signedArea)
    centroidy /= (6.0 * signedArea)

    return new Cesium.Cartographic(centroidx, centroidy)
  }

  /**
   * 计算三角形的面积
   * @param {*} pos1
   * @param {*} pos2
   * @param {*} pos3
   */
  function computeAreaOfTriangle(pos1, pos2, pos3) {
    var a = Cesium.Cartesian3.distance(pos1, pos2)
    var b = Cesium.Cartesian3.distance(pos2, pos3)
    var c = Cesium.Cartesian3.distance(pos3, pos1)

    var S = (a + b + c) / 2

    return Math.sqrt(S * (S - a) * (S - b) * (S - c))
  }

  /**
   * 计算方量
   */
  function computeCutVolume() {

    var tileAvailability = that._viewer.terrainProvider.availability
    if (!tileAvailability) {
      alert('未获取到地形')
      return false
    }
    var maxLevel = 0
    var minHeight = 15000
    // 计算差值点
    for (var i = 0; i < positions.length; i++) {
      var cartographic = Cesium.Cartographic.fromCartesian(positions[i])
      var height = that._viewer.scene.globe.getHeight(cartographic)

      if (minHeight > height)
        minHeight = height

      var level = tileAvailability.computeMaximumLevelAtPosition(cartographic)

      if (maxLevel < level)
        maxLevel = level
    }

    var granularity = Math.PI / Math.pow(2, 11)
    granularity = granularity / (64)
    var polygonGeometry = new Cesium.PolygonGeometry.fromPositions({
      positions: positions,
      vertexFormat: Cesium.PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
      granularity: granularity
    })

    //polygon subdivision

    var geom = new Cesium.PolygonGeometry.createGeometry(polygonGeometry)

    var totalCutVolume = 0
    var maxHeight = 0

    var i0, i1, i2
    var height1, height2, height3
    var p1, p2, p3
    var bottomP1, bottomP2, bottomP3
    var scratchCartesian = new Cesium.Cartesian3()
    var bottomArea
    var subTrianglePositions


    for (i = 0; i < geom.indices.length; i += 3) {
      i0 = geom.indices[i]
      i1 = geom.indices[i + 1]
      i2 = geom.indices[i + 2]

      subTrianglePositions = geom.attributes.position.values

      scratchCartesian.x = subTrianglePositions[i0 * 3]
      scratchCartesian.y = subTrianglePositions[i0 * 3 + 1]
      scratchCartesian.z = subTrianglePositions[i0 * 3 + 2]

      cartographic = Cesium.Cartographic.fromCartesian(scratchCartesian)

      height1 = that._viewer.scene.globe.getHeight(cartographic)

      p1 = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, height1)
      bottomP1 = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0)

      if (maxHeight < height1)
        maxHeight = height1

      scratchCartesian.x = subTrianglePositions[i1 * 3]
      scratchCartesian.y = subTrianglePositions[i1 * 3 + 1]
      scratchCartesian.z = subTrianglePositions[i1 * 3 + 2]

      cartographic = Cesium.Cartographic.fromCartesian(scratchCartesian)

      height2 = that._viewer.scene.globe.getHeight(cartographic)

      p2 = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, height2)
      bottomP2 = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0)

      if (maxHeight < height2)
        maxHeight = height2

      scratchCartesian.x = subTrianglePositions[i2 * 3]
      scratchCartesian.y = subTrianglePositions[i2 * 3 + 1]
      scratchCartesian.z = subTrianglePositions[i2 * 3 + 2]

      cartographic = Cesium.Cartographic.fromCartesian(scratchCartesian)

      height3 = that._viewer.scene.globe.getHeight(cartographic)

      p3 = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, height3)
      bottomP3 = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0)

      if (maxHeight < height3)
        maxHeight = height3

      bottomArea = computeAreaOfTriangle(bottomP1, bottomP2, bottomP3)

      totalCutVolume = totalCutVolume + bottomArea * (height1 - minHeight + height2 - minHeight + height3 - minHeight) / 3

      if (_debugShowSubTriangles) {
        var positionsarr = []

        positionsarr.push(p1)
        positionsarr.push(p2)
        positionsarr.push(p3)

        var drawingPolygon = {
          polygon: {
            hierarchy: {
              positions: positionsarr
            },
            extrudedHeight: 0,
            perPositionHeight: true,
            material: Cesium.Color.fromRandom().withAlpha(0.5),
            outline: true,
            closeTop: true,
            closeBottom: true,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2
          }
        }

        that._analysisLayer.entities.add(drawingPolygon)
      }

    }
    var centroid = computeCentroidOfPolygon(positions)
    $this._volumeLabel = that._analysisLayer.entities.add({
      position: Cesium.Cartesian3.fromRadians(centroid.longitude, centroid.latitude, maxHeight + 1000),
      label: {
        text: 'Cut Volume ' + totalCutVolume.toString() + 'm3'
      }
    })

    return maxHeight
  }
}