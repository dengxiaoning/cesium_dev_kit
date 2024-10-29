<template>
  <div id="cesiumContainer"
       class="map3d-contaner"></div>
</template>
<script >
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'


export default {
  mounted () {
    this.initMap()
  },
  methods: {
    async initMap () {
      const {
        viewer,
        material,
        graphics,
        math3d } = new initCesium({
          cesiumGlobal: Cesium,
          containerId: 'cesiumContainer',
          viewerConfig: {
            infoBox: false,
            shouldAnimate: true,
          },
          MapImageryList: []
        })


      this.c_viewer = viewer;

      this.material = material;
      this.graphics = graphics;
      this.math3d = math3d;

      this.material.setDefSceneConfig()
      this.material.setBloomLightScene()
      let tiles = await Cesium.Cesium3DTileset.fromUrl('static/data/3DTiles/building/tileset.json');
      let tileset = this.c_viewer.scene.primitives.add(tiles)
      tileset.style = new Cesium.Cesium3DTileStyle({
        color: {
          conditions: [
            ["${height} >= 300", "rgba(0, 149, 251, 0.3)"],
            ["${height} >= 200", "rgb(0, 149, 251, 0.3)"],
            ["${height} >= 100", "rgb(0, 149, 251, 0.3)"],
            ["${height} >= 50", "rgb(0, 149, 251, 0.3)"],
            ["${height} >= 25", "rgb(0, 149, 251, 0.3)"],
            ["${height} >= 10", "rgb(0, 149, 251, 0.3)"],
            ["${height} >= 5", "rgb(0, 149, 251, 0.3)"],
            ["true", "rgb(0, 149, 251, 0.3)"]
          ]
        }
      })

      this.flyto();

      this.createModel();
    },
    flyto () {
      this.material.flyTo({
        position: { x: -1337132.0092982147, y: 5330611.474631115, z: 3228680.029449292 },
        orientation: {
          heading: Cesium.Math.toRadians(1.0114629015290062),
          pitch: Cesium.Math.toRadians(-23.53661660731824),
          roll: Cesium.Math.toRadians(0.00324596311071617)
        }
      })
    },
    createModel () {
      var ellipse = this.math3d.computeEllipseEdgePositions({
        semiMinorAxis: 500,
        semiMajorAxis: 500,
        rotation: 0,
        center: Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 50),
        granularity: Math.PI / 150.0//间隔
      })

      let positions = [], index = 0
      for (let i = 0; i < ellipse.outerPositions.length; i += 3) {
        let cartesian = new Cesium.Cartesian3(ellipse.outerPositions[i], ellipse.outerPositions[i + 1], ellipse.outerPositions[i + 2]);
        positions.push(cartesian)
      }
      this.intevalRotatePlane(positions)
      this.graphics.craeteRotatePlaneGraphics({
        positions: positions,
        center: Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 50),
        image: 'static/data/images/Textures/b2.png',
        dimensions: new Cesium.Cartesian2(200.0, 100.0),
      })

    },
    intevalRotatePlane (positions) {
      setTimeout(() => {
        this.graphics.craeteRotatePlaneGraphics({
          positions: positions,
          center: Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 50),
          image: 'static/data/images/Textures/b4.png',
          dimensions: new Cesium.Cartesian2(200.0, 100.0),
        })

        setTimeout(() => {
          this.graphics.craeteRotatePlaneGraphics({
            positions: positions,
            center: Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 50),
            image: 'static/data/images/Textures/g_1_t_0.png',
            dimensions: new Cesium.Cartesian2(200.0, 100.0),
          })

          setTimeout(() => {
            this.graphics.craeteRotatePlaneGraphics({
              positions: positions,
              center: Cesium.Cartesian3.fromDegrees(104.081701757991, 30.627042558105988, 50),
              image: 'static/data/images/Textures/movingRiver.png',
              dimensions: new Cesium.Cartesian2(200.0, 100.0),
            })
          }, 1000)
        }, 1200)
      }, 1500)
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
