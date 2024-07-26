<template>
  <div class="path-content">
    <div id="cesiumContainer"
         class="map3d-contaner"></div>
    <div class="plane-box">
      <div class="title">
        <h3>路线规划:</h3>
      </div>
      <div class="desc-opera">
        <p>绘制点操作介绍:</p>
        <p>1、左键点击获取位置信息</p>
        <p>2、右键点击结束选点</p>
      </div>
      <el-input v-model="startPos"
                style="max-width: 300px"
                placeholder="Please select point">
        <template #append><el-button @click="drawStartPoint">起点</el-button></template>
      </el-input>
      <el-input v-model="destinationPos"
                style="max-width: 300px;margin-top:5px;"
                placeholder="Please select point">
        <template #append><el-button @click="drawDestinationPoint">终点</el-button></template>
      </el-input>
      <div style="margin-top:5px;">
        <el-button plain
                   @click="computeDriverPath">驾车路线</el-button>
        <el-button plain
                   @click="computeWalkPath">步行路线</el-button>
        <el-button plain
                   @click="computeCyclePath">骑行路线</el-button>
        <el-button plain
                   @click="resetOpera">重置</el-button>
      </div>
      <div class="table-context">
        <el-table :data="pathPlanList"
                  :border="true"
                  style="width: 100%"
                  max-height="300">
          <el-table-column property="id"
                           align="center"
                           label="序号"
                           width="60">
          </el-table-column>
          <el-table-column property="content"
                           label="路线详情">
            <template #scope="scope">
              <div class="pathPlan-detail">
                <span>{{ scope.row.content }}</span>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>
<script >
import * as Cesium from 'cesium'
import { initCesium } from '@/utils/cesiumPluginsExtends/index'
let startMarkerObj, destinationMarkerObj;

