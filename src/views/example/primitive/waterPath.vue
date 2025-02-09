<template>
  <div class="inner-page">
    <div id="cesiumContainer" class="map3d-contaner"></div>
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>绘制面板</span>
        </div>
      </template>
      <el-tag @click="caldDistain">
        绘制河流
      </el-tag>
    </el-card>
  </div>
</template>
<script >
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'
import { waterData } from './data/waterData'
import { defaultStatic } from '../defaultStaticConf'
export default {
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
    initMap () {
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
            geocoder: false,
            navigationHelpButton: false,
            selectionIndicator: false,
            baseLayerPicker: false,
            showRenderLoopErrors: false
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

          }],
          defaultStatic
        })
      this.addWorldTerrainAsync(viewer);
      this.c_viewer = viewer;
      this.drawObj = draw;
      this.material = material;
      this.graphics = graphics;
      this.base = base;
      this.flyto();
      this.createRiverByData();
    },
    flyto () {
      this.c_viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(110.32749851112206, 31.050083305294777, 10000),
        duration: 1.6
      })
    },
    caldDistain () {
      const pos = [];
      this.drawObj.drawLineGraphics({
        callback: res => {
          res.forEach(r => {
            pos.push(r.lng)
            pos.push(r.lat)
          })
          if (pos.length > 0) {
            // console.log(pos);
            this.drawObj.removeAll();
            this.createWaterPath(Cesium.Cartesian3.fromDegreesArray(pos))
          }
        }
      })
    },
    createRiverByData () {
      waterData.forEach((wE, index) => {
        this.createWaterPath(Cesium.Cartesian3.fromDegreesArray(wE.pos));
      })
    },
    createWaterPath (ps) {
      let x = 1;
      let waterH = 40;
      this.graphics.craeteCorridorGraphics({
        positions: ps,
        width: 1500.0,
        height: 0,
        extrudedHeight: new Cesium.CallbackProperty(() => {
          waterH += 0.05 * x
          if (waterH > 50) {
            x = -1
          }
          if (waterH < 45) {
            x = 1
          }
          return waterH
        }, false),
        cornerType: Cesium.CornerType.MITERED,
        outline: false,
        material: new Cesium.Scene.PolylineTrailLinkMaterial({
          color: Cesium.Color.BLUE.withAlpha(0.4),
          duration: 15000,
          image: 'static/data/images/Textures/river.png',
          speed: 0.5
        }),
      })
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
.inner-page {
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
