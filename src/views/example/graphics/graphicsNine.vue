<template>
  <div>
    <div id="cesiumContainer"
         class="map3d-contaner"></div>
  </div>
</template>
<script >
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'


export default {
  mounted() {
    this.initMap()
  },
  methods: {
    initMap() {
      const { viewer,
        material,
        graphics,
        math3d } = new initCesium(
          Cesium,
          'cesiumContainer',
          {
            infoBox: false,
            shouldAnimate: true,
          },
          [],
        )


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
      this.graphics.createPointsGraphics({
        positions: [Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 400.0)],
        billboard: {
          b_img: 'static/data/images/Textures/billboard2.png',
          b_width: 40,
          b_height: 25,
          b_scale: 1.5,
          b_scaleByDistance: new Cesium.NearFarScalar(1.5e2, 2.0, 1.5e7, 0.5)
        },
        label: {
          l_text: '中科较大',
          l_fillColor: Cesium.Color.YELLOW,
          l_outlineColor: Cesium.Color.KHAKI,
        }
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
