<template>
  <el-container class="layout-container">
    <Aside />
    <el-container class="flex-center layout-backtop">
      <Header v-if="isFixedHeader" />
      <el-scrollbar ref="layoutDefaultsScrollbarRef">
        <Header v-if="!isFixedHeader" />
        <MainView />
      </el-scrollbar>
    </el-container>
    <el-backtop target=".layout-backtop"></el-backtop>
  </el-container>
</template>

<script lang="ts">
  import { computed, getCurrentInstance, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { useStore } from 'store/index'
  import Aside from '../component/aside.vue'
  import Header from '../component/header.vue'
  import MainView from '../component/mainView.vue'
  
  export default {
    name: 'layoutDefaults',
    components: { Aside, Header, MainView },
    setup() {
      const { proxy } = getCurrentInstance() as any
      const store = useStore()
      const route = useRoute()
  		const isFixedHeader = computed(() => {
        return store.state.themeConfig.isFixedHeader;
      });
      // 监听路由的变化
      watch(
        () => route.path,
        () => {
          proxy.$refs.layoutDefaultsScrollbarRef.wrap.scrollTop = 0
        }
      )
      return {
        isFixedHeader
      }
    }
  }
</script>
