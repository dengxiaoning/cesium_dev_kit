<template>
  <div class="layout-navbars-container">
    <BreadcrumbIndex />
    <TagsView />
  </div>
</template>

<script lang="ts">
import BreadcrumbIndex from './breadcrumb/index.vue'
import TagsView from './tagsView/tagsView.vue'

export default {
  name: 'layoutNavBars',
  components: { BreadcrumbIndex, TagsView },
  setup() {
    return {}
  }
}
</script>

<style scoped lang="scss">
.layout-navbars-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}
</style>
