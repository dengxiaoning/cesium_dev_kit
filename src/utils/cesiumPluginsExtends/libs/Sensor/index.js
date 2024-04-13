import { InitRectangularSensorPrimitive } from './RectangularSensor/RectangularSensorPrimitive'
import { InitRectangularSensorGraphics } from './RectangularSensor/RectangularSensorGraphics'
import { InitRectangularSensorVisualizer } from './RectangularSensor/RectangularSensorVisualizer'
import { RadarPlugin } from './ConeSensor'
let Cesium = {}

function initSensor(_viewer, cesiumGlobal) {
  if (cesiumGlobal) {
    Cesium = cesiumGlobal
    // init cone sensor
    new RadarPlugin(_viewer, cesiumGlobal)
    const RectangularSensorPrimitive = new InitRectangularSensorPrimitive(
      cesiumGlobal
    )
    const RectangularSensorGraphics = new InitRectangularSensorGraphics(
      cesiumGlobal
    )
    const RectangularSensorVisualizer = new InitRectangularSensorVisualizer(
      cesiumGlobal,
      RectangularSensorPrimitive
    )
    //rectangularSensor
    Cesium.Scene.RectangularSensorPrimitive = RectangularSensorPrimitive
    Cesium.Scene.RectangularSensorGraphics = RectangularSensorGraphics
    Cesium.Scene.RectangularSensorVisualizer = RectangularSensorVisualizer

    var DataSourceDisplay = Cesium.DataSourceDisplay
    var originalDefaultVisualizersCallback =
      DataSourceDisplay.defaultVisualizersCallback
    DataSourceDisplay.defaultVisualizersCallback = function (
      scene,
      entityCluster,
      dataSource
    ) {
      var entities = dataSource.entities
      var array = originalDefaultVisualizersCallback(
        scene,
        entityCluster,
        dataSource
      )
      return array.concat([new RectangularSensorVisualizer(scene, entities)])
    }
  }
}

export { initSensor }
