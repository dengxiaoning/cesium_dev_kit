<template>
  <div id="dataManageMap"
       class="map2d-container">

  </div>
</template>
<script lang="ts">
import { defineComponent, onMounted } from 'vue'
import MapHelper from './map2dHelper'
const MAPOBJ = new MapHelper()
export default defineComponent({
  name: 'v2dpage',
  setup() {
    onMounted(() => {
      // 初始化地图
      MAPOBJ.initMap('dataManageMap', { projection: 'EPSG:4326' })
    })
  }
})
</script>
<style lang="scss" scoped>
.map2d-container {
  height: 100%;
  .left-btn {
    position: absolute;
    right: 0;
    top: 46%;
    cursor: pointer;
    z-index: 1;
  }
}
</style>
