/**
 * dom 工具
 * @param {*} viewer
 */
function DomUtil() {}

DomUtil.prototype = {
  /**
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
    if (el.classList !== undefined) {
      var classes = this.splitWords(name)
      for (var i = 0, len = classes.length; i < len; i++) {
        el.classList.add(classes[i])
      }
    } else if (!this.hasClass(el, name)) {
      var className = this.getClass(el)
      this.setClass(el, (className ? className + ' ' : '') + name)
    }
  },
  //删除class
  removeDomClass: function (el, name) {
    if (el.classList !== undefined) {
      el.classList.remove(name)
    } else {
      this.setClass(el, this.trim((' ' + this.getClass(el) + ' ').replace(' ' + name + ' ', ' ')))
    }
  },
  //设置 class
  setDomClass: function (el, name) {
    if (el.className.baseVal === undefined) {
      el.className = name
    } else {
      // in case of SVG element
      el.className.baseVal = name
    }
  },
  //获取 el class
  getDomClass: function (el) {
    // Check if the element is an SVGElementInstance and use the correspondingElement instead
    // (Required for linked SVG elements in IE11.)
    if (el.correspondingElement) {
      el = el.correspondingElement
    }
    return el.className.baseVal === undefined ? el.className : el.className.baseVal
  },
  //创建 svg
  createDomSvg: function (width, height, path, container) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg:svg')
    svg.setAttribute('class', 'svg-path')
    svg.setAttribute('width', width)
    svg.setAttribute('height', height)
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
    const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split(
      ''
    )
    let uuid = []
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-'
    uuid[14] = '4'
    let r
    for (let i = 0; i < 36; i++) {
      if (!uuid[i]) {
        r = 0 | (Math.random() * 16)
        uuid[i] = CHARS[i == 19 ? (r & 0x3) | 0x8 : r]
      }
    }
    return prefix + '-' + uuid.join('')
  }
}