import { defineComponent, h } from 'vue';
import { RouterView } from "vue-router";
// Initialization App main
// Vue tsx development model
// example https://www.jianshu.com/p/9c3e7cd3dff3
// https://github.com/vuejs/jsx-next/blob/dev/packages/babel-plugin-jsx/README-zh_CN.md
export default defineComponent({
	name: 'App',
	setup() {
		// 用 h() 而不是 JSX：vue-router 的类型与当前 JSX 工厂不完全兼容，
		// 直接写 <RouterView/> 会被 vue-tsc 判为「不能作为 JSX 组件」
		return () => h(RouterView);
	}
});