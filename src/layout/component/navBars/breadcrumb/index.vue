<template>
  <div class="layout-navbars-breadcrumb-index">
    <Breadcrumb />
  </div>
</template>

<script lang="ts">
import {
  computed,
  reactive,
  toRefs,
  onMounted,
  onUnmounted,
  getCurrentInstance,
  watch
} from 'vue'
import type { AppRouteRecordRaw } from 'store/interface/index'
import { useRoute } from 'vue-router'
import { useStore } from 'store/index'
import Breadcrumb from '../breadcrumb/breadcrumb.vue'

export default {
  name: 'layoutBreadcrumbIndex',
  components: { Breadcrumb },
  setup() {
    const { proxy } = getCurrentInstance() as any
    const store = useStore()
    const route = useRoute()
    const state: any = reactive({
      menuList: []
    })
    // 获取布局配置信息
    const getThemeConfig = computed(() => {
      return store.state.themeConfig
    })

    // 路由过滤递归函数
    const filterRoutesFun = (arr: Array<AppRouteRecordRaw>) => {
      return arr
        .filter((item: AppRouteRecordRaw) => !item.meta.isHide)
        .map((item: AppRouteRecordRaw) => {
          item = Object.assign({}, item)
          if (item.children) item.children = filterRoutesFun(item.children)
          return item
        })
    }
    // 页面加载时
    onMounted(() => {
      // setFilterRoutes();
      // proxy.mittBus.on('getBreadcrumbIndexSetFilterRoutes', () => {
      // 	setFilterRoutes();
      // });
    })
    // 页面卸载时
    onUnmounted(() => {
      proxy.mittBus.off('getBreadcrumbIndexSetFilterRoutes')
    })
    return {
      getThemeConfig,
      // setIsShowLogo,
      // isLayoutTransverse,
      ...toRefs(state)
    }
  }
}
</script>

<style scoped lang="scss">
.layout-navbars-breadcrumb-index {
  height: 50px;
  display: flex;
  align-items: center;
  padding-right: 15px;
  background: var(--bg-topBar);
  overflow: hidden;
  border-bottom: 1px solid #f1f2f3;
}
</style>
