<template>
  <div>
    <div id="cesiumContainer"
         class="map3d-contaner"></div>
  </div>
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
      const { viewer, passEffect } = new initCesium(
        {
          cesiumGlobal: Cesium,
          containerId: 'cesiumContainer',
          viewerConfig: {
            infoBox: false,
            shouldAnimate: true,
          },
          extraConfig: {},
          MapImageryList: []
        })

      this.c_viewer = viewer;
      this.passEffect = passEffect;

      this.passEffect.setDefSceneConfig()
      this.passEffect.setBloomLightScene()
      let tileset = this.c_viewer.scene.primitives.add(
        new Cesium.Cesium3DTileset({
          url: 'static/data/3DTiles/building/tileset.json'
        })
      )
      tileset.style = new Cesium.Cesium3DTileStyle({
        color: {
          conditions: [
            ['${height} >= 300', 'rgba(0, 149, 251, 0.3)'],
            ['${height} >= 200', 'rgb(0, 149, 251, 0.3)'],
            ['${height} >= 100', 'rgb(0, 149, 251, 0.3)'],
            ['${height} >= 50', 'rgb(0, 149, 251, 0.3)'],
            ['${height} >= 25', 'rgb(0, 149, 251, 0.3)'],
            ['${height} >= 10', 'rgb(0, 149, 251, 0.3)'],
            ['${height} >= 5', 'rgb(0, 149, 251, 0.3)'],
            ['true', 'rgb(0, 149, 251, 0.3)']
          ]
        }
      })

      this.c_viewer.flyTo(tileset);
      this.createRadarScan();
    },
    createRadarScan() {
      this.passEffect.setRadarScanEffect({
        id: 'radarScanA',
        position: Cesium.Cartesian3.fromDegrees(104.08985268964015, 30.635443158056148, 10.0),
        color: Cesium.Color.LIGHTGREEN.withAlpha(0.8),
        duration: 2000,
        radius: 1000,
        border: -1,
        width: 5.0
      })
    }
  },
  beforeUnmount() {
    this.c_viewer = null;
    this.passEffect = null;
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
