import { defineComponent } from 'vue'
import type { RouteRecordNormalized, RouteRecordRaw } from 'vue-router'
/**
 * typescript 
 * 官网 https://www.tslang.cn/docs/home.html 
 * 博客 https://blog.csdn.net/qq_40280582/article/details/112444461
 */
type Component<T extends any = any> =
  | ReturnType<typeof defineComponent>
  | (() => Promise<typeof import('*.vue')>)
  | (() => Promise<T>)

interface RouteMeta {
  auth: string[]
  icon: string
  isLink?: string
  isAffix: boolean
  isHide: boolean
  isKeepAlive: boolean
  title: string
  index?: string | number
  roles?: string[]
  noCache?: boolean
}

// @ts-ignore
export interface AppRouteRecordRaw extends Omit<RouteRecordRaw, 'meta'> {
  name: string
  meta: RouteMeta
  component?: Component | string
  components?: Component
  children?: AppRouteRecordRaw[]
  props?: Recordable
  fullPath?: string
  query?: Partial<Recordable> | undefined
  redirect?:string
}

export interface Menu {
  name: string

  path: string

  orderNo?: number

  query?:  Partial<Recordable>  | undefined

  meta: Partial<RouteMeta>
  component?: Component | string
  children?: Menu[]
}

// 布局配置
export interface ThemeConfigState {
  isCollapse: boolean
  isBreadcrumb: boolean
  isFixedHeader: boolean
  isShowLogo: boolean
  isBreadcrumbIcon: boolean
  isShowLogoChange: boolean
  isCacheTagsView: boolean
  isUniqueOpened: boolean
  isTagsviewIcon: false
  globalTitle: string
  animation: string
  layout: string
  menuBar: string
}

export interface App {
  count: number
}

export interface Userinfo{
  name: string,
  avatar: string,
  roles: Array<any>,
  permissions: Array<any>,
}

export interface permissionListState {
  routeList:Array<any>,
  addRoutes: Array<any>,
}

export interface RoutesListState {
  routesList: Array<AppRouteRecordRaw>
}

export interface TagsViewRoutesState {
  tagsSession:string
  tagsViewRoutes: Array<Menu>
}

// 主接口(顶级类型声明)
export interface RootStateTypes {
  themeConfig: ThemeConfigState
  app: App
  routesList: RoutesListState
  tagsViewRoutes: TagsViewRoutesState,
  user: Userinfo,
  permission:permissionListState
}

export type AppRouteModule = AppRouteRecordRaw
