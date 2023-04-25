<template>
  <div class="inner-page">
    <div id="cesiumContainer"
         class="map3d-contaner"></div>
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>控制面板</span>
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
import { initCesium } from '@/utils/cesiumPluginsExtends/index'
let ctrlManualFlag = {
  selected: false,
  leftDown: false
}
export default {
  data() {
    return {
      activeId: 'move',
      plotEntitiesId: [],
      menuData: [
        {
          label: '平移',
          value: 'move'
        },
        {
          label: '旋转',
          value: 'rotate'
        },
        {
          label: '缩放',
          value: 'scale'
        }]
    }
  },
  mounted() {
    this.initMap()
  },
  methods: {
    initMap() {
      const { viewer, graphics, control } = new initCesium(
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


      this.c_viewer = viewer;
      this.graphics = graphics;
      this.control = control;


      this.initModel(viewer);

    },
    initModel(viewer) {
      const entity = this.graphics.createBoxGraphics({
        position: Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883, 0.0),
        name: "box",
        box: {
          dimensions: new Cesium.Cartesian3(500.0, 500.0, 500.0),//尺寸，长宽高
          material: new Cesium.ColorMaterialProperty((new Cesium.CallbackProperty(() => {
            if (ctrlManualFlag.selected && ctrlManualFlag.leftDown) {
              return Cesium.Color.GREENYELLOW.withAlpha(0.5)
            }
            return Cesium.Color.WHITE;
          }, false))),
        }
      })
      viewer.flyTo(entity)
      this.initMouseEvent(entity)
    },
    initMouseEvent(entity) {
      this.control.definedMouseEvent({ targetEntity: entity, ctrlFlag: ctrlManualFlag })
    },
    caldDistain(item) {
      this.activeId = item.value
      switch (item.value) {
        case 'move':
          this.control.manualMoveModel(item.value);
          break
        case 'rotate':
          this.control.manualRotateModel(item.value);
          break
        case 'scale':
          this.control.manualScaleModel(item.value);
          break
      }
    },
  },
  beforeUnmount() {
    // 清除绑定的事件
    this.graphics.removeHandlerByName(['LEFT_CLICK', 'MOUSE_MOVE', 'LEFT_DOWN', 'LEFT_UP', 'WHEEL']);
    this.c_viewer = null;
    this.graphics = null;
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
