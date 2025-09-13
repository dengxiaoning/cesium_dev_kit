<template>
  <div class="layout-navbars-tagsview" :class="{
      'layout-navbars-tagsview-shadow': getThemeConfig.layout === 'classic'
    }">
    <el-scrollbar ref="scrollbarRef" @wheel.prevent="onHandleScroll">
      <ul class="layout-navbars-tagsview-ul tags-style-one" ref="tagsUlRef">
        <li v-for="(v, k) in tagsViewList" :key="k" class="layout-navbars-tagsview-ul-li" :data-name="v.name" :class="{ 'is-active': isActive(v.path) }" @click="onTagsClick(v, k)" :ref="
            (el) => {
              if (el) tagsRefs[k] = el
            }
          ">
          <i class="iconfont icon-webicon318 layout-navbars-tagsview-ul-li-iconfont font14" v-if="isActive(v.path)"></i>
          <i class="layout-navbars-tagsview-ul-li-iconfont" :class="v.meta.icon" v-if="!isActive(v.path) && getThemeConfig.isTagsviewIcon"></i>
          <span>{{ v.meta.title }}</span>
          <template v-if="isActive(v.path) && tagsViewList.length>1 ">
            <i class="el-icon-close layout-navbars-tagsview-ul-li-icon layout-icon-active" v-if="!v.meta.isAffix" @click.stop="closeCurrentTagsView(v.path)"></i>
          </template>
          <i class="el-icon-close layout-navbars-tagsview-ul-li-icon layout-icon-three" v-if="!v.meta.isAffix" @click.stop="closeCurrentTagsView(v.path)"></i>
        </li>
      </ul>
    </el-scrollbar>
  </div>
</template>

<script lang="ts">
import {
  toRefs,
  reactive,
  onMounted,
  computed,
  ref,
  nextTick,
  onBeforeUpdate,
  onBeforeMount,
  onUnmounted,
  getCurrentInstance,
  watch
} from 'vue'
import {
  useRoute,
  useRouter,
  onBeforeRouteUpdate,
  RouteLocationNormalized,
  onBeforeRouteLeave
} from 'vue-router'
import type { Menu } from 'store/interface/index'
import { useStore } from 'store/index'
import { setSession, removeSession } from '@/utils/localCache'

import { ElScrollbar, Close } from 'element-plus'

