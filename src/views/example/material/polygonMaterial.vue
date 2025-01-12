<template>
  <div>
    <div id="cesiumContainer" class="map3d-contaner"></div>
  </div>
</template>
<script>
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'

export default {
  mounted () {
    this.initMap()
  },
  methods: {
    async initMap () {
      const { viewer, material, graphics, math3d } = new initCesium(
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

      this.material = material
      this.graphics = graphics
      this.math3d = math3d

      this.material.setDefSceneConfig()
      this.material.setBloomLightScene()

      let tiles = await Cesium.Cesium3DTileset.fromUrl('static/data/3DTiles/building/tileset.json');
      let tileset = this.c_viewer.scene.primitives.add(tiles)
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

      this.createPolygonOne()
      this.createPolygonTwo()
    },
    createCustMaterialWall (imgUrl, colorVal, durationNum) {
      return this.material.getCustomMaterialWall({
        image: imgUrl,
        freely: 'vertical',
        direction: '+',
        count: 2.0,
        color: colorVal,
        duration: durationNum
      })
    },
    createPolygonOne () {
      var polygon = this.graphics.createPolygonGraphics({
        positions: Cesium.Cartesian3.fromDegreesArray([
          104.09816110606057,
          30.659821965447698,
          104.1120972824757,
          30.65330300319938,
          104.10758419863926,
          30.64592470850288,
          104.09351691196979,
          30.652434826507452,
          104.09816110606057,
          30.659821965447698
        ]),
        material: this.createCustMaterialWall(
          'static/data/images/Textures/color3.png',
          Cesium.Color.BLUE,
          50000
        )
      })
      polygon.polygon.extrudedHeight = 500
    },
    createPolygonTwo () {
      var polygon2 = this.graphics.createPolygonGraphics({
        positions: Cesium.Cartesian3.fromDegreesArray([
          104.07263175401185,
          30.647622150198725,
          104.06369117158526,
          30.648834374000277,
          104.06437182811021,
          30.62274533905387,
          104.07463538167119,
          30.62285687644371,
          104.07263175401185,
          30.647622150198725
        ]),
        material: this.createCustMaterialWall(
          'static/data/images/Textures/gradual_change_red_02.png',
          Cesium.Color.BLUE.withAlpha(0.5),
          20000
        )
      })
      polygon2.polygon.extrudedHeight = 500
    }
  },
  beforeUnmount () {
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
