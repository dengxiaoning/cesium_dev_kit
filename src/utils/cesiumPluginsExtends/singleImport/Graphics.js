import BaseExtends from './Base'
import { Base, Graphics } from '../libs'

class GraphicsExtends extends BaseExtends {
  constructor(obj) {
    return super({
      ...obj,
      baseExtendsCom: Base,
      extendsCom: Graphics,
      extendsComName: 'graphics'
    })
  }
}

export { GraphicsExtends as Graphics }
