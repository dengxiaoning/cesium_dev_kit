import {
  Controller
} from './initConf';
import {
  Graphics
} from './libs/Graphics';
import {
  Material
} from './libs/Material';
import {
  Shaders
} from './libs/Shaders';
import {
  Base
} from './libs/Base';
import {
  Math3d
} from './libs/Math3d';
import {
  Primitive
} from './libs/Primitive'
import {
  Draw
} from './libs/Draw'
let Cesium = null;

const prototypeExtends = function (viewer, cesiumGlobal) {
  function _inner(parents, children) {
    var curr = null;
    if (Array.isArray(parents)) {
      parents.forEach(pp => {
        exeClone(pp);
      })
      curr = new children(viewer, cesiumGlobal);
      parents.forEach(pp => {
        pp.call(curr, viewer, cesiumGlobal);
      })
    } else {
      exeClone(parents);
      curr = new children(viewer, cesiumGlobal);
      parents.call(curr, viewer, cesiumGlobal);
    }

    function exeClone(cloneTarget) {
      //拷贝方法
      var keys = Object.keys(cloneTarget.prototype);
      var i, len;
      for (var i = 0, len = keys.length; i < len; i++) {
        children.prototype[keys[i]] = cloneTarget.prototype[keys[i]];
      }
    }
    return curr;
  }
  return _inner;
}


export function initCesium(cesiumGlobal, containerId, BaseMapConfig, MapImageryList = []) {
  Cesium = cesiumGlobal;
  const initCom = new Controller(cesiumGlobal);
  const _viewer = initCom.init(containerId, BaseMapConfig, MapImageryList);

  // 合并对象，实现继承
  const protoExtends = prototypeExtends(_viewer, cesiumGlobal);
  // 初始化材质
  const _material = protoExtends([Base, Shaders], Material);
  const _graphics = protoExtends(Base, Graphics);
  const _math3d = protoExtends(Base, Math3d);
  const _primitive = protoExtends(Base, Primitive);
  const _draw = protoExtends([Base, Math3d], Draw);
  return {
    viewer: _viewer,
    material: _material,
    graphics: _graphics,
    math3d: _math3d,
    primitive: _primitive,
    draw: _draw
  }
}