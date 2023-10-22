import BaseExtends from './Base'
import { Base, Primitive } from '../libs'

class PrivmitiveExtends extends BaseExtends {
  constructor(obj) {
    return super({
      ...obj,
      baseExtendsCom: Base,
      extendsCom: Primitive,
      extendsComName: 'primitive'
    })
  }
}

export { PrivmitiveExtends as Primitive }
