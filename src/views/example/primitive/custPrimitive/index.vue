<template>
  <div id="cesiumContainer" class="map3d-contaner"></div>
</template>
<script>
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'

export default {
  mounted () {
    this.initMap()
  },
  methods: {
    async initMap () {
      const { viewer,
        primitive,
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
          MapImageryList: []
        })


      this.c_viewer = viewer;
      this.primitiveObj = primitive;
      let tiles = await Cesium.Cesium3DTileset.fromUrl('static/data/3DTiles/building/tileset.json');
      let tileset = this.c_viewer.scene.primitives.add(tiles)
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
      let custPrim = this.primitiveObj.customPrimivive({
        center: [104.0737048186066, 30.634227553819127],
        height1: 0,
        height2: 20,
        scale: 0.00006,
        img: 'static/data/images/Textures/beautiful.jpg'
      })
      this.c_viewer.scene.primitives.add(custPrim)

      base.flyTo({
        position: {
          x: -1335718.3738141463,
          y: 5327996.272508891,
          z: 3230971.826570713,
        },
        orientation: {
          heading: 6.153234780255776,
          pitch: -0.2083363211445124,
          roll: 0.0000016515446423781555
        },
        duration: 3
      })
    },
  },
  beforeUnmount () {
    this.c_viewer = null;
    this.primitives = null;
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
