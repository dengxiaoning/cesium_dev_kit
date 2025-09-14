<template>
  <div class="sky-box">
    <div id="cesiumContainer" class="map3d-contaner">
      <div class="ctrl-group">
        <el-button type="primary" @click="clearBar">清除柱状图层</el-button>
      </div>
    </div>
  </div>
</template>
<script >
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'
import { barData } from './barData'

const viewerData = {
  viewer: null,
  dataSource: null,
  barLayer: null
};
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
    initMap () {
      const {
        viewer,
        base,
      } = new initCesium(
        {
          cesiumGlobal: Cesium,
          containerId: 'cesiumContainer',
          viewerConfig: {
            infoBox: false,
            shouldAnimate: true,
          },
          extraConfig: {},
          MapImageryList: []
        })
      this.c_viewer = viewer;
      this.b_base = base;
      let key = '7eb11c0c503429878691ac917238f87f'
      let layer = this.c_viewer.imageryLayers.addImageryProvider(new Cesium.Scene.TdtImageryProvider({
        key,
        style: 'cva'
      }));
      layer.name = '标注'; layer.id = 'layer1'; layer.show = true;

      let layer2 = this.c_viewer.imageryLayers.addImageryProvider(new Cesium.Scene.TdtImageryProvider({ key }), 2);
      layer2.name = '电子'; layer2.id = 'layer2'; layer2.show = true; layer2.alpha = 0.1;

      viewerData.viewer = viewer;
      viewerData.barLayer = new Cesium.Scene.ThreeDimensionalBar({ label: { font: 'bold 16px Arial' } })
      this.visualJuest()
      this.loadGeojson();

    },
    visualJuest () {
      this.b_base.flyTo({
        position: {
          x: -2894997.4051553877,
          y: 10767248.748340026,
          z: 3503270.647910785,
        },
        orientation: {
          heading: 0.005041818266091624,
          pitch: -1.3172161700876117,
          roll: 0.0000031629556005441373
        },
        duration: 2
      })
    },
    loadGeojson () {
      const _self = this;
      viewerData.viewer = this.c_viewer;
      viewerData.dataSource = new Cesium.GeoJsonDataSource();
      viewerData.viewer.dataSources.add(viewerData.dataSource);

      // 加载行政区域的边界数据
      const geojsonUrl = "static/data/110000.json";
      viewerData.dataSource.load(geojsonUrl).then(() => {
        // 设置行政区域的样式
        const entities = viewerData.dataSource.entities.values;
        for (let i = 0; i < entities.length; i++) {
          const entity = entities[i];

          entity.polygon.material = Cesium.Color.fromRandom({ alpha: 0.5 });
          entity.polygon.outline = true;
          entity.polygon.outlineColor = Cesium.Color.fromCssColorString('#1fffd2');
          entity.polygon.outlineWidth = 4.0;

        }
      });
      _self.createBar()
    },
    createBar () {
      barData.forEach(e => e.color = Cesium.Color.fromRandom({ alpha: 0.8 }))
      viewerData.barLayer.addDataToLayer({ barData, numField: 'count' })
    },
    clearBar () {
      viewerData.barLayer.clear();
    }
  },

  beforeUnmount () {
    this.c_viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
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
    right: 50px;
    z-index: 999;
  }
}
</style>
