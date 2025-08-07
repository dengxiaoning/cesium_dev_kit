<template>
  <div>
    <div id="cesiumContainer" class="map3d-contaner">

    </div>
    <div id="info-warp" class="info-msg-box"></div>
  </div>
</template>
<script >
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'
import './css/utils.css';

export default {
  mounted () {
    this.initMap()
  },
  methods: {
    initMap () {
      const { viewer,
        material,
      } = new initCesium(
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

      this.material.setDefSceneConfig()
      this.material.setBloomLightScene()
      this.load3dTiles(viewer);
    },
    async load3dTiles (viewer) {
      var _self = this;

      let tiles = await Cesium.Cesium3DTileset.fromUrl('static/data/3DTiles/building/tileset.json');
      let tileset = this.c_viewer.scene.primitives.add(tiles)
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
    },
    addEntityToScene (viewer) {
      let css3Renderer = new Cesium.Scene.Css3Renderer([{
        id: 'box4',
        position: [104.08985268964015, 30.635443158056148, 50.0],
        element: `<div class="ys-css3-box ex-box" id="box4">xxx 信息点</div>`,
        offset: [10, 10]
      }], true);
    }
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
.info-msg-box {
  width: 100%;
  height: 100%;
}
</style>
