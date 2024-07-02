// 按需加载element
import type { App } from 'vue'
import ElementPlus from 'element-plus'
import "element-plus/dist/index.css";

export function setupElementPlus(app: App<Element>): void {
  app.use(ElementPlus);
  // 全局配置
  app.config.globalProperties.$ELEMENT = { size: 'small', zIndex: 3000 }
}
