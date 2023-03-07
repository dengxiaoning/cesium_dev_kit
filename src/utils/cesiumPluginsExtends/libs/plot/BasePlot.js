import {
  xp
} from './algorithm'
let Cesium = null;

function BasePlot(viewer, cesiumGlobal) {
  this.viewer = viewer;
  Cesium = cesiumGlobal;
  this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
  this.fillMaterial = Cesium.Color.RED.withAlpha(0.5);

  this.positions = []; //控制点
  this.state = -1; //state用于区分当前的状态 0 为删除 1为添加 2为编辑 
  this.floatPoint = null;
  this.arrowEntity = null;
  this.pointArr = []; //中间各点
  this.selectPoint = null;
  this.clickStep = 0; //用于控制点的移动结束
  this.modifyHandler = null;
  this.xp = xp;
}
BasePlot.prototype.clear = function () { //清除绘制箭头
  this.state = 0;
  if (this.firstPoint) this.viewer.entities.remove(this.firstPoint);
  if (this.floatPoint) this.viewer.entities.remove(this.floatPoint);
  if (this.arrowEntity) this.viewer.entities.remove(this.arrowEntity);
  this.state = -1;
}
BasePlot.prototype.disableHandler = function () {
  if (this.handler) {
    this.handler.destroy();
    this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
  }
  if (this.modifyHandler) {
    this.modifyHandler.destroy();
    this.modifyHandler = null;
  }
}
export {
  BasePlot
}