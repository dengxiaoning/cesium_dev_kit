const defaultToken =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmYzkwZWEwYy1mMmIwLTQwYjctOWJlOC00OWU4ZWU1YTZhOTkiLCJpZCI6MTIxODIsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1NjA0OTUyNDN9.wagvw7GxUjxvHXO6m2jjX5Jh9lN0UyTJhNGEcSm2pgE'
let Cesium = null
class Controller {
  // 初始化 controller 类
  constructor(cesiumGlobal) {
    Cesium = cesiumGlobal
    this.init_data()
  }
  init_data() {
    this.viewer = null
  }
  init({
    containerId,
    viewerConfig,
    extraConfig,
    MapImageryList,
    imageryProvider,
    viewer
  }) {
    const mapID = containerId
    let vConfig = {
      contextOptions: {
        webgl: {
          alpha: false
        }
      },
      // 默认设置
      animation: false, //动画控件
      timeline: false, //时间线
      fullscreenButton: false, // 全屏按钮
      geocoder: false, //地名查找（依赖google服务）
      homeButton: false, //重置到初始焦点与缩放
      selectionIndicator: false, //
      shadow: true,
      sceneMode: Cesium.SceneMode.SCENE3D,
      infoBox: false, //消息框
      sceneModePicker: false, //场景模式选择
      navigationHelpButton: false, //导航帮助按钮
      projectionPicker: false, //投影方式选择（3D、2D、Columbus）
      baseLayerPicker: false,
      shouldAnimate: true,
      navigation: false,
      showRenderLoopErrors: true // 是否显示render异常信息
    }
    let providerConf = this.findCesiumProvider(imageryProvider)
    // configure the access_token
    Cesium.Ion.defaultAccessToken = extraConfig['AccessToken'] || defaultToken
    vConfig = Object.assign(vConfig, viewerConfig) // 后台接口配置 融合替换 默认配置
    // 如果外部传入viewer 将不再重新实例化viewer

    const _viewer = viewer || new Cesium.Viewer(mapID, { ...vConfig, ...providerConf });
    if (!extraConfig['logo']) {
      const cC = _viewer.cesiumWidget.creditContainer
      cC.style.display = 'none' // 影藏logo
    }

    // 是否开启深度参数
    if (extraConfig['depthTest']) {
      // 设置开启深度检测
      _viewer.scene.globe.depthTestAgainstTerrain = true
    }

    // 增加配置图层
    if (MapImageryList && MapImageryList.length > 0) {
      for (let i = 0; i < MapImageryList.length; i++) {
        this.addImageryProvider(
          _viewer,
          MapImageryList[i].type,
          MapImageryList[i].option || MapImageryList[i].classConfig
        )
      }
    }
    this.viewer = _viewer
    return _viewer
  }
  addImageryProvider(viewer, type, option) {
    viewer.imageryLayers.addImageryProvider(
      this.createCesiumProvider({
        type,
        option
      })
    )
  }
  // 获取cesium provider
  findCesiumProvider(options) {
    const object = {}
    for (const key in options) {
      if (options[key] && options[key].type) {
        object[key] = this.createCesiumProvider(options[key])
        continue
      }
      object[key] = options[key]
    }

    return object
  }
  // 创建provider
  createCesiumProvider(config) {
    switch (config.type) {
      case 'WebMapTileServiceImageryProvider':
        return new Cesium[config.type](config.option)
        break
      case 'UrlTemplateImageryProvider':
        return new Cesium[config.type](config.option)
        break
      case 'TileMapServiceImageryProvider':
        return new Cesium[config.type](config.option)
        break
    }
  }
}

export { Controller }
