<template>
  <div class="analysis-plane">
    <div id="cesiumContainer" class="map3d-contaner"></div>
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>分析面板</span>
        </div>
      </template>
      <div class="group-btn">
        <el-button size="mini" @click="VisibilityAnalysis">通视分析</el-button>
        <el-button size="mini" @click="lookAroundAnalysis">环视分析</el-button>
        <el-button size="mini" @click="visualFieldAnalysis">可视域分析</el-button>
        <el-button size="mini" @click="clipPlanAnalysis">地形开挖分析</el-button>
        <el-button size="mini" @click="submergedAnalysis">淹没分析</el-button>
        <el-button size="mini" @click="slopeAnalysis">坡度分析</el-button>
        <el-button size="mini" @click="cutVolumeAnalysis"> 方量分析</el-button>
      </div>
    </el-card>
  </div>
</template>
<script >
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'

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
        analysis
      } = new initCesium(
        {
          cesiumGlobal: Cesium,
          containerId: 'cesiumContainer',
          viewerConfig: {
            infoBox: false,
            shouldAnimate: true
          },
          extraConfig: {
            depthTest: true,
            AccessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmYzkwZWEwYy1mMmIwLTQwYjctOWJlOC00OWU4ZWU1YTZhOTkiLCJpZCI6MTIxODIsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1NjA0OTUyNDN9.wagvw7GxUjxvHXO6m2jjX5Jh9lN0UyTJhNGEcSm2pgE'
          },
          MapImageryList: [
            {
              type: 'UrlTemplateImageryProvider',
              option: {
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                subdomains: ['0', '1', '2', '3'],
                tilingScheme: new Cesium.WebMercatorTilingScheme()
              }
            }]
        })
      this.addWorldTerrainAsync(viewer);
      this.c_viewer = viewer;
      this.analysis = analysis;
      this.flyTo();
    },
    flyTo () {
      this.analysis.setView({
        position: new Cesium.Cartesian3(-1337035.7496454942, 5285202.940044943, 3305373.990594733),
        orientation: {
          heading: 6.108097731064569,
          pitch: -0.15254104473396812,
          roll: 6.283157460498558

        },
      })
    },
    VisibilityAnalysis () {
      this.analysis.createVisibilityAnalysis();
    },
    lookAroundAnalysis () {
      this.analysis.createLookAroundAnalysis();
    },
    visualFieldAnalysis () { this.analysis.createVisualFieldAnalysis(); },
    clipPlanAnalysis () { this.analysis.createClipPlanAnalysis(); },
    submergedAnalysis () { this.analysis.createSubmergedAnalysis(); },
    slopeAnalysis () { this.analysis.createSlopeAnalysis(); },
    cutVolumeAnalysis () { this.analysis.createCutVolumeAnalysis(); }
  },
  beforeUnmount () {
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