interface State {
  routePath: string
  tagsRefsIndex: number
  tagsViewList: Array<Menu>
  sortable: string
  tagsViewRoutesList: Menu[]
}
export default {
  name: 'layoutTagsView',
  components: {},
  setup() {
    const { proxy } = getCurrentInstance() as any
    const tagsRefs = ref<ElRef[]>([])
    const scrollbarRef = ref<InstanceType<typeof ElScrollbar>>()
    const tagsUlRef = ref<ElRef>(null)
    const store = useStore()
    const route = useRoute()
    const router = useRouter()

    const state = reactive<State>({
      routePath: route.path,
      tagsRefsIndex: 0,
      tagsViewList: [],
      sortable: '',
      tagsViewRoutesList: []
    })

    const sessionkey: string = store.state.tagsViewRoutes.tagsSession
    // 获取布局配置信息
    const getThemeConfig = computed(() => {
      return store.state.themeConfig
    })

    // 存储 tagsViewList 到浏览器临时缓存中，页面刷新时，保留记录
    const addBrowserSetSession = (tagsViewList: Array<Menu>) => {
      setSession(sessionkey, tagsViewList)
    }

    /**
     * 获取 vuex 中的 tagsViewRoutes 列表
     * fromOnmount 来自onmount
     */
    const getTagsViewRoutes = (fromOnmount?: boolean) => {
      state.routePath = route.path
      state.tagsViewList = []
      if (!store.state.themeConfig.isCacheTagsView) removeSession(sessionkey)
      state.tagsViewRoutesList = store.state.tagsViewRoutes.tagsViewRoutes
      if (fromOnmount) {
        state.tagsViewList = store.state.tagsViewRoutes.tagsViewRoutes
      } else {
        addTagsView(route)
      }
    }

    // 1、添加 tagsView：未设置隐藏（isHide）也添加到在 tagsView 中
    const addTagsView = (routeAgr: any) => {
      if (state.tagsViewList.some((v) => v.path === routeAgr.path)) return false

      /**
       * 【notice】
       * The following notation will throw an "Avoid app logic that relies on enumerating keys on a component instance.
       * The keys will be empty in production mode to avoid performance overhead." exception.
       */
      // const remRef = JSON.parse(JSON.stringify(routeAgr ))
      const { name, path, component, meta, children } = routeAgr
      const remRef = JSON.parse(
        JSON.stringify({ name, path, component, meta, children })
      )
      const ff = Object.assign({}, remRef)
      state.tagsViewList.push(ff)
      addBrowserSetSession(state.tagsViewList)
    }

    // 3、关闭当前 tagsView：如果是设置了固定的（isAffix），不可以关闭
    const closeCurrentTagsView = (path: string) => {
      state.tagsViewList.map((v: Menu, k: number, arr: Menu[]) => {
        if (!v.meta.isAffix) {
          if (v.path === path) {
            state.tagsViewList.splice(k, 1)
            setTimeout(() => {
              // 最后一个
              if (state.tagsViewList.length === k)
                router.push({
                  path: arr[arr.length - 1].path,
                  query: arr[arr.length - 1].query || undefined
                })
              // 否则，跳转到下一个
              else router.push({ path: arr[k].path, query: arr[k].query })
            }, 0)
          }
        }
      })
      addBrowserSetSession(state.tagsViewList)
    }

    // 判断页面高亮
    const isActive = (path: string) => {
      return path === state.routePath
    }

    // 当前的 tagsView 项点击时
    const onTagsClick = (v: any, k: number) => {
      state.routePath = v.path
      state.tagsRefsIndex = k
      router.push(v)
    }
    // 更新滚动条显示
    const updateScrollbar = () => {
      scrollbarRef.value!.update()
    }
    // 鼠标滚轮滚动
    const onHandleScroll = (e: any) => {
      // proxy.$refs.scrollbarRef.$refs.wrap.scrollLeft += e.wheelDelta / 4
      let scrollRefs = scrollbarRef.value!.wrapRef
      let scrollL = scrollRefs.scrollLeft
      scrollbarRef.value!.setScrollLeft(scrollL + e.wheelDelta / 4)
    }
    // tagsView 横向滚动
    const tagsViewmoveToCurrentTag = () => {
      nextTick(() => {
        if (tagsRefs.value.length <= 0) return false
        // 当前 li 元素
        let liDom = tagsRefs.value[state.tagsRefsIndex]
        // 当前 li 元素下标
        let liIndex = state.tagsRefsIndex
        // 当前 ul 下 li 元素总长度
        let liLength = tagsRefs.value.length
        // 最前 li
        let liFirst: any = tagsRefs.value[0]
        // 最后 li
        let liLast: any = tagsRefs.value[tagsRefs.value.length - 1]
        // 当前滚动条的值
        let scrollRefs = scrollbarRef.value!.wrapRef
        // 当前滚动条滚动宽度
        let scrollS = scrollRefs.scrollWidth
        // 当前滚动条偏移宽度
        let offsetW = scrollRefs.offsetWidth
        // 当前滚动条偏移距离
        let scrollL = scrollRefs.scrollLeft
        // 上一个 tags li dom
        let liPrevTag: any = tagsRefs.value[state.tagsRefsIndex - 1]
        // 下一个 tags li dom
        let liNextTag: any = tagsRefs.value[state.tagsRefsIndex + 1]
        // 上一个 tags li dom 的偏移距离
        let beforePrevL: any = ''
        // 下一个 tags li dom 的偏移距离
        let afterNextL: any = ''
        if (liDom === liFirst) {
          // 头部
          scrollRefs.scrollLeft = 0
        } else if (liDom === liLast) {
          // 尾部
          scrollRefs.scrollLeft = scrollS - offsetW
        } else {
          // 非头/尾部
          if (liIndex === 0) beforePrevL = liFirst.offsetLeft - 5
          // else beforePrevL = liPrevTag?.offsetLeft - 5
          else beforePrevL = liPrevTag && liPrevTag.offsetLeft - 5
          if (liIndex === liLength)
            afterNextL = liLast.offsetLeft + liLast.offsetWidth + 5
          else afterNextL = liNextTag.offsetLeft + liNextTag.offsetWidth + 5
          if (afterNextL > scrollL + offsetW) {
            scrollRefs.scrollLeft = afterNextL - offsetW
          } else if (beforePrevL < scrollL) {
            scrollRefs.scrollLeft = beforePrevL
          }
        }
        // 更新滚动条，防止不出现
        updateScrollbar()
      })
    }
    // 获取 tagsView 的下标：用于处理 tagsView 点击时的横向滚动
    const getTagsRefsIndex = (path: string) => {
      if (state.tagsViewList.length > 0) {
        state.tagsRefsIndex = state.tagsViewList.findIndex(
          (item: any) => item.path === path
        )
      }
    }

    // 监听路由的变化，动态赋值给 tagsView
    watch(
      () => store.state.tagsViewRoutes.tagsViewRoutes,
      (val) => {
        if (val.length === state.tagsViewRoutesList.length) return false
        getTagsViewRoutes()
      }
    )
    // 页面加载前
    onBeforeMount(() => {})
    // 页面卸载时
    onUnmounted(() => {})
    // 页面更新时
    onBeforeUpdate(() => {
      tagsRefs.value = []
    })
    // 页面加载时
    onMounted(() => {
      // 初始化 vuex 中的 tagsViewRoutes 列表
      getTagsViewRoutes(true)
    })

    /**
     * 同级路由更新时
     * 无法监听跨根目录跳转
     *
     */
    onBeforeRouteUpdate((to) => {
      if (to.meta['title']) {
        state.routePath = to.path
        addTagsView(to)
        getTagsRefsIndex(to.path)
        tagsViewmoveToCurrentTag()
      }
    })

    /**
     * 监听跨根目录路由变化
     *https://www.jianshu.com/p/c3ffc1c155dc
     */
    onBeforeRouteLeave((to) => {
      if (to.meta['title']) {
        state.routePath = to.path
        addTagsView(to)
        getTagsRefsIndex(to.path)
        tagsViewmoveToCurrentTag()
      }
    })
    return {
      isActive,
      getTagsViewRoutes,
      onTagsClick,
      tagsRefs,
      scrollbarRef,
      tagsUlRef,
      onHandleScroll,
      getThemeConfig,
      closeCurrentTagsView,
      ...toRefs(state)
    }
  }
}
</script>

