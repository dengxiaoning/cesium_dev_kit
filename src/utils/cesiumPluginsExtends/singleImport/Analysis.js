import BaseExtends from './Base'
import { Base, Draw, Plugin, Analysis } from '../libs'

class AnalysisExtends extends BaseExtends {
  constructor(obj) {
    return super({
      ...obj,
      baseExtendsCom: [Base, Draw, Plugin],
      extendsCom: Analysis,
      extendsComName: 'analysis'
    })
  }
}

export { AnalysisExtends as Analysis }
