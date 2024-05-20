import { initSensor } from "./Sensor/index";
let Cesium = null;
/**
 * 自定义插件(传感器)
 * @class
 * @param {object} viewer - cesium 实例
 * @param {object}  cesiumGlobal - cesium 全局对象
 * @exports CustomCesiumPlugin
 */
function CustomCesiumPlugin(viewer, cesiumGlobal) {
  if (viewer) {
    this._viewer = viewer;
    Cesium = cesiumGlobal;
    this._customPluginLayer = new Cesium.CustomDataSource("_customPluginLayer");
    // init rectangular sensor
    new initSensor(viewer, cesiumGlobal);
    viewer && viewer.dataSources.add(this._customPluginLayer);
  }
}

CustomCesiumPlugin.prototype = {
  createRectangularSensorGraphics: function (options) {
    if (this._customPluginLayer && options) {
      let r = new Cesium.HeadingPitchRoll(
        Cesium.Math.toRadians(options.heading || 90),
        Cesium.Math.toRadians(options.pitch || 0),
        Cesium.Math.toRadians(options.roll || 0)
      );
      let l = options.position;
      return this._customPluginLayer.entities.add({
        position: l,
        orientation: Cesium.Transforms.headingPitchRollQuaternion(l, r),
        rectangularSensor: new Cesium.Scene.RectangularSensorGraphics({
          radius: options.radius || 100000,
          xHalfAngle: Cesium.Math.toRadians(options.xHalfAngle || 45),
          yHalfAngle: Cesium.Math.toRadians(options.yHalfAngle || 45),
          material: options.material || new Cesium.Color(1.0, 0.0, 1.0, 0.4),
          lineColor: options.lineColor || new Cesium.Color(1.0, 0.0, 1.0, 1.0),
          showScanPlane: options.showScanPlane || true,
          scanPlaneColor: options.scanPlaneColor || new Cesium.Color(1.0, 0.0, 1.0, 1.0),
          scanPlaneMode: options.scanPlaneMode || "vertical",
          scanPlaneRate: options.scanPlaneRate || 3,
          showThroughEllipsoid: options.showThroughEllipsoid || !1,
          show: true,
        }),
      });
    }
  },
  // 棱形传感器正在加紧研究中......
  createSatelliteCoverageSimulationGraphics: function (options) {
    if (options) {
      return new Cesium.Scene.SatelliteCoverageSimulation(this._viewer, {
        position: options.position,
        angle1: options.angle1 || 30,
        angle2: options.angle2 || 45,
        areaType: options.areaType || 2,
        rotation: {
          heading: Cesium.Math.toRadians(options.heading || 0),
          pitch: Cesium.Math.toRadians(options.pitch || 0),
          roll: Cesium.Math.toRadians(options.roll || 0),
        },
        color: options.color || {
          red: 0.43137254901960786,
          green: 0.9607843137254902,
          blue: 0,
          alpha: 0.8,
        },
      });
    }
  },
  /**
   * 锥形传感器
   * @function
   * @param {object} options
   * @param {Cartesian3} options.position - 坐标
   * @param {number} options.angle - 角度
   * @param {number} options.radius - 半径
   * @param {number} options.heading - 方向
   * @param {number} options.pitch - 倾斜度
   * @param {object} options.roll - 翻滚角
   * @param {object} options.color - 颜色
   * @param {object} options.lineColor - 线条颜色
   * @example
   * import { CustomCesiumPlugin } from 'cesium_dev_kit'
   * const {customCesiumPlugin} = new CustomCesiumPlugin({
   *     cesiumGlobal: Cesium,
   *     containerId: 'cesiumContainer'
   * })
   * customCesiumPlugin.createRadarPrimitive(
        {
          position:Cesium.Cartesian3.fromDegrees(117.224, 31.819, 128),
          roll: 0,
          pitch: 40,
          heading: 0
        }
      )
   * @returns {ConeSensorPrimitive}
   */
  createRadarPrimitive: function (options) {
    if (options) {
      return new Cesium.Scene.ConeSensorPrimitive(this._viewer, {
        position: options.position,
        angle: options.angle || 90 - 10,
        radius: options.radius || 700000,
        rotation: {
          heading: Cesium.Math.toRadians(options.heading || 0),
          pitch: Cesium.Math.toRadians(options.pitch || 40),
          roll: Cesium.Math.toRadians(options.roll || 0),
        },
        color: options.color || {
          red: 1,
          green: 0,
          blue: 0,
          alpha: 0.4,
        },
        lineColor: options.lineColor || {
          red: 1,
          green: 1,
          blue: 1,
          alpha: 0.9,
        },
      });
    }
  },
};

export { CustomCesiumPlugin };
