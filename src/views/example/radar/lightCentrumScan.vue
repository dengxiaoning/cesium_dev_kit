<template>
  <div>
    <div id="cesiumContainer"
         class="map3d-contaner"></div>
  </div>
</template>
<script>
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'

export default {
  mounted() {
    this.initMap()
  },
  methods: {
    initMap() {
      const { viewer, passEffect, graphics } = new initCesium(
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
      this.passEffect = passEffect;
      this.graphics = graphics;
      var baseData = {
        circle: [0.003, 117, 35, 30]// 第一个参数 0.003表示半径，第二个第三个分别表示底座圆心的坐标,第四个表示切割成多少个点。组成多少个面。越多会越卡 尽量实际项目不影响效果，越少越好。
        , observer: [117.01, 35.01, 500]//观察点，也就是光源点
        , positionList: [ //我们这里就不加高度了。不然太麻烦了 //以圆心为参考做偏移值获取，圆心坐标 [117,35]，简单点画个正方形吧 如果画圆的画，也可以多取点
          [117, 35],//初始位置
          [117.01, 35], //下一个点
          [117.01, 35.01],
          [117, 35.01],
          [117, 35],//回来
        ]
        , material: Cesium.Color.RED.withAlpha(0.5)//光的材质
        , number: 100//数字越小速度越快
      };
      this.createRadarScan(baseData);
      this.initModel(viewer, baseData);
    },
    createRadarScan(baseData) {
      this.passEffect.lighitCentrumScanEffect(baseData)
    },
    initModel(viewer, data) {
      let entity = this.graphics.createBoxGraphics({
        position: Cesium.Cartesian3.fromDegrees(data.observer[0], data.observer[1], data.observer[2] / 2),
        name: "box",
        box: {
          dimensions: new Cesium.Cartesian3(100.0, 100.0, data.observer[2]),
          outline: true,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          material: Cesium.Color.fromRandom({ alpha: 0.5 })
        }
      })
      viewer.flyTo(entity);
    },
  },
  beforeUnmount() {
    this.c_viewer = null;
    this.passEffect = null;
    this.graphics = null;
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
</style>
