import {
  constantRoutes
} from '@/router/index'
import { Module } from 'vuex';
import { permissionListState, RootStateTypes } from 'store/interface/index';

const permissionModule : Module<permissionListState, RootStateTypes>= {
  state: {
    routeList: [],
    addRoutes: []
  },
  mutations: {
    SET_ROUTES: (state:any, routes:any) => {
      state.addRoutes = routes
      let resRoutelist:any[] = constantRoutes.filter(e => e.name !== 'root')
      let getRootList = constantRoutes.find(e => e.name === 'root');
      if (getRootList) {
        resRoutelist= resRoutelist.concat(getRootList.children)
      }
      
      state.routeList = resRoutelist.concat(routes)
    }
  },
  actions: {
    // 生成路由
    GenerateRoutes({
      commit
    }:any) {
      return new Promise((resolve:any) => {
        const modulesObtainJson = import.meta.glob('../../../public/*.json')
        modulesObtainJson['../../../public/testMenu.json']().then((mod) => {
          const accessedRoutes = mod.default;
          commit('SET_ROUTES', accessedRoutes)
           resolve(accessedRoutes)
        })
        
        // fetch("testMenu.json").then(res => {
				// 	return res.json();
				// }).then(res => {
				// 	if (typeof res === 'string') {
				// 		res = JSON.parse(res)
				// 	}
        //   const accessedRoutes = res;
        //   commit('SET_ROUTES', accessedRoutes)
        //    resolve(accessedRoutes)
				// })

        // 向后端请求路由数据
        // getRouters().then(res => {
        //   const accessedRoutes = filterAsyncRouter(res.data)
        //   accessedRoutes.push({ path: '*', redirect: '/404', hidden: true })
        //   commit('SET_ROUTES', accessedRoutes)
        //   resolve(accessedRoutes)
        // })
      })
    }
  }
}


export default permissionModule
