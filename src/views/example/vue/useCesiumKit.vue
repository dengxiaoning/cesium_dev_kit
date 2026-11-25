<template>
  <div>
    <div id="cesiumContainer" class="map3d-contaner"></div>
    <div v-if="error" class="error">初始化失败：{{ error.message }}</div>
  </div>
</template>

<script setup lang="ts">
import * as Cesium from 'cesium'
import { watch } from 'vue'
import { useCesiumKit } from '@/utils/cesiumPluginsExtends/vue'

// 演示站专用 token；业务项目请替换为自己的 Cesium Ion token
Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN as string

// 组件挂载时创建 kit，卸载时自动 dispose，无需手动清理
const { kit, viewer, ready, error } = useCesiumKit({
  Cesium,
  containerId: 'cesiumContainer',
  viewerConfig: { infoBox: false, shouldAnimate: true }
})

watch(ready, (ok) => {
  if (!ok || !kit.value) return
  // 画一个面，并飞到目标位置
  kit.value.graphics.createPolygonGraphics({
    positions: Cesium.Cartesian3.fromDegreesArray([
      104.09, 30.65, 104.12, 30.65, 104.11, 30.62
    ]),
    material: Cesium.Color.DEEPSKYBLUE.withAlpha(0.4),
    clampToGround: true
  })
  viewer.value?.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(104.10, 30.635, 9000)
  })
})
</script>

<style lang="scss" scoped>
.map3d-contaner {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.error {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: #c62828;
  color: #fff;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
}
</style>
