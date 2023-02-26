import type { App,InjectionKey } from 'vue';
import { createStore, useStore as baseUseStore, Store } from 'vuex'
import { RootStateTypes } from './interface/index';
// The import.meta object exposes context-specific metadata to a JavaScript module. 
// It contains information about the module, like the module 's URL.
// https://developer.mozilla.org/zh-cn/docs/web/javascript/reference/statements/import.meta
const modulesGlob = import.meta.globEager('./**/*.ts'), modules: any = {};
// Set global vuex getters
let getters: any = "";
// Get all the folders under the modules folder, 
// traverse the file object to set Vuex modules and getters
Object.keys(modulesGlob).map((key) => {
    if (key.indexOf("modules") >= 0) {
        modules[key.split("/")[key.split("/").length - 1].replace(/\.ts|.js/, "")] = modulesGlob[key].default;
    } else {
        getters = modulesGlob[key].default;
    }
});

//  定义注入类型 InjectionKey 将store安装到Vue应用程序时提供类型,将类型传递InjectionKey给useStore方法
const key: InjectionKey<Store<RootStateTypes>> = Symbol()


// Create vuex store
// set modules getters and strict
// https://next.vuex.vuejs.org/
const store = createStore<RootStateTypes>({
    modules,
    getters,
    strict: false
});


// 将类型注入useStore，似乎无效
export function useStore() {
  return baseUseStore(key)
}


export function setupStore(app: App<Element>): any {
    app.use(store, key);
}

// Throw current store
export default store;