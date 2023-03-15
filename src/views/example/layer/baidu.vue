<template>
  <div class="sky-box">
    <div id="cesiumContainer"
         class="map3d-contaner"></div>

    <div class="cust-gui-box"
         id="cust-gui-box"></div>
  </div>
</template>
<script >
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'

let skyObj = null;
let flag = true;
export default {
  data() {
    return {
      activeId: 'light'
    }
  },
  mounted() {
    this.initMap()
  },
  methods: {
    initMap() {
      const {
        viewer,
        control,
      } = new initCesium(
        Cesium,
        'cesiumContainer',
        {
          infoBox: false,
          shouldAnimate: true,
        },
        [],
      )
      this.c_viewer = viewer;

      this.control = control;
      let layer = this.c_viewer.imageryLayers.addImageryProvider(new Cesium.Scene.BaiduImageryProvider({}));
        layer.name = '电子';layer.id = 'layer1';

        let layer2 = this.c_viewer.imageryLayers.addImageryProvider(new Cesium.Scene.BaiduImageryProvider({
          style: 'midnight'
        }));
        layer2.name = '午夜蓝'; layer2.id = 'layer2'; layer2.show = false;

        let layer3 = this.c_viewer.imageryLayers.addImageryProvider(new Cesium.Scene.BaiduImageryProvider({
          style: 'dark'
        }));
        layer3.name = '黑夜'; layer3.id = 'layer3'; layer3.show = false;

        let layer4 = this.c_viewer.imageryLayers.addImageryProvider(new Cesium.Scene.BaiduImageryProvider({
          style: 'googlelite'
        }));
        layer4.name = '精简';layer4.id = 'layer4';layer4.show = false;

        let layer5 = this.c_viewer.imageryLayers.addImageryProvider(new Cesium.Scene.BaiduImageryProvider({
          style: 'redalert'
        }));
        layer5.name = '红色警戒'; layer5.id = 'layer5'; layer5.show = false;

        this.control.showLayerSwitchPanel([layer, layer2, layer3, layer4, layer5],{ elementId: 'cust-gui-box' })

      }
  },
  beforeUnmount() {
    this.c_viewer = null;
    this.control = null;
  }
}
</script>
<style lang="scss" scoped>
.sky-box {
  position: relative;
}
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
.cust-gui-box {
  position: absolute;
  right: 0px;
  top: 0px;
}
</style>
