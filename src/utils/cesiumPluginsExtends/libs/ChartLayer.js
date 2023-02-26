/**
 * chart 插件
 */
function ChartLayer() {
  this._chartLayer = null
}

ChartLayer.prototype = {
  createChartLayer() {
    this._chartLayer = new Cesium.ChartLayer()
    return this._chartLayer.install({
      csmContainer: this._csmContainer,
      canvas: this._viewer.scene.canvas,
      viewer: this._viewer
    })
  },
  setChartData(options) {
    if (options) {
      this._chartLayer &&
        this._chartLayer.setOption(options)
    }
  },
  removeChartLayer() {}
}