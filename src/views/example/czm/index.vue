<template>
  <div id="cesiumContainer"
       class="map3d-contaner"></div>
</template>
<script>
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'


export default {
  mounted() {
    this.initMap()
  },
  methods: {
    initMap() {
      const tempData = [
        {
          id: 3,
          name: '高德地图02',
          type: 'UrlTemplateImageryProvider',
          classConfig: {
            url: 'https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
          },
          interfaceConfig: {},
          offset: '0,0',
          invertswitch: 0,
          filterRGB: '#ffffff',
          showswitch: 1,
          weigh: 13,
          createtime: 1624346908,
          updatetime: 1647395260,
        },
        {
          id: 14,
          name: '高德地图01',
          type: 'UrlTemplateImageryProvider',
          classConfig: {
            url: 'http://webst03.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&style=7',
          },
          interfaceConfig: {
            saturation: 0,
            brightness: 0.6,
            contrast: 1.8,
            hue: 1,
            gamma: 0.3,
          },
          offset: '0,0',
          invertswitch: 1,
          filterRGB: '#4e70a6',
          showswitch: 1,
          weigh: 0,
          createtime: 1624326728,
          updatetime: 1646979297,
        },
      ]
      const { viewer,
        material,
        graphics,
        sceneMang } = new initCesium(
          {
            cesiumGlobal: Cesium,
            containerId: 'cesiumContainer',
            viewerConfig: {
              infoBox: false,
              shouldAnimate: true,
            },
            extraConfig: {
              depthTest: true
            },
            MapImageryList: tempData
          })


      this.c_viewer = viewer;

      this.material = material;
      this.graphics = graphics;
      viewer.scene.screenSpaceCameraController.maximumZoomDistance = 999999999.0
      viewer.dataSources.add(Cesium.CzmlDataSource.load('static/data/file/beidou.czml'))
      viewer.scene.skyBox = this.graphics.setOneSkyBox();
      viewer.scene.globe.enableLighting = true;

      let mapGrid = new Cesium.GridImageryProvider();
      let layerGrid = viewer.imageryLayers.addImageryProvider(mapGrid)
      viewer.imageryLayers.raiseToTop(layerGrid)
      let _rota = Date.now();
      function rotate() {
        let a = .1;
        let t = Date.now();
        let n = (t - _rota) / 1e3;
        _rota = t;
        viewer.scene.camera.rotate(Cesium.Cartesian3.UNIT_Z, -a * n);
      }
      viewer.clock.onTick.addEventListener(rotate);
      setTimeout(() => {
        viewer.delegate.clock.onTick.removeEventListener(rotate);
      }, 2000000)
    }
  },
  beforeUnmount() {
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
