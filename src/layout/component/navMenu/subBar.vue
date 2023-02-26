<template>
  <el-menu router
           background-color="transparent"
           :collapse="setIsCollapse"
           :default-active="defaultActive"
           :unique-opened="getThemeConfig.isUniqueOpened"
           :collapse-transition="false">
    <template v-for="(val,index) in menuLists"
              :key="index">
      <el-submenu :index="val.path"
                  v-if="val.children && val.children.length > 0"
                  :key="val.path">
        <template #title>
          <CIcon :icon-class="val.meta.icon ? val.meta.icon : ''" />
          <span>{{ val.meta.title }}</span>
        </template>
        <SubItem :chil="val.children"
                 :parent-path="val.path" />
      </el-submenu>

      <el-menu-item :index="val.path"
                    :key="val.path"
                    v-else>
        <CIcon :icon-class="val.meta.icon ? val.meta.icon : ''" />
        <template #title
                  v-if="!val.meta.isLink">
          <span>{{ val.meta.title }}</span>
        </template>
        <template #title
                  v-else>
          <a :href="val.meta.isLink"
             target="_blank">
            {{ val.meta.title }}
          </a>
        </template>
      </el-menu-item>
    </template>
  </el-menu>
</template>

<script lang="ts">
import type { PropType } from 'vue'
import type { Menu } from 'store/interface/index'
import { ref, toRefs, reactive, computed, defineComponent,  } from 'vue'
import { useRoute, onBeforeRouteUpdate } from 'vue-router'
import { useStore } from 'store/index'
import SubItem from './subItem.vue'
export default defineComponent({
  name: 'navMenuSubBar',
  components: { SubItem },
  props: {
    menuList: {
      type: Array as PropType<Menu[]>,
      require: true
    }
  },
  setup(props) {
    const store = useStore()
    const route = useRoute()
    const state = reactive({
      defaultActive: route.path
    })
    // 获取父级菜单数据
    const menuLists = computed(() => props.menuList)

    // 获取布局配置信息
    const getThemeConfig = computed(() => store.state.themeConfig)

    // 设置菜单的收起/展开
    const setIsCollapse = computed(() =>
      document.body.clientWidth < 1000
        ? false
        : store.state.themeConfig.isCollapse
    )

    // 路由更新时
    onBeforeRouteUpdate((to) => {
      state.defaultActive = to.path
      const clientWidth = document.body.clientWidth
      if (clientWidth < 1000) getThemeConfig.value.isCollapse = false
    })

    return {
      getThemeConfig,
      menuLists,
      setIsCollapse,
      ...toRefs(state)
    }
  }
})
</script>
