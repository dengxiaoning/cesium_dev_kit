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
      const _self = this;
      const {
        viewer,
        graphics,
        material } = new initCesium({
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
      this.material = material;
      this.graphics = graphics;

      this.material.setDefSceneConfig()
      this.material.setBloomLightScene()
      var tilesets = this.c_viewer.scene.primitives.add(new Cesium.Cesium3DTileset({
        url: 'static/data/3DTiles/building/tileset.json'
      }));

      tilesets.readyPromise.then(function (tileset) {

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
        });
        _self.c_viewer.flyTo(tileset);
        _self.graphics.createFadeCylinderGraphics({
          position: Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988),
          length: 700,
          bottomRadius: 500
        })
      });
    }
  },
  beforeUnmount () {
    this.c_viewer = null;
    this.material = null;
    this.graphics = null;
  }
}
</script>