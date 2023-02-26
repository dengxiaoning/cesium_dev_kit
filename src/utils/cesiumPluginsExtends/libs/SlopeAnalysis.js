/**
 * 坡度分析
 * @param {*} params
 */
function SlopeAnalysis(params) {
  //显示结果
  const showResult = function (startPoint, endPoint) {
    //起止点相关信息
    var scartographic = Cesium.Cartographic.fromCartesian(startPoint)
    var samplePoint = [scartographic]
    var pointSum = 10 //取样点个数
    var tempCartesians = new Cesium.Cartesian3()
    var slopePercent = [0]
    var disL = [0]
    var angle = 0
    for (var i = 1; i <= pointSum; i++) {
      Cesium.Cartesian3.lerp(startPoint, endPoint, i / pointSum, tempCartesians)
      var tempCartographic = Cesium.Cartographic.fromCartesian(tempCartesians)
      var surfaceHeight = $this._viewer.scene.globe.getHeight(tempCartographic)
      tempCartographic.height = surfaceHeight
      samplePoint.push(tempCartographic)
      var lastCarto = samplePoint[i - 1]
      var dis = Cesium.Cartesian3.distance(Cesium.Cartographic.toCartesian(lastCarto), Cesium.Cartographic.toCartesian(tempCartographic))
      disL.push(disL[i - 1] + dis)
      angle = Math.asin((tempCartographic.height - lastCarto.height) / dis)
      slopePercent.push(Math.tan(angle) * 100)
    }

    var echartContainer = document.createElement('div')
    echartContainer.className = 'echart-viewer'
    $this._viewer.container.appendChild(echartContainer, 'dark', {
      renderer: 'canvas',
      width: 640,
      height: 480
    })
    echartContainer.style.position = 'absolute'
    echartContainer.style.right = '140px'
    echartContainer.style.top = '100px'
    echartContainer.style.height = '300px'
    echartContainer.style.width = '640px'
    echartContainer.style.overflow = 'hidden'
    echartContainer.style.zIndex = '9999'
    echartContainer.style.opacity = 0.9
    var myChart = echarts.init(echartContainer)
    var option = {
      title: {
        text: '剖面示意图',
        left: 'center',
        subtext: '',
        textStyle: {
          color: 'white',
          fontSize: 15
        }
      },
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: ['']
      },
      //右上角工具条
      toolbox: {
        show: false,
        feature: {
          mark: {
            show: true
          },
          dataView: {
            show: true,
            readOnly: false
          },
          magicType: {
            show: true,
            type: ['line', 'bar']
          },
          restore: {
            show: true
          },
          saveAsImage: {
            show: true
          }
        }
      },
      calculable: true,
      xAxis: [{
        type: 'category',
        name: '长度(米)',
        boundaryGap: false,
        data: disL,
        axisLabel: {
          textStyle: {
            color: 'white'
          }
        },
        axisLine: {
          lineStyle: {
            color: 'white'
          }
        }
      }],
      yAxis: [{
        type: 'value',
        name: '坡度（%）',
        axisLabel: {
          formatter: function (data) {
            return data.toFixed(2) + '%'
          },
          // formatter: '{value} 米',
          textStyle: {
            color: 'white'
          }
        },
        axisLine: {
          lineStyle: {
            color: 'white'
          }
        }
      }],
      series: [{
        name: '坡度',
        type: 'line',
        areaStyle: {},
        smooth: true,
        data: slopePercent,
        markPoint: {
          data: [{
              type: 'max',
              name: '最大值'
            },
            {
              type: 'min',
              name: '最小值'
            }
          ]
        },
        markLine: {
          data: [{
            type: 'average',
            name: '平均值'
          }]
        }
      }]
    }

    // 为echarts对象加载数据
    myChart.setOption(option)
    return myChart
  }
  if (params && params.positions) {

    var positions = params.positions,
      that = params.that,
      points = [],
      position1 = that.transformWGS84ToCartesian(positions[0]),
      position2 = that.transformWGS84ToCartesian(positions[1])
    points = that.createPointsGraphics({
      point: true,
      positions: [position1, position2]
    })
  }

  showResult(points[0], points[1])
}