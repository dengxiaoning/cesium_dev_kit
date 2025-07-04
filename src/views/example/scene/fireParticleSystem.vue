<template>
  <div>
    <div id="cesiumContainer" class="map3d-contaner"></div>
  </div>
</template>
<script >
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'


export default {
  mounted () {
    this.initMap()
  },
  methods: {
    async initMap () {
      const { viewer,
        passEffect } = new initCesium(
          {
            cesiumGlobal: Cesium,
            containerId: 'cesiumContainer',
            viewerConfig: {
              infoBox: false,
              shouldAnimate: true,
              contextOptions: {
                requestWebgl2: true,
              }
            },
            extraConfig: {},
            MapImageryList: []
          })


      this.c_viewer = viewer;

      this.passEffect = passEffect;
      // let tileset = this.c_viewer.scene.primitives.add(
      //   new Cesium.Cesium3DTileset({
      //     url: 'static/data/3DTiles/building/tileset.json',
      //   }),
      // )
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
      })

      this.flyto();

      this.createFireParticle();
      this.getClickPosition();
    },
    flyto () {
      this.passEffect.flyTo({
        position: { x: -1336570.0406011753, y: 5328267.273888877, z: 3230238.062799759 },
        orientation: {
          heading: Cesium.Math.toRadians(1.0114628530500758),
          pitch: Cesium.Math.toRadians(-23.536610303267967),
          roll: Cesium.Math.toRadians(0.0032460845095368066)
        }
      })
    },
    createFireParticle () {
      const fireParticle = this.passEffect.createFireParticleSystem({
        position: Cesium.Cartesian3.fromDegrees(104.08148712154906, 30.626679696977835, 11.887677190312914),
        emitter: new Cesium.ConeEmitter(Cesium.Math.toRadians(30.0))
      })
      this.c_viewer.scene.primitives.add(fireParticle);
      this.fireParticle = fireParticle;
    },
    // 左键点击获取相机位置
    getClickPosition () {
      var $this = this;
      this.passEffect.bindHandelEvent({
        leftClick: function click (event, _handlers) {
          const pos = $this.passEffect.getCameraPosition();
          console.log(pos);
        }
      })
    }
  },
  beforeUnmount () {
    this.fireParticle && this.c_viewer.scene.primitives.remove(this.fireParticle); // 删除粒子对象
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
