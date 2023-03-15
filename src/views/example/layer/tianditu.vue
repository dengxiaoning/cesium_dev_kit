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

      let key = '7eb11c0c503429878691ac917238f87f'
      let layer = this.c_viewer.imageryLayers.addImageryProvider(new Cesium.Scene.TdtImageryProvider({
        key,
        style: 'cva'
      }));
      layer.name = '标注';layer.id = 'layer1';layer.show = false;

      let layer2 = this.c_viewer.imageryLayers.addImageryProvider(new Cesium.Scene.TdtImageryProvider({ key }));
      layer2.name = '电子'; layer2.id = 'layer2'; layer2.show = false;

      let layer3 = this.c_viewer.imageryLayers.addImageryProvider(new Cesium.Scene.TdtImageryProvider({
        key,
        style: 'img'
      }));
      layer3.name = '影像'; layer3.id = 'layer3';layer3.show = true;

      let layer4 = this.c_viewer.imageryLayers.addImageryProvider(new Cesium.Scene.TdtImageryProvider({
        key,
        style: 'ter'
      }));
      layer4.name = '地形'; layer4.id = 'layer3'; layer4.show = true;

      this.control.showLayerSwitchPanel([layer, layer2, layer3, layer4],{ elementId: 'cust-gui-box' })
      this.flyTo();
    },
      flyTo() {
      this.control.flyTo({
        position: { x: -1337132.0092982147, y: 5330611.474631115, z: 3228680.029449292 },
        orientation: {
          heading: Cesium.Math.toRadians(1.0114629015290062),
          pitch: Cesium.Math.toRadians(-23.53661660731824),
          roll: Cesium.Math.toRadians(0.00324596311071617)
        }
      })
    },
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
