import { createRouter, createWebHashHistory } from 'vue-router'
import type { App } from 'vue'

const routerHistory = createWebHashHistory()
// createWebHashHistory hash 路由
// createWebHistory history 路由
// createMemoryHistory 带缓存 history 路由

const Layout = () => import('@/layout/index.vue')

export const constantRoutes = [
  {
    path: '/',
    name: 'root',
    component: Layout,
    redirect: '/home',
    children: [
      {
        path: '/home',
        name: 'home',
        component: () => import('views/home/index.vue'),
        meta: {
          auth: ['admin', 'test'],
          icon: 'carbon:rule-test',
          isAffix: true,
          isHide: false,
          isKeepAlive: true,
          title: '首页',
          index: '1'
        }
      }
    ]
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/login.vue')
  },
  {
    path: '/visual',
    name: 'visual',
    component: () => import('@/views/visual/index.vue'),
    children: [
      {
        path: 'v3d',
        name: 'v3d',
        component: () => import('@/views/visual/v3d/index.vue')
      },
      {
        path: 'v2d',
        name: 'v2d',
        component: () => import('@/views/visual/v2d/index.vue')
      }
    ]
  }
]

const router = createRouter({
  history: routerHistory,
  routes: constantRoutes
})

// 删除/重置路由
export function resetRoute(): void {
  router.getRoutes().forEach((route) => {
    const { name } = route
    if (name) {
      router.hasRoute(name) && router.removeRoute(name)
    }
  })
}

export function setupRouter(app: App<Element>): void {
  app.use(router)
}
export default router
