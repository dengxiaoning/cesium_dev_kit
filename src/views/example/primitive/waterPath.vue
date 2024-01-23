<template>
  <div class="inner-page">
    <div id="cesiumContainer"
         class="map3d-contaner"></div>
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>绘制面板</span>
        </div>
      </template>
      <el-tag @click="caldDistain">
        绘制河流
      </el-tag>
    </el-card>
  </div>
</template>
<script >
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'
import { waterData } from './data/waterData'
import { defaultStatic } from '../defaultStaticConf'
export default {
  mounted () {
    this.initMap()
  },
  methods: {
    initMap () {
      const {
        viewer,
        material,
        graphics,
        draw,
        base
      } = new initCesium(
        {
          cesiumGlobal: Cesium,
          containerId: 'cesiumContainer',
          viewerConfig: {
            infoBox: false,
            shouldAnimate: true,
            contextOptions: {
              requestWebgl2: true,
            }
          },
          extraConfig: {},
          MapImageryList: [],
          // defaultStatic
        })


      this.c_viewer = viewer;
      this.drawObj = draw;
      this.material = material;
      this.graphics = graphics;
      this.base = base;
      this.flyto();
      this.createWaterPath();
    },
    flyto () {
      this.c_viewer.camera.flyTo({
        orientation: {
          heading: 1.6802671089814538,
          pitch: -0.5942780176871376,
          roll: 0.00009774854244337661
        },
        destination: {
          x: -1316325.8004510372,
          y: 5328682.353043815,
          z: 3246432.9086183477
        }
      })
    },
    caldDistain () {
      const pp = this.base.getCameraPosition();
      console.log(this.c_viewer.camera.positions)
      const pos = [];
      this.drawObj.drawLineGraphics({
        callback: res => {
          res.forEach(r => {
            pos.push(r.lng)
            pos.push(r.lat)
            pos.push(r.alt)
          })
          if (pos.length > 0) {
            this.drawObj.removeAll();
            this.graphics.createLineVolumeGraphics({
              name: 'water_01',
              oid: 'lineWater_01',
              positions: pos,
              width: 1050,
              cornerType: Cesium.CornerType.ROUNDED,
              material:
                new Cesium.Scene.PolylineFlowWaterMaterialProperty(
                  {
                    riverColor: Cesium.Color.SKYBLUE,
                    flowDuration: 50000
                  }
                ),
            })

          }
        }
      })
    },
    createWaterPath () {
      waterData.forEach((wE, index) => {
        this.graphics.createLineVolumeGraphics({
          name: 'water_' + index + 1,
          oid: 'lineWater_' + index + 1,
          positions: wE.pos,
          width: 6550,
          material:
            new Cesium.Scene.PolylineFlowWaterMaterialProperty(
              {
                riverColor: Cesium.Color.SKYBLUE,
                flowDuration: 10000
              }
            ),
        })
      })
    }
  },
  beforeUnmount () {
    this.c_viewer = null;
    this.material = null;
    this.graphics = null;
  }
}
</script>
<style lang="scss" scoped>
.inner-page {
  position: relative;
}
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

  .text {
    font-size: 14px;
  }

  .item {
    margin: 0px 6px 18px;
    cursor: pointer;
    &.active {
      color: #36a3f7;
      background: yellowgreen;
    }
  }
}
</style>
