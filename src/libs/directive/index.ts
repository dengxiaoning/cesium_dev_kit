import type { App } from 'vue'
import directObj from './directiveConf'
export function setupDirective(app: App<Element>): void {
  app.directive('cust-drag-dialog', {
    mounted(el, bindings, vnode, preVnode) {
      const domDragContainer = el.firstElementChild.firstElementChild
      directObj.bind(domDragContainer)
      directObj.update(domDragContainer, bindings)
    }
  })
}
