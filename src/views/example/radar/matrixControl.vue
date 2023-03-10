<template>
  <div class="phase-page">
    <div id="cesiumContainer"
         class="map3d-contaner"></div>
    <section class="elslider-control">
      <div class="block"
           v-for="(item,idx) in menuList"
           :key="idx">
        <span class="demonstration">{{ item.label }}</span>
        <el-slider v-model="item.bindVal.value"
                   :max="item.bindVal.max"
                   :min="item.bindVal.min"
                   @change="sliderChanger(item.flag,$event)"></el-slider>
      </div>
    </section>
  </div>
</template>
<script>
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'

export default {
  data() {
    return {
      currPosition: Cesium.Cartesian3.fromDegrees(117.224, 31.819, 128),
      roll: 0,
      pitch: 40,
      heading: 0,
      menuList: [
        {
          label: 'X轴平移【+】',
          flag: 'X-Translation-Plus',
          bindVal: {
            max: 1000
            , min: 0
            , value: 0
          }
        },
        {
          label: 'Y轴平移【+】',
          flag: 'Y-Translation-Plus',
          bindVal: {
            max: 1000
            , min: 0
            , value: 0
          }
        },
        {
          label: 'Z轴平移【+】',
          flag: 'Z-Translation-Plus',
          bindVal: {
            max: 0
            , min: -1000
            , value: -1000
          }
        },
        {
          label: 'X轴平移【-】',
          flag: 'X-Translation-Minus',
          bindVal: {
            max: 0
            , min: -1000
            , value: -1000
          }
        },
        {
          label: 'Y轴平移【-】',
          flag: 'Y-Translation-Minus',
          bindVal: {
            max: 0
            , min: -1000
            , value: -1000
          }
        },
        {
          label: 'Z轴平移【-】',
          flag: 'Z-Translation-Minus',
          bindVal: {
            max: 3.0
            , min: 1.0
            , value: 1.0
          }
        },
        {
          label: 'X旋转【+】',
          flag: 'X-Rotate-plus',
          bindVal: {
            max: 3.0
            , min: 1.0
            , value: 1.0
          }
        },
        {
          label: 'Y旋转【+】',
          flag: 'Y-Rotate-plus',
          bindVal: {
            max: 3.0
            , min: 1.0
            , value: 1.0
          }
        },
        {
          label: 'Z旋转【+】',
          flag: 'Z-Rotate-Plus',
          bindVal: {
            max: -1.0
            , min: -3.0
            , value: -3.0
          }
        },
        {
          label: 'X旋转【-】',
          flag: 'X-Rotate-Minus',
          bindVal: {
            max: -1.0
            , min: -3.0
            , value: -3.0
          }
        },
        {
          label: 'Y旋转【-】',
          flag: 'Y-Rotate-Minus',
          bindVal: {
            max: -1.0
            , min: -3.0
            , value: -3.0
          }
        },
        {
          label: 'Z旋转【-】',
          flag: 'Z-Rotate-Minus',
          bindVal: {
            max: -1.0
            , min: -3.0
            , value: -3.0
          }
        }
      ]
    }
  },
  mounted() {
    this.initMap()
  },
  methods: {
    initMap() {
      const { viewer, primitive } = new initCesium(
        Cesium,
        'cesiumContainer',
        {
          infoBox: false,
          shouldAnimate: true
        },
        []
      )

      this.c_viewer = viewer
      this.primitive = primitive;
      this.flyToPos()
      this.initPhaseControl()
    },
    flyToPos() {
      this.primitive.flyTo({
        position: {
          x: -1577100.7186109242,
          y: 5851821.270502206,
          z: 3447255.476239793
        },
        orientation: {
          heading: Cesium.Math.toRadians(78.17580384898336),
          pitch: Cesium.Math.toRadians(-29.981992162453782),
          roll: Cesium.Math.toRadians(0.005676460617140785)
        }
      })
    },
    initPhaseControl() {
      const _this = this
      this.Probing = new Cesium.Scene.ProbingPrimitive({
        center: _this.currPosition,
        thickness: 0.8,
        repeat: 20
      })
    },
    sliderChanger(flag, value) {
      const Probing = this.Probing;
      let translation = null, angel = null, rotation = null;
      switch (flag) {
        case 'X-Translation-Plus':
          translation = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(value, 0, 0))
          Cesium.Matrix4.multiply(Probing._radar.modelMatrix, translation, Probing._radar.modelMatrix)
          break;
        case 'Y-Translation-Plus':
          translation = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(0, value, 0))
          Cesium.Matrix4.multiply(Probing._radar.modelMatrix, translation, Probing._radar.modelMatrix)
          break;
        case 'Z-Translation-Plus':
          translation = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(0, 0, value))
          Cesium.Matrix4.multiply(Probing._radar.modelMatrix, translation, Probing._radar.modelMatrix)
          break;
        case 'X-Translation-Minus':
          translation = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(value, 0, 0))
          Cesium.Matrix4.multiply(Probing._radar.modelMatrix, translation, Probing._radar.modelMatrix)
          break;
        case 'Y-Translation-Minus':
          translation = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(0, value, 0))
          Cesium.Matrix4.multiply(Probing._radar.modelMatrix, translation, Probing._radar.modelMatrix)
          break;
        case 'Z-Translation-Minus':
          translation = Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(0, 0, value))
          Cesium.Matrix4.multiply(Probing._radar.modelMatrix, translation, Probing._radar.modelMatrix)
          break;
        case 'X-Rotate-Plus':
          angel = Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(value))
          rotation = Cesium.Matrix4.fromRotationTranslation(angel)
          Cesium.Matrix4.multiply(Probing._radar.modelMatrix, rotation, Probing._radar.modelMatrix)
          break;
        case 'Y-Rotate-Plus':
          angel = Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(value))
          rotation = Cesium.Matrix4.fromRotationTranslation(angel)
          Cesium.Matrix4.multiply(Probing._radar.modelMatrix, rotation, Probing._radar.modelMatrix)
          break;
        case 'Z-Rotate-Plus':
          angel = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(value))
          rotation = Cesium.Matrix4.fromRotationTranslation(angel)
          Cesium.Matrix4.multiply(Probing._radar.modelMatrix, rotation, Probing._radar.modelMatrix)
          break;
        case 'X-Rotate-Minus':
          angel = Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(value))
          rotation = Cesium.Matrix4.fromRotationTranslation(angel)
          Cesium.Matrix4.multiply(Probing._radar.modelMatrix, rotation, Probing._radar.modelMatrix)
          break;
        case 'Y-Rotate-Minus':
          angel = Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(value))
          rotation = Cesium.Matrix4.fromRotationTranslation(angel)
          Cesium.Matrix4.multiply(Probing._radar.modelMatrix, rotation, Probing._radar.modelMatrix)
          break;
        case 'Z-Rotate-Minus':
          angel = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(value))
          rotation = Cesium.Matrix4.fromRotationTranslation(angel)
          Cesium.Matrix4.multiply(Probing._radar.modelMatrix, rotation, Probing._radar.modelMatrix)
          break;

      }
    },

  },
  beforeUnmount() {
    this.c_viewer = null
    this.customCesiumPlugin = null
  }
}
</script>
<style lang="scss" scoped>
.phase-page {
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
    width: 300px;
    padding: 6px 12px;
    position: absolute;
    top: 10px;
    left: 8px;
    background: #fff;
  }
  :deep(.el-slider__runway) {
    margin: 6px 0;
  }
}
</style>
