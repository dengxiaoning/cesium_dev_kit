import { defineComponent } from 'vue';
import { RouterView } from "vue-router";
// Initialization App main
// Vue tsx development model
// example https://www.jianshu.com/p/9c3e7cd3dff3
// https://github.com/vuejs/jsx-next/blob/dev/packages/babel-plugin-jsx/README-zh_CN.md
export default defineComponent({
	name: 'App',
	setup() {
		return () => <RouterView></RouterView>;
	}
});