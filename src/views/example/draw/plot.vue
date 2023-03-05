<template>
  <div>
    <div id="cesiumContainer"
         class="map3d-contaner"></div>
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>绘制面板</span>
        </div>
      </template>
      <el-tag v-for="(item,idx) in menuData"
              :key="idx"
              class="text item"
              :class="activeId===item.value?'active':''"
              @click="caldDistain(item)">{{ item.label }}</el-tag>
    </el-card>
  </div>
</template>
<script >
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'

export default {
  data() {
    return {
      activeId: 'pos',
      menuData: [{
        label: '坐标点',
        value: 'coordinates'
      }, {
        label: '线段',
        value: 'line'
      }, {
        label: '多边形',
        value: 'polygon'
      }, {
        label: '矩形',
        value: 'rectangle'
      }, {
        label: '圆形',
        value: 'circular'
      }, {
        label: '多边立方体',
        value: 'polygonCable'
      }, {
        label: '四方体',
        value: 'Tetragonal'
      }, {
        label: '圆柱体',
        value: 'cylinder'
      }, {
        label: '围栏',
        value: 'enclosure'
      }, {
        label: '球体',
        value: 'spherome'
      }, {
        label: '圆锥',
        value: 'circularCone'
      }, {
        label: '圆柱',
        value: 'circularColumn'
      }, {
        label: '走廊',
        value: 'corridor'
      }, {
        label: '管道',
        value: 'pipeline'
      }, {
        label: '清除',
        value: 'clean'
      }]
    }
  },
  mounted() {
    this.initMap()
  },
  methods: {
    initMap() {
      const {
        viewer,
        material,
        graphics,
        draw } = new initCesium(
          Cesium,
          'cesiumContainer',
          {
            infoBox: false,
            shouldAnimate: true,
          },
          [],
        )


      this.c_viewer = viewer;
      this.material = material;
      this.graphics = graphics;
      this.draw = draw;
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
      });
    },
    caldDistain(item) {
      this.activeId = item.value;
      switch (item.label) {
        case '坐标点': this.draw.drawPointGraphics(); break;
        case '线段': this.draw.drawLineGraphics(); break;
        case '多边形': this.draw.drawPolygonGraphics(); break;
        case '矩形': this.draw.drawRectangleGraphics(); break;
        case '圆形': this.draw.drawCircleGraphics(); break;

        case '多边立方体': this.draw.drawPolygonGraphics({ height: 10000 }); break;
        case '四方体': this.draw.drawRectangleGraphics({ height: 10000 }); break;
        case '圆柱体': this.draw.drawCircleGraphics({ height: 10000 }); break;
        case '围栏': this.draw.drawWallGraphics(); break;
        case '球体': this.draw.drawEllipsoidGraphics(); break;
        case '圆锥': this.draw.drawCylinderGraphics({ topRadius: 1 }); break;
        case '圆柱': this.draw.drawCylinderGraphics(); break;
        case '走廊': this.draw.drawCorridorGraphics({ width: 5000 }); break;
        case '管道': this.draw.drawPolylineVolumeGraphics(); break;

        case '直角箭头': this.draw.drawStraightArrowGraphics(); break;
        case '攻击箭头': this.draw.drawAttackArrowGraphics(); break;
        case '钳击箭头': this.draw.drawPincerArrowGraphics(); break;
        case '清除': this.draw._drawLayer.entities.removeAll(); break;
      }
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
    margin: 0px 6px 18px;
    cursor: pointer;
    &.active {
      color: #36a3f7;
      background: yellowgreen;
    }
  }
}
</style>

