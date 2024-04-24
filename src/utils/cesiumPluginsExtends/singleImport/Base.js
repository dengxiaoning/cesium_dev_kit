import { Controller } from '../initConf'
export default class BaseExtends {
  constructor(obj) {
    return this.init(obj)
  }
  init({
    cesiumGlobal,
    threeGlobal,
    containerId,
    threeContainerId,
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
    // three 容器绑定优化
    const threeConf = threeGlobal
      ? { threeGlobal, containerId, threeContainerId }
      : ''
    // 合并对象，实现继承
    const protoExtends = this.prototypeExtends(
      _viewer,
      cesiumGlobal,
      defaultStatic,
      threeConf
    )
    const _tempName = protoExtends(baseExtendsCom, extendsCom)
    return {
      viewer: _viewer,
      [extendsComName]: _tempName
    }
  }
  prototypeExtends(viewer, cesiumGlobal, defaultStatic, threeGlobal) {
    function _inner(parents, children) {
      var curr = null
      if (Array.isArray(parents)) {
        parents.forEach((pp) => {
          exeClone(pp)
        })
        curr = new children(viewer, cesiumGlobal, defaultStatic, threeGlobal)
        parents.forEach((pp) => {
          pp.call(curr, viewer, cesiumGlobal, defaultStatic, threeGlobal)
        })
      } else {
        exeClone(parents)
        curr = new children(viewer, cesiumGlobal, defaultStatic, threeGlobal)
        parents.call(curr, viewer, cesiumGlobal, defaultStatic, threeGlobal)
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
