import {
  colorRgb
} from './ColorDeal'
import {
  evil
} from './common'

let Cesium = null;
class Controller {
  // 初始化 controller 类
  constructor(cesiumGlobal) {
    Cesium = cesiumGlobal;
    this.init_data()
  }
  init_data() {
    this.viewer = null
  }
  init({containerId, viewerConfig,extreaConfig, MapImageryList}) {
    const mapID = containerId;
    let imageryProviderConfig = new Cesium.SingleTileImageryProvider({
      url: 'https://mapv-data.oss-cn-hangzhou.aliyuncs.com/Cesium-1.82-hawk/background.png',
    })
    if (MapImageryList.length !== 0) {
      imageryProviderConfig = this.setOneimageryProvider(MapImageryList[0])
    }
    let vConfig = {
      // 加载单张影像 第一层最小最透明的
      imageryProvider: imageryProviderConfig,
      contextOptions: {
        webgl: {
          alpha: false,
        },
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
      showRenderLoopErrors: true, // 是否显示render异常信息
    }
    vConfig = Object.assign(vConfig, viewerConfig) // 后台接口配置 融合替换 默认配置
    const viewer = new Cesium.Viewer(mapID, vConfig)
    if (!extreaConfig['logo']) {
      const cC = viewer.cesiumWidget.creditContainer
      cC.style.display = 'none' // 影藏logo
    }

    // 是否开启深度参数
    if (extreaConfig['depthTest']) {
      // 设置开启深度检测
      viewer.scene.globe.depthTestAgainstTerrain = true
    }


    // 增加配置图层
    this.setConfigMapList(viewer, MapImageryList)
    // 消除锯齿
    this.removeJagged(viewer)
    this.viewer = viewer
    return viewer
  }

  setOneimageryProvider(MapImagery) {
    if (MapImagery.classConfig.customTags) {
      MapImagery.classConfig.customTags = evil(
        '(' + MapImagery.classConfig.customTags + ')'
      )
    }
    return new Cesium[MapImagery.type](MapImagery.classConfig)
  }
  setConfigMapList(viewer, MapImageryList) {
    const imageryLayers = viewer.imageryLayers
    MapImageryList.some((elem, index) => {
      if (index === 0) {
        return false
      }
      imageryLayers.addImageryProvider(this.setOneimageryProvider(elem))
    })
    // 设置具体的 ImageryLayer 参数
    MapImageryList.some((elem, index) => {
      const baseLayer = viewer.imageryLayers.get(index)
      if (elem.interfaceConfig) {
        Object.getOwnPropertyNames(elem.interfaceConfig).forEach(function (
          key
        ) {
          baseLayer[key] = elem.interfaceConfig[key]
        })
      }
      // 设置 滤镜效果
      baseLayer.invertColor = elem.invertswitch
      baseLayer.filterRGB = [255.0, 255.0, 255.0]
      if (elem.filterRGB !== '#000000' && elem.filterRGB !== '#ffffff') {
        baseLayer.filterRGB = colorRgb(elem.filterRGB)
      }

      // 设置 offset 偏移量
      const offset = elem.offset.split(',')
      if (offset.length === 2) {
        try {
          const oxy = [
            parseFloat(offset[0]),
            parseFloat(offset[1]),
          ]
          baseLayer._imageryProvider._tilingScheme._rectangleNortheastInMeters.x +=
            oxy[0]
          baseLayer._imageryProvider._tilingScheme._rectangleNortheastInMeters.y +=
            oxy[1]
        } catch (error) {
          console.log(error)
        }
      }

      // 更改cesium的着色器代码 关于滤镜和反色的 [在不更改cesium源文件的情况下]
      this.changeImageryProviderColors(viewer, baseLayer)
    })
  }
  // 消除锯齿
  removeJagged(viewer) {
    viewer.scene.postProcessStages.fxaa.enabled = false
    viewer.scene.fxaa = false
    const supportsImageRenderingPixelated =
      viewer.cesiumWidget._supportsImageRenderingPixelated
    if (supportsImageRenderingPixelated) {
      let vtxf_dpr = window.devicePixelRatio
      while (vtxf_dpr >= 2.0) {
        vtxf_dpr /= 2.0
      }
      viewer.resolutionScale = vtxf_dpr
    }
  }
  // 更改 cesium 着色的方法
  changeImageryProviderColors(viewer, baseLayer) {
    // 更改底图的着色器 代码
    const baseFragmentShaderSource =
      viewer.scene.globe._surfaceShaderSet.baseFragmentShaderSource.sources
    for (let i = 0; i < baseFragmentShaderSource.length; i++) {
      const oneSource = baseFragmentShaderSource[i]
      // 格式必须一致 不能多有空格 且保持版本一致性
      const strS = 'color = czm_saturation(color, textureSaturation);\n#endif\n'
      let strT = 'color = czm_saturation(color, textureSaturation);\n#endif\n'
      if (baseLayer.invertColor) {
        strT += `
          color.r = 1.0 - color.r;
          color.g = 1.0 - color.g;
          color.b = 1.0 - color.b;
        `
        strT += `
        color.r = color.r * ${baseLayer.filterRGB[0]}.0/255.0;
        color.g = color.g * ${baseLayer.filterRGB[1]}.0/255.0;
        color.b = color.b * ${baseLayer.filterRGB[2]}.0/255.0;
        `
      }

      if (oneSource.indexOf(strS) !== -1) {
        baseFragmentShaderSource[i] = baseFragmentShaderSource[i].replace(
          strS,
          strT
        )
      }
    }
  }
  // 获取当前视图的中心经纬度
  getCurCenterlonLat(viewer) {
    let result = viewer.camera.pickEllipsoid(
      new Cesium.Cartesian2(
        viewer.canvas.clientWidth / 2,
        viewer.canvas.clientHeight / 2
      )
    )
    let curPosition = Cesium.Ellipsoid.WGS84.cartesianToCartographic(result)
    let lon = (curPosition.longitude * 180) / Math.PI
    let lat = (curPosition.latitude * 180) / Math.PI
    return {
      lon: lon,
      lat: lat,
    }
  }
}

export {
  Controller
}