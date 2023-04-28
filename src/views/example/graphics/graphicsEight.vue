<template>
  <div>
    <div id="cesiumContainer"
         class="map3d-contaner"></div>
  </div>
</template>
<script >
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
        material,
        graphics,
        math3d } = new initCesium({
          cesiumGlobal: Cesium,
          containerId: 'cesiumContainer',
          viewerConfig: {
            infoBox: false,
            shouldAnimate: true,
          },
          extreaConfig: {
            depthTest: true
          },
          MapImageryList: [],
          defaultStatic
        })


      this.c_viewer = viewer;

      this.material = material;
      this.graphics = graphics;
      this.math3d = math3d;
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

      this.flyto();

      this.createModel();
    },
    flyto() {
      this.material.flyTo({
        position: { x: -1337132.0092982147, y: 5330611.474631115, z: 3228680.029449292 },
        orientation: {
          heading: Cesium.Math.toRadians(1.0114629015290062),
          pitch: Cesium.Math.toRadians(-23.53661660731824),
          roll: Cesium.Math.toRadians(0.00324596311071617)
        }
      })
    },
    createModel() {
      var model = this.graphics.createModelGraphics({
        position: Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 200),
        m_url: 'static/data/model/zhui.glb',
        m_scale: 200
      })
      this.graphics.setGraphicsRotate({
        entity: model,
        position: this.graphics.transformCartesianToWGS84(Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 50)),
        rotateAmount: 4
      })
      this.graphics.setGraphicsFloat({
        entity: model,
        cartesians: Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 100),
        maxHeiht: 200,
        speed: 0.5
      })
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
