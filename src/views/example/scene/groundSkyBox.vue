<template>
  <div class="sky-box">
    <div id="cesiumContainer"
         class="map3d-contaner"></div>
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>近景天空盒</span>
        </div>
      </template>
      <div class="text item"
           :class="activeId==='light'?'active':''"
           @click="sky1('light')">晴天</div>
      <div class="text item"
           :class="activeId==='late'?'active':''"
           @click="sky2('late')">晚霞</div>
      <div class="text item"
           :class="activeId==='blue'?'active':''"
           @click="sky3('blue')">蓝天</div>
    </el-card>
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
            MapImageryList: tempData
          })


      this.c_viewer = viewer;

      this.material = material;
      this.graphics = graphics;
      this.math3d = math3d;

      // let layer = viewer.imageryLayers.addImageryProvider(new Cesium.Scene.GoogleImageryProvider({
      //   style: 'img'
      // }));

      this.flyto();
      this.sky1('light');
      this.addListenerToScene();
    },
    flyto() {
      this.material.setView({
        position: Cesium.Cartesian3.fromDegrees(120.380788, 31.066719, 12136),
        orientation: {
          heading: Cesium.Math.toRadians(0.0),
          pitch: Cesium.Math.toRadians(-30),
          roll: Cesium.Math.toRadians(0.0)
        },
      })
    },
    sky1(clicktype) {
      this.activeId = clicktype;
      skyObj = this.material.setOneGroundSkyBox();
      this.c_viewer.scene.skyBox = skyObj
      this.c_viewer.scene.skyAtmosphere.show = false
    },
    sky2(clicktype) {
      this.activeId = clicktype;
      skyObj = this.material.setTwoGroundSkyBox()
      this.c_viewer.scene.skyBox = skyObj
      this.c_viewer.scene.skyAtmosphere.show = false
    },
    sky3(clicktype) {
      this.activeId = clicktype;
      skyObj = this.material.setThreeGroundSkyBox();
      this.c_viewer.scene.skyBox = skyObj
      this.c_viewer.scene.skyAtmosphere.show = false
    },
    addListenerToScene() {

      this.c_viewer.scene.camera.moveEnd.addEventListener((move) => {
        let position = this.material.getCameraPosition()
        if (!position.height) return
        if (100000 <= position.height) {
          if (flag) {
            this.c_viewer.scene.skyBox = this.material.setOneSkyBox();
            this.c_viewer.scene.skyAtmosphere.show = true
            flag = false
          }
        } else if (100000 > position.height) {
          if (!flag) {
            this.c_viewer.scene.skyBox = skyObj
            this.c_viewer.scene.skyAtmosphere.show = false
            flag = true
          }

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

.box-card {
  width: 280px;
  position: absolute;
  top: 3px;
  right: 3px;
  z-index: 3;
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .text {
    font-size: 14px;
  }

  .item {
    margin-bottom: 18px;
    &.active {
      color: #36a3f7;
      background: yellowgreen;
    }
  }
}
</style>
