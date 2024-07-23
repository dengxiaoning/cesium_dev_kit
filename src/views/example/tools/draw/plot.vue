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
      <el-tag v-for="(item, idx) in menuData"
              :key="idx"
              class="text item"
              :class="activeId === item.value ? 'active' : ''"
              @click="caldDistain(item)">
        {{ item.label }}
      </el-tag>
    </el-card>
  </div>
</template>
<script>
import * as Cesium from 'cesium'
// import { initCesium } from '@/utils/cesiumPluginsExtends/index'
import { Draw } from '@/utils/cesiumPluginsExtends/singleImport'

export default {
  data () {
    return {
      activeId: 'pos',
      plotEntitiesId: [],
      menuData: [
        {
          label: '坐标点',
          value: 'coordinates'
        },
        {
          label: '线段',
          value: 'line'
        },
        {
          label: '多边形',
          value: 'polygon'
        },
        {
          label: '矩形',
          value: 'rectangle'
        },
        {
          label: '圆形',
          value: 'circular'
        },
        {
          label: '多边立方体',
          value: 'polygonCable'
        },
        {
          label: '四方体',
          value: 'Tetragonal'
        },
        {
          label: '圆柱体',
          value: 'cylinder'
        },
        {
          label: '围栏',
          value: 'enclosure'
        },
        {
          label: '球体',
          value: 'spherome'
        },
        {
          label: '圆锥',
          value: 'circularCone'
        },
        {
          label: '圆柱',
          value: 'circularColumn'
        },
        {
          label: '走廊',
          value: 'corridor'
        },
        {
          label: '管道',
          value: 'pipeline'
        },
        {
          label: '五角管道',
          value: 'fivePoint'
        },
        {
          label: '直角箭头',
          value: 'StraightArrow'
        },
        {
          label: '攻击箭头',
          value: 'AttackArrow'
        },
        {
          label: '钳击箭头',
          value: 'PincerArrow'
        },
        {
          label: '钳击箭头-修改',
          value: 'PincerArrowModify'
        },
        {
          label: '清除',
          value: 'clean'
        }
      ]
    }
  },
  mounted () {
    this.initMap()
  },
  methods: {
    // 添加地形数据
    async addWorldTerrainAsync (viewer) {
      try {
        const terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(1);
        viewer.terrainProvider = terrainProvider;
      } catch (error) {
        console.log(`Failed to add world imagery: ${error}`);
      }
    },
    initMap () {
      const drawObj = new Draw({
        cesiumGlobal: Cesium,
        containerId: 'cesiumContainer',
        viewerConfig: {
          infoBox: false,
          shouldAnimate: true,
        },
        extraConfig: {
          depthTest: true,
          AccessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmYzkwZWEwYy1mMmIwLTQwYjctOWJlOC00OWU4ZWU1YTZhOTkiLCJpZCI6MTIxODIsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1NjA0OTUyNDN9.wagvw7GxUjxvHXO6m2jjX5Jh9lN0UyTJhNGEcSm2pgE'
        },
        MapImageryList: [
          {
            type: 'UrlTemplateImageryProvider',
            option: {
              url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              subdomains: ['0', '1', '2', '3'],
              tilingScheme: new Cesium.WebMercatorTilingScheme()
            }
          }]
      })
      this.addWorldTerrainAsync(drawObj.viewer);
      this.c_viewer = drawObj.viewer
      this.draw = drawObj.draw
      this.draw.setDefSceneConfig()
      this.draw.setBloomLightScene()
      this.load3dTiles(drawObj.viewer)

      this.StraightArrowObj = drawObj.straightArrowObj
      this.AttackArrowObj = drawObj.attackArrowObj
      this.PincerArrowObj = drawObj.pincerArrowObj
    },
    load3dTiles (viewer) {
      var _self = this
      viewer.scene.sun.show = false
      viewer.scene.moon.show = false
      viewer.scene.skyAtmosphere.show = false

      var tilesets = viewer.scene.primitives.add(
        new Cesium.Cesium3DTileset({
          url: 'static/data/3DTiles/building/tileset.json'
        })
      )

      tilesets.readyPromise.then(function (tileset) {
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
        viewer.flyTo(tileset)
      })
    },
    caldDistain (item) {
      this.activeId = item.value
      if (item.label !== '钳击箭头-修改' && item.label !== '钳击箭头') {
        this.drawAgain();
      }
      switch (item.label) {
        case '坐标点':
          this.draw.drawPointGraphics()
          break
        case '线段':
          this.draw.drawLineGraphics()
          break
        case '多边形':
          this.draw.drawPolygonGraphics()
          break
        case '矩形':
          this.draw.drawRectangleGraphics()
          break
        case '圆形':
          this.draw.drawCircleGraphics()
          break

        case '多边立方体':
          this.draw.drawPolygonGraphics({ height: 200 })
          break
        case '四方体':
          this.draw.drawRectangleGraphics({ height: 200 })
          break
        case '圆柱体':
          this.draw.drawCircleGraphics({ height: 200 })
          break
        case '围栏':
          this.draw.drawWallGraphics()
          break
        case '球体':
          this.draw.drawEllipsoidGraphics()
          break
        case '圆锥':
          this.draw.drawCylinderGraphics({ topRadius: 1 })
          break
        case '圆柱':
          this.draw.drawCylinderGraphics()
          break
        case '走廊':
          this.draw.drawCorridorGraphics({ width: 100, height: 20, extrudedHeight: 200 })
          break
        case '管道':
          this.draw.drawPolylineVolumeGraphics()
          break
        case '五角管道':
          this.draw.drawPolylineVolumeGraphics({
            color: Cesium.Color.fromCssColorString("#FFD700"),
            shape: 'fivePoint',
            arms: 5,
            rOuter: 25,
            rInner: 50
          })
          break;
        case '直角箭头':
          this.AttackArrowObj.disable()
          this.PincerArrowObj.disable()
          this.StraightArrowObj.startDraw(entiteId => {
            this.plotEntitiesId.push(entiteId)
          })
          break
        case '攻击箭头':
          this.PincerArrowObj.disable()
          this.StraightArrowObj.disable()
          this.AttackArrowObj.startDraw(entiteId => {
            this.plotEntitiesId.push(entiteId)
          })
          break
        case '钳击箭头':
          this.StraightArrowObj.disable()
          this.AttackArrowObj.disable()
          this.PincerArrowObj.startDraw(entiteId => {
            this.plotEntitiesId.push(entiteId)
          })
          break
        case '钳击箭头-修改':
          // this.StraightArrowObj.disable()
          // this.AttackArrowObj.disable()
          this.PincerArrowObj.startModify()
          break
        case '清除':
          this.draw._drawLayer.entities.removeAll()
          this.plotEntitiesId.forEach(e => {
            this.c_viewer.entities.removeById(e)
          })
          break
      }
    },
    drawAgain () {
      this.PincerArrowObj.disable()
      this.StraightArrowObj.disable()
      this.AttackArrowObj.disable()
    }
  },
  beforeUnmount () {
    this.c_viewer = null
    this.drawObj = null
  }
}
</script>
<style lang="scss" scoped>
.sky-box {
  position: relative;
}
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