let routes = [];
let colors = [
  Cesium.Color.fromCssColorString('#01C37C'),
  Cesium.Color.SPRINGGREEN,
  Cesium.Color.YELLOW,
  Cesium.Color.DODGERBLUE,
];
export default {
  data () {
    return {
      startPos: '',
      destinationPos: '',
      pathPlanList: []
    }
  },
  mounted () {
    this.initMap()
  },
  methods: {
    initMap () {
      const { viewer,
        material,
        plugin,
        graphics,
        draw } = new initCesium(
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
            imageryProvider: {
              type: "WebMapTileServiceImageryProvider",
              option: {
                url: "http://t0.tianditu.gov.cn/img_w/wmts?tk=65a5f62a964c1d5b23fa81bc34147973",
                layer: "img",
                style: "default",
                tileMatrixSetID: "w",
                format: "tiles",
                maximumLevel: 18,
              },
            },
            MapImageryList: [{
              type: "WebMapTileServiceImageryProvider",
              option: {
                url: "http://t0.tianditu.gov.cn/cia_w/wmts?tk=65a5f62a964c1d5b23fa81bc34147973",
                layer: "cia",
                style: "default",
                tileMatrixSetID: "w",
                format: "tiles",
                maximumLevel: 18,
              },
            }],
          })


      this.c_viewer = viewer;
      this.draw = draw;
      this.material = material;
      this.graphics = graphics;
      this.plugin = plugin;
      this.flyto();
    },
    /**
     * 绘制起点
     */
    drawStartPoint () {
      let $this = this;
      if (startMarkerObj) {
        this.draw._drawLayer.entities.remove(startMarkerObj);
        startMarkerObj = null;
        $this.startPos = '';
      }
      this.draw.drawPointGraphics({
        style: {
          image: 'static/data/images/file/start.png'
        },
        callback: function (pos, entityObj) {
          startMarkerObj = entityObj;
          $this.startPos = Number(pos[0]['lng']).toFixed(6) + "," + Number(pos[0]['lat']).toFixed(6);
        }
      })
    },
    /**
     * 绘制终点
     */
    drawDestinationPoint () {
      let $this = this;
      if (destinationMarkerObj) {
        this.draw._drawLayer.entities.remove(destinationMarkerObj);
        destinationMarkerObj = null;
        $this.destinationPos = '';
      }
      this.draw.drawPointGraphics({
        style: {
          image: 'static/data/images/file/end.png'
        },
        callback: function (pos, entityObj) {
          destinationMarkerObj = entityObj;
          $this.destinationPos = Number(pos[0]['lng']).toFixed(6) + "," + Number(pos[0]['lat']).toFixed(6);
        }
      })
    },
    // 步行
    computeWalkPath () {
      this.computePathPlan({
        type: 'walk',
        key: '8dc49b1fa65a79d306ef12dae4229842',
        url: "https://restapi.amap.com/v3/direction/walking"
      })
    },
    // 骑行
    computeCyclePath () {
      this.computePathPlan({
        type: 'cycle',
        key: '8dc49b1fa65a79d306ef12dae4229842',
        url: 'https://restapi.amap.com/v4/direction/bicycling'
      })
    },
    /**
    * 计算驾车路线
    */
    computeDriverPath () {
      this.computePathPlan({
        type: 'drive',
        key: '8dc49b1fa65a79d306ef12dae4229842',
        url: "https://restapi.amap.com/v5/direction/driving"
      })
    },
    /**
    * 计算步行、骑行路线
    */
    computePathPlan ({ type, key, url }) {
      this.clearOrgPath();
      this.pathPlanList = [];

      if (!this.startPos || !this.destinationPos) {
        this.$message.error("缺少点位数据！");
        return;
      }

      let startPoint = this.startPos.split(",");
      let endPoint = this.destinationPos.split(",");
      const queryParams = {
        origin: [Number(startPoint[0]), Number(startPoint[1])],
        destination: [Number(endPoint[0]), Number(endPoint[1])],
      }
      if (key) {
        queryParams['key'] = key;
      }
      if (url) {
        queryParams['url'] = url;
      }
      this.plugin.queryPathPlan(type, queryParams, restArr => {
        // 拿到结果转换后调用绘制路线
        this.createPath(restArr)
      }, err => { console.error(err) })
    },
    /**
     * 创建路线
     */
    createPath (restArr) {
      for (let index = 0; index < restArr.length; index++) {
        const item = restArr[index];
        const positions = this.graphics.lnglatArrayToCartesians(item.lnglats);
        const length = item.distance
        const countArrow = length / 350
        let route = this.graphics.createLineGraphics({
          positions: positions,
          oid: index,
          name: `方案${index + 1}`,
          width: 8,
          material: this.material.getCustomMaterialWall({
            image: 'static/data/images/Textures/ArrowTransparent.png',
            freely: 'cross',
            direction: '-',  // 顺时针
            count: countArrow,
            color: colors[index],
            duration: 5000,
          }),
          clampToGround: true,
        })

        let route1 = this.graphics.createLineGraphics({
          positions: positions,
          oid: 'base_' + index,
          name: `方案${index + 1}`,
          width: 12,
          material: colors[index],
          clampToGround: true,
        })
        if (route1) {
          routes.push(route1);
        }
        route.tooltip = `方案${index + 1}`
        if (route) {
          routes.push(route);
        }
        const inslength = item.instructions.length;
        for (let i = 0; i < inslength; i++) {
          this.pathPlanList.push({
            id: i + 1,
            content: item.instructions[i],
          });
        }

      }
    },
    resetOpera () {
      this.draw.removeAll();
      this.pathPlanList = [];
      this.startPos = "";
      this.destinationPos = "";
      this.clearOrgPath();
    },
    clearOrgPath () {
      routes.forEach(route => {
        if (route) {
          this.graphics._graphicsLayer.entities.remove(route)
        }
      });
      routes = [];
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
.path-content {
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
  .plane-box {
    width: 400px;
    padding: 6px 12px;
    position: absolute;
    top: 10px;
    left: 8px;
    border-radius: 8px;
    background: #213749;
    .title {
      color: #fff;
      margin-bottom: 4px;
    }
    .desc-opera {
      color: #fff;
    }
    .table-context {
      margin-top: 6px;
    }
    :deep(.el-input__wrapper) {
      background-color: transparent;
    }
    :deep(.el-input__inner) {
      border: none;
      color: #bdc2d0;
      font-weight: bold;
      background: transparent;
      color: #fff;
    }
    :deep(.el-input-group__append) {
      color: #fff;
      background-color: transparent;
    }
    :deep(.el-button) {
      color: #fff;
      background-color: transparent;
    }

    /* 重置表格样式 */
    :deep(.el-table) {
      background: transparent;
      color: #fff;
      thead {
        color: #fff;
      }
      tr {
        background-color: transparent;
      }
      th.el-table__cell {
        background: transparent;
      }
      td.el-table__cell,
      th.el-table__cell.is-leaf {
        border-color: #363d4b !important;
      }
      .el-table__inner-wrapper:before {
        border-color: #363d4b !important;
      }
    }
    :deep(.el-table--border, .el-table--group) {
      border-color: #363d4b !important;
    }
    :deep(.el-table::before) {
      background-color: #363d4b !important;
    }
    :deep(
        .el-table--border::after,
        .el-table--group::after,
        .el-table::before
      ) {
      background: transparent;
    }
    :deep(
        .el-table--enable-row-hover .el-table__body tr:hover > td.el-table__cell
      ) {
      background: transparent;
    }
    :deep(.el-table--border th.el-table__cell.gutter:last-of-type) {
      border-color: #363d4b !important;
    }
  }
}
</style>
