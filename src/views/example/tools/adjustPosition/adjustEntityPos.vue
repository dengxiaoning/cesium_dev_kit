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
      const tempData = [
        {
          id: 3,
          name: '高德地图02',
          type: 'UrlTemplateImageryProvider',
          classConfig: {
            url: 'https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
          },
          interfaceConfig: {},
          offset: '0,0',
          invertswitch: 0,
          filterRGB: '#ffffff',
          showswitch: 1,
          weigh: 13,
          createtime: 1624346908,
          updatetime: 1647395260,
        }]
      const {
        viewer,
        control,
        graphics
      } = new initCesium(
        {
          cesiumGlobal: Cesium,
          containerId: 'cesiumContainer',
          viewerConfig: {
            infoBox: false,
            shouldAnimate: true,
          },
          extraConfig: {},
          MapImageryList: tempData
        })


      this.c_viewer = viewer;
      this.graphics = graphics;
      this.control = control;
      this.initModel(viewer);

    },
    initModel(viewer) {
      let entity = this.graphics.createBoxGraphics({
        position: Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883, 0.0),
        name: "box",
        box: {
          dimensions: new Cesium.Cartesian3(500.0, 500.0, 500.0),//尺寸，长宽高
          material: new Cesium.ColorMaterialProperty((new Cesium.CallbackProperty(() => {
            return Cesium.Color.WHITE;
          }, false))),
        }
      })
      viewer.flyTo(entity);
      this.control.showEntityOrientationEditPanel({
        elementId: 'cust-gui-box', entity, cb: orientationRes => {
          console.log(orientationRes)
        }
      });
    },
  },
  beforeUnmount() {
    this.c_viewer = null;
    this.control = null;
    this.graphics = null;
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
