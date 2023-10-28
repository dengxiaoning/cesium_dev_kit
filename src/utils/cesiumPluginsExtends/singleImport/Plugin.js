import BaseExtends from './Base'
import { Base, Graphics, Plugin } from '../libs'

class PluginExtends extends BaseExtends {
  constructor(obj) {
    return super({
      ...obj,
      baseExtendsCom: [Base, Graphics],
      extendsCom: Plugin,
      extendsComName: 'plugin'
    })
  }
}

export { PluginExtends as Plugin }
