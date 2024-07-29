import { Graphics } from "./Graphics";
//封装TooltipCesium对象
let Cesium = null;
class TooltipUtil{
  constructor(viewer, cesiumGlobal) {
    Cesium = cesiumGlobal;
    this._viewer = viewer;
    this._labelEntity = null;
    this.$graphics = new Graphics(viewer, cesiumGlobal);
    this.isInit = false;
  }
  initTool () {
      if (this.isInit) { return; }
      this._labelEntity =  this._viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(0, 0),
        label: this.$graphics.getLabelGraphics({
          l_text: '操作提示',
          l_fillColor: Cesium.Color.CYAN,
          l_outlineColor: Cesium.Color.BLACK,
        })
      });
    
      this._labelEntity.show = false;
      this.isInit = true;
  }

  setVisible (visible) {
      if (!this.isInit) { return; }
      this._labelEntity.show = visible ? true : false;
  }
  showAt (position, message) {
      if (!this.isInit) { return; }
      if (position && message) {
        this._labelEntity.show = true;
          var cartesian = this._viewer.camera.pickEllipsoid(position, this._viewer.scene.globe.ellipsoid);// 
          if (cartesian) {
            this._labelEntity.position = cartesian;
            this._labelEntity.show = true;
            this._labelEntity.label.text = message;
          } else {
            this._labelEntity.show = false;
          }
      }
  }
  showAtCartesian (cartesian, message) {
      if (!this.isInit) { return; }
    if (cartesian && message) {
        this._labelEntity.show = true;
        this._labelEntity.position = cartesian;
        this._labelEntity.show = true;
        this._labelEntity.label.text = message;
      }
  }
}
export {TooltipUtil}