<template>
  <div>
    <div id="cesiumContainer"
         class="map3d-contaner"></div>
  </div>
</template>
<script >
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'
import { raod, raod2, raod3, raod4, raod5, raod6, raod7 } from './extraData'

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
      this.material = material;
      this.graphics = graphics;
      this.math3d = math3d;
      this.material.setDefSceneConfig()
      this.material.setBloomLightScene()
      this.load3dTiles(viewer);
    },
    load3dTiles(viewer) {
      var _self = this;
      viewer.scene.sun.show = false;
      viewer.scene.moon.show = false;
      viewer.scene.skyAtmosphere.show = false;


      var tilesets = viewer.scene.primitives.add(new Cesium.Cesium3DTileset({
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
        viewer.flyTo(tileset)
        _self.addEntityToScene(viewer);
      });
    },
    addEntityToScene(viewer) {

      viewer.entities.add({
        polyline: {
          positions: this.material.transformWGS84ArrayToCartesianArray(raod),
          width: 10,
          material: new Cesium.Scene.PolylineCityLinkMaterialProperty({
            color: new Cesium.Color(5.0, 5.0, 10.0),
            duration: 2000
          }),
        }
      });
      viewer.entities.add({
        polyline: {
          positions: this.material.transformWGS84ArrayToCartesianArray(raod2),
          width: 10,
          material: new Cesium.Scene.PolylineCityLinkMaterialProperty({
            color: new Cesium.Color(5.0, 5.0, 10.0),
            duration: 2000,
          }),
        }
      });
      viewer.entities.add({
        polyline: {
          positions: this.material.transformWGS84ArrayToCartesianArray(raod3),
          width: 10,
          material: new Cesium.Scene.PolylineCityLinkMaterialProperty({
            color: new Cesium.Color(5.0, 5.0, 10.0),
            duration: 2000
          }),
        }
      });
      viewer.entities.add({
        polyline: {
          positions: this.material.transformWGS84ArrayToCartesianArray(raod4),
          width: 10,
          material: new Cesium.Scene.PolylineCityLinkMaterialProperty({
            color: Cesium.Color.fromBytes(255, 165, 0, 1.0),
            duration: 2000
          }),
        }
      });
      viewer.entities.add({
        polyline: {
          positions: this.material.transformWGS84ArrayToCartesianArray(raod5),
          width: 10,
          material: new Cesium.Scene.PolylineCityLinkMaterialProperty({
            color: Cesium.Color.fromBytes(220, 20, 60, 1.0),
            duration: 2000
          }),
        }
      });
      viewer.entities.add({
        polyline: {
          positions: this.material.transformWGS84ArrayToCartesianArray(raod6),
          width: 10,
          material: new Cesium.Scene.PolylineCityLinkMaterialProperty({
            color: new Cesium.Color(5.0, 5.0, 8.0),
            duration: 2000,

          }),
        }
      });

      viewer.entities.add({
        polyline: {
          positions: this.material.transformWGS84ArrayToCartesianArray(raod7),
          width: 4,
          material: new Cesium.Scene.PolylineCityLinkMaterialProperty({
            color: Cesium.Color.fromBytes(255, 140, 0, 1),
            duration: 2000,
            imgUrl: 'static/data/images/Textures/colors1.png'
          }),
        }
      });
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
