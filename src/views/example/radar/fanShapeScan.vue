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
  mounted () {
    this.initMap()
  },
  methods: {
    initMap () {
      const { viewer, material, graphics } = new initCesium(
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

      this.createAEllipsoid();
      this.createAFanShape();
    },
    createCustMaterialWall (imgUrl, colorVal, durationNum, countNum, directionStr) {
      return this.material.getCustomMaterialWall({
        image: imgUrl,
        freely: 'cross',
        direction: directionStr || '+',
        count: countNum,
        color: colorVal,
        duration: durationNum
      })
    },
    // 创建椭圆体
    createAEllipsoid () {
      var position = Cesium.Cartesian3.fromDegrees(
        104.06417395476578,
        30.636185094244944
      )
      var ellipsoid = this.graphics.getEllipsoidGraphics({
        radii: 700,
        material: Cesium.Color.AQUAMARINE.withAlpha(0.3),
        outline: true,
        outlineColor: Cesium.Color.AQUAMARINE.withAlpha(0.5),
      })
      let three2 = this.c_viewer.entities.add({
        name: 'oneEllipsoid',
        position: position,
        ellipsoid: ellipsoid
      });

    },
    // 创建一个扫描扇形
    createAFanShape () {
      /**
        * @param {Object} viewer cesium 视图对象
        * @param {Material} custMaterial 自定义材质
        * @param {Number} speed 运动速度(为0停止扫描)
        * @param {Number} longitude 纬度
        * @param {Number} latitude 经度
        * @param {Number} alt 高度(z轴)
        * @param {String} direction 扫描方向（"-"顺时针，"+"逆时针）
       */
      const fanEntity = this.graphics.createFanShape({
        viewer: this.c_viewer,
        longitude: 104.06417395476578,
        latitude: 30.636185094244944,
        alt: 700,
        speed: 2.0,
        direction: '+',
        // custMaterial: Cesium.Color.AQUAMARINE.withAlpha(0.5)
        custMaterial: this.createCustMaterialWall(
          'static/data/images/Textures/b2.png',
          Cesium.Color.GOLD,
          2000,
          1.0,
          '+'
        )
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
