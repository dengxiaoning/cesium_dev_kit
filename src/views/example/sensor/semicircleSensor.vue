<template>
  <div class="semicircle-page">
    <div id="cesiumContainer"
         class="map3d-contaner"></div>
    <section class="elslider-control">
      <div class="slider-demo-block">
        <span class="demonstration">xHalfAngle:</span>
        <input type="range"
               v-model="xHalfAngleDef.value"
               :max="xHalfAngleDef.max"
               :min="xHalfAngleDef.min"
               @change="xHalfAngleChange">
      </div>
      <div class="slider-demo-block">
        <span class="demonstration">yHalfAngle:</span>
        <input type="range"
               v-model="yHalfAngleDef.value"
               :max="yHalfAngleDef.max"
               :min="yHalfAngleDef.min"
               @change="yHalfAngleChange">
      </div>
      <div class="slider-demo-block">
        <span class="demonstration">Heading:</span>
        <input type="range"
               v-model="HeadingDef.value"
               :max="HeadingDef.max"
               :min="HeadingDef.min"
               @change="HeadingChange">
      </div>
      <div class="slider-demo-block">
        <span class="demonstration">Pitch:</span>
        <input type="range"
               v-model="PitchDef.value"
               :max="PitchDef.max"
               :min="PitchDef.min"
               @change="PitchChange">
      </div>
      <div class="slider-demo-block">
        <span class="demonstration">Roll:</span>
        <input type="range"
               v-model="RollDef.value"
               :max="RollDef.max"
               :min="RollDef.min"
               @change="RollChange">
      </div>
    </section>
  </div>
</template>
<script>
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'

export default {
  data () {
    return {
      currPosition: Cesium.Cartesian3.fromDegrees(117.224, 31.819, 128),
      roll: 0,
      pitch: 0,
      heading: 90,
      xHalfAngleDef: {
        max: 90,
        min: 0,
        value: 55 //初始值
      },
      yHalfAngleDef: {
        max: 90,
        min: 0,
        value: 0 //初始值
      },

      HeadingDef: {
        max: 360,
        min: 0,
        value: 90 //初始值
      },
      PitchDef: {
        max: 360,
        min: 0,
        value: 0 //初始值
      },
      RollDef: {
        max: 360,
        min: 0,
        value: 0 //初始值
      }
    }
  },
  mounted () {
    this.initMap()
  },
  methods: {
    initMap () {
      const { viewer, customCesiumPlugin } = new initCesium(
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

      this.c_viewer = viewer
      this.customCesiumPlugin = customCesiumPlugin

      this.flyToPos()
      this.initPhaseControl()
    },
    flyToPos () {
      this.customCesiumPlugin.flyTo({
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
    initPhaseControl () {
      const _this = this
      this.sensorEntity = this.customCesiumPlugin.createRectangularSensorGraphics(
        {
          position: _this.currPosition,
          xHalfAngle: 90,
          yHalfAngle: 90,
          heading: _this.heading,
          pitch: _this.pitch,
          roll: _this.roll,
          scanPlaneColor: new Cesium.Color(1.0, 1.0, 1.5, 1.0),
          material: new Cesium.Color(1.0, 1.0, 1.5, 0.4),
          lineColor: new Cesium.Color(1.0, 1.0, 1.5, 1.0)
        }
      )
    },
    xHalfAngleChange (e) {
      this.sensorEntity.rectangularSensor.xHalfAngle = Cesium.Math.toRadians(
        e.target.value
      )
    },
    yHalfAngleChange (e) {
      this.sensorEntity.rectangularSensor.yHalfAngle = Cesium.Math.toRadians(
        e.target.value
      )
    },
    HeadingChange (e) {
      const _this = this
      _this.heading = e.target.value
      _this.sensorEntity.orientation = Cesium.Transforms.headingPitchRollQuaternion(
        _this.currPosition,
        new Cesium.HeadingPitchRoll(
          Cesium.Math.toRadians(_this.heading),
          Cesium.Math.toRadians(_this.pitch),
          Cesium.Math.toRadians(_this.roll)
        )
      )
    },
    PitchChange (e) {
      const _this = this
      _this.pitch = e.target.value
      _this.sensorEntity.orientation = Cesium.Transforms.headingPitchRollQuaternion(
        _this.currPosition,
        new Cesium.HeadingPitchRoll(
          Cesium.Math.toRadians(_this.heading),
          Cesium.Math.toRadians(_this.pitch),
          Cesium.Math.toRadians(_this.roll)
        )
      )
    },
    RollChange (e) {
      const _this = this
      this.roll = e.target.value
      this.sensorEntity.orientation = Cesium.Transforms.headingPitchRollQuaternion(
        _this.currPosition,
        new Cesium.HeadingPitchRoll(
          Cesium.Math.toRadians(_this.heading),
          Cesium.Math.toRadians(_this.pitch),
          Cesium.Math.toRadians(_this.roll)
        )
      )
    }
  },
  beforeUnmount () {
    this.c_viewer = null
    this.customCesiumPlugin = null
  }
}
</script>
<style lang="scss" scoped>
.semicircle-page {
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
    .slider-demo-block {
      line-height: 40px;
      display: flex;
      justify-content: space-around;
    }
  }
}
</style>
