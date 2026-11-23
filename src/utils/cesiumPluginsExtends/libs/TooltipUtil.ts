import { Graphics } from "./Graphics";
import type { GraphicsInstance } from "./Graphics";
import type { Viewer } from './Base'
import type { Cartesian2, Cartesian3 } from 'cesium'
import { createScopedConstructor, attachDestroy, registerCleanup, disposeModule } from './Base'


//封装TooltipCesium对象
/**
 * 为每个实例创建独立闭包，避免模块级 Cesium/dfSt 及交互状态在多个 viewer 间共享。
 * 由 createScopedConstructor 在每次 new 时调用。
 */
export function createTooltipUtilModule() {
  let Cesium: any = null;

class TooltipUtil {
  /** cesium viewer 实例 */
  _viewer: Viewer
  /** 提示 label 实体 */
  _labelEntity: any
  /** 图形创建工具 */
  $graphics: GraphicsInstance
  /** 是否已经初始化 */
  isInit: boolean
  /** 释放当前模块持有的监听器 / 实体（幂等） */
  destroy!: () => void

  constructor(viewer: Viewer, cesiumGlobal: any) {
    Cesium = cesiumGlobal;
    this._viewer = viewer;
    this._labelEntity = null;
    this.$graphics = new Graphics(viewer, cesiumGlobal);
    this.isInit = false;
    attachDestroy(this);
    registerCleanup(this, () => {
      if (this._labelEntity && this._viewer) {
        this._viewer.entities.remove(this._labelEntity);
        this._labelEntity = null;
      }
      disposeModule(this.$graphics);
    });
  }
  initTool(): void {
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

  setVisible (visible: boolean) {
      if (!this.isInit) { return; }
      this._labelEntity.show = visible ? true : false;
  }
  showAt (position: Cartesian2, message: string) {
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
  showAtCartesian (cartesian: Cartesian3, message: string) {
      if (!this.isInit) { return; }
    if (cartesian && message) {
        this._labelEntity.show = true;
        this._labelEntity.position = cartesian;
        this._labelEntity.show = true;
        this._labelEntity.label.text = message;
      }
  }
}
  return TooltipUtil
}

export const TooltipUtil = createScopedConstructor(createTooltipUtilModule)
export type TooltipUtil = InstanceType<typeof TooltipUtil>