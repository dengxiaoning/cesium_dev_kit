import BaseExtends from './Base'
import { Base, CustomCesiumPlugin } from '../libs'
import { RadarPlugin } from '../libs/radar/index'

class CustomCesiumPluginTempExtends extends BaseExtends {
  constructor(obj) {
    return super({
      ...obj,
      baseExtendsCom: Base,
      extendsCom: CustomCesiumPlugin,
      extendsComName: 'customCesiumPlugin'
    })
  }
}

class CustomCesiumPluginExtends {
  constructor(obj) {
    let res = new CustomCesiumPluginTempExtends(obj)
    return this._initInter(res, obj)
  }
  _initInter(res, obj) {
    new RadarPlugin(res.viewer, obj.cesiumGlobal, obj.defaultStatic)
    return res
  }
}

export { CustomCesiumPluginExtends as CustomCesiumPlugin }
