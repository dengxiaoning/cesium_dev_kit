import { InitRectangularSensorPrimitive } from './RectangularSensor/RectangularSensorPrimitive'
import { InitRectangularSensorGraphics } from './RectangularSensor/RectangularSensorGraphics'
import { InitRectangularSensorVisualizer } from './RectangularSensor/RectangularSensorVisualizer'
import { RadarPlugin } from './ConeSensor'



function initSensor(_viewer: any, cesiumGlobal: any) {
  if (cesiumGlobal) {
    // init cone sensor
    new RadarPlugin(_viewer, cesiumGlobal)
    const RectangularSensorPrimitive = new (InitRectangularSensorPrimitive as any)(
      cesiumGlobal
    )
    const RectangularSensorGraphics = new (InitRectangularSensorGraphics as any)(
      cesiumGlobal
    )
    const RectangularSensorVisualizer = new (InitRectangularSensorVisualizer as any)(
      cesiumGlobal,
      RectangularSensorPrimitive
    )
    //rectangularSensor
    cesiumGlobal.Scene.RectangularSensorPrimitive = RectangularSensorPrimitive
    cesiumGlobal.Scene.RectangularSensorGraphics = RectangularSensorGraphics
    cesiumGlobal.Scene.RectangularSensorVisualizer = RectangularSensorVisualizer

    var DataSourceDisplay = cesiumGlobal.DataSourceDisplay
    var originalDefaultVisualizersCallback =
      DataSourceDisplay.defaultVisualizersCallback
    DataSourceDisplay.defaultVisualizersCallback = function (
      scene: any,
      entityCluster: any,
      dataSource: any
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
