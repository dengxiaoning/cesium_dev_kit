import BaseExtends from './Base'
import { Base, Shaders, PassEffect } from '../libs'

class PassEffectExtends extends BaseExtends {
  constructor(obj) {
    return super({
      ...obj,
      baseExtendsCom: [Base, Shaders],
      extendsCom: PassEffect,
      extendsComName: 'passEffect'
    })
  }
}

export { PassEffectExtends as PassEffect }
