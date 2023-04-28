/**
 * 该文件配置所以默认的静态资源路径
 * 如：图片，模型等
 * 这些配置是在创建实例是没有给于iamgeUrl时使用
 * 例：
 *  craeteDynamicCricleGraphics:(options){
 *    new Cesium.ImageMaterialProperty({
 *     image: options.img || 'static/data/images/Textures/circle_bg.png'
  *   }
 * }
 * 优先看options 是否传入img,如没有使用默认配置
 */
const defaultStatic = {
  baseService:'https://benpaodehenji.com/cesium_dev_kit/',// 加载静态资源的服务器地址（如https://www.static.com）,将会拼接与下面路径前
  skyBox: { // 天空盒子
    one: {//天空盒1
      positiveX: 'static/data/images/SkyBox/00h+00.jpg',
      negativeX: 'static/data/images/SkyBox/12h+00.jpg',
      positiveY: 'static/data/images/SkyBox/06h+00.jpg',
      negativeY: 'static/data/images/SkyBox/18h+00.jpg',
      positiveZ: 'static/data/images/SkyBox/06h+90.jpg',
      negativeZ: 'static/data/images/SkyBox/06h-90.jpg',
    },
    two: {//天空盒2
      positiveX: 'static/data/images/SkyBox/Version2_dark_px.jpg',
      negativeX: 'static/data/images/SkyBox/Version2_dark_mx.jpg',
      positiveY: 'static/data/images/SkyBox/Version2_dark_py.jpg',
      negativeY: 'static/data/images/SkyBox/Version2_dark_my.jpg',
      positiveZ: 'static/data/images/SkyBox/Version2_dark_pz.jpg',
      negativeZ: 'static/data/images/SkyBox/Version2_dark_mz.jpg'
    },
    three: {//天空盒3
      positiveX: 'static/data/images/SkyBox/tycho2t3_80_pxs.jpg',
      negativeX: 'static/data/images/SkyBox/tycho2t3_80_mxs.jpg',
      positiveY: 'static/data/images/SkyBox/tycho2t3_80_pys.jpg',
      negativeY: 'static/data/images/SkyBox/tycho2t3_80_mys.jpg',
      positiveZ: 'static/data/images/SkyBox/tycho2t3_80_pzs.jpg',
      negativeZ: 'static/data/images/SkyBox/tycho2t3_80_mzs.jpg'
    },
    nearOne: {//近景天空盒1
      positiveX: 'static/data/images/SkyBox/rightav9.jpg',
      negativeX: 'static/data/images/SkyBox/leftav9.jpg',
      positiveY: 'static/data/images/SkyBox/frontav9.jpg',
      negativeY: 'static/data/images/SkyBox/backav9.jpg',
      positiveZ: 'static/data/images/SkyBox/topav9.jpg',
      negativeZ: 'static/data/images/SkyBox/bottomav9.jpg'
    },
    nearTwo: {//近景天空盒2
      positiveX: 'static/data/images/SkyBox/SunSetRight.png',
      negativeX: 'static/data/images/SkyBox/SunSetLeft.png',
      positiveY: 'static/data/images/SkyBox/SunSetFront.png',
      negativeY: 'static/data/images/SkyBox/SunSetBack.png',
      positiveZ: 'static/data/images/SkyBox/SunSetUp.png',
      negativeZ: 'static/data/images/SkyBox/SunSetDown.png'
    },
    nearThree: {//近景天空盒3
      positiveX: 'static/data/images/SkyBox/Right.jpg',
      negativeX: 'static/data/images/SkyBox/Left.jpg',
      positiveY: 'static/data/images/SkyBox/Front.jpg',
      negativeY: 'static/data/images/SkyBox/Back.jpg',
      positiveZ: 'static/data/images/SkyBox/Up.jpg',
      negativeZ: 'static/data/images/SkyBox/Down.jpg'
    }
  },
  drawPointGraphics: 'static/data/images/file/location4.png',
  graphic: {
    craeteRotateCylinderGraphics: 'static/data/images/file/cc2.png',// 创建旋转圆柱
    craeteDynamicCricleGraphics: 'static/data/images/Textures/circle_bg.png',//动态旋转圆
    craeteDynamicShadeWallGraphics: 'static/data/images/Textures/fence.png', //动态渐变墙
    createCustomDefBillboardGraphics: 'static/data/images/file/div1.png',// 默认自定义标牌气泡框
  },
  material: {
    PolylineCityLinkMaterialProperty: 'static/data/images/Textures/meteor_01.png', // 城市光效线
    WarnLinkMaterialProperty:'static/data/images/Textures/jsx2.png',// 城市警示墙
  },
  plugin: {
    Css3Renderer_one: "static/data/images/Textures/circle2.png", // 拓展css3的动画 html元素（添加底座 一 外环）
    Css3Renderer_two:"static/data/images/Textures/circle1.png",// 拓展css3的动画 html元素(添加底座二 内环)
  },
  primitive: {
    TetrahedronPrimitive: 'static/data/images/Textures/fence.png',//光锥图元
    WaterPrimitive:'static/data/images/Textures/waterNormals.jpg'//水面效果
  },
  amalysis: {
    createClipPlanAnalysis_wallImg: 'static/data/images/file/excavate_side_min.jpg',//地形开挖分析
    createClipPlanAnalysis_bottomImg: 'static/data/images/file/excavate_bottom_min.jpg',//地形开挖分析
    createSubmergedAnalysis:'static/data/images/file/water.png',// 创建淹没分析
  }
}
export {defaultStatic}