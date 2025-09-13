<template>
  <div class="sky-box">
    <div id="cesiumContainer" class="map3d-contaner">
      <div class="ctrl-group">
        <el-button type="primary" @click="createCluteData">加载聚合图层</el-button>
      </div>
    </div>
  </div>
</template>
<script >
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'
import * as turf from "@turf/turf"
import testImg from '/static/data/images/file/location4.png'
const viewerData = {
  viewer: null,
  dataSource: null,
  clusterLayer: null,
  selectGraphic: null
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

      // 完成聚合对象初始化
      viewerData.clusterLayer = new Cesium.Scene.ClusterLayer({ image: testImg, style: 0, minimumClusterSize: 2 })
      viewer.dataSources.add(viewerData.clusterLayer.layer);
      this.visualJuest()
      this.initLeftClickEvent();
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

    generateRandomId (length) {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'; // 可供选择的字符
      let id = '';
      for (let i = 0; i < length; i++) {
        const randIndex = Math.floor(Math.random() * characters.length); // 随机选择字符
        id += characters.charAt(randIndex); // 将字符追加到ID中
      }
      return id;
    },
    // 模拟数据
    createPointByRandom (count, bbox) {
      const pointsArr = []
      // 模拟随机点数据
      const points = turf.randomPoint( /* 模拟数量*/count, { bbox/*范围*/ })
      const { features } = points;
      features.forEach(e => {
        const { geometry: { coordinates } } = e;
        pointsArr.push({
          id: this.generateRandomId(16),
          position: coordinates
        });
      })
      return pointsArr;
    },
    loadGeojson () {
      const _self = this;
      viewerData.viewer = this.c_viewer;
      viewerData.dataSource = new Cesium.GeoJsonDataSource();
      viewerData.viewer.dataSources.add(viewerData.dataSource);

      // 加载行政区域的边界数据
      const geojsonUrl = "/static/data/110000.json";
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
    },
    generateRandomPoints (count) {
      const points = [];
      for (let i = 0; i < count; i++) {
        const lat = Cesium.Math.randomBetween(-180, 180); // 随机纬度
        const lon = Cesium.Math.randomBetween(-75, 75); // 随机经度
        points.push({
          id: this.generateRandomId(16),
          position: [lon, lat]
        });
      }
      return points;
    },
    createCluteData () {
      // 先清空
      viewerData.clusterLayer.clear();
      const clusterData = this.createPointByRandom(10000, [82.40341642625106, 24.228918628969303, 123.16623191285805, 45.54657478450935])//this.generateRandomPoints(10000);
      viewerData.clusterLayer.addDataToLayer(clusterData);
      // 如果加载后没有聚合效果，可以手动更新触发聚合
      viewerData.clusterLayer.manualRaiseClusterEvent(2000);
    },
    initLeftClickEvent () {
      const _self = this;
      viewerData.viewer.screenSpaceEventHandler.setInputAction((e) => {
        const pickedObj = viewerData.viewer.scene.pick(e.position);
        if (viewerData.selectGraphic) {
          viewerData.clusterLayer.setSelectById(viewerData.selectGraphic.id, false);
          viewerData.selectGraphic = null;
        }
        if (pickedObj && pickedObj.id) {
          if (pickedObj.id instanceof Cesium.Entity) {
            //选中单个
            if (pickedObj.id.layer && pickedObj.id.layer.name === "clusterLayer") {
              viewerData.selectGraphic = pickedObj.id;
              viewerData.clusterLayer.setSelectById(viewerData.selectGraphic.id, true);
              // todo anything
            }
          } else if (pickedObj.id instanceof Array) {
            // 选中聚合
            if (pickedObj.id[0].layer && pickedObj.id[0].layer.name === "clusterLayer") {
              viewerData.clusterLayer.unClusterFn(pickedObj)
            }
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    },
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
