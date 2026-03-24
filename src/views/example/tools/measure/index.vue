<template>
  <div class="sky-box">
    <div id="cesiumContainer" class="map3d-contaner"></div>
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>测量面板</span>
        </div>
      </template>
      <div class="text item" :class="activeId==='distain'?'active':''" @click="caldDistain('distain')">空间距离</div>
      <div class="text item" :class="activeId==='area'?'active':''" @click="calArea('area')">空间面积</div>
      <div class="text item" :class="activeId==='trangle'?'active':''" @click="calTrangle('trangle')">三角量测</div>
      <div class="text item" :class="activeId==='clen'?'active':''" @click="calClen('clen')">清除量测</div>
    </el-card>
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
    // 添加地形数据
    async addWorldTerrainAsync (viewer) {
      try {
        const terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(1);
        viewer.terrainProvider = terrainProvider;
      } catch (error) {
        console.log(`Failed to add world imagery: ${error}`);
      }
    },
    async initMap () {
      const {
        viewer,
        material,
        graphics,
        draw,
        base
      } = new initCesium(
        {
          cesiumGlobal: Cesium,
          containerId: 'cesiumContainer',
          viewerConfig: {
            infoBox: false,
            shouldAnimate: true,
          },
          extraConfig: {
            depthTest: true,
            AccessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmYzkwZWEwYy1mMmIwLTQwYjctOWJlOC00OWU4ZWU1YTZhOTkiLCJpZCI6MTIxODIsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1NjA0OTUyNDN9.wagvw7GxUjxvHXO6m2jjX5Jh9lN0UyTJhNGEcSm2pgE'
          },
          MapImageryList: [{
            type: 'UrlTemplateImageryProvider',
            option: {
              url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              subdomains: ['0', '1', '2', '3'],
              tilingScheme: new Cesium.WebMercatorTilingScheme()
            }

          }]
        })

      this.c_viewer = viewer;
      this.b_base = base;
      this.material = material;
      this.graphics = graphics;
      this.draw = draw;
      this.addWorldTerrainAsync(viewer);
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
      // viewer.flyTo(tileset)
      this.justVisualLocation()

    },
    justVisualLocation () {
      this.b_base.flyTo({
        position: {
          x: -1282407.9014409434,
          y: 5419513.991543971,
          z: 3100164.1762982574,
        },
        orientation: {
          heading: 0.7912511169225169,
          pitch: -0.7329013575106695,
          roll: 0.000013780821305431346,
        },
        duration: 2,
      });
    },
    caldDistain (clicktype) {
      this.activeId = clicktype;
      this.draw.drawLineGraphics({
        measure: true,
        clampToGround: true,
        callback: () => { }
      });
    },
    calArea (clicktype) {
      this.activeId = clicktype;
      this.draw.drawPolygonGraphics({
        measure: true,
        clampToGround: true,
        callback: () => { }
      });
    },
    calTrangle (clicktype) {
      this.activeId = clicktype;
      this.draw.drawTrianglesGraphics({
        measure: true,
        callback: () => { }
      });
    },
    calClen (clicktype) {
      this.activeId = clicktype;
      this.draw._drawLayer.entities.removeAll();
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
