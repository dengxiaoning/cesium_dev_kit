import router from './router/index'
import store from './store/index'
import { AppRouteRecordRaw } from 'store/interface/index';
import Layout from '@/layout/index.vue'
import { getToken } from '@/utils/auth'
// import {
//   ElMessage,
//   ElLoading
// } from 'element-plus'

import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

NProgress.configure({
  showSpinner: false
})
const obtainModules = getMoulesByRoute();
const whiteList = ['/login', '/auth-redirect', '/bind', '/register']

/**
 * 演示站免登录：访问时带上 ?auto=1 即用内置的模拟账号自动登录。
 *
 * 这里的登录/取用户信息本来就是纯前端模拟（见 store/modules/user.ts），没有后端校验，
 * 所以它本身不承担任何鉴权职责；这个开关只是为了让 GitHub Pages 上的在线 Demo
 * 少一步「先看到登录页再点登录」，链接形如：
 * https://dengxiaoning.github.io/cesium_dev_kit/demo/?auto=1
 */
const DEMO_AUTO_LOGIN = (() => {
  if (typeof window === 'undefined') return false
  const search = window.location.search
  return search.includes('auto=1')
})()

router.beforeEach((to: any, from: any, next: any) => {
  const hasetoken = getToken('USER-TOKEN');
  NProgress.start()
  /* has token*/

  if (hasetoken) {
    /* has token*/
    if (to.path === '/login') {
      next({
        path: '/'
      })
      NProgress.done()
    } else {
      if (store.state.user.roles.length === 0) {
        const loading = ElLoading.service();
        // 判断当前用户是否已拉取完user_info信息
        store.dispatch('GetInfo').then((res: any) => {
          // 拉取user_info
          const roles = res.roles
          store.dispatch('GenerateRoutes', {
            roles
          }).then((accessRoutes: AppRouteRecordRaw[]) => {

            // 根据roles权限生成可访问的路由表
            custAddRoutes(accessRoutes, '', obtainModules)
            loading.close(); // 关闭loading
            next({
              ...to,
              replace: true
            }) // hack方法 确保addRoutes已完成
          })
        })
          .catch((err: any) => {
            store.dispatch('FedLogOut').then(() => {
              ElMessage.error(err)
              next({
                path: '/'
              })
            })
          })
      } else {
        next()
      }
    }
  } else {
    // 没有token
    if (whiteList.indexOf(to.path) !== -1) {
      // 在免登录白名单，直接进入
      next()
    } else if (DEMO_AUTO_LOGIN) {
      // 演示站：用模拟账号登录后回到当前路由，省掉登录页这一跳
      store.dispatch('Login', { username: 'admin', password: '123456' }).then(() => {
        next({ ...to, replace: true })
        NProgress.done()
      })
    } else {
      next(`/login?redirect=${to.fullPath}`) // 否则全部重定向到登录页
      NProgress.done()
    }
  }
})


/**
 * 动态添加路由
 * import() 使用动态路径
 * 只可以是相对路径
 * import(`@/${componentPath}.vue`)❌
 * import(`/${componentPath}.vue`)❌
 * import(`${componentPath}.vue`)❌ 
 * import(`./${componentPath}.vue`)❌
 * import(`./views/${componentPath}.vue`)✔
 * https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars#limitations
 */
const custAddRoutes = (routes: AppRouteRecordRaw[], parentName: string = " ", obtainModules: Function): void => {
  routes.forEach((item: any) => {
    if (item.path && item.component) {
      const componentString = item.component.replace(/^\/+/, ""), // 过滤字符串前面所有 '/' 字符
        componentPath = componentString.replace(/\.\w+$/, ""); // 过滤掉后缀名，为了让 import 加入 .vue ，不然会有警告提示...

      const eachRoute = {
        path: item.path,
        redirect: item.redirect,
        name: item.name,
        component: item.component === 'Layout' ? Layout : obtainModules(`./views/${componentPath}.vue`),
        meta: item.meta
      }

      parentName || item.append ? router.addRoute(parentName || item.append, eachRoute) : router.addRoute(eachRoute);

      if (item.children && item.children.length) {
        custAddRoutes(item.children, item.name, obtainModules);
      }

    }
  })

};

/**
 * 根据component 获取真实的模块
 * 不适用import.meta.glob为异步
 * @returns 
 */
function getMoulesByRoute(): Function {
  // 把所有的数据读出来
  const modulesGlob = import.meta.globEager("./views/**/**.vue");
  return (componentStr: string): any => {
    let finalComp = null;
    Object.keys(modulesGlob).some((key) => {
      if (key === componentStr) {
        finalComp = modulesGlob[key].default;
        return true;
      }
    });
    return finalComp;
  }
}


router.afterEach(() => {
  NProgress.done()
})