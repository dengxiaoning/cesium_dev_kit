import echarts from "echarts";
import { Base } from "./Base";
import { Math3d } from "./Math3d";
import { Graphics } from "./Graphics";
let Cesium = null;
let dfSt = undefined;
/**
 * 分析模块
 * @class
 * @augments  module:Base
 * @augments  module:Draw
 * @augments  module:Plugin
 * @param {object} viewer - cesium 实例
 * @param {object}  cesiumGlobal - cesium 全局对象
 * @param {Array}  defaultStatic - 静态资源
 * @exports Analysis
 */
function Analysis(viewer, cesiumGlobal, defaultStatic) {
  if (viewer) {
    Cesium = cesiumGlobal;
    dfSt = defaultStatic;
    this._analysisLayer = new Cesium.CustomDataSource("analysisLayer");
    // 继承base，避免公共方法无法使用
    Math3d.prototype = { ...Math3d.prototype, ...Base.prototype}
    Graphics.prototype = { ...Graphics.prototype, ...Base.prototype}
    this.$math3d = new Math3d(viewer, cesiumGlobal);
    this.$graphics = new Graphics(viewer, cesiumGlobal);
    viewer && viewer.dataSources.add(this._analysisLayer);
  }
}

Analysis.prototype = {
  /**
   * 创建通视分析
   * @function
   * @param {object} options
   * @param {function} options.callback - 回调函数
   * @example
   *  import { Analysis } from 'cesium_dev_kit'
   * const {analysis} = new Analysis({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * analysis.createVisibilityAnalysis({  callback:res=>{console.log(res)}})
   */
  createVisibilityAnalysis: function (options) {
    options = options || {};
    var $this = this;
    $this.drawLineGraphics({
      type: "straightLine",
      clampToGround: false,
      callback: function (line, lineObj) {
        var _visibilityAnalysis = new VisibilityAnalysis({
          positions: line,
          that: $this,
        });

        if ($this._graphicsLayer) $this._graphicsLayer.entities.remove(lineObj);

        if (typeof options.callback === "function") {
          options.callback(_visibilityAnalysis);
        }
      },
    });
  },
  /**
   * 创建环视分析
   * @function
   * @param {object} options
   * @param {function} options.callback - 回调函数
   * @see {@link  module:Draw#drawCircleGraphics|drawCircleGraphics}
   * @example
   *  import { Analysis } from 'cesium_dev_kit'
   * const {analysis} = new Analysis({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * analysis.createVisibilityAnalysis({  callback:res=>{console.log(res)}})
   */
  createLookAroundAnalysis: function (options) {
    options = options || {};
    if (this._viewer && options) {
      var $this = this;
      $this.drawCircleGraphics({
        callback: function (result, obj) {
          $this._drawLayer.entities.remove(obj);

          let _lookAroundAnalysis = new LookAroundAnalysis({
            that: $this,
            radius: result.radius,
            center: result.center,
          });

          if (typeof options.callback === "function") {
            options.callback(_lookAroundAnalysis);
          }
        },
      });
    }
  },
  /**
   * 创建可视域分析
   * @function
   * @param {object} options
   * @param {function} options.callback - 回调函数
   * @see {@link  module:Base#bindHandelEvent|bindHandelEvent}
   * @see {@link  ShadowPrimitive}
   * @example
   *  import { Analysis } from 'cesium_dev_kit'
   * const {analysis} = new Analysis({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * analysis.createVisibilityAnalysis({  callback:res=>{console.log(res)}})
   */
  createVisualFieldAnalysis: function (options) {
    options = options || {};
    if (this._viewer && options) {
      var $this = this,
        _shadowPrimitive = null;
      $this.bindHandelEvent({
        leftClick: function click(event, _handlers) {
          var position = $this._viewer.scene.pickPosition(event.position);
          if (!position) return false;
          if (!Cesium.defined(_shadowPrimitive)) {
            // 创建shadowPrimitve
            _shadowPrimitive = new Cesium.Scene.ShadowPrimitive({
              scene: $this._viewer.scene,
              viewerPosition: position,
            });

            $this._analysisLayer._primitives.add(_shadowPrimitive);
          } else {
            _handlers.destroy();
            _handlers = null;
          }
        },
        mouseMove: function move(event) {
          var position = $this._viewer.scene.pickPosition(event.endPosition);
          if (!position) return false;
          if (_shadowPrimitive) _shadowPrimitive.setPoseByTargetPoint(position);
        },
      });
    }
  },
  /**
   * 地形开挖分析
   * @function
   * @param {object} options
   * @param {number} options.height - 高度
   * @param {number} options.splitNum - 裁剪大小
   * @param {string} options.wallImg - 四周贴图
   * @param {string} options.bottomImg - 底部贴图
   * @param {function} options.callback - 回调函数
   * @see {@link  TerrainClipPlan}
   * @see {@link  module:Draw#drawPolygonGraphics|drawPolygonGraphics}
   * @see {@link  module:Base#transformWGS84ArrayToCartesianArray|transformWGS84ArrayToCartesianArray}
   * @example
   *  import { Analysis } from 'cesium_dev_kit'
   * const {analysis} = new Analysis({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * analysis.createClipPlanAnalysis({
   *         height:30,
   *         splitNum: 50,
             wallImg :"static/data/images/file/excavate_side_min.jpg",
             bottomImg :"static/data/images/file/excavate_bottom_min.jpg",
             callback:res=>{console.log(res)}
   * })
   */
  createClipPlanAnalysis: function (options) {
    options = options || {};
    if (this._viewer && options) {
      var $this = this;
      var _height = options.height || 30,
        _splitNum = options.splitNum || 50,
        _wallImg =
          options.wallImg ||
          this.getDfSt(["amalysis", "createClipPlanAnalysis_wallImg"]) ||
          "static/data/images/file/excavate_side_min.jpg",
        _bottomImg =
          options.bottomImg ||
          this.getDfSt(["amalysis", "createClipPlanAnalysis_bottomImg"]) ||
          "static/data/images/file/excavate_bottom_min.jpg";

      $this.drawPolygonGraphics({
        callback: function (polygon, polygonObj) {
          $this._drawLayer.entities.remove(polygonObj);

          let terrainClipPlan = new Cesium.Scene.TerrainClipPlan($this._viewer, {
            height: _height,
            splitNum: _splitNum,
            wallImg: _wallImg,
            bottomImg: _bottomImg,
          });
          const cartesian3Coor = $this.transformWGS84ArrayToCartesianArray(polygon);
          terrainClipPlan.updateData(cartesian3Coor);

          if (typeof options.callback === "function") {
            options.callback(terrainClipPlan);
          }
        },
      });
    }
  },
  /**
   * 创建淹没分析
   * @function
   * @param {object} options
   * @param {number} options.maxH - 最大高度
   * @param {number} options.speed - 速度
   * @param {number} options.interval - 时间间隔
   * @param {string} options.matrialUrl - 材质
   * @see {@link  module:Draw#drawPolygonGraphics|drawPolygonGraphics}
   * @example
   *  import { Analysis } from 'cesium_dev_kit'
   * const {analysis} = new Analysis({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * analysis.createSubmergedAnalysis({
   *      maxH:15,
          speed:1,
          interval:10,
          matrialUrl: "static/data/images/file/water.png"
   * })
   */
  createSubmergedAnalysis: function (options) {
    options = options || {};
    if (this._viewer && options) {
      var $this = this,
        _maxH = options.maxH || 15,
        _speed = options.speed || 1,
        _interval = options.interval || 10,
        _matrialUrl =
          options.matrialUrl ||
          this.getDfSt(["amalysis", "createSubmergedAnalysis"]) ||
          "static/data/images/file/water.png";
      $this.drawPolygonGraphics({
        height: 1,
        callback: function (polygon, polygonObj) {
          if (!$this._viewer.scene.globe.depthTestAgainstTerrain) {
            alert("请开启深度检测");
            return false;
          }
          if (polygonObj) {
            setTimeout(() => {
              polygonObj.polygon.heightReference = "CLAMP_TO_GROUND";
              polygonObj.polygon.material = _matrialUrl;
              var h = 0.0;
              polygonObj.polygon.extrudedHeight = h;
              var st = setInterval(function () {
                h = h + _speed;
                if (h >= _maxH) {
                  h = _maxH;
                  clearTimeout(st);
                }
                polygonObj.polygon.extrudedHeight = h;
              }, _interval);
            }, 2000);
          }
        },
      });
    }
  },

  /**
   * 创建坡度分析
   * @function
   * @param {object} options
   * @param {function} options.callback - 回调
   * @see {@link  module:Draw#drawLineGraphics|drawLineGraphics}
   * @example
   *  import { Analysis } from 'cesium_dev_kit'
   * const {analysis} = new Analysis({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * analysis.createSlopeAnalysis({callback:res=>{console.log(res)})
   */
  createSlopeAnalysis: function (options) {
    options = options || {};
    if (!echarts) {
      alert("需要引入echarts库");
      return false;
    }
    var $this = this;
    if (this._viewer && options) {
      $this.drawLineGraphics({
        type: "straightLine",
        clampToGround: false,
        callback: function (line, lineObj) {
          var _slopeAnalysis = new SlopeAnalysis({
            positions: line,
            that: $this,
          });

          if ($this._graphicsLayer) $this._graphicsLayer.entities.remove(lineObj);

          if (typeof options.callback === "function") {
            options.callback(_slopeAnalysis);
          }
        },
      });
    }
  },
  /**
   * 方量分析
   * @function
   * @param {object} options
   * @param {function} options.callback - 回调
   * @see {@link  module:Draw#drawLineGraphics|drawLineGraphics}
   * @see {@link  module:Base#transformWGS84ArrayToCartesianArray|transformWGS84ArrayToCartesianArray}
   * @example
   *  import { Analysis } from 'cesium_dev_kit'
   * const {analysis} = new Analysis({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * analysis.createCutVolumeAnalysis({callback:res=>{console.log(res)})
   */
  createCutVolumeAnalysis: function (options) {
    options = options || {};
    if (this._viewer && options) {
      var $this = this;
      $this.drawWallGraphics({
        callback: function (wall) {
          var _cutVolumeAnalysis = new CutVolumeAnalysis({
            positions: $this.transformWGS84ArrayToCartesianArray(wall, 100),
            that: $this,
          });

          if (typeof options.callback === "function") {
            options.callback(_cutVolumeAnalysis);
          }
        },
      });
    }
  },
};

