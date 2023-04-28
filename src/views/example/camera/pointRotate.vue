<template>
  <div id="cesiumContainer"
       class="map3d-contaner"></div>
</template>
<script>
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'
import { defaultStatic } from '../defaultStaticConf'

export default {
  mounted() {
    this.initMap()
  },
  methods: {
    initMap() {
      const { viewer,
        base
      } = new initCesium(
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
          MapImageryList: [],
          defaultStatic
        })


      this.c_viewer = viewer;
      this.base = base;

      let tileset = this.c_viewer.scene.primitives.add(
        new Cesium.Cesium3DTileset({
          url: 'static/data/3DTiles/building/tileset.json',
        }),
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
            ['true', 'rgb(0, 149, 251, 0.3)'],
          ],
        },
      })
      viewer.flyTo(tileset)
      this.base.setCameraEotateHeading({
        lng: 104.081701757991,
        lat: 30.627042558105988,
        height: 15.8,
        heading: 0.0,
        pitch: 0.0,
        roll: 0.0
      })
    },
  },
  beforeUnmount() {
    this.c_viewer = null;
    this.base = null;
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
