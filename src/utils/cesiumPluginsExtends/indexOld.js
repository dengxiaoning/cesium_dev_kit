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
  ThreeJs
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
/**
 * @typedef {Object} extraConfigOptions  - 其它的额外配置
 * @property {string}  AccessToken - 认证token
 * @property {boolean} logo -显示logo，默认true
 * @property {boolean} depthTest - 是否开启深度参数,默认false
 */
/**
 * @typedef {Object} providerConfOptions  - 配置provider的参数 json 对象
 * @property {string}  type - Provider类型，可选WebMapTileServiceImageryProvider/UrlTemplateImageryProvider/TileMapServiceImageryProvider
 * @property {Cesium.WebMapTileServiceImageryProvider.ConstructorOptions|
 * Cesium.UrlTemplateImageryProvider.ConstructorOptions|
 * Cesium.TileMapServiceImageryProvider.ConstructorOptions}  options - 每一个provider 的参数配置，参考官方的provider
 */
/**
 * @typedef {Object} resModulesType - 所有模块实例信息
 * @property {Viewer}  viewer - cesium 实例
 * @property {Graphics}  graphics - 图形实例
 * @property {Material}  mterial - 材质实例
 * @property {Primitive}  primitive - 图元实例
 * @property {Draw}  draw - 画笔实例
 * @property {Analysis}  analysis - 分析实例
 * @property {CustomCesiumPlugin}  customCesiumPlugin - 自定义扩展(传感器)实例
 * @property {PassEffect}  passEffect - 后置处理实例
 * @property {Plugin}  plugin - 插件实例
 * @property {ThreeJs}  threeJs - 集成threejs实例
 * @property {Control}  control - 控制模块实例
 * @property {Math2d}  math2d - 数学2d计算工具实例
 * @property {Math3d}  math3d - 数学3d计算工具实例
 * @property {AttackArrow}  attackArrowObj - 标会（攻击箭头）模块
 * @property {StraightArrow}  straightArrowObj - 标会（直线箭头）模块
 * @property {PincerArrow}  pincerArrowObj - 标会（钳击箭头）模块
 */
/**
 * 初始化Cesium 对象
  * @constructor
   * @param {object} params
   * @param {string}  params.cesiumGlobal - 全局Cesium 对象
   * @param {string}  params.containerId - 挂载cesium 对象的dom id
   * @param {string}  params.threeGlobal - 全局的THREE对象
   * @param {string}  params.threeContainerId - 挂载THREEJS对象的dom id
   * @param {extraConfigOptions}  params.extraConfig - 二外配置,默认{}
   * @param {providerConfOptions}  params.imageryProvider - provider 信息配置,默认{}
   * @param {Array<providerConfOptions>}  params.MapImageryList - 配置imageLayer加载对象,默认[]
   * @param {Cesium.Viewer.ConstructorOptions} params.viewerConfig - 同cesium viewer 配置参数,默认{}
   * @param {string}  params.defaultStatic - 静态数据配置
  * @example
  * import { initCesium } from 'cesium_dev_kit'
   * const {
   *      viewer,
          material:,
          graphics,
          math3d,
          math2d,
          primitive,
          draw,
          passEffect,
          customCesiumPlugin,
          control,
          plugin,
          base,
          analysis,
          attackArrowObj,
          straightArrowObj,
          pincerArrowObj,
          threeJs
        } =
   *   new initCesium({
            cesiumGlobal: Cesium,
            containerId: 'cesiumContainer',
            viewerConfig: {
              infoBox: false,
              shouldAnimate: true,
            },
            extraConfig: {
              depthTest: true
            },
            imageryProvider: {
                type: "WebMapTileServiceImageryProvider",
                option: {
                  url: "http://t0.tianditu.gov.cn/img_w/wmts?tk=65a5f62a964c1d5b23fa81bc34147973",
                  layer: "img",
                  style: "default",
                  tileMatrixSetID: "w",
                  format: "tiles",
                  maximumLevel: 18,
                },
              },
            MapImageryList: [{
              type: "WebMapTileServiceImageryProvider",
              option: {
                url: "http://t0.tianditu.gov.cn/cia_w/wmts?tk=65a5f62a964c1d5b23fa81bc34147973",
                layer: "cia",
                style: "default",
                tileMatrixSetID: "w",
                format: "tiles",
                maximumLevel: 18,
              },
            }],
            defaultStatic
          })
   * @returns {resModulesType} 返回所有模块实例
   * @exports initCesium
   */
export function initCesium({
  cesiumGlobal,
  threeGlobal,
  containerId,
  threeContainerId,
  viewerConfig = {},
  extraConfig = {},
  imageryProvider = {},
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
    MapImageryList,
    imageryProvider
  })

  // 合并对象，实现继承
  const protoExtends = prototypeExtends(_viewer, cesiumGlobal, defaultStatic)
  // 初始化材质
  const _material = protoExtends([Base, Shaders], Material)
  const _graphics = protoExtends(Base, Graphics)
  const _math3d = protoExtends(Base, Math3d)
  const _math2d = new Math2d(_viewer, cesiumGlobal)
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
  // three 容器绑定优化
  const threeConf = threeGlobal
    ? { threeGlobal, containerId, threeContainerId }
    : ''
  const _threeJs = new ThreeJs(_viewer, cesiumGlobal, defaultStatic, threeConf)

  return {
    viewer: _viewer,
    material: _material,
    graphics: _graphics,
    math3d: _math3d,
    math2d: _math2d,
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
    pincerArrowObj: _pincerArrowObj,
    threeJs: _threeJs
  }
}
