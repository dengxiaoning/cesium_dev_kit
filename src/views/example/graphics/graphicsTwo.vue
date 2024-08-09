<template>
  <div id="cesiumContainer"
       class="map3d-contaner"></div>
</template>
<script>
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'


export default {
  mounted () {
    this.initMap()
  },
  methods: {
    initMap () {
      // 自定义viewer
      var myViewer = new Cesium.Viewer('cesiumContainer', {
        animation: false, //是否显示动画控件
        homeButton: false, //是否显示home键
        geocoder: false, //是否显示地名查找控件        如果设置为true，则无法查询
        baseLayerPicker: false, //是否显示图层选择控件
        timeline: false, //是否显示时间线控件
        fullscreenButton: true, //是否全屏显示
        scene3DOnly: false, //如果设置为true，则所有几何图形以3D模式绘制以节约GPU资源
        infoBox: false, //是否显示点击要素之后显示的信息
        sceneModePicker: false, //是否显示投影方式控件  三维/二维
        navigationInstructionsInitiallyVisible: false,
        navigationHelpButton: false, //是否显示帮助信息控件
        selectionIndicator: false //是否显示指示器组件
      });
      const { viewer,
        material,
        graphics
      } = new initCesium(
        {
          cesiumGlobal: Cesium,
          viewerConfig: {
            infoBox: false,
            shouldAnimate: true,
          },
          extraConfig: {},
          MapImageryList: [],
          viewer: myViewer
        })


      this.c_viewer = viewer;

      this.material = material;
      this.graphics = graphics;
      // let layer = this.c_viewer.imageryLayers.addImageryProvider(new Cesium.Scene.BaiduImageryProvider({
      //   style: 'dark'
      // }));
      this.material.setDefSceneConfig()
      this.material.setBloomLightScene()
      let tileset = this.c_viewer.scene.primitives.add(
        new Cesium.Cesium3DTileset({
          url: 'static/data/3DTiles/building/tileset.json',
        }),
      )
      tileset.style = new Cesium.Cesium3DTileStyle({
        color: {
          conditions: [
            ["${height} >= 300", "rgba(0, 149, 251, 0.3)"],
            ["${height} >= 200", "rgb(0, 149, 251, 0.3)"],
            ["${height} >= 100", "rgb(0, 149, 251, 0.3)"],
            ["${height} >= 50", "rgb(0, 149, 251, 0.3)"],
            ["${height} >= 25", "rgb(0, 149, 251, 0.3)"],
            ["${height} >= 10", "rgb(0, 149, 251, 0.3)"],
            ["${height} >= 5", "rgb(0, 149, 251, 0.3)"],
            ["true", "rgb(0, 149, 251, 0.3)"]
          ]
        }
      })
      this.createModel()
      this.flyto()
    },
    flyto () {
      this.material.flyTo({
        position: { x: -1337132.0092982147, y: 5330611.474631115, z: 3228680.029449292 },
        orientation: {
          heading: Cesium.Math.toRadians(1.0114629015290062),
          pitch: Cesium.Math.toRadians(-23.53661660731824),
          roll: Cesium.Math.toRadians(0.00324596311071617)
        }
      })
    },
    createModel () {
      this.graphics.craeteDynamicBlinkCircleGraphics({
        position: Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 1),
        semiMinorAxis: 500.0,
        semiMajorAxis: 500.0,
      })
    },
  },
  beforeUnmount () {
    this.c_viewer = null;
    this.material = null;
    this.graphics = null;
  }
}
</script>
<style lang="scss" scoped>
.map3d-contaner {
  width: 100%;
  height: 100%;
  overflow: hidden;
  .ctrl-group {
    position: absolute;
    top: 10px;
    right: 20px;
    z-index: 999;
    .reset-home-btn {
      color: #36a3f7;
      cursor: pointer;
    }
  }
}
</style>
