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
      const { viewer, material, graphics, math3d } = new initCesium(
        Cesium,
        'cesiumContainer',
        {
          infoBox: false,
          shouldAnimate: true
        },
        []
      )

      this.c_viewer = viewer

      this.material = material
      this.graphics = graphics
      this.math3d = math3d
      // let layer = this.c_viewer.imageryLayers.addImageryProvider(new Cesium.Scene.BaiduImageryProvider({
      //   style: 'dark'
      // }));
      this.material.setDefSceneConfig()
      this.material.setBloomLightScene()
      let tileset = this.c_viewer.scene.primitives.add(
        new Cesium.Cesium3DTileset({
          url: 'static/data/3DTiles/building/tileset.json'
        })
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
            ['true', 'rgb(0, 149, 251, 0.3)']
          ]
        }
      })

      this.c_viewer.flyTo(tileset)

      this.createEllipsoidOne()
      this.createEllipsoidTwo()
      this.createEllipsoidThree()
    },
    createCustMaterialWall(imgUrl, colorVal, durationNum, countNum) {
      return this.material.getCustomMaterialWall({
        image: imgUrl,
        freely: 'cross',
        direction: '+',
        count: countNum,
        color: colorVal,
        duration: durationNum
      })
    },
    // ellipsoid one
    createEllipsoidOne() {
      var ellipsoid = new Cesium.EllipsoidGraphics({
        radii: new Cesium.Cartesian3(500, 500, 500), //单位 米
        material: this.createCustMaterialWall(
          'static/data/images/Textures/test1.png',
          Cesium.Color.BLUE,
          2000,
          0.0
        ),
        maximumCone: Cesium.Math.PI_OVER_TWO
      })
      var position = Cesium.Cartesian3.fromDegrees(
        104.081701757991,
        30.627042558105988
      )
      let three1 = this.c_viewer.entities.add({
        name: 'aaaaa',
        position: position,
        ellipsoid: ellipsoid
      })
    },
    // ellipsoid two
    createEllipsoidTwo() {
      var position = Cesium.Cartesian3.fromDegrees(
        104.06417395476578,
        30.636185094244944
      )
      var ellipsoid = this.graphics.getEllipsoidGraphics({
        radii: 700,
        material: this.createCustMaterialWall(
          'static/data/images/Textures/color3.png',
          Cesium.Color.BLUE.withAlpha(0.5),
          2000,
          1.0
        ),
        outline: false,
        outlineColor: Cesium.Color.WHITE.withAlpha(0.8)
      })
      ellipsoid.innerRadii = new Cesium.Cartesian3(
        700 / 1.5,
        700 / 1.5,
        700 / 1.5
      )

      let three2 = this.c_viewer.entities.add({
        name: 'aaaaa',
        position: position,
        ellipsoid: ellipsoid
      })
    },
    // ellipsoid three
    createEllipsoidThree() {
      var ellipsoid = new Cesium.EllipsoidGraphics({
        radii: new Cesium.Cartesian3(500, 500, 500), //单位 米
        material: this.createCustMaterialWall(
          'static/data/images/Textures/b2.png',
          Cesium.Color.BLUE,
          2000,
          1.0
        ),
        maximumCone: Cesium.Math.PI_OVER_TWO
      })
      var position = Cesium.Cartesian3.fromDegrees(
        104.05248507490258,
        30.653854957158103
      )

      let three3 = this.c_viewer.entities.add({
        name: 'aaaaa',
        position: position,
        ellipsoid: ellipsoid
      })
    }
  },
  beforeUnmount() {
    this.c_viewer = null
    this.material = null
    this.graphics = null
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
