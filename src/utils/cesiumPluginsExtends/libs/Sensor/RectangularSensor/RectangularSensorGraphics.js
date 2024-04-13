let Cesium = {}
function InitRectangularSensorGraphics(cesiumGlobal) {
  Cesium = cesiumGlobal
  var defaultValue = Cesium.defaultValue
  var defined = Cesium.defined
  var defineProperties = Object.defineProperties
  var DeveloperError = Cesium.DeveloperError
  var Event = Cesium.Event
  var createMaterialPropertyDescriptor = Cesium.createMaterialPropertyDescriptor
  var createPropertyDescriptor = Cesium.createPropertyDescriptor

  function RectangularSensorGraphics(options) {
    this._show = undefined
    this._radius = undefined
    this._xHalfAngle = undefined
    this._yHalfAngle = undefined
    this._lineColor = undefined
    this._showSectorLines = undefined
    this._showSectorSegmentLines = undefined
    this._showLateralSurfaces = undefined
    this._material = undefined
    this._showDomeSurfaces = undefined
    this._showDomeLines = undefined
    this._showIntersection = undefined
    this._intersectionColor = undefined
    this._intersectionWidth = undefined
    this._showThroughEllipsoid = undefined
    this._gaze = undefined
    this._showScanPlane = undefined
    this._scanPlaneColor = undefined
    this._scanPlaneMode = undefined
    this._scanPlaneRate = undefined
    this._definitionChanged = new Event()
    this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT))
  }

  defineProperties(RectangularSensorGraphics.prototype, {
    definitionChanged: {
      get: function () {
        return this._definitionChanged
      }
    },

    show: createPropertyDescriptor('show'),
    radius: createPropertyDescriptor('radius'),
    xHalfAngle: createPropertyDescriptor('xHalfAngle'),
    yHalfAngle: createPropertyDescriptor('yHalfAngle'),
    lineColor: createPropertyDescriptor('lineColor'),
    showSectorLines: createPropertyDescriptor('showSectorLines'),
    showSectorSegmentLines: createPropertyDescriptor('showSectorSegmentLines'),
    showLateralSurfaces: createPropertyDescriptor('showLateralSurfaces'),
    material: createMaterialPropertyDescriptor('material'),
    showDomeSurfaces: createPropertyDescriptor('showDomeSurfaces'),
    showDomeLines: createPropertyDescriptor('showDomeLines '),
    showIntersection: createPropertyDescriptor('showIntersection'),
    intersectionColor: createPropertyDescriptor('intersectionColor'),
    intersectionWidth: createPropertyDescriptor('intersectionWidth'),
    showThroughEllipsoid: createPropertyDescriptor('showThroughEllipsoid'),
    gaze: createPropertyDescriptor('gaze'),
    showScanPlane: createPropertyDescriptor('showScanPlane'),
    scanPlaneColor: createPropertyDescriptor('scanPlaneColor'),
    scanPlaneMode: createPropertyDescriptor('scanPlaneMode'),
    scanPlaneRate: createPropertyDescriptor('scanPlaneRate')
  })

  RectangularSensorGraphics.prototype.clone = function (result) {
    if (!defined(result)) {
      result = new RectangularSensorGraphics()
    }

    result.show = this.show
    result.radius = this.radius
    result.xHalfAngle = this.xHalfAngle
    result.yHalfAngle = this.yHalfAngle
    result.lineColor = this.lineColor
    result.showSectorLines = this.showSectorLines
    result.showSectorSegmentLines = this.showSectorSegmentLines
    result.showLateralSurfaces = this.showLateralSurfaces
    result.material = this.material
    result.showDomeSurfaces = this.showDomeSurfaces
    result.showDomeLines = this.showDomeLines
    result.showIntersection = this.showIntersection
    result.intersectionColor = this.intersectionColor
    result.intersectionWidth = this.intersectionWidth
    result.showThroughEllipsoid = this.showThroughEllipsoid
    result.gaze = this.gaze
    result.showScanPlane = this.showScanPlane
    result.scanPlaneColor = this.scanPlaneColor
    result.scanPlaneMode = this.scanPlaneMode
    result.scanPlaneRate = this.scanPlaneRate

    return result
  }

  RectangularSensorGraphics.prototype.merge = function (source) {
    if (!defined(source)) {
      throw new DeveloperError('source is required.')
    }

    this.show = defaultValue(this.show, source.show)
    this.radius = defaultValue(this.radius, source.radius)
    this.xHalfAngle = defaultValue(this.xHalfAngle, source.xHalfAngle)
    this.yHalfAngle = defaultValue(this.yHalfAngle, source.yHalfAngle)
    this.lineColor = defaultValue(this.lineColor, source.lineColor)
    this.showSectorLines = defaultValue(
      this.showSectorLines,
      source.showSectorLines
    )
    this.showSectorSegmentLines = defaultValue(
      this.showSectorSegmentLines,
      source.showSectorSegmentLines
    )
    this.showLateralSurfaces = defaultValue(
      this.showLateralSurfaces,
      source.showLateralSurfaces
    )
    this.material = defaultValue(this.material, source.material)
    this.showDomeSurfaces = defaultValue(
      this.showDomeSurfaces,
      source.showDomeSurfaces
    )
    this.showDomeLines = defaultValue(this.showDomeLines, source.showDomeLines)
    this.showIntersection = defaultValue(
      this.showIntersection,
      source.showIntersection
    )
    this.intersectionColor = defaultValue(
      this.intersectionColor,
      source.intersectionColor
    )
    this.intersectionWidth = defaultValue(
      this.intersectionWidth,
      source.intersectionWidth
    )
    this.showThroughEllipsoid = defaultValue(
      this.showThroughEllipsoid,
      source.showThroughEllipsoid
    )
    this.gaze = defaultValue(this.gaze, source.gaze)
    this.showScanPlane = defaultValue(this.showScanPlane, source.showScanPlane)
    this.scanPlaneColor = defaultValue(
      this.scanPlaneColor,
      source.scanPlaneColor
    )
    this.scanPlaneMode = defaultValue(this.scanPlaneMode, source.scanPlaneMode)
    this.scanPlaneRate = defaultValue(this.scanPlaneRate, source.scanPlaneRate)
  }
  return RectangularSensorGraphics
}

export { InitRectangularSensorGraphics }
