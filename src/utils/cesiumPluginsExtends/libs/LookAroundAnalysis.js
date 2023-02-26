/**
 * 环视分析
 * @param {*} params
 */
function LookAroundAnalysis(params) {
  if (!params && !params.center && !params.radius && params.that) {

    alert('没有获取到分析参数')
    return false
  }

  var that = params.that,
    $this = this
  if (!that._viewer.scene.globe.depthTestAgainstTerrain) {

    alert('请开启深度检测')
    return false
  }

  var viewHeight = params.viewHeight || 10
  var cartographicCenter = Cesium.Cartographic.fromCartesian(params.center)
  // 分析
  try {
    var ab = params.radius
    var eopt = {}
    eopt.semiMinorAxis = ab
    eopt.semiMajorAxis = ab
    eopt.rotation = 0
    eopt.center = params.center
    eopt.granularity = Math.PI / 45.0 //间隔
    let ellipse = that.computeEllipseEdgePositions(eopt) //范围当前椭圆位置的数组
    for (let i = 0; i < ellipse.outerPositions.length; i += 3) {
      //逐条计算可视域
      let cartesian = new Cesium.Cartesian3(ellipse.outerPositions[i], ellipse.outerPositions[i + 1], ellipse.outerPositions[i + 2])
      let cartographic = Cesium.Cartographic.fromCartesian(cartesian)
      let deltaRadian = 0.00005 * Math.PI / 180.0 //Cesium.Math.RADIANS_PER_DEGREE
      let cartographicArr = that.computeInterpolateLineCartographic(cartographicCenter, cartographic, deltaRadian)
      that.computeCartographicPointsTerrainData(cartographicArr,
        function (terrainData) {
          if (terrainData.length > 0) {
            let preVisible = true
            let cartesiansLine = []
            let colors = []
            for (let j = 1; j < terrainData.length; j++) {
              //逐点计算可见性
              let visible = true //该点可见性
              if (j > 1) {
                let cartographicCenterHV = new Cesium.Cartographic(terrainData[0].longitude, terrainData[0].latitude, terrainData[0].height + viewHeight)
                if (preVisible) {
                  //
                  let curPoint = that.computeInterpolateIndexLineHeightCartographic(cartographicCenterHV, terrainData[j], j, j - 1)
                  if (curPoint.height >= terrainData[j - 1].height) {
                    preVisible = true
                    visible = true
                  } else {
                    preVisible = false
                    visible = false
                  }
                } else {
                  //插值到当前
                  let curPointArr = that.computeInterpolateIndexLineHeightCartographic(cartographicCenterHV, terrainData[j], j, j - 1)
                  for (let k = 0; k < curPointArr.length; k++) {
                    if (curPointArr[k].height >= terrainData[k].height) {
                      preVisible = true
                      visible = true
                    } else {
                      preVisible = false
                      visible = false
                      break
                    }
                  }
                }
              }
              let cartesianTemp = Cesium.Cartesian3.fromRadians(terrainData[j].longitude, terrainData[j].latitude, terrainData[j].height + 1)
              cartesiansLine.push(cartesianTemp)
              //绘制点
              if (visible) {
                colors.push(0)
                colors.push(0)
                colors.push(1)
                colors.push(1)
              } else {
                colors.push(1)
                colors.push(0)
                colors.push(0)
                colors.push(1)
              }
            }
            //绘制结果
            $this._pointsKSYResult = new Cesium.PointsPrimitive({
              'viewer': that._viewer,
              'Cartesians': cartesiansLine,
              'Colors': colors
            })
          } else {
            alert('高程异常！')
          }
        })
    }
  } catch (error) {
    console.log(error)
  }

  LookAroundAnalysis.prototype.remove = function () {}
}