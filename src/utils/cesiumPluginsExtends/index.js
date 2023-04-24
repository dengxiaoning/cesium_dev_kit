import {
  Controller
} from './initConf';
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
  PincerArrow
} from './libs'
import * as alternateCesium from 'cesium'

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

  /**
   * 初始化入口函数
   * @param {*} param0 
   * {
   *   cesiumGlobal：{Object} ceiusm全局对象
   *   containerId:{String} 容器id
   *   viewerConfig:{Object} viewer基础配置
   *      【参数格式】：{与官网一致}
   *   extreaConfig：{Object }
   *     【参数格式】：
   *       {
   *        initNavigate：true，指南针,
   *        logo：true，// 是否显示logo
   *        depthTest：true， //开启深度检测 
   *      }
   *   MapImageryList:{Array} 配置底图，每一个元素格式为
   *    【参数格式】 ：
   *      [{
   *        id: 3,
            name: '',
            type: '',//ImageryProvider类型
            classConfig: {
              url:  链接地址
            },
            interfaceConfig: {},
            offset: '0,0',
            invertswitch: 0,
            filterRGB: '#ffffff',
            showswitch: 1,
            weight: 13,
            createtime: 创建时间
            updatetime: 更新时间,
        }]
   *   
   * }
   * @returns 
   */
export function initCesium({cesiumGlobal=alternateCesium, containerId,viewerConfig={}, extreaConfig={}, MapImageryList = [] }) {
  const initCom = new Controller(cesiumGlobal);
  const _viewer = initCom.init({containerId, viewerConfig, extreaConfig, MapImageryList});

  // 合并对象，实现继承
  const protoExtends = prototypeExtends(_viewer, cesiumGlobal);
  // 初始化材质
  const _material = protoExtends([Base, Shaders], Material);
  const _graphics = protoExtends(Base, Graphics);
  const _math3d = protoExtends(Base, Math3d);
  const _primitive = protoExtends(Base, Primitive);
  const _draw = protoExtends([Base, Math3d, Math2d], Draw);
  const _passEffect = protoExtends([Base, Shaders], PassEffect);
  const _customCesiumPlugin = protoExtends(Base, CustomCesiumPlugin);
  const _control = protoExtends(Base, Control);
  const _plugin = protoExtends(Base, Plugin);
  const _base = new Base(_viewer, cesiumGlobal);
  const _analysis = protoExtends([Base, Draw, Plugin], Analysis);
  const _attackArrowObj = new AttackArrow(_viewer, cesiumGlobal);
  const _straightArrowObj = new StraightArrow(_viewer, cesiumGlobal);
  const _pincerArrowObj = new PincerArrow(_viewer, cesiumGlobal);

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
    pincerArrowObj:_pincerArrowObj
  }
}