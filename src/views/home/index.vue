<template>
  <div>
    <example-czm />
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import exampleCzm from '../example/primitive/heatmap3d.vue'

export default defineComponent({
  name: 'App',
  components: {
    exampleCzm
  }
})
</script>

