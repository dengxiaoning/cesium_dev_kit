<template>
  <div>
    <div id="cesiumContainer" class="map3d-contaner"></div>
    <section class="elslider-control">
      <div class="block">
        <span class="demonstration">xHalfAngle:</span>
        <el-slider
          v-model="xHalfAngleDef.value"
          :max="xHalfAngleDef.max"
          :min="xHalfAngleDef.min"
          @change="xHalfAngleChange"
        ></el-slider>
      </div>
      <div class="block">
        <span class="demonstration">yHalfAngle:</span>
        <el-slider
          v-model="yHalfAngleDef.value"
          :max="yHalfAngleDef.max"
          :min="yHalfAngleDef.min"
          @change="yHalfAngleChange"
        ></el-slider>
      </div>
      <div class="block">
        <span class="demonstration">Heading:</span>
        <el-slider
          v-model="HeadingDef.value"
          :max="HeadingDef.max"
          :min="HeadingDef.min"
          @change="HeadingChange"
        ></el-slider>
      </div>
      <div class="block">
        <span class="demonstration">Pitch:</span>
        <el-slider
          v-model="PitchDef.value"
          :max="PitchDef.max"
          :min="PitchDef.min"
          @change="PitchChange"
        ></el-slider>
      </div>
      <div class="block">
        <span class="demonstration">Roll:</span>
        <el-slider
          v-model="RollDef.value"
          :max="RollDef.max"
          :min="RollDef.min"
          @change="RollChange"
        ></el-slider>
      </div>
    </section>
  </div>
</template>
<script>
  import * as Cesium from 'cesium'
  import { initCesium } from '@/utils/cesiumPluginsExtends/index'
  let sensorEntity = undefined,
    l = Cesium.Cartesian3.fromDegrees(117.224, 31.819, 128),
    roll = 0,
    pitch = 0,
    heading = 90
  export default {
    data() {
      return {
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
    mounted() {
      this.initMap()
    },
    methods: {
      initMap() {
        const { viewer, customCesiumPlugin } = new initCesium(
          Cesium,
          'cesiumContainer',
          {
            infoBox: false,
            shouldAnimate: true
          },
          []
        )

        this.c_viewer = viewer
        this.customCesiumPlugin = customCesiumPlugin

        this.flyToPos()
        this.initPhaseControl()
      },
      flyToPos() {
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
      initPhaseControl() {
        sensorEntity = this.customCesiumPlugin.createRectangularSensorGraphics({
          position: l,
          heading: heading,
          pitch: pitch,
          roll: roll
        })
      },
      xHalfAngleChange(e) {
        console.log(e)
        sensorEntity.rectangularSensor.xHalfAngle = Cesium.Math.toRadians(e)
      },
      yHalfAngleChange(e) {
        sensorEntity.rectangularSensor.yHalfAngle = Cesium.Math.toRadians(e)
      },
      HeadingChange(e) {
        console.log(e)
        heading = e
        sensorEntity.orientation = Cesium.Transforms.headingPitchRollQuaternion(
          l,
          new Cesium.HeadingPitchRoll(
            Cesium.Math.toRadians(heading),
            Cesium.Math.toRadians(pitch),
            Cesium.Math.toRadians(roll)
          )
        )
      },
      PitchChange(e) {
        console.log(e)
        pitch = e
        sensorEntity.orientation = Cesium.Transforms.headingPitchRollQuaternion(
          l,
          new Cesium.HeadingPitchRoll(
            Cesium.Math.toRadians(heading),
            Cesium.Math.toRadians(pitch),
            Cesium.Math.toRadians(roll)
          )
        )
      },
      RollChange(e) {
        console.log(e)
        roll = e
        sensorEntity.orientation = Cesium.Transforms.headingPitchRollQuaternion(
          l,
          new Cesium.HeadingPitchRoll(
            Cesium.Math.toRadians(heading),
            Cesium.Math.toRadians(pitch),
            Cesium.Math.toRadians(roll)
          )
        )
      }
    },
    beforeUnmount() {
      this.c_viewer = null
      this.customCesiumPlugin = null
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
  .elslider-control {
    width: 300px;
    position: absolute;
    top: 10px;
    left: 8px;
  }
</style>
