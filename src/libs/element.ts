// 按需加载element
import type { App } from 'vue'
import ElementPlus from 'element-plus'
import "element-plus/dist/index.css";
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

export function setupElementPlus(app: App<Element>): void {
  app.use(ElementPlus, { locale: zhCn });
  // 全局配置
  app.config.globalProperties.$ELEMENT = { size: 'small', zIndex: 3000 }
}
