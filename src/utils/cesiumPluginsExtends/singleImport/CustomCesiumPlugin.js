import BaseExtends from './Base'
import { Base, CustomCesiumPlugin } from '../libs'

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
    return new CustomCesiumPluginTempExtends(obj)
  }
}

export { CustomCesiumPluginExtends as CustomCesiumPlugin }
