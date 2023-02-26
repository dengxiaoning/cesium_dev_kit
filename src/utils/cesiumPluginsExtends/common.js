// 函数
export function evil(fn) {
  const Fn = Function // 一个变量指向Function，防止有些前端编译工具报错
  // return new Fn('return ' + fn)()
  return new Fn('return ' + fn)()
}
// 获得get参数
export function getUrlKey(name, url) {
  return (
    decodeURIComponent(
      (new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(url) || [
        null,
        '',
        null,
      ])[1].replace(/\+/g, '%20')
    ) || null
  )
}
// 获得格式化后的get参数
export function getUrlParma(p, type = 'string') {
  let UrlParma = getUrlKey(p, window.location.href)
  if (type === 'int') {
    return parseInt(UrlParma)
  }
  if (type === 'float') {
    return parseFloat(UrlParma)
  }
  if (UrlParma && type === 'array') {
    UrlParma = UrlParma.split(',')
    return [
      parseFloat(UrlParma[0]),
      parseFloat(UrlParma[1]),
      parseFloat(UrlParma[2]),
    ]
  }
  return UrlParma
}
// 将一个字符串转换为变量名
export function string_to_name(string) {
  let _name = 'let new_name = ' + string
  evil(_name)
  return _name
}