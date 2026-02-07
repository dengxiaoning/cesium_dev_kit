<template>
  <div class="con-box">
    <div class="cesium-box" ref="refmap"></div>
    <div class="select-box">
      <div class="select-left-box box">
        <span class="til">左侧影像: </span>
        <el-select v-model="leftTimeVal" placeholder="Select" :popper-append-to-body="false" popper-class="myDropdown" @change="leftSelectChange">
          <el-option v-for="item in leftTime" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </div>
      <div class="select-right-box box">
        <span class="til">右侧影像: </span>
        <el-select v-model="rightTimeVal" placeholder="Select" :popper-append-to-body="false" popper-class="myDropdown" @change="rightSelectChange">
          <el-option v-for="item in leftTime" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </div>
    </div>
    <div class="split-box">
      <div id="splitSlider" class="split-silder">
        <div class="split-silder-box"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import * as Cesium from 'cesium';
import { initCesium } from '@/utils/cesiumPluginsExtends/index'

let viewerObj, imgLayerObj, imageryLayer, baseLayerObj, baseLayer, baseComponent;
const refmap = ref();
const leftTimeVal = ref('midnight');
const rightTimeVal = ref('dark');

const leftTime = [
  {
    label: 'midnight',
    value: 'midnight',
  },
  {
    label: 'dark',
    value: 'dark',
  },
  {
    label: 'googlelite',
    value: 'googlelite',
  },
  {
    label: 'redalert',
    value: 'redalert',
  }];

