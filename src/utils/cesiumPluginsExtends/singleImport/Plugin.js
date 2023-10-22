import BaseExtends from './Base'
import { Base, Plugin } from '../libs'

class PluginExtends extends BaseExtends {
  constructor(obj) {
    return super({
      ...obj,
      baseExtendsCom: Base,
      extendsCom: Plugin,
      extendsComName: 'plugin'
    })
  }
}

export { PluginExtends as Plugin }
