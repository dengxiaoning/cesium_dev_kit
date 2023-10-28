import { Controller } from './initConf'
import {
  Base,
  Material,
  Shaders,
  Graphics,
  Draw,
  Primitive,
  CustomCesiumPlugin,
  PassEffect,
  Math2d,
  Math3d,
  Control,
  Plugin,
  Analysis,
  AttackArrow,
  StraightArrow,
  PincerArrow,
  RadarPlugin
} from './libs'

const prototypeExtends = function (viewer, cesiumGlobal, defaultStatic) {
  function _inner(parents, children) {
    var curr = null
    if (Array.isArray(parents)) {
      parents.forEach((pp) => {
        exeClone(pp)
      })
      curr = new children(viewer, cesiumGlobal, defaultStatic)
      parents.forEach((pp) => {
        pp.call(curr, viewer, cesiumGlobal, defaultStatic)
      })
    } else {
      exeClone(parents)
      curr = new children(viewer, cesiumGlobal, defaultStatic)
      parents.call(curr, viewer, cesiumGlobal, defaultStatic)
    }

    function exeClone(cloneTarget) {
      //拷贝方法
      var keys = Object.keys(cloneTarget.prototype)
      var i, len
      for (var i = 0, len = keys.length; i < len; i++) {
        children.prototype[keys[i]] = cloneTarget.prototype[keys[i]]
      }
    }
    return curr
  }
  return _inner
}

export function initCesium({
  cesiumGlobal,
  containerId,
  viewerConfig = {},
  extraConfig = {},
  MapImageryList = [],
  defaultStatic
}) {
  if (!cesiumGlobal) {
    throw 'Missing cesiumGlobal parameter, please check the calling function initCesium.'
  }
  if (!containerId) {
    throw 'Missing containerId parameter, please check the calling function initCesium.'
  }
  const initCom = new Controller(cesiumGlobal)
  const _viewer = initCom.init({
    containerId,
    viewerConfig,
    extraConfig,
    MapImageryList
  })

  // 合并对象，实现继承
  const protoExtends = prototypeExtends(_viewer, cesiumGlobal, defaultStatic)
  // 初始化材质
  const _material = protoExtends([Base, Shaders], Material)
  const _graphics = protoExtends(Base, Graphics)
  const _math3d = protoExtends(Base, Math3d)
  const _primitive = protoExtends(Base, Primitive)
  const _draw = protoExtends([Base, Math3d, Math2d], Draw)
  const _passEffect = protoExtends([Base, Shaders], PassEffect)
  const _customCesiumPlugin = protoExtends(Base, CustomCesiumPlugin)
  const _control = protoExtends(Base, Control)
  const _plugin = protoExtends([Base, Graphics], Plugin)
  const _base = new Base(_viewer, cesiumGlobal)
  const _analysis = protoExtends([Base, Draw, Plugin], Analysis)
  const _attackArrowObj = new AttackArrow(_viewer, cesiumGlobal)
  const _straightArrowObj = new StraightArrow(_viewer, cesiumGlobal)
  const _pincerArrowObj = new PincerArrow(_viewer, cesiumGlobal)
  // 初始化相控相关对象
  new RadarPlugin(_viewer, cesiumGlobal, defaultStatic)
  return {
    viewer: _viewer,
    material: _material,
    graphics: _graphics,
    math3d: _math3d,
    primitive: _primitive,
    draw: _draw,
    passEffect: _passEffect,
    customCesiumPlugin: _customCesiumPlugin,
    control: _control,
    plugin: _plugin,
    base: _base,
    analysis: _analysis,
    attackArrowObj: _attackArrowObj,
    straightArrowObj: _straightArrowObj,
    pincerArrowObj: _pincerArrowObj
  }
}
