<template>
  <div>
    <div id="cesiumContainer" class="map3d-contaner">

    </div>
    <div id="info-warp" class="info-msg-box"></div>
  </div>
</template>
<script >
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'
import './css/utils.css';
const viewerData = {
  viewer: null,
  css3Entity: null,
};
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
      const { viewer,
        material,
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
          MapImageryList: []
        })


      this.c_viewer = viewer;
      this.material = material;
      this.b_base = base;
      this.material.setDefSceneConfig()
      this.material.setBloomLightScene()
      this.load3dTiles(viewer);
    },
    async load3dTiles (viewer) {
      var _self = this;

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
      _self.addWorldTerrainAsync(viewer);
      viewer.flyTo(tileset)
      _self.addEntityToScene(viewer);
      _self.addListent()
    },
    addEntityToScene (viewer) {
      viewerData.css3Entity = new Cesium.Scene.Css3Renderer([{
        id: 'box4',
        parentEleId: 'info-warp',
        position: [104.08985268964015, 30.635443158056148, 50.0],
        element: `<div class="ysc-dynamic-layer ex-box" id="box4"><div class="close__box__btn">X</div>
        <div class="line"  style="width:300px;height:200px;">xxx 信息点</div></div>`,
        offset: [10, -180]
      }], true);

    },
    addListent () {
      const _self = this;
      this.b_base.bindHandelEvent({
        leftClick: function click (event, _handlers) {
          if (Cesium.defined(viewerData.css3Entity)) { viewerData.css3Entity.close(); }// 先关闭其它的
          const pickPosition = _self.c_viewer.scene.pickPosition(event.position)
          const { lng, lat, alt } = _self.b_base.transformCartesianToWGS84(pickPosition)
          if (Cesium.defined(pickPosition)) {

            viewerData.css3Entity = new Cesium.Scene.Css3Renderer([{
              id: 'box4',
              parentEleId: 'info-warp',
              position: [lng, lat, alt],
              element: `<div class="ysc-dynamic-layer ex-box" id="box4"><div class="close__box__btn">X</div> 
              <div class="line"  style="width:300px;height:200px;">
                信息点<br/>经度： ${lng}<br/>纬度：${lat}<br/>高层：${alt}
                </div>
              </div>`,
              offset: [10, -180]
            }], true);

          }
        }
      });
    }
  },
  beforeUnmount () {
    this.c_viewer = null;
    this.material = null;
    this.graphics = null;
    this.b_base.removeHandlerByName(['LEFT_CLICK']);
    this.b_base = null;
  }
}
</script>
<style lang="scss" scoped>
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
.info-msg-box {
  width: 100%;
  height: 100%;
}
</style>