<style scoped lang="scss">
.layout-navbars-tagsview {
  flex: 1;
  background-color: #ffffff;
  border-bottom: 1px solid #f1f2f3;
  :deep(.el-scrollbar__wrap) {
    overflow-x: auto !important;
  }
  &-ul {
    list-style: none;
    margin: 0;
    padding: 0;
    height: 34px;
    display: flex;
    align-items: center;
    color: #606266;
    font-size: 12px;
    white-space: nowrap;
    padding: 0 15px;
    &-li {
      height: 26px;
      line-height: 26px;
      display: flex;
      align-items: center;
      border: 1px solid #e6e6e6;
      padding: 0 15px;
      margin-right: 5px;
      border-radius: 2px;
      position: relative;
      z-index: 0;
      cursor: pointer;
      justify-content: space-between;
      &:hover {
        background-color: var(--color-primary-light-9);
        color: var(--color-primary);
        border-color: var(--color-primary-light-6);
      }
      &-iconfont {
        position: relative;
        left: -5px;
        font-size: 12px;
      }
      &-icon {
        border-radius: 100%;
        position: relative;
        height: 14px;
        width: 14px;
        text-align: center;
        line-height: 14px;
        right: -5px;
        &:hover {
          color: #fff;
          background-color: var(--color-primary-light-3);
        }
      }
      .layout-icon-active {
        display: block;
      }
      .layout-icon-three {
        display: none;
      }
    }
    .is-active {
      color: #ffffff;
      background: var(--color-primary);
      border-color: var(--color-primary);
    }
  }
  // 风格2
  .tags-style-two {
    .layout-navbars-tagsview-ul-li {
      height: 34px !important;
      line-height: 34px !important;
      border: none !important;
      .layout-navbars-tagsview-ul-li-iconfont {
        display: none;
      }
      .layout-icon-active {
        display: none;
      }
      .layout-icon-three {
        display: block;
      }
    }
    .is-active {
      background: none !important;
      color: var(--color-primary) !important;
      border-bottom: 2px solid !important;
      border-color: var(--color-primary) !important;
      border-radius: 0 !important;
    }
  }
  // 风格3
  .tags-style-three {
    .layout-navbars-tagsview-ul-li {
      height: 34px !important;
      line-height: 34px !important;
      border-right: 1px solid #f6f6f6 !important;
      border-top: none !important;
      border-bottom: none !important;
      border-left: none !important;
      border-radius: 0 !important;
      margin-right: 0 !important;
      &:first-of-type {
        border-left: 1px solid #f6f6f6 !important;
      }
      .layout-icon-active {
        display: none;
      }
      .layout-icon-three {
        display: block;
      }
    }
    .is-active {
      background: white !important;
      color: var(--color-primary) !important;
      border-top: 1px solid !important;
      border-top-color: var(--color-primary) !important;
    }
  }
  // 风格4
  .tags-style-four {
    .layout-navbars-tagsview-ul-li {
      margin-right: 0 !important;
      border: none !important;
      position: relative;
      border-radius: 3px !important;
      .layout-icon-active {
        display: none;
      }
      .layout-icon-three {
        display: block;
      }
      &:hover {
        background: none !important;
      }
    }
    .is-active {
      background: none !important;
      color: var(--color-primary) !important;
    }
  }
}
.layout-navbars-tagsview-shadow {
  box-shadow: rgb(0 21 41 / 4%) 0px 1px 4px;
}
</style>