const tileLables = Object.keys(new Array(20).fill(0)).map(
  (v) => parseInt(v) + 1,
);
const leftSelectChange = function (val) {
  const commonOption = { url: 'https://api.map.baidu.com/customimage/tile?udt=20181205&scale=1&ak=1XjLLEhZhQNUzd93EjU5nOGQ' };
  viewerObj.imageryLayers.remove(imageryLayer);
  imageryLayer = new Cesium.Scene.BaiduImageryProvider({
    ...commonOption,
    style: val
  })

  imageryLayer.alpha = 1.0; // 设置透明度为完全不透明
  imgLayerObj = viewerObj.imageryLayers.addImageryProvider(imageryLayer);
  imgLayerObj.splitDirection = Cesium.SplitDirection.LEFT;
};
const rightSelectChange = function (val) {
  const commonOption = { url: 'https://api.map.baidu.com/customimage/tile?udt=20181205&scale=1&ak=1XjLLEhZhQNUzd93EjU5nOGQ' };
  viewerObj.imageryLayers.remove(baseLayer);
  baseLayer = new Cesium.Scene.BaiduImageryProvider({
    ...commonOption,
    style: val
  })

  // 设置基础图层透明度
  baseLayer.alpha = 0.9; // 稍微有些透明，便于观察分割效果
  baseLayerObj = viewerObj.imageryLayers.addImageryProvider(baseLayer);
  baseLayerObj.splitDirection = Cesium.SplitDirection.RIGHT;
};
const initMap = () => {
  const { viewer, control, base, graphics } = new initCesium({
    cesiumGlobal: Cesium,
    containerId: refmap.value,
    viewerConfig: {
      infoBox: false,
      shouldAnimate: true,
    },
    extraConfig: {
      depthTest: true,
      AccessToken:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmYzkwZWEwYy1mMmIwLTQwYjctOWJlOC00OWU4ZWU1YTZhOTkiLCJpZCI6MTIxODIsInNjb3BlcyI6WyJhc3IiLCJnYyJdLCJpYXQiOjE1NjA0OTUyNDN9.wagvw7GxUjxvHXO6m2jjX5Jh9lN0UyTJhNGEcSm2pgE',
    },
    MapImageryList: [],
  });
  baseComponent = base;
  // 创建查看器
  viewerObj = viewer;
  // 加载左侧视图
  leftSelectChange('midnight');
  console.log('loading left image.');

  // 加载右侧视图
  rightSelectChange('dark');
  console.log('loading right image.');

  registerLeftEvent();

  // 初始化滑块位置
  const slider = document.getElementById('splitSlider');
  // 从滑块当前位置设置场景分割位置
  viewer.scene.splitPosition =
    slider.offsetLeft / slider.parentElement.offsetWidth;
  slider.style.left = '50%';

  // 创建事件处理器来处理滑块拖动
  const handler = new Cesium.ScreenSpaceEventHandler(slider);
  let moveActive = false;

  // 处理移动事件
  function move (movement) {
    if (!moveActive) {
      return;
    }

    // 计算相对偏移
    const relativeOffset = movement.endPosition.x;
    // 计算新的分割位置
    const splitPosition = Math.max(
      0,
      Math.min(
        1,
        (slider.offsetLeft + relativeOffset) / slider.parentElement.offsetWidth,
      ),
    );

    // 更新滑块位置和场景分割位置
    slider.style.left = `${100.0 * splitPosition}%`;
    viewer.scene.splitPosition = splitPosition;
  }

  // 鼠标按下开始拖动
  handler.setInputAction(function () {
    moveActive = true;
  }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

  // 触摸开始拖动
  handler.setInputAction(function () {
    moveActive = true;
  }, Cesium.ScreenSpaceEventType.PINCH_START);

  // 鼠标移动
  handler.setInputAction(move, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  // 触摸移动
  handler.setInputAction(move, Cesium.ScreenSpaceEventType.PINCH_MOVE);

  // 鼠标释放结束拖动
  handler.setInputAction(function () {
    moveActive = false;
  }, Cesium.ScreenSpaceEventType.LEFT_UP);

  // 触摸释放结束拖动
  handler.setInputAction(function () {
    moveActive = false;
  }, Cesium.ScreenSpaceEventType.PINCH_END);

  viewerObj.camera.flyTo({
    destination: {
      "x": -1339806.522417923,
      "y": 5342127.704209544,
      "z": 3238244.511395003
    },
    duration: 5, // 飞行持续时间(秒)
    orientation: {
      "heading": 0.04046959012132323,
      "pitch": -1.420234741628971,
      "roll": 0.000031773228459819336
    },
  });
};

// 注册一个右键点击事件，获取点击的位置信息
const registerLeftEvent = () => {
  baseComponent.bindHandelEvent({
    leftClick: function click (event, _handlers) {
      const { wgs84Coor, graphicCoor, cameraPosition } = baseComponent.getHandlerClickPosition(event);
      console.log(wgs84Coor, graphicCoor, cameraPosition);
    }
  })
}
onMounted(() => {
  initMap();
});
</script>
<style lang="scss" scoped>
.con-box {
  width: 100%;
  height: 100vh;
  position: relative;
  margin: 0;
  padding: 0;
  overflow: hidden;
  .cesium-box {
    width: 100%;
    height: 100%;
  }
  .select-box {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    display: flex;
    padding: 6px 0px;
    justify-content: space-around;
    align-content: center;
    .til {
      margin-right: 8px;
    }
    .box {
      width: 220px;
      display: flex;
      color: #fff;
      align-items: center;
      padding: 6px;
      background-color: rgba(63, 72, 84, 0.8);
      border-radius: 4px;
      :deep(.el-select) {
        width: 120px !important;

        .el-select__wrapper {
          color: #fff;
          background-color: rgba(63, 72, 84, 0.8);
        }
        .el-select__placeholder {
          color: #fff;
        }
      }
    }
  }
  .split-box {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .split-silder {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 4px;
    background: white;
    pointer-events: auto;
    left: 50%;
    transform: translateX(-50%);
    cursor: ew-resize;
    .split-silder-box {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      -webkit-transform: translateY(-50%);
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.7);
      left: 50%;
      transform: translate(-50%, -50%);
      cursor: ew-resize;
    }
  }
}
</style>
<style lang="scss">
.myDropdown {
  .el-select-dropdown {
    color: #ffffff;
    background-color: rgba(63, 72, 84, 0.8);
    border: 0;
  }
  .el-select-dropdown__item {
    color: #ffffff;
    background-color: rgba(63, 72, 84, 0.8);
  }
  .el-select-dropdown__item.hover,
  .el-select-dropdown__item:hover {
    color: rgb(21, 94, 38);
    background: rgba(87, 133, 87, 0.3);
  }
  .el-select-dropdown__item.selected {
    color: rgb(21, 94, 38);
    background: rgba(87, 133, 87, 0.3);
  }
  .el-popper .popper__arrow,
  .el-popper .popper__arrow::after {
    display: none;
  }
}
</style>
