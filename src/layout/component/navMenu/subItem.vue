<template>
  <template v-for="(val,index) in chils"
            :key="index">
    <el-submenu :index="resolvePath(val.path)"
                :key="val.path"
                v-if="val.children && val.children.length > 0">
      <template #title>
        <CIcon :icon-class="val.meta.icon" />
        <span>{{ val.meta.title }}</span>
      </template>
      <sub-item :chil="val.children"
                :parent-path="resolvePath(val.path)" />
    </el-submenu>
    <el-menu-item :index="resolvePath(val.path)"
                  :key="val.path"
                  v-else>
      <template v-if="!val.meta.isLink">
        <CIcon :icon-class="val.meta.icon ? val.meta.icon : ''" />
        <span>{{ val.meta.title }}</span>
      </template>
      <template v-else>
        <a :href="val.meta.isLink"
           target="_blank">
          <CIcon :icon-class="val.meta.icon ? val.meta.icon : ''" />
          {{ val.meta.title }}
        </a>
      </template>
    </el-menu-item>
  </template>
</template>

<script lang="ts">
import path from 'path-browserify'
import type { PropType } from 'vue'
import type { Menu } from 'store/interface/index'
import { computed, defineComponent } from 'vue'
import { Utils } from '@/utils/index'

export default defineComponent({
  name: 'navMenuSubItem',
  props: {
    chil: {
      type: Array as PropType<Menu[]>,
      default: () => []
    },
    parentPath: {
      type: String,
      default: ''
    }
  },
  setup(props) {
    // 获取父级菜单数据
    const chils = computed(() => {
      return props.chil
    })
    const resolvePath = (routePath: string) => {
      if (Utils.isExternal(routePath)) {
        return routePath
      }
      if (Utils.isExternal(props.parentPath)) {
        return props.parentPath
      }
      const respath = path.resolve(props.parentPath, routePath)
      return respath
    }
    return {
      chils,
      resolvePath
    }
  }
})
</script>
