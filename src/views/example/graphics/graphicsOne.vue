<template>
  <div id="cesiumContainer"
       class="map3d-contaner"></div>
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
        },
        {
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
        },
      ]
      const { viewer,
        material,
        graphics,
        sceneMang } = new initCesium(
          {
            cesiumGlobal: Cesium,
            containerId: 'cesiumContainer',
            viewerConfig: {
              infoBox: false,
              shouldAnimate: true,
            },
            extraConfig: {
              initNavigate: true,
              depthTest: true
            },
            MapImageryList: tempData
          })


      this.c_viewer = viewer;

      this.material = material;
      this.graphics = graphics;
      console.log(this.material.myname)
      this.$nextTick(() => {
        this.material.setDefSceneConfig()
        this.material.setBloomLightScene()
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
        this.createModel()
        this.flyto()
      })
    },
    flyto() {
      this.material.flyTo({
        position: {
          x: -1337132.0092982147,
          y: 5330611.474631115,
          z: 3228680.029449292,
        },
        orientation: {
          heading: Cesium.Math.toRadians(1.0114629015290062),
          pitch: Cesium.Math.toRadians(-23.53661660731824),
          roll: Cesium.Math.toRadians(0.00324596311071617),
        },
      })
    },
    createModel() {
      const model = this.graphics.createModelGraphics({
        position: Cesium.Cartesian3.fromDegrees(
          104.081701757991,
          30.627042558105988,
          400,
        ),
        m_url: 'static/data/model/zhui.glb',
        m_scale: 60,
      })
      const carseianTans = this.graphics.transformCartesianToWGS84(
        Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 50),
      )
      this.graphics.setGraphicsRotate({
        entity: model,
        position: carseianTans,
        rotateAmount: 4,
      })
      this.graphics.setGraphicsFloat({
        entity: model,
        cartesians: Cesium.Cartesian3.fromDegrees(
          104.081701757991,
          30.627042558105988,
          400,
        ),
        maxHeiht: 100,
        speed: 0.5,
      })
      this.graphics.craeteDynamicCricleGraphics({
        center: { lng: 104.081701757991, lat: 30.627042558105988, alt: 1 },
        radius: 800,
        scale: 1500,
      })
    },
  },
  beforeUnmount() {
    this.c_viewer = null;
    this.material = null;
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