/**
 * 通视分析
 * @private
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
      position2 = that.transformWGS84ToCartesian(positions[1]);
    points = that.$graphics.createPointsGraphics({
      point: true,
      positions: [position1, position2],
    });

    var results = that.$math3d.getIntersectObj(position1, position2, points, true); //碰撞检测

    if (results.length === 0) {
      alert("没有取到相交点 , 请检查是否开启深度检测。");
      return false;
    }
    //显示相交对象 高亮
    function showIntersections() {
      for (let i = 0; i < results.length; ++i) {
        var object = results[i].object;
        if (object) {
          if (object instanceof Cesium.Cesium3DTileFeature) {
            pickedObjs.push(object);
            object.oldColor = object.color.clone();
            object.color = Cesium.Color.fromAlpha(Cesium.Color.YELLOW, object.color.alpha);
          } else if (object.id instanceof Cesium.Entity) {
            var entity = object.id,
              checkEntity = entity.polygon || entity.polyline;
            pickedObjs.push(entity);

            var color = checkEntity.material.color.getValue();
            checkEntity.oldColor = color.clone();
            checkEntity.material = Cesium.Color.fromAlpha(Cesium.Color.YELLOW, color.alpha);
          }
        }
        //相交点
        points.push(
          that._analysisLayer.entities.add({
            position: results[i].position,
            ellipsoid: {
              radii: new Cesium.Cartesian3(0.8, 0.8, 0.8),
              material: Cesium.Color.RED,
            },
          })
        );
      }
    }
    // 计算分析结果
    function computesResult() {
      //分析一下是否都有position
      for (let index = results.length - 1; index >= 0; index--) {
        const element = results[index];
        if (!Cesium.defined(element.position)) {
          results.splice(index, 1);
        }
      }
      if (!Cesium.defined(results[0].position)) {
        throw new Cesium.DeveloperError("position is undefined");
      }
      var pickPos1 = results[0].position;
      var dis = Cesium.Cartesian3.distance(pickPos1, position2);
      var bVisibility = dis < 5 ? true : false; //
      var arrowPositions = [position1, results[0].position];
      //通视线
      var greenLine = that._analysisLayer.entities.add({
        polyline: {
          positions: arrowPositions,
          width: 10,
          arcType: Cesium.ArcType.NONE,
          material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.GREEN),
        },
      });
      lines.push(greenLine);
      //不通视
      if (!bVisibility) {
        var unArrowPositions = [results[0].position, position2];
        var redLine = that._analysisLayer.entities.add({
          polyline: {
            positions: unArrowPositions,
            width: 10,
            arcType: Cesium.ArcType.NONE,
            material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.RED),
          },
        });

        lines.push(redLine);
      }
      showIntersections();
      var rad1 = Cesium.Cartographic.fromCartesian(position1);
      var rad2 = Cesium.Cartographic.fromCartesian(position2);
      var degree1 = {
        longitude: (rad1.longitude / Math.PI) * 180,
        latitude: (rad1.latitude / Math.PI) * 180,
        height: rad1.height,
      };
      var degree2 = {
        longitude: (rad2.longitude / Math.PI) * 180,
        latitude: (rad2.latitude / Math.PI) * 180,
        height: rad2.height,
      };

      var length_ping = Math.sqrt(
        Math.pow(position1.x - position2.x, 2) +
          Math.pow(position1.y - position2.y, 2) +
          Math.pow(position1.z - position2.z, 2)
      );
      var length_h = Math.abs(degree2.height - degree1.height);
      var length = Math.sqrt(Math.pow(length_ping, 2) + Math.pow(length_h, 2));

      var visTxt = bVisibility ? "是" : "否";
      var text =
        "起点坐标: " +
        ("   (" + degree1.longitude.toFixed(6)) +
        "\u00B0" +
        "," +
        degree1.latitude.toFixed(6) +
        "\u00B0" +
        "," +
        degree1.height.toFixed(2) +
        ")" +
        "\n终点坐标: " +
        ("   (" + degree2.longitude.toFixed(6)) +
        "\u00B0" +
        "," +
        degree2.latitude.toFixed(6) +
        "\u00B0" +
        "," +
        degree2.height.toFixed(2) +
        ")" +
        "\n垂直距离: " +
        "   " +
        length_h.toFixed(2) +
        "m" +
        "\n水平距离: " +
        "   " +
        length_ping.toFixed(2) +
        "m" +
        "\n空间距离: " +
        "   " +
        length.toFixed(2) +
        "m" +
        "\n是否可视: " +
        "   " +
        visTxt;

      if (points && points[0]) {
        points[0].label = {
          text: text,
          showBackground: true,
          font: "14px monospace",
          fillColor: Cesium.Color.YELLOW,
          pixelOffset: {
            x: 0,
            y: -20,
          },
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        };
      }
    }

    computesResult(); // 计算相交结果
  }

  VisibilityAnalysis.prototype.remove = function () {};
}

/**
 * 环视分析
 * @private
 * @param {object} params
 */
