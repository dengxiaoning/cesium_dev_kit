import BaseExtends from './Base'
import { Base, Shaders, Material } from '../libs'

class MaterialExtends extends BaseExtends {
  constructor(obj) {
    return super({
      ...obj,
      baseExtendsCom: [Base, Shaders],
      extendsCom: Material,
      extendsComName: 'material'
    })
  }
}

export { MaterialExtends as Material }
