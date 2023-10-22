import BaseExtends from './Base'
import {
  Base,
  Math3d,
  Math2d,
  Draw,
  AttackArrow,
  StraightArrow,
  PincerArrow
} from '../libs'

class DrawTempExtends extends BaseExtends {
  constructor(obj) {
    return super({
      ...obj,
      baseExtendsCom: [Base, Math3d, Math2d],
      extendsCom: Draw,
      extendsComName: 'draw'
    })
  }
}

class DrawExtends {
  constructor(obj) {
    const res = new DrawTempExtends(obj)
    return this._initCurrMeasure(obj, res)
  }
  _initCurrMeasure(obj, res) {
    const _attackArrowObj = new AttackArrow(res.viewer, obj.cesiumGlobal)
    const _straightArrowObj = new StraightArrow(res.viewer, obj.cesiumGlobal)
    const _pincerArrowObj = new PincerArrow(res.viewer, obj.cesiumGlobal)
    return {
      ...res,
      attackArrowObj: _attackArrowObj,
      straightArrowObj: _straightArrowObj,
      pincerArrowObj: _pincerArrowObj
    }
  }
}
export { DrawExtends as Draw }
