
import { createApp } from 'vue'
import { setupStore } from './store' // 状态管理
import router, { setupRouter } from './router' // 路由
import { setupElementPlus } from './libs/element' // element UI
import { setupGlobalCom } from './components/index'
import {setupDirective } from './libs/directive/index'

import './styles/index.scss'
import mitt from 'mitt';
import App from './App'
import './permission' // permission control
import 'virtual:svg-icons-register';

const app = createApp(App)

setupRouter(app) // 引入路由

setupStore(app) // 引入状态管理

setupElementPlus(app) // 引入element组件

setupGlobalCom(app) // 注册全局公用组件

setupDirective(app) // 注册全局指令

app.config.globalProperties.mittBus = mitt()

// console.log('elementPlus---',elementPlus);

router.isReady().then(() => {
  app.mount('#app')
})
