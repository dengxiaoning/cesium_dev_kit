// 输入16进制颜色值 转 rgb 的数组值 255
export function colorRgb(inColor) {
  // 16进制颜色值的正则
  const reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/
  // 把颜色值变成小写
  let color = inColor.toLowerCase()
  if (reg.test(color)) {
    // 如果只有三位的值，需变成六位，如：#fff => #ffffff
    if (color.length === 4) {
      let colorNew = '#'
      for (let i = 1; i < 4; i += 1) {
        colorNew += color.slice(i, i + 1).concat(color.slice(i, i + 1))
      }
      color = colorNew
    }
    // 处理六位的颜色值，转为RGB
    const colorChange = []
    for (let i = 1; i < 7; i += 2) {
      colorChange.push(parseInt('0x' + color.slice(i, i + 2)))
    }
    return colorChange
  }
  return []
}
// 输入16进制颜色值 转 rgb 的字符 255
export function colorRgbString(inColor) {
  let arr = colorRgb(inColor)
  return 'rgb(' + arr[0] + ',' + arr[1] + ',' + arr[2] + ')'
}

// 输入16进制颜色值 转 rgb 的数组值 0.0 - 1.0
export function colorRgb1(inColor) {
  const colorChange = colorRgb(inColor)
  colorChange.forEach((ele, index) => {
    colorChange[index] = (ele / 255.0).toFixed(2)
  })
  return colorChange
}
// RGB转16进制(rgb2hex)
export function colorRGB2Hex(color) {
  const rgb = color.split(',')
  if (rgb.length <= 1) {
    return color
  }
  const r = parseInt(rgb[0].split('(')[1])
  const g = parseInt(rgb[1])
  const b = parseInt(rgb[2].split(')')[0])
  const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
  return hex
}