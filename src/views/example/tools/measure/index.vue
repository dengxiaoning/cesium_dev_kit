<template>
  <div class="sky-box">
    <div id="cesiumContainer"
         class="map3d-contaner"></div>
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>测量面板</span>
        </div>
      </template>
      <div class="text item"
           :class="activeId==='distain'?'active':''"
           @click="caldDistain('distain')">空间距离</div>
      <div class="text item"
           :class="activeId==='area'?'active':''"
           @click="calArea('area')">空间面积</div>
      <div class="text item"
           :class="activeId==='trangle'?'active':''"
           @click="calTrangle('trangle')">三角量测</div>
      <div class="text item"
           :class="activeId==='clen'?'active':''"
           @click="calClen('clen')">清除量测</div>
    </el-card>
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
        material,
        graphics,
        draw
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

      this.material = material;
      this.graphics = graphics;
      this.draw = draw;

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
      })
    },
    caldDistain(clicktype) {
      this.activeId = clicktype;
      this.draw.drawLineGraphics({
        measure: true,
        callback: () => { }
      });
    },
    calArea(clicktype) {
      this.activeId = clicktype;
      this.draw.drawPolygonGraphics({
        measure: true,
        callback: () => { }
      });
    },
    calTrangle(clicktype) {
      this.activeId = clicktype;
      this.draw.drawTrianglesGraphics({
        measure: true,
        callback: () => { }
      });
    },
    calClen(clicktype) {
      this.activeId = clicktype;
      this.draw._drawLayer.entities.removeAll();
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
