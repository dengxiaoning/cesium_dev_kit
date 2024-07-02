<template>
  <div class="sky-box">
    <div id="cesiumContainer"
         class="map3d-contaner"></div>

    <div class="position-panel">
      <el-card class="box-card">
        <div class="clearfix">
          <span>相机位置</span>
        </div>
        <div class="card-content">
          <p><span>longitude：</span>{{posLon}}</p>
          <p><span>latitude：</span>{{posLat}}</p>
          <p><span>heading：</span>{{posHeading}}</p>
          <p><span>pitch：</span>{{posPitch}}</p>
          <p><span>roll：</span>{{posRoll}}</p>
          <p><span>posAlt：</span>{{posAlt}}</p>
        </div>
        <div class="clearfix">
          <span>相机笛卡尔位置</span>
        </div>
        <div class="card-content">
          <p><span>笛卡尔经度:</span>{{ cartesinaX }}</p>
          <p><span>笛卡尔纬度:</span>{{cartesinaY}}</p>
          <p><span>笛卡尔高度:</span>{{ cartesinaZ }}</p>
          <p><span>朝向:</span>{{cartesinaH}}</p>
          <p><span>倾斜角:</span>{{cartesinaP}}</p>
          <p><span>翻滚角:</span>{{cartesinaR}}</p>
        </div>
      </el-card>
    </div>
  </div>
</template>
<script>
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'
import { defaultStatic } from '../defaultStaticConf'

export default {
  data () {
    return {
      posHeading: 0,
      posPitch: 0,
      posRoll: 0,
      posAlt: 0,
      posLat: 0,
      posLon: 0,
      cartesinaX: 0,
      cartesinaY: 0,
      cartesinaZ: 0,
      cartesinaH: 0,
      cartesinaP: 0,
      cartesinaR: 0
    }
  },
  mounted () {
    this.initMap()
  },
  methods: {
    initMap () {
      const tempData = [
        {
          id: 3,
          name: '高德地图02',
          type: 'UrlTemplateImageryProvider',
          classConfig: {
            url: 'https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
          },
          interfaceConfig: {},
          offset: '0,0',
          invertswitch: 0,
          filterRGB: '#ffffff',
          showswitch: 1,
          weigh: 13,
          createtime: 1624346908,
          updatetime: 1647395260,
        }, {
          id: 14,
          name: '高德地图01',
          type: 'UrlTemplateImageryProvider',
          classConfig: {
            url: 'http://webst03.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&style=7',
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
        },]
      const { viewer,
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
            depthTest: true
          },
          MapImageryList: tempData,
          defaultStatic
        })

      this.c_viewer = viewer;
      this.base = base;

      let tileset = this.c_viewer.scene.primitives.add(
        new Cesium.Cesium3DTileset({
          url: 'static/data/3DTiles/building/tileset.json',
        }),
      )
      tileset.style = new Cesium.Cesium3DTileStyle({
        color: {
          conditions: [
            ['${height} >= 300', 'rgba(0, 149, 251, 0.3)'],
            ['${height} >= 200', 'rgb(0, 149, 251, 0.3)'],
            ['${height} >= 100', 'rgb(0, 149, 251, 0.3)'],
            ['${height} >= 50', 'rgb(0, 149, 251, 0.3)'],
            ['${height} >= 25', 'rgb(0, 149, 251, 0.3)'],
            ['${height} >= 10', 'rgb(0, 149, 251, 0.3)'],
            ['${height} >= 5', 'rgb(0, 149, 251, 0.3)'],
            ['true', 'rgb(0, 149, 251, 0.3)'],
          ],
        },
      })
      viewer.flyTo(tileset)
      this.initCameraPos();
      this.cameraModify();
    },
    initCameraPos () {
      let position = this.base.getCameraPosition();
      if (position) {
        const { lon,
          lat,
          height,
          heading,
          pitch,
          roll,
          position: { x, y, z },
          cameraHeading,
          cameraPitch,
          cameraRoll,
        } = position;
        this.posAlt = height;
        this.posHeading = heading;
        this.posPitch = pitch;
        this.posRoll = roll;
        this.posLat = lat;
        this.posLon = lon;

        this.cartesinaX = x;
        this.cartesinaY = y;
        this.cartesinaZ = z;
        this.cartesinaH = cameraHeading;
        this.cartesinaP = cameraPitch;
        this.cartesinaR = cameraRoll;
      } else {
        console.log('can not get postion.')
      }
    },
    cameraModify () {
      this.c_viewer.scene.camera.moveEnd.addEventListener((move) => {
        let position = this.base.getCameraPosition()
        if (position) {
          const { lon,
            lat,
            height,
            heading,
            pitch,
            roll,
            position: { x, y, z },
            cameraHeading,
            cameraPitch,
            cameraRoll,
          } = position;
          this.posAlt = height;
          this.posHeading = heading;
          this.posPitch = pitch;
          this.posRoll = roll;
          this.posLat = lat;
          this.posLon = lon;

          this.cartesinaX = x;
          this.cartesinaY = y;
          this.cartesinaZ = z;
          this.cartesinaH = cameraHeading;
          this.cartesinaP = cameraPitch;
          this.cartesinaR = cameraRoll;
        } else {
          console.log('can not get postion.')
        }
      });
    }
  },
  beforeUnmount () {
    this.c_viewer = null;
    this.base = null;
  }
}
</script>
<style lang="scss" scoped>
.sky-box {
  position: relative;
  .map3d-contaner {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
  .position-panel {
    position: absolute;
    top: 10px;
    left: 20px;
    z-index: 3;
    .card-content {
      p {
        span {
          color: #808080;
        }
      }
    }
  }
}
</style>
