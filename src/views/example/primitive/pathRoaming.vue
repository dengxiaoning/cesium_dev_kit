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
      pitchNum: -10,
      pluginObj: null,
      pathRomaObj: null,
      entitesObj: null,
      c_viewer: null
    }
  },
  mounted () {
    this.initMap()
  },

  methods: {
    initMap () {
      const tempData = [
        {
          type: 'UrlTemplateImageryProvider',
          option: {
            url: 'https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}'
          }
        },
        {
          type: 'UrlTemplateImageryProvider',
          option: {
            url: 'https://webst03.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&style=7',
          }
        }
      ]
      this.pluginObj = new initCesium(
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
      this.c_viewer = this.pluginObj.viewer;
      this.pluginCtrl = this.pluginObj.plugin;
      this.draw = this.pluginObj.draw;
      this.material = this.pluginObj.material;
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
          console.log('漫游==>', res);
          _self.entitesObj = entitesObj;
        }
      })
    },
    previewRoma () {
      if (this.paths.length <= 0) {
        this.$message({ type: "warning", message: '情形绘制漫游路线' })
      } else {
        // 重复预览时先移除上一次的漫游实体，避免叠加
        if (this.pathRomaObj) {
          this.c_viewer.entities.remove(this.pathRomaObj)
          this.pathRomaObj = null
        }
        const roamEntity = this.pluginCtrl.buildPathRoaming({
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
        this.pathRomaObj = roamEntity || null
        if (!roamEntity) {
          this.$message({ type: "warning", message: '漫游路径无效：至少需要两个不重合的点' })
        }
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
      if (this.pathRomaObj) {
        this.c_viewer.entities.remove(this.pathRomaObj)
        this.pathRomaObj = null
      }
      if (this.entitesObj) {
        this.draw._drawLayer.entities.remove(this.entitesObj)
        this.entitesObj = null
      }
      // 漫游时相机被 lookAtTransform 锁定，移除后需要解除，否则视角无法自由旋转
      this.c_viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
      this.paths = []
    },
  },
  beforeUnmount () {
    // dispose 会释放本模块添加的监听 / 实体；viewer 由 initCesium 创建，一并销毁
    if (this.pluginObj) {
      this.pluginObj.dispose()
      this.pluginObj = null
    }
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
