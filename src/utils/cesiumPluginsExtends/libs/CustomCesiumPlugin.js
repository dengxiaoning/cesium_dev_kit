/**
 * 自定义插件
 * @param {*} viewer
 */
function CustomCesiumPlugin(viewer) {
  if (viewer) {
    this._customPluginLayer = new Cesium.CustomDataSource('_customPluginLayer')

    viewer && viewer.dataSources.add(this._customPluginLayer)
  }
}

CustomCesiumPlugin.prototype = {

  createRectangularSensorGraphics: function (options) {
    if (this._customPluginLayer && options) {
      let r = new Cesium.HeadingPitchRoll(Cesium.Math.toRadians(options.heading || 90),
        Cesium.Math.toRadians(options.pitch || 0),
        Cesium.Math.toRadians(options.roll || 0))
      let l = options.position
      return this._customPluginLayer.entities.add({
        position: l,
        orientation: Cesium.Transforms.headingPitchRollQuaternion(l, r),
        rectangularSensor: new Cesium.RectangularSensorGraphics({
          radius: options.radius || 100000,
          xHalfAngle: Cesium.Math.toRadians(options.xHalfAngle || 45),
          yHalfAngle: Cesium.Math.toRadians(options.yHalfAngle || 45),
          material: options.material || new Cesium.Color(1.0, 0.0, 1.0, 0.4),
          lineColor: options.lineColor || new Cesium.Color(1.0, 0.0, 1.0, 1.0),
          showScanPlane: options.showScanPlane || true,
          scanPlaneColor: options.scanPlaneColor || new Cesium.Color(1.0, 0.0, 1.0, 1.0),
          scanPlaneMode: options.scanPlaneMode || 'vertical',
          scanPlaneRate: options.scanPlaneRate || 3,
          showThroughEllipsoid: options.showThroughEllipsoid || !1
        })
      })
    }
  },
  createSatelliteCoverageSimulationGraphics: function (options) {

    if (options) {
      return new Cesium.SatelliteCoverageSimulation(this._viewer, {
        position: options.position,
        angle1: options.angle1 || 30,
        angle2: options.angle2 || 45,
        areaType: options.areaType || 2,
        rotation: {
          heading: Cesium.Math.toRadians(options.heading || 0),
          pitch: Cesium.Math.toRadians(options.pitch || 0),
          roll: Cesium.Math.toRadians(options.roll || 0)
        },
        color: options.color || {
          red: 0.43137254901960786,
          green: 0.9607843137254902,
          blue: 0,
          alpha: 0.8
        }
      })
    }
  },
  createRadarPrimitive: function (options) {

    if (options) {
      return new Cesium.RadarPrimitive(this._viewer, {
        position: options.position,
        angle: options.angle || 90 - 10,
        radius: options.radius || 700000,
        rotation: {
          heading: Cesium.Math.toRadians(options.heading || 0),
          pitch: Cesium.Math.toRadians(options.pitch || 40),
          roll: Cesium.Math.toRadians(options.roll || 0)
        },
        color: options.color || {
          red: 1,
          green: 0,
          blue: 0,
          alpha: 0.4
        },
        lineColor: options.lineColor || {
          red: 1,
          green: 1,
          blue: 1,
          alpha: 0.9
        }
      })
    }
  }
}