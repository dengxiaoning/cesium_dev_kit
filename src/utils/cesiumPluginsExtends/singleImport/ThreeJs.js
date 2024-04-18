import BaseExtends from './Base'
import { ThreeJs } from '../libs'

class ThreeJsExtends extends BaseExtends {
  constructor(obj) {
    return super({
      ...obj,
      baseExtendsCom: [],
      extendsCom: ThreeJs,
      extendsComName: 'threeJs'
    })
  }
}

export { ThreeJsExtends as ThreeJs }
