//dom 工具

/**
 * DomUtil 实例类型定义
 */
export interface DomUtilInstance {
  /**
   * 创建dom元素
   * @param tagName - 标签名
   * @param className - class 名称
   * @param container - 父容器
   * @returns 创建的 dom 元素
   */
  createDom(tagName: string, className?: string, container?: Element | null): HTMLElement
  /**
   * 删除 element
   * @param el - 目标元素
   */
  removeDom(el: Element): void
  /**
   * 清空 element 的所有子节点
   * @param el - 目标元素
   */
  emptyDom(el: Element): void
  /**
   * 添加 class
   * @param el - 目标元素
   * @param name - class 名称（多个 class 用空格分隔）
   */
  addDomClass(el: Element, name: string): void
  /**
   * 删除 class
   * @param el - 目标元素
   * @param name - class 名称
   */
  removeDomClass(el: Element, name: string): void
  /**
   * 设置 class
   * @param el - 目标元素（支持 SVG 元素）
   * @param name - class 名称
   */
  setDomClass(el: Element | SVGElement, name: string): void
  /**
   * 获取元素 class
   * @param el - 目标元素
   * @returns class 字符串
   */
  getDomClass(el: Element): string
  /**
   * 创建 svg 元素
   * @param width - 宽
   * @param height - 高
   * @param path - path 的 d 属性
   * @param container - 父容器
   * @returns svg 元素
   */
  createDomSvg(
    width: number | string,
    height: number | string,
    path: string,
    container?: Element | null
  ): SVGElement
  /**
   * 生成 uuid
   * @param prefix - 前缀，默认 "D"
   * @returns uuid 字符串
   */
  createUUID(prefix?: string): string
  /** 按空白字符拆分字符串（老版本浏览器的降级实现，按需调用） */
  splitWords(str: string): string[]
  /** 判断元素是否含有某个 class（老版本浏览器的降级实现，按需调用） */
  hasClass(el: Element, name: string): boolean
  /** 获取元素 class（老版本浏览器的降级实现，按需调用） */
  getClass(el: Element): string
  /** 设置元素 class（老版本浏览器的降级实现，按需调用） */
  setClass(el: Element, name: string): void
  /** 去除字符串首尾空白（老版本浏览器的降级实现，按需调用） */
  trim(str: string): string
}

/**
 * DomUtil 构造函数类型
 */
export interface DomUtilConstructor {
  new (): DomUtilInstance
  prototype: DomUtilInstance
}

const DomUtil = function (this: DomUtilInstance) {
  // 占位构造，所有能力都挂在原型上
} as unknown as DomUtilConstructor

DomUtil.prototype = {
  /*
   * 创建dom元素
   * @param {*} tagName
   * @param {*} className
   * @param {*} container
   */
  createDom: function (tagName, className, container) {
    var el = document.createElement(tagName)
    el.className = className || ''
    if (container) {
      container.appendChild(el)
    }
    return el
  },
  //删除 element
  removeDom: function (el) {
    var parent = el.parentNode
    if (parent) {
      parent.removeChild(el)
    }
  },
  //清空 element
  emptyDom: function (el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild)
    }
  },
  //添加 class
  addDomClass: function (el, name) {
    if ((el as HTMLElement).classList !== undefined) {
      var classes = this.splitWords(name)
      for (var i = 0, len = classes.length; i < len; i++) {
        ;(el as HTMLElement).classList.add(classes[i])
      }
    } else if (!this.hasClass(el, name)) {
      var className = this.getClass(el)
      this.setClass(el, (className ? className + ' ' : '') + name)
    }
  },
  //删除class
  removeDomClass: function (el, name) {
    if ((el as HTMLElement).classList !== undefined) {
      ;(el as HTMLElement).classList.remove(name)
    } else {
      this.setClass(el, this.trim((' ' + this.getClass(el) + ' ').replace(' ' + name + ' ', ' ')))
    }
  },
  //设置 class
  setDomClass: function (el, name) {
    if ((el as SVGElement).className.baseVal === undefined) {
      ;(el as HTMLElement).className = name
    } else {
      // in case of SVG element
      ;(el as SVGElement).className.baseVal = name
    }
  },
  //获取 el class
  getDomClass: function (el) {
    // Check if the element is an SVGElementInstance and use the correspondingElement instead
    // (Required for linked SVG elements in IE11.)
    const svgInstance = el as SVGElement & { correspondingElement?: SVGElement }
    if (svgInstance.correspondingElement) {
      el = svgInstance.correspondingElement
    }
    return (el as SVGElement).className.baseVal === undefined
      ? (el as HTMLElement).className
      : (el as SVGElement).className.baseVal
  },
  //创建 svg
  createDomSvg: function (width, height, path, container) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg:svg')
    svg.setAttribute('class', 'svg-path')
    svg.setAttribute('width', String(width))
    svg.setAttribute('height', String(height))
    svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height)
    var pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    pathEl.setAttribute('d', path)
    svg.appendChild(pathEl)
    if (container) {
      container.appendChild(svg)
    }
    return svg
  },
  //生成uuid
  createUUID: function (prefix) {
    prefix = prefix || 'D'
    const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('')
    let uuid: string[] = []
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-'
    uuid[14] = '4'
    let r: number
    for (let i = 0; i < 36; i++) {
      if (!uuid[i]) {
        r = 0 | (Math.random() * 16)
        uuid[i] = CHARS[i == 19 ? (r & 0x3) | 0x8 : r]
      }
    }
    return prefix + '-' + uuid.join('')
  },
} as DomUtilInstance

export { DomUtil }