function LookAroundAnalysis(params) {
  if (!params && !params.center && !params.radius && params.that) {
    alert("没有获取到分析参数");
    return false;
  }

  var that = params.that,
    $this = this;
  if (!that._viewer.scene.globe.depthTestAgainstTerrain) {
    alert("请开启深度检测");
    return false;
  }

  var viewHeight = params.viewHeight || 10;
  var cartographicCenter = Cesium.Cartographic.fromCartesian(params.center);
  // 分析
  try {
    var ab = params.radius;
    var eopt = {};
    eopt.semiMinorAxis = ab;
    eopt.semiMajorAxis = ab;
    eopt.rotation = 0;
    eopt.center = params.center;
    eopt.granularity = Math.PI / 30.0; //间隔
    let ellipse = that.computeEllipseEdgePositions(eopt); //范围当前椭圆位置的数组
    for (let i = 0; i < ellipse.outerPositions.length; i += 3) {
      //逐条计算可视域
      let cartesian = new Cesium.Cartesian3(
        ellipse.outerPositions[i],
        ellipse.outerPositions[i + 1],
        ellipse.outerPositions[i + 2]
      );
      let cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      let deltaRadian = (0.0005 * Math.PI) / 180.0; //Cesium.Math.RADIANS_PER_DEGREE
      let cartographicArr = that.computeInterpolateLineCartographic(cartographicCenter, cartographic, deltaRadian);
      that.computeCartographicPointsTerrainData(cartographicArr, function (terrainData) {
        if (terrainData.length > 0) {
          let preVisible = true;
          let cartesiansLine = [];
          let colors = [];
          for (let j = 1; j < terrainData.length; j++) {
            //逐点计算可见性
            let visible = true; //该点可见性
            if (j > 1) {
              let cartographicCenterHV = new Cesium.Cartographic(
                terrainData[0].longitude,
                terrainData[0].latitude,
                terrainData[0].height + viewHeight
              );
              if (preVisible) {
                //
                let curPoint = that.computeInterpolateIndexLineHeightCartographic(
                  cartographicCenterHV,
                  terrainData[j],
                  j,
                  j - 1
                );
                if (curPoint.height >= terrainData[j - 1].height) {
                  preVisible = true;
                  visible = true;
                } else {
                  preVisible = false;
                  visible = false;
                }
              } else {
                //插值到当前
                let curPointArr = that.computeInterpolateIndexLineHeightCartographic(
                  cartographicCenterHV,
                  terrainData[j],
                  j,
                  j - 1
                );
                for (let k = 0; k < curPointArr.length; k++) {
                  if (curPointArr[k].height >= terrainData[k].height) {
                    preVisible = true;
                    visible = true;
                  } else {
                    preVisible = false;
                    visible = false;
                    break;
                  }
                }
              }
            }
            let cartesianTemp = Cesium.Cartesian3.fromRadians(
              terrainData[j].longitude,
              terrainData[j].latitude,
              terrainData[j].height + 1
            );
            cartesiansLine.push(cartesianTemp);
            //绘制点
            if (visible) {
              colors.push(0);
              colors.push(0);
              colors.push(1);
              colors.push(1);
            } else {
              colors.push(1);
              colors.push(0);
              colors.push(0);
              colors.push(1);
            }
          }
          //绘制结果
          $this._pointsKSYResult = new Cesium.Scene.PointsPrimitive({
            viewer: that._viewer,
            Cartesians: cartesiansLine,
            Colors: colors,
          });
        } else {
          alert("高程异常！");
        }
      });
    }
  } catch (error) {
    console.log(error);
  }

  LookAroundAnalysis.prototype.remove = function () {};
}

