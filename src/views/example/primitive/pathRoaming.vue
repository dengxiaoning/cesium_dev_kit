<template>
  <div class="dom-panle">
    <div id="cesiumContainer"
         class="map3d-contaner"></div>
    <section class="elslider-control">
      <div class="slider-demo-block">
        <span class="demonstration">偏航角:</span>
        <el-input v-model="headingNum"
                  size="mini"
                  style="width:60%;" />
      </div>
      <div class="slider-demo-block">
        <span class="demonstration">俯仰角:</span>
        <el-input v-model="pitchNum"
                  size="mini"
                  style="width:60%;" />
      </div>
      <div class="slider-demo-block">
        <span class="demonstration">距离:</span>
        <el-input v-model="rangeNum"
                  size="mini"
                  style="width:60%;" />
      </div>
      <div class="slider-demo-block">
        <span class="demonstration">速度:{{romaSpeed}}</span>
        <input type="range"
               style="width:60%;"
               v-model="romaSpeed"
               min=0
               @change="romaSpeedChange">
      </div>
      <el-button @click="drawPath">绘制路线</el-button>
      <el-button @click="previewRoma">预览</el-button>
      <el-button @click="stopRoma">{{roamCtrl}}</el-button>
      <el-button @click="removeRoma">清除</el-button>
    </section>
  </div>
</template>
<script >
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'


export default {
  data () {
    return {
      romaSpeed: 1,
      paths: [],
      roamCtrl: '停止',
      rangeNum: 140,
      headingNum: 90,
      pitchNum: -10
    }
  },
  mounted () {
    this.initMap()
  },

  methods: {
    initMap () {
      const tempData = [
        {
          id: 14,
          name: '高德地图01',
          type: 'UrlTemplateImageryProvider',
          classConfig: {
            url: 'https://webst03.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&style=7',
          },
          interfaceConfig: {
            saturation: 0,
            brightness: 0.6,
            contrast: 1.8,
            hue: 1,
            gamma: 0.3,
          },
          offset: '0,0',
          invertswitch: 1,
          filterRGB: '#4e70a6',
          showswitch: 1,
          weigh: 0,
          createtime: 1624326728,
          updatetime: 1646979297,
        }]
      const pluginObj = new initCesium(
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
      this.c_viewer = pluginObj.viewer;
      this.pluginCtrl = pluginObj.plugin;
      this.draw = pluginObj.draw;
      this.material = pluginObj.material;
      this.flyto();
    },
    flyto () {
      this.pluginCtrl.flyTo({
        position: { x: -1337132.0092982147, y: 5330611.474631115, z: 3228680.029449292 },
        orientation: {
          heading: Cesium.Math.toRadians(1.0114629015290062),
          pitch: Cesium.Math.toRadians(-23.53661660731824),
          roll: Cesium.Math.toRadians(0.00324596311071617)
        }
      })
    },
    drawPath () {
      let _self = this;
      // 绘制路线
      this.draw.drawLineGraphics({
        width: 8,
        material: new Cesium.Scene.PolylineCityLinkMaterialProperty({
          color: Cesium.Color.MEDIUMBLUE,
          duration: 2000
        }),
        callback: function (res, entitesObj) {
          _self.paths = res;
          _self.entitesObj = entitesObj;
        }
      })
    },
    previewRoma () {
      if (this.paths.length <= 0) {
        this.$message({ type: "warning", message: '情形绘制漫游路线' })
      } else {

        this.pathRomaObj = this.pluginCtrl.buildPathRoaming({
          name: '一品大街',
          paths: this.paths,
          polyline: { // 配置漫游路径（不配置则不绘制）
            width: 40,
            material: this.material.getCustomMaterialWall({
              image: 'static/data/images/Textures/jsx4.png',
              freely: 'cross',
              direction: '-',  // 顺时针
              count: 12,
              color: Cesium.Color.RED,
              duration: 5000,
            }),
            clampToGround: true,
          },
          model: { // 配置漫游模型（不配置则不绘制）
            url: 'static/data/model/man/walk.gltf',
            scale: 10
          },
          cameraOffset: () => {
            // 配置漫游时相机偏移位置
            //new Cesium.Cartesian3(-100, 0, 20),或 new Cesium.HeadingPitchRange(heading, pitch, range)
            return new Cesium.HeadingPitchRange(
              Cesium.Math.toRadians(this.headingNum),
              Cesium.Math.toRadians(this.pitchNum),
              Number(this.rangeNum))
          }
        })
      }
    },
    romaSpeedChange (e) {
      this.c_viewer.clock.multiplier = e.target.value;
    },
    stopRoma () {
      this.c_viewer.clock.shouldAnimate = !this.c_viewer.clock.shouldAnimate;
      this.roamCtrl = this.c_viewer.clock.shouldAnimate ? '停止' : '继续';
    },
    removeRoma () {
      this.c_viewer.clock.shouldAnimate = false
      this.c_viewer.entities.remove(this.pathRomaObj);
      this.draw._drawLayer.entities.remove(this.entitesObj);
    },
  },
  beforeUnmount () {
    this.c_viewer = null;
    this.pluginCtrl = null;
    this.draw = null;
  }
}
</script>
<style lang="scss" scoped>
.dom-panle {
  position: relative;
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
  .elslider-control {
    width: 330px;
    padding: 6px 12px;
    position: absolute;
    top: 10px;
    left: 8px;
    background: #fff;
    .slider-demo-block {
      line-height: 40px;
      display: flex;
      justify-content: space-around;
    }
  }
}
</style>
