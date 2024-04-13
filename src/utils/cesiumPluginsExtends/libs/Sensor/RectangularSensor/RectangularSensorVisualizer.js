let Cesium = {}
function InitRectangularSensorVisualizer(
  cesiumGlobal,
  RectangularSensorPrimitive
) {
  if (cesiumGlobal) {
    Cesium = cesiumGlobal
    var AssociativeArray = Cesium.AssociativeArray
    var Cartesian3 = Cesium.Cartesian3
    var Color = Cesium.Color
    var defined = Cesium.defined
    var destroyObject = Cesium.destroyObject
    var DeveloperError = Cesium.DeveloperError
    var Matrix3 = Cesium.Matrix3
    var Matrix4 = Cesium.Matrix4
    var Quaternion = Cesium.Quaternion
    var MaterialProperty = Cesium.MaterialProperty
    var Property = Cesium.Property

    var matrix3Scratch = new Matrix3()
    var matrix4Scratch = new Matrix4()
    var cachedPosition = new Cartesian3()
    var cachedGazePosition = new Cartesian3()
    var cachedOrientation = new Quaternion()
    var diffVectorScratch = new Cartesian3()
    var orientationScratch = new Quaternion()

    function removePrimitive(entity, hash, primitives) {
      var data = hash[entity.id]
      if (defined(data)) {
        var primitive = data.primitive
        primitives.remove(primitive)
        if (!primitive.isDestroyed()) {
          primitive.destroy()
        }
        delete hash[entity.id]
      }
    }

    var RectangularSensorVisualizer = function (scene, entityCollection) {
      // >>includeStart('debug', pragmas.debug);
      if (!defined(scene)) {
        throw new DeveloperError('scene is required.')
      }
      if (!defined(entityCollection)) {
        throw new DeveloperError('entityCollection is required.')
      }
      // >>includeEnd('debug');

      entityCollection.collectionChanged.addEventListener(
        RectangularSensorVisualizer.prototype._onCollectionChanged,
        this
      )

      this._scene = scene
      this._primitives = scene.primitives
      this._entityCollection = entityCollection
      this._hash = {}
      this._entitiesToVisualize = new AssociativeArray()

      this._onCollectionChanged(
        entityCollection,
        entityCollection.values,
        [],
        []
      )
    }

    /**
     * Updates the primitives created by this visualizer to match their
     * Entity counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     * @returns {Boolean} This function always returns true.
     */
    RectangularSensorVisualizer.prototype.update = function (time) {
      // >>includeStart('debug', pragmas.debug);
      if (!defined(time)) {
        throw new DeveloperError('time is required.')
      }
      // >>includeEnd('debug');

      var entities = this._entitiesToVisualize.values
      var hash = this._hash
      var primitives = this._primitives

      for (var i = 0, len = entities.length; i < len; i++) {
        var entity = entities[i]
        var rectangularSensorGraphics = entity._rectangularSensor

        var position
        var orientation
        var radius
        var xHalfAngle
        var yHalfAngle
        var data = hash[entity.id]
        var show =
          entity.isShowing &&
          entity.isAvailable(time) &&
          Property.getValueOrDefault(
            rectangularSensorGraphics._show,
            time,
            true
          )

        if (show) {
          position = Property.getValueOrUndefined(
            entity._position,
            time,
            cachedPosition
          )
          orientation = Property.getValueOrUndefined(
            entity._orientation,
            time,
            cachedOrientation
          )
          radius = Property.getValueOrUndefined(
            rectangularSensorGraphics._radius,
            time
          )
          xHalfAngle = Property.getValueOrUndefined(
            rectangularSensorGraphics._xHalfAngle,
            time
          )
          yHalfAngle = Property.getValueOrUndefined(
            rectangularSensorGraphics._yHalfAngle,
            time
          )
          show = defined(position) && defined(xHalfAngle) && defined(yHalfAngle)
        }

        if (!show) {
          // don't bother creating or updating anything else
          if (defined(data)) {
            data.primitive.show = false
          }
          continue
        }

        var primitive = defined(data) ? data.primitive : undefined
        if (!defined(primitive)) {
          primitive = new RectangularSensorPrimitive()
          primitive.id = entity
          primitives.add(primitive)

          data = {
            primitive: primitive,
            position: undefined,
            orientation: undefined
          }
          hash[entity.id] = data
        }

        var gaze = Property.getValueOrUndefined(
          rectangularSensorGraphics._gaze,
          time
        )
        if (defined(gaze)) {
          var targetPosition = Property.getValueOrUndefined(
            gaze._position,
            time,
            cachedGazePosition
          )

          if (!defined(position) || !defined(targetPosition)) {
            continue
          }

          var diffVector = Cartesian3.subtract(
            position,
            targetPosition,
            diffVectorScratch
          )
          var rotate = Cartesian3.angleBetween(
            Cesium.Cartesian3.UNIT_Z,
            diffVector
          )
          var cross = Cartesian3.cross(
            Cesium.Cartesian3.UNIT_Z,
            diffVector,
            diffVectorScratch
          )
          var orientation = Quaternion.fromAxisAngle(
            cross,
            rotate - Math.PI,
            orientationScratch
          )

          //replace original radius
          radius = Cartesian3.distance(position, targetPosition)
          primitive.modelMatrix = Matrix4.fromRotationTranslation(
            Matrix3.fromQuaternion(orientation, matrix3Scratch),
            position,
            primitive.modelMatrix
          )
        } else {
          if (
            !Cartesian3.equals(position, data.position) ||
            !Quaternion.equals(orientation, data.orientation)
          ) {
            if (defined(orientation)) {
              primitive.modelMatrix = Matrix4.fromRotationTranslation(
                Matrix3.fromQuaternion(orientation, matrix3Scratch),
                position,
                primitive.modelMatrix
              )
              data.position = Cartesian3.clone(position, data.position)
              data.orientation = Quaternion.clone(orientation, data.orientation)
            } else {
              primitive.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
                position
              )
              data.position = Cartesian3.clone(position, data.position)
            }
          }
        }

        primitive.show = true
        primitive.gaze = gaze
        primitive.radius = radius
        primitive.xHalfAngle = xHalfAngle
        primitive.yHalfAngle = yHalfAngle
        primitive.lineColor = Property.getValueOrDefault(
          rectangularSensorGraphics._lineColor,
          time,
          Color.WHITE
        )
        primitive.showSectorLines = Property.getValueOrDefault(
          rectangularSensorGraphics._showSectorLines,
          time,
          true
        )
        primitive.showSectorSegmentLines = Property.getValueOrDefault(
          rectangularSensorGraphics._showSectorSegmentLines,
          time,
          true
        )
        primitive.showLateralSurfaces = Property.getValueOrDefault(
          rectangularSensorGraphics._showLateralSurfaces,
          time,
          true
        )
        primitive.material = MaterialProperty.getValue(
          time,
          rectangularSensorGraphics._material,
          primitive.material
        )
        primitive.showDomeSurfaces = Property.getValueOrDefault(
          rectangularSensorGraphics._showDomeSurfaces,
          time,
          true
        )
        primitive.showDomeLines = Property.getValueOrDefault(
          rectangularSensorGraphics._showDomeLines,
          time,
          true
        )
        primitive.showIntersection = Property.getValueOrDefault(
          rectangularSensorGraphics._showIntersection,
          time,
          true
        )
        primitive.intersectionColor = Property.getValueOrDefault(
          rectangularSensorGraphics._intersectionColor,
          time,
          Color.WHITE
        )
        primitive.intersectionWidth = Property.getValueOrDefault(
          rectangularSensorGraphics._intersectionWidth,
          time,
          1
        )
        primitive.showThroughEllipsoid = Property.getValueOrDefault(
          rectangularSensorGraphics._showThroughEllipsoid,
          time,
          true
        )
        primitive.scanPlaneMode = Property.getValueOrDefault(
          rectangularSensorGraphics._scanPlaneMode,
          time
        )
        primitive.scanPlaneColor = Property.getValueOrDefault(
          rectangularSensorGraphics._scanPlaneColor,
          time,
          Color.WHITE
        )
        primitive.showScanPlane = Property.getValueOrDefault(
          rectangularSensorGraphics._showScanPlane,
          time,
          true
        )
        primitive.scanPlaneRate = Property.getValueOrDefault(
          rectangularSensorGraphics._scanPlaneRate,
          time,
          1
        )
      }
      return true
    }

    /**
     * Returns true if this object was destroyed; otherwise, false.
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     */
    RectangularSensorVisualizer.prototype.isDestroyed = function () {
      return false
    }

    /**
     * Removes and destroys all primitives created by this instance.
     */
    RectangularSensorVisualizer.prototype.destroy = function () {
      var entities = this._entitiesToVisualize.values
      var hash = this._hash
      var primitives = this._primitives
      for (var i = entities.length - 1; i > -1; i--) {
        removePrimitive(entities[i], hash, primitives)
      }
      return destroyObject(this)
    }

    /**
     * @private
     */
    RectangularSensorVisualizer.prototype._onCollectionChanged = function (
      entityCollection,
      added,
      removed,
      changed
    ) {
      var i
      var entity
      var entities = this._entitiesToVisualize
      var hash = this._hash
      var primitives = this._primitives

      for (i = added.length - 1; i > -1; i--) {
        entity = added[i]
        if (defined(entity._rectangularSensor) && defined(entity._position)) {
          entities.set(entity.id, entity)
        }
      }

      for (i = changed.length - 1; i > -1; i--) {
        entity = changed[i]
        if (defined(entity._rectangularSensor) && defined(entity._position)) {
          entities.set(entity.id, entity)
        } else {
          removePrimitive(entity, hash, primitives)
          entities.remove(entity.id)
        }
      }

      for (i = removed.length - 1; i > -1; i--) {
        entity = removed[i]
        removePrimitive(entity, hash, primitives)
        entities.remove(entity.id)
      }
    }
    return RectangularSensorVisualizer
  }
}

export { InitRectangularSensorVisualizer }