/**
 * 坡度分析
 * @private
 * @param {object} params
 */
function SlopeAnalysis(params) {
  if (params && params.positions) {
    var positions = params.positions,
      that = params.that,
      position1 = that.transformWGS84ToCartesian(positions[0]),
      position2 = that.transformWGS84ToCartesian(positions[1]);
    //显示结果
    function showResult(startPoint, endPoint) {
      //起止点相关信息
      var scartographic = Cesium.Cartographic.fromCartesian(startPoint);
      var samplePoint = [scartographic];
      var pointSum = 10; //取样点个数
      var tempCartesians = new Cesium.Cartesian3();
      var slopePercent = [0];
      var disL = [0];
      var angle = 0;
      for (var i = 1; i <= pointSum; i++) {
        Cesium.Cartesian3.lerp(startPoint, endPoint, i / pointSum, tempCartesians);
        var tempCartographic = Cesium.Cartographic.fromCartesian(tempCartesians);
        var surfaceHeight = that._viewer.scene.globe.getHeight(tempCartographic);
        tempCartographic.height = surfaceHeight;
        samplePoint.push(tempCartographic);
        var lastCarto = samplePoint[i - 1];
        var dis = Cesium.Cartesian3.distance(
          Cesium.Cartographic.toCartesian(lastCarto),
          Cesium.Cartographic.toCartesian(tempCartographic)
        );
        disL.push(disL[i - 1] + dis);
        angle = Math.asin((tempCartographic.height - lastCarto.height) / dis);
        slopePercent.push(Math.tan(angle) * 100);
      }

      var echartContainer = document.createElement("div");
      echartContainer.className = "echart-viewer";
      that._viewer.container.appendChild(echartContainer, "dark", {
        renderer: "canvas",
        width: 640,
        height: 480,
      });
      echartContainer.style.position = "absolute";
      echartContainer.style.left = "20px";
      echartContainer.style.bottom = "20px";
      echartContainer.style.height = "300px";
      echartContainer.style.width = "640px";
      echartContainer.style.overflow = "hidden";
      echartContainer.style.zIndex = "9999";
      echartContainer.style.opacity = 0.9;
      var myChart = echarts.init(echartContainer);
      var option = {
        title: {
          text: "剖面示意图",
          left: "center",
          subtext: "",
          textStyle: {
            color: "white",
            fontSize: 15,
          },
        },
        tooltip: {
          trigger: "axis",
        },
        legend: {
          data: [""],
        },
        //右上角工具条
        toolbox: {
          show: false,
          feature: {
            mark: {
              show: true,
            },
            dataView: {
              show: true,
              readOnly: false,
            },
            magicType: {
              show: true,
              type: ["line", "bar"],
            },
            restore: {
              show: true,
            },
            saveAsImage: {
              show: true,
            },
          },
        },
        calculable: true,
        xAxis: [
          {
            type: "category",
            name: "长度(米)",
            boundaryGap: false,
            data: disL,
            axisLabel: {
              textStyle: {
                color: "white",
              },
            },
            axisLine: {
              lineStyle: {
                color: "white",
              },
            },
          },
        ],
        yAxis: [
          {
            type: "value",
            name: "坡度（%）",
            axisLabel: {
              formatter: function (data) {
                return data.toFixed(2) + "%";
              },
              // formatter: '{value} 米',
              textStyle: {
                color: "white",
              },
            },
            axisLine: {
              lineStyle: {
                color: "white",
              },
            },
          },
        ],
        series: [
          {
            name: "坡度",
            type: "line",
            areaStyle: {},
            smooth: true,
            data: slopePercent,
            markPoint: {
              data: [
                {
                  type: "max",
                  name: "最大值",
                },
                {
                  type: "min",
                  name: "最小值",
                },
              ],
            },
            markLine: {
              data: [
                {
                  type: "average",
                  name: "平均值",
                },
              ],
            },
          },
        ],
      };

      // 为echarts对象加载数据
      myChart.setOption(option);
      return myChart;
    }
    showResult(position1, position2);
  }
}

