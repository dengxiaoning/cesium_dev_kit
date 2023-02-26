/**
 * mapv 插件
 */
function MapvLayer() {
  this._mapvLayer = null
}

MapvLayer.prototype = {
  createMapvLayer(option) {
    if (this._viewer && option) {
      this._mapvLayer = new mapv.cesiumMapLayer(
        this._viewer,
        new mapv.DataSet([]),
        option || {}
      )
      this._viewer.scene.canvas.setAttribute('tabIndex', 0)

      return this._mapvLayer
    }
  },
  setMapvData(dataSet, option) {
    if (dataSet && option) {
      this._mapvLayer &&
        this._mapvLayer.update({
          data: dataSet,
          option: option
        })
    }
  },
  removeMapvLayer() {}
}