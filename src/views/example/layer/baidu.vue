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

export default {
  data () {
    return {
      activeId: 'light'
    }
  },
  mounted () {
    this.initMap()
  },
  methods: {
    initMap () {
      const {
        viewer,
        control,
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

      this.control = control;
      const commonOption = { url: 'https://api.map.baidu.com/customimage/tile?udt=20181205&scale=1&ak=1XjLLEhZhQNUzd93EjU5nOGQ' };
      let layer = this.c_viewer.imageryLayers.addImageryProvider(new Cesium.Scene.BaiduImageryProvider(commonOption));
      layer.name = '电子'; layer.id = 'layer1'; layer.show = true;

      let layer2 = this.c_viewer.imageryLayers.addImageryProvider(new Cesium.Scene.BaiduImageryProvider({
        ...commonOption,
        style: 'midnight'
      }));
      layer2.name = '午夜蓝'; layer2.id = 'layer2'; layer2.show = false;

      let layer3 = this.c_viewer.imageryLayers.addImageryProvider(new Cesium.Scene.BaiduImageryProvider({
        ...commonOption,
        style: 'dark'
      }));
      layer3.name = '黑夜'; layer3.id = 'layer3'; layer3.show = false;

      let layer4 = this.c_viewer.imageryLayers.addImageryProvider(new Cesium.Scene.BaiduImageryProvider({
        ...commonOption,
        style: 'googlelite'
      }));
      layer4.name = '精简'; layer4.id = 'layer4'; layer4.show = false;

      let layer5 = this.c_viewer.imageryLayers.addImageryProvider(new Cesium.Scene.BaiduImageryProvider({
        ...commonOption,
        style: 'redalert'
      }));
      layer5.name = '红色警戒'; layer5.id = 'layer5'; layer5.show = false;
      const conLayArr = [layer, layer2, layer3, layer4, layer5];
      this.control.showLayerSwitchPanel(conLayArr, { elementId: 'cust-gui-box' }, res => {
        console.log('selected:', res);
      })
      this.control.flyTo({
        position: {
          x: -1340866.8753050675,
          y: 5346629.099064495,
          z: 3237702.755069747
        },
        orientation: {
          heading: 6.155983939697551,
          pitch: -0.9509397537106805,
          roll: 6.28318444986502
        },
        duration: 5
      })
    }
  },
  beforeUnmount () {
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
