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
let selected = false
let leftDown = false;
let pickedObject;
let entity;
let mode = null;
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
      const { viewer, graphics, } = new initCesium(
        Cesium,
        'cesiumContainer',
        {
          infoBox: false,
          shouldAnimate: true
        },
        []
      )


      this.c_viewer = viewer
      this.graphics = graphics

      this.definedMouseEvent()
      this.initModel(viewer);
    },
    initModel(viewer) {
      entity = this.graphics.createBoxGraphics({
        position: Cesium.Cartesian3.fromDegrees(-75.59777, 40.03883, 0.0),
        name: "box",
        box: {
          dimensions: new Cesium.Cartesian3(500.0, 500.0, 500.0),//尺寸，长宽高
          material: new Cesium.ColorMaterialProperty((new Cesium.CallbackProperty(() => {
            if (selected && leftDown) {
              return Cesium.Color.GREENYELLOW.withAlpha(0.5)
            }
            return Cesium.Color.WHITE;
          }, false))),
        }
      })
      viewer.flyTo(entity)
    },
    definedMouseEvent() {
      this.graphics.bindHandelEvent({
        leftDown: this.defLeftDown,
        mouseMove: this.defMouseMove,
        mouseWheel: this.defMouseWheel,
        leftUp: this.defLeftUp
      });
    },
    defMouseMove(movement) {
      const viewer = this.c_viewer;
      if (leftDown && pickedObject) {
        //鼠标在场景中移动的位置
        let ray = viewer.camera.getPickRay(movement.endPosition);
        //鼠标在移动过程中与三维场景中移动的坐标位置
        let cartesian = viewer.scene.globe.pick(ray, viewer.scene);
        //改变鼠标样式
        document.body.style.cursor = 'pointer';
        if (pickedObject && pickedObject.id && mode === "move") {
          //获取到物体当前的位置
          let currentTime = Cesium.JulianDate.fromDate(new Date())
          let positionC3 = entity.position.getValue(currentTime)
          let catographic = Cesium.Cartographic.fromCartesian(positionC3);
          let height = Number(catographic.height.toFixed(3));
          //动态回调改变物体的位置
          entity.position = new Cesium.CallbackProperty(() => {
            let cartographic = viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian);
            let longitude = Cesium.Math.toDegrees(cartographic.longitude);
            let latitude = Cesium.Math.toDegrees(cartographic.latitude);
            let position = Cesium.Cartesian3.fromDegrees(longitude, latitude, height)
            return position;
          }, false);
        } else if (pickedObject && pickedObject.id && mode === "rotate") {
          let currentTime = Cesium.JulianDate.fromDate(new Date())
          let center = entity.position.getValue(currentTime)

          //获取鼠标移动起始位置与地球球面求交的开始位置和结束位置
          let start = viewer.scene.camera.pickEllipsoid(movement.startPosition)
          let end = viewer.scene.camera.pickEllipsoid(movement.endPosition);

          //计算旋转轴
          const vector2 = Cesium.Cartesian3.subtract(center, end, new Cesium.Cartesian3());
          //归一化
          const normal = Cesium.Cartesian3.normalize(vector2, new Cesium.Cartesian3());

          //计算起始点的旋转角度
          let startNormal = Cesium.Cartesian3.subtract(start, center, new Cesium.Cartesian3())
          let endNormal = Cesium.Cartesian3.subtract(end, center, new Cesium.Cartesian3())
          let angleBetween = Cesium.Cartesian3.angleBetween(startNormal, endNormal);
          //旋转因子
          const rotate = 100
          //计算出朝向
          const quaternion = Cesium.Quaternion.fromAxisAngle(normal, angleBetween * rotate)
          entity.orientation = quaternion
        }
      }
    },
    defLeftDown(movement) {
      //选中物体
      pickedObject = this.c_viewer.scene.pick(movement.position);
      if (Cesium.defined(pickedObject) && mode) {
        //选中
        selected = true;
        leftDown = true;
      } else {
        selected = false;
      }
    },
    defMouseWheel(movement) {
      if (pickedObject && pickedObject.id && mode === "scale") {
        //计算出当前盒子的尺寸
        let currentTime = Cesium.JulianDate.fromDate(new Date())
        let dimensions = entity.box.dimensions.getValue(currentTime)
        //计算缩放因子
        let scale = movement > 0 ? 2 : 0.5
        entity.box.dimensions = new Cesium.CallbackProperty(() => {
          let cartesian3 = Cesium.Cartesian3.multiplyByScalar(dimensions, scale, new Cesium.Cartesian3());
          return cartesian3
        }, false)
      }
    },
    defLeftUp(movement) {
      leftDown = false;
      document.body.style.cursor = 'default';
    },
    caldDistain(item) {
      this.activeId = item.value
      mode = item.value;
      switch (item.value) {
        case 'move':
          //锁定相机
          this.c_viewer.scene.screenSpaceCameraController.enableRotate = false;
          this.c_viewer.scene.screenSpaceCameraController.enableZoom = true;
          break
        case 'rotate':
          //锁定相机
          this.c_viewer.scene.screenSpaceCameraController.enableRotate = false;
          this.c_viewer.scene.screenSpaceCameraController.enableZoom = true;
          break
        case 'scale':
          this.c_viewer.scene.screenSpaceCameraController.enableZoom = false;
          break
      }
    },
  },
  beforeUnmount() {
    this.c_viewer = null
    this.graphics = null
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
