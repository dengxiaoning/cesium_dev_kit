import { Module } from 'vuex';
import { TagsViewRoutesState, RootStateTypes } from 'store/interface/index';
import type {  AppRouteRecordRaw } from 'store/interface/index';
import { getSession } from '@/utils/localCache'
const getCacheTags = getSession('tagsViewSessionkey');
const tagsViewRoutesModule: Module<TagsViewRoutesState, RootStateTypes> = {
	namespaced: true,
  state: {
    tagsSession:'tagsViewSessionkey',
		tagsViewRoutes: getCacheTags?getCacheTags:[{ // 第一次进入页面默认为首页
      meta: {
        auth: ['admin', 'test'],
        icon: 'iconfont el-icon-menu',
        isAffix: true,
        isHide: false,
        isKeepAlive: true,
        title: '首页',
        index: '1'
      },
      name: 'home',
      path: '/home'
    }],
	},
	mutations: {
		// 设置 TagsView 路由
		getTagsViewRoutes(state: any, data: Array<AppRouteRecordRaw>) {
			state.tagsViewRoutes = data;
		},
	},
	actions: {
		// 设置 TagsView 路由
		async setTagsViewRoutes({ commit }, data: Array<AppRouteRecordRaw>) {
			commit('getTagsViewRoutes', data);
		},
	},
};

export default tagsViewRoutesModule;
