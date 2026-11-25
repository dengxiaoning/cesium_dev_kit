/**
 * cesium_dev_kit 文档站自定义脚本（TypeDoc `customJs`，会拷贝为 assets/custom.js）。
 *
 * 功能：在页面顶部注入一个「版本切换」下拉框，读取站点根目录的 versions.json，
 * 在 latest 与归档版本（/v1.x/）之间跳转；同时提供中英文文档的互链。
 *
 * 无依赖、无侵入：抓不到 versions.json 或找不到工具栏时静默跳过。
 */
;(function () {
  'use strict'

  var REPO = '/cesium_dev_kit/'
  var path = location.pathname
  var siteRoot = path.indexOf(REPO) >= 0 ? path.slice(0, path.indexOf(REPO) + REPO.length) : '/'

  // 当前版本：匹配 /v1.2.1/ 这类归档路径；否则视为 latest
  var versionMatch = path.match(/\/v([^/]+)\//)
  var currentVersion = versionMatch ? versionMatch[1] : 'latest'

  // 是否处于英文文档（/en/），用于切换版本时尽量保持语言
  var isEn = new RegExp(siteRoot + 'en/').test(path)

  function css() {
    var style = document.createElement('style')
    style.textContent =
      '.cdk-version{display:inline-flex;align-items:center;gap:6px;margin-left:auto;padding-left:12px}' +
      '.cdk-version select{' +
      'appearance:auto;-webkit-appearance:auto;' +
      'background:var(--color-background-secondary,#f8f8f8);' +
      'color:var(--color-text,#222);' +
      'border:1px solid var(--color-accent,rgba(0,0,0,.2));' +
      'border-radius:6px;padding:3px 8px;font-size:.8rem;cursor:pointer' +
      '}' +
      '.cdk-version label{font-size:.72rem;opacity:.7;white-space:nowrap}'
    document.head.appendChild(style)
  }

  function mount(target) {
    var box = document.createElement('div')
    box.className = 'cdk-version'
    var label = document.createElement('label')
    label.textContent = 'v'
    var select = document.createElement('select')
    select.setAttribute('aria-label', '文档版本切换')
    box.appendChild(label)
    box.appendChild(select)

    var loading = document.createElement('option')
    loading.value = ''
    loading.textContent = currentVersion === 'latest' ? 'latest' : currentVersion
    select.appendChild(loading)

    target.appendChild(box)

    fetch(siteRoot + 'versions.json', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('no versions.json')
        return res.json()
      })
      .then(function (data) {
        var versions = (data && data.versions) || []
        if (!versions.length) return
        select.innerHTML = ''
        versions.forEach(function (item) {
          var option = document.createElement('option')
          option.value = item.path || '/'
          option.textContent =
            item.version + (item.version === data.current ? ' (latest)' : '')
          if (
            (item.version === data.current && currentVersion === 'latest') ||
            (item.version !== data.current && item.version === currentVersion)
          ) {
            option.selected = true
          }
          select.appendChild(option)
        })
      })
      .catch(function () {
        /* 本地预览还没有 versions.json，忽略即可 */
      })

    select.addEventListener('change', function () {
      var value = select.value
      if (!value) return
      // 切到 latest 时尽量留在当前语言
      if (value === '/' && isEn) {
        location.href = siteRoot + 'en/'
      } else {
        location.href = siteRoot + value.replace(/^\//, '')
      }
    })
  }

  function boot() {
    css()
    var toolbar = document.querySelector('.tsd-page-toolbar .tsd-toolbar-contents')
    if (toolbar) {
      mount(toolbar)
    } else if (document.body) {
      mount(document.body)
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
})()
