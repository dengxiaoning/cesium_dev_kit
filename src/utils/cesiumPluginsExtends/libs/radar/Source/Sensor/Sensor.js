// import Cesium from "Cesium";
let Cesium = null

import { initRectangular } from './RectangularSensor/RectangularSensorPrimitive'
import { initSensor } from './RectangularSensor/RectangularSensorGraphics'
import { initVisualize } from './RectangularSensor/RectangularSensorVisualizer'

function initEntrySensor(cesiumObj) {
  Cesium = cesiumObj
  //conicSensor
  // import {ConicArcSensorGeometry} from './ConicArcSensor/ConicArcSensorGeometry';
  // import  {ConicArcSensorOutlineGeometry} from './ConicArcSensor/ConicArcSensorOutlineGeometry';
  // import {ConicArcSensorGraphics} from './ConicArcSensor/ConicArcSensorGraphics';
  // import {ConicArcSensorCollection} from './ConicArcSensor/ConicArcSensorCollection';
  const RectangularSensorPrimitive = new initRectangular(cesiumObj)
  const RectangularSensorGraphics = new initSensor(cesiumObj)
  const RectangularSensorVisualizer = new initVisualize(cesiumObj)

  //rectangularSensor
  Cesium.Scene.RectangularSensorPrimitive = RectangularSensorPrimitive
  Cesium.Scene.RectangularSensorGraphics = RectangularSensorGraphics
  Cesium.Scene.RectangularSensorVisualizer = RectangularSensorVisualizer

  //conicSensor
  // Cesium.ConicArcSensorGeometry = ConicArcSensorGeometry;
  // Cesium.ConicArcSensorOutlineGeometry = ConicArcSensorOutlineGeometry;
  // Cesium.ConicArcSensorGraphics = ConicArcSensorGraphics;
  // Cesium.ConicArcSensorCollection = ConicArcSensorCollection;

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

export { initEntrySensor }
