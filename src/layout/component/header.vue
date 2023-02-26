<template>
  <el-header class="layout-header"
             height="50"
             :style="{'position': 'fixed','width': '100%','z-index': '2','padding':'0',
              'padding-right':isCollapseWidth?'64px':'200px'}">
    <NavBarsIndex />
  </el-header>
</template>

<script lang="ts">
import { computed, reactive, toRefs, watch } from 'vue'
import { useStore } from 'store/index'
import NavBarsIndex from './navBars/index.vue'
interface State {
  isCollapseWidth: boolean
}
export default {
  name: 'layoutHeader',
  components: { NavBarsIndex },
  setup() {
    const store = useStore()
    const state = reactive<State>({
      isCollapseWidth: store.state.themeConfig.isCollapse
    })
    watch(
      () => store.state.themeConfig.isCollapse,
      (newProps, oldProps) => {
        state.isCollapseWidth = newProps
      }
    )

    // 设置 header 的高度
    // const setHeaderHeight = computed(() => {
    // 	let { isTagsview, layout } = store.state.themeConfig;
    // 	if (isTagsview && layout !== 'classic') return '84px';
    // 	else return '50px';
    // });

    return {
      // setHeaderHeight,
      ...toRefs(state)
    }
  }
}
</script>

