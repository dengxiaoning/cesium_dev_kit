<template>
  <div id="cesiumContainer"
       class="map3d-contaner"></div>
</template>
<script>
import * as Cesium from 'cesium'
// import { initCesium } from '@/utils/cesiumPluginsExtends/index'
import { initCesium } from 'cesium_dev_kit'

export default {
  mounted () {
    this.initMap()
  },
  methods: {
    initMap () {
      const { viewer,
        material,
        graphics
      } = new initCesium({
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
      this.material = material;
      this.graphics = graphics;

      this.material.setDefSceneConfig()
      this.material.setBloomLightScene()
      this.createModel()
      this.flyto()
    },
    flyto () {
      this.material.flyTo({
        position: {
          x: -1337132.0092982147,
          y: 5330611.474631115,
          z: 3228680.029449292,
        },
        orientation: {
          heading: Cesium.Math.toRadians(1.0114629015290062),
          pitch: Cesium.Math.toRadians(-23.53661660731824),
          roll: Cesium.Math.toRadians(0.00324596311071617),
        },
      })
    },
    createModel () {
      const model = this.graphics.createModelGraphics({
        position: Cesium.Cartesian3.fromDegrees(
          104.081701757991,
          30.627042558105988,
          400,
        ),
        m_url: 'static/data/model/zhui.glb',
        m_scale: 60,
      })
      const carseianTans = this.graphics.transformCartesianToWGS84(
        Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 50),
      )
      this.graphics.setGraphicsRotate({
        entity: model,
        position: carseianTans,
        rotateAmount: 4,
      })
      this.graphics.setGraphicsFloat({
        entity: model,
        cartesians: Cesium.Cartesian3.fromDegrees(
          104.081701757991,
          30.627042558105988,
          400,
        ),
        maxHeiht: 100,
        speed: 0.5,
      })
      this.graphics.craeteDynamicCricleGraphics({
        center: { lng: 104.081701757991, lat: 30.627042558105988, alt: 1 },
        radius: 800,
        scale: 1500,
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
