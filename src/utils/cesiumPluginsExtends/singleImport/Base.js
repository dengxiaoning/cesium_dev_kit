import { Controller } from '../initConf'
export default class BaseExtends {
  constructor(obj) {
    return this.init(obj)
  }
  init({
    cesiumGlobal,
    containerId,
    viewerConfig = {},
    extraConfig = {},
    MapImageryList = [],
    defaultStatic,
    baseExtendsCom = [],
    extendsCom,
    extendsComName
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
    const protoExtends = this.prototypeExtends(
      _viewer,
      cesiumGlobal,
      defaultStatic
    )
    const _tempName = protoExtends(baseExtendsCom, extendsCom)
    return {
      viewer: _viewer,
      [extendsComName]: _tempName
    }
  }
  prototypeExtends(viewer, cesiumGlobal, defaultStatic) {
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
}
