import { xp} from './algorithm'
import type { XpAlgorithm } from './algorithm'
import {TooltipUtil} from '../TooltipUtil'
import type { CesiumGlobal } from '../Base'

/** BasePlot 实例类型 */
export interface BasePlotInstance {
  viewer: any
  handler: any
  fillMaterial: any | any | string
  positions: any[]
  state: number
  floatPoint: any | null
  arrowEntity: any | null
  pointArr: any[]
  selectPoint: any | null
  clickStep: number
  modifyHandler: any | null
  xp: { algorithm: XpAlgorithm }
  tooltip: TooltipUtil
  firstPoint: any | null
  _Cesium: CesiumGlobal
  clear(): void
  disableHandler(): void
}

/** BasePlot 构造函数类型 */
export interface BasePlotConstructor {
  new (viewer?: any, cesiumGlobal?: CesiumGlobal): BasePlotInstance
  prototype: BasePlotInstance
}



const BasePlot = function (this: BasePlotInstance, viewer?: any, cesiumGlobal?: CesiumGlobal) {
  this.viewer = viewer!;
  this._Cesium = cesiumGlobal as CesiumGlobal;
  this.handler = new this._Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
  this.fillMaterial = this._Cesium.Color.RED.withAlpha(0.5);

  this.positions = []; //控制点
  this.state = -1; //state用于区分当前的状态 0 为删除 1为添加 2为编辑 
  this.floatPoint = null;
  this.arrowEntity = null;
  this.pointArr = []; //中间各点
  this.selectPoint = null;
  this.clickStep = 0; //用于控制点的移动结束
  this.modifyHandler = null;
  this.xp = xp;
  this.tooltip = new TooltipUtil(viewer!, cesiumGlobal);
  this.tooltip.initTool();
} as unknown as BasePlotConstructor
BasePlot.prototype.clear = function (this: BasePlotInstance) { //清除绘制箭头
  this.state = 0;
  if (this.firstPoint) this.viewer.entities.remove(this.firstPoint);
  if (this.floatPoint) this.viewer.entities.remove(this.floatPoint);
  if (this.arrowEntity) this.viewer.entities.remove(this.arrowEntity);
  this.state = -1;
}
BasePlot.prototype.disableHandler = function (this: BasePlotInstance) {
  var Cesium = this._Cesium
  if (this.handler) {
    this.handler.destroy();
    this.handler = new this._Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
  }
  if (this.modifyHandler) {
    this.modifyHandler.destroy();
    this.modifyHandler = null;
  }
}
export {
  BasePlot
}