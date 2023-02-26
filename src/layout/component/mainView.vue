<template>
  <div class="h100" style="padding-top: 90px;">
    <router-view v-slot="{ Component }">
      <transition :name="setTransitionName" mode="out-in">
        <keep-alive :include="keepAliveNameList">
          <component :is="Component" :key="refreshRouterViewKey" class="w100" />
        </keep-alive>
      </transition>
    </router-view>
  </div>
</template>

<script lang="ts">
  import {
    computed,
    defineComponent,
    toRefs,
    reactive,
    getCurrentInstance,
    onBeforeMount,
    onUnmounted,
    nextTick
  } from 'vue'
  import { useRoute } from 'vue-router'
  import { useStore } from 'store/index'

  interface State {
    refreshRouterViewKey: string | null | number
    keepAliveNameList: Array<string>
    keepAliveNameNewList: Array<string>
  }

  export default defineComponent({
    name: 'layoutAppMain',
    setup() {
      // const { proxy } = getCurrentInstance() as any;
      // const route = useRoute();
      const store = useStore()

      const state = reactive<State>({
        refreshRouterViewKey: null,
        keepAliveNameList: [],
        keepAliveNameNewList: []
      })
      // 设置主界面切换动画
      const setTransitionName = computed(() => {
        return store.state.themeConfig.animation
      })
      // 获取布局配置信息
      // const getThemeConfig = computed(() => {
      // 	return store.state.themeConfig;
      // });
      // 获取组件缓存列表(name值)
      // const getKeepAliveNames = computed(() => {
      // 	return store.state.keepAliveNames.keepAliveNames;
      // });
      // 页面加载前，处理缓存，页面刷新时路由缓存处理
      onBeforeMount(() => {
        // state.keepAliveNameList = getKeepAliveNames.value;
        // proxy.mittBus.on('onTagsViewRefreshRouterView', (path: string) => {
        // 	if (route.path !== path) return false;
        // 	state.keepAliveNameList = getKeepAliveNames.value.filter((name: string) => route.name !== name);
        // 	state.refreshRouterViewKey = route.path;
        // 	nextTick(() => {
        // 		state.refreshRouterViewKey = null;
        // 		state.keepAliveNameList = getKeepAliveNames.value;
        // 	});
        // });
      })
      // 页面卸载时
      onUnmounted(() => {
        // proxy.mittBus.off('onTagsViewRefreshRouterView');
      })
      return {
        // getThemeConfig,
        // getKeepAliveNames,
        setTransitionName,
        ...toRefs(state)
      }
    }
  })
</script>