/**
 * 方量分析
 * @private
 * @param {object} params
 */
function CutVolumeAnalysis(params) {
  if (params && params.positions && params.that) {
    var that = params.that,
      positions = params.positions,
      _debugShowSubTriangles = true,
      $this = this;

    computeCutVolume(positions);
  }
  /**
   * 计算多边形的重心点
   * @param {*} positions
   */
  function computeCentroidOfPolygon(positions) {
    var x = [];
    var y = [];

    for (var i = 0; i < positions.length; i++) {
      var cartographic = Cesium.Cartographic.fromCartesian(positions[i]);

      x.push(cartographic.longitude);
      y.push(cartographic.latitude);
    }

    var x0 = 0.0,
      y0 = 0.0,
      x1 = 0.0,
      y1 = 0.0;
    var signedArea = 0.0;
    var a = 0.0;
    var centroidx = 0.0,
      centroidy = 0.0;

    for (i = 0; i < positions.length; i++) {
      x0 = x[i];
      y0 = y[i];

      if (i == positions.length - 1) {
        x1 = x[0];
        y1 = y[0];
      } else {
        x1 = x[i + 1];
        y1 = y[i + 1];
      }

      a = x0 * y1 - x1 * y0;
      signedArea += a;
      centroidx += (x0 + x1) * a;
      centroidy += (y0 + y1) * a;
    }

    signedArea *= 0.5;
    centroidx /= 6.0 * signedArea;
    centroidy /= 6.0 * signedArea;

    return new Cesium.Cartographic(centroidx, centroidy);
  }

  /**
   * 计算三角形的面积
   * @param {*} pos1
   * @param {*} pos2
   * @param {*} pos3
   */
  function computeAreaOfTriangle(pos1, pos2, pos3) {
    var a = Cesium.Cartesian3.distance(pos1, pos2);
    var b = Cesium.Cartesian3.distance(pos2, pos3);
    var c = Cesium.Cartesian3.distance(pos3, pos1);

    var S = (a + b + c) / 2;

    return Math.sqrt(S * (S - a) * (S - b) * (S - c));
  }
  /**
   * 计算方量
   */
  function computeCutVolume(positions) {
    var tileAvailability = that._viewer.terrainProvider.availability;
    if (!tileAvailability) {
      alert("未获取到地形");
      return false;
    }
    var maxLevel = 0;
    var minHeight = 15000;
    // 计算差值点
    // for (let i = 0; i < positions.length; i++) {
    //   var cartographic = Cesium.Cartographic.fromCartesian(positions[i]);
    //   var height = that._viewer.scene.globe.getHeight(cartographic);

    //   if (minHeight > height) minHeight = height;

    //   var level = tileAvailability.computeMaximumLevelAtPosition(cartographic);

    //   if (maxLevel < level) maxLevel = level;
    // }

    var granularity = Math.PI / Math.pow(2, 11);
    granularity = granularity / 64;
    var polygonGeometry = new Cesium.PolygonGeometry.fromPositions({
      positions: positions,
      vertexFormat: Cesium.PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
      granularity: granularity,
    });

    //polygon subdivision

    var geom = new Cesium.PolygonGeometry.createGeometry(polygonGeometry);

    var totalCutVolume = 0;
    var maxHeight = 0;

    var i0, i1, i2;
    var height1, height2, height3;
    var p1, p2, p3;
    var bottomP1, bottomP2, bottomP3;
    var scratchCartesian = new Cesium.Cartesian3();
    var cartographic;
    var bottomArea;
    var subTrianglePositions;

    for (let i = 0; i < geom.indices.length; i += 3) {
      i0 = geom.indices[i];
      i1 = geom.indices[i + 1];
      i2 = geom.indices[i + 2];

      subTrianglePositions = geom.attributes.position.values;

      scratchCartesian.x = subTrianglePositions[i0 * 3];
      scratchCartesian.y = subTrianglePositions[i0 * 3 + 1];
      scratchCartesian.z = subTrianglePositions[i0 * 3 + 2];

      cartographic = Cesium.Cartographic.fromCartesian(scratchCartesian);

      height1 = that._viewer.scene.globe.getHeight(cartographic);

      p1 = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, height1);
      bottomP1 = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0);

      if (maxHeight < height1) maxHeight = height1;

      scratchCartesian.x = subTrianglePositions[i1 * 3];
      scratchCartesian.y = subTrianglePositions[i1 * 3 + 1];
      scratchCartesian.z = subTrianglePositions[i1 * 3 + 2];

      cartographic = Cesium.Cartographic.fromCartesian(scratchCartesian);

      height2 = that._viewer.scene.globe.getHeight(cartographic);

      p2 = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, height2);
      bottomP2 = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0);

      if (maxHeight < height2) maxHeight = height2;

      scratchCartesian.x = subTrianglePositions[i2 * 3];
      scratchCartesian.y = subTrianglePositions[i2 * 3 + 1];
      scratchCartesian.z = subTrianglePositions[i2 * 3 + 2];

      cartographic = Cesium.Cartographic.fromCartesian(scratchCartesian);

      height3 = that._viewer.scene.globe.getHeight(cartographic);

      p3 = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, height3);
      bottomP3 = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0);

      if (maxHeight < height3) maxHeight = height3;

      bottomArea = computeAreaOfTriangle(bottomP1, bottomP2, bottomP3);

      totalCutVolume =
        totalCutVolume + (bottomArea * (height1 - minHeight + height2 - minHeight + height3 - minHeight)) / 3;

      if (_debugShowSubTriangles) {
        var positionsarr = [];

        positionsarr.push(p1);
        positionsarr.push(p2);
        positionsarr.push(p3);

        var drawingPolygon = {
          polygon: {
            hierarchy: {
              positions: positionsarr,
            },
            extrudedHeight: 0,
            perPositionHeight: true,
            material: Cesium.Color.fromRandom().withAlpha(0.5),
            outline: true,
            closeTop: true,
            closeBottom: true,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
          },
        };

        that._analysisLayer.entities.add(drawingPolygon);
      }
    }
    var centroid = computeCentroidOfPolygon(positions);
    $this._volumeLabel = that._analysisLayer.entities.add({
      position: Cesium.Cartesian3.fromRadians(centroid.longitude, centroid.latitude, maxHeight + 1000),
      label: {
        text: "Cut Volume " + totalCutVolume.toString() + "m3",
      },
    });

    return maxHeight;
  }
}

export { Analysis };
