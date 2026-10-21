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
    // 监听容器尺寸变化,自动同步 canvas 尺寸(详见 bindContainerResize 注释)
    // 外部传入的 viewer 由外部自行管理,不做绑定
    if (!viewer) {
      const containerEl =
        mapID && mapID.nodeType === 1 ? mapID : document.getElementById(mapID)
      this.bindContainerResize(_viewer, containerEl)
    }

    this.viewer = _viewer
    return _viewer
  }
  /**
   * 监听 viewer 容器尺寸变化并自动调用 viewer.resize()
   * 【背景】useDefaultRenderLoop: false 时,cesium 不会像默认渲染循环那样自动同步
   * canvas 尺寸,而融合 three 必须关闭默认渲染循环。路由切换重新挂载页面时,容器
   * 可能先以 0 高度完成挂载(布局稍后恢复),此时创建的 canvas 绘图缓冲区会停留在
   * 0 高,地图将永久黑屏。ResizeObserver 可在容器尺寸变化(包括初始 0 -> 正常尺寸)
   * 时及时同步,同时兼顾侧栏折叠等仅容器尺寸变化、不触发 window resize 的场景。
   * @param {Viewer} viewer - cesium viewer 实例
   * @param {Element} container - viewer 容器 DOM 元素
   */
  bindContainerResize(viewer, container) {
    if (typeof ResizeObserver === 'undefined' || !container) return
    const doResize = () => {
      try {
        if (typeof viewer.isDestroyed !== 'function' || !viewer.isDestroyed()) {
          viewer.resize()
        }
      } catch (e) {
        // viewer 已销毁等情况静默忽略
      }
    }
    const observer = new ResizeObserver(doResize)
    observer.observe(container)
    // 下一帧补一次同步,防止挂载瞬间布局尚未稳定
    requestAnimationFrame(doResize)
    // viewer 销毁时断开监听,避免闭包持有已销毁实例
    const originalDestroy = viewer.destroy.bind(viewer)
    viewer.destroy = function () {
      try {
        observer.disconnect()
      } catch (e) {
        // 忽略
      }
      return originalDestroy()
    }
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
