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
  mounted () {
    this.initMap()
  },
  methods: {
    initMap () {
      const { viewer, passEffect, graphics } = new initCesium(
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
      this.graphics = graphics;
      this.createRadarScan();
      this.graphics.flyTo({
        position: {
          x: -2346830.2203772613,
          y: 4466707.7134610135,
          z: 4113849.456869386
        },
        orientation: {
          heading: Cesium.Math.toRadians(299.9133567470365),
          pitch: Cesium.Math.toRadians(-43.32853926465136),
          roll: Cesium.Math.toRadians(0.12183910428719429)
        },
      })
      this.getClickPosition()
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
    },
    createRadarScan () {
      this.graphics.createPointsGraphics({
        positions: [Cesium.Cartesian3.fromDegrees(116.39, 39.9, 40000.0)],
        billboard: {
          b_img: 'static/data/images/file/satellite.svg',
          b_width: 50,
          b_height: 40,
          b_scale: 1,
          b_pixelOffset: new Cesium.Cartesian2(20, -10)
        }
      })
      this.passEffect.satelliteScan({
        position: [116.39, 39.9],
        length: 40000.0,
        color: Cesium.Color.LIGHTGREEN,
        repeat: 40,
        thickness: 0.1
      })
    }
  },
  beforeUnmount () {
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
