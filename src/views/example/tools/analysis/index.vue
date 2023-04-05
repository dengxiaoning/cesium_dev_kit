<template>
  <div class="analysis-plane">
    <div id="cesiumContainer"
         class="map3d-contaner"></div>
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>分析面板</span>
        </div>
      </template>
      <div class="group-btn">
        <el-button size="mini"
                   @click="VisibilityAnalysis">通视分析</el-button>
        <el-button size="mini"
                   @click="lookAroundAnalysis">环视分析</el-button>
        <el-button size="mini"
                   @click="visualFieldAnalysis">可视域分析</el-button>
        <el-button size="mini"
                   @click="clipPlanAnalysis">地形开挖分析</el-button>
        <el-button size="mini"
                   @click="submergedAnalysis">淹没分析</el-button>
        <el-button size="mini"
                   @click="slopeAnalysis">坡度分析</el-button>
        <el-button size="mini"
                   @click="cutVolumeAnalysis"> 方量分析</el-button>
      </div>
    </el-card>
  </div>
</template>
<script >
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'

export default {
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
        analysis
      } = new initCesium(
        Cesium,
        'cesiumContainer',
        {
          infoBox: false,
          shouldAnimate: true,
          depthTest: true, // 深度测试
          // imageryProvider: new Cesium.ArcGisMapServerImageryProvider({
          //   url: "https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer?f=jsapi"
          // }),
          // terrainProvider: new Cesium.ArcGISTiledElevationTerrainProvider({
          //   url: 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer'
          // })
        },
        tempData,
      )


      this.c_viewer = viewer;
      this.analysis = analysis;

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
    VisibilityAnalysis() {
      this.analysis.createVisibilityAnalysis();
    },
    lookAroundAnalysis() {
      this.analysis.createLookAroundAnalysis();
    },
    visualFieldAnalysis() { this.analysis.createVisualFieldAnalysis(); },
    clipPlanAnalysis() { this.analysis.createClipPlanAnalysis(); },
    submergedAnalysis() { this.analysis.createSubmergedAnalysis(); },
    slopeAnalysis() { this.analysis.createSlopeAnalysis(); },
    cutVolumeAnalysis() { this.analysis.createCutVolumeAnalysis(); }
  },
  beforeUnmount() {
    this.c_viewer = null;
    this.material = null;
    this.graphics = null;
  }
}
</script>
<style lang="scss" scoped>
.analysis-plane {
  position: relative;
  .map3d-contaner {
    width: 100%;
    height: 100%;
    overflow: hidden;
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
    .group-btn {
      display: flex;
      flex-direction: column;
      button {
        margin-top: 4px;
        margin-left: 10px;
      }
    }
  }
}
</style>
