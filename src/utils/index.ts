export class Utils {
  /**
   * 生成随机字符串
   */
  public static toAnyString() {
    const str: string = 'xxxxx-xxxxx-4xxxx-yxxxx-xxxxx'.replace(
      /[xy]/g,
      (c: string) => {
        const r: number = (Math.random() * 16) | 0
        const v: number = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString()
      }
    )
    return str
  }

  public static isExternal(path:string) {
    return /^(https?:|mailto:|tel:)/.test(path)
  }
  /**
   * 截取URL参数
   * @param {string} url
   * @returns {Object}
   */
  public static param2Obj(url: string) {
    const search: string = url.split('?')[1]
    if (!search) {
      return {}
    }
    return JSON.parse(
      '{"' +
        decodeURIComponent(search)
          .replace(/"/g, '\\"')
          .replace(/&/g, '","')
          .replace(/=/g, '":"')
          .replace(/\+/g, ' ') +
        '"}'
    )
  }
  
  /**
   * 防抖
   * @param {Function} func
   * @param {number} wait
   * @param {boolean} immediate
   * @return {*}
   */
  public static debounce(
    func: Function,
    wait: number,
    immediate: boolean = false
  ) {
    let timeout: any, args: any, context: any, timestamp: number, result: any

    const later = function () {
      // 据上一次触发时间间隔
      const last = +new Date() - timestamp

      // 上次被包装函数被调用时间间隔 last 小于设定时间间隔 wait
      if (last < wait && last > 0) {
        timeout = setTimeout(later, wait - last)
      } else {
        timeout = null
        // 如果设定为immediate===true，因为开始边界已经调用过了此处无需调用
        if (!immediate) {
          result = func.apply(context, args)
          if (!timeout) context = args = null
        }
      }
    }
    return  (...args: any) => {
      context = this
      timestamp = +new Date()
      const callNow = immediate && !timeout
      // 如果延时不存在，重新设定延时
      if (!timeout) timeout = setTimeout(later, wait)
      if (callNow) {
        result = func.apply(context, args)
        context = args = null
      }

      return result
    }
  }
   /**
 * Parse the time to string
 * @param {(Object|string|number)} time
 * @param {string} cFormat
 * @returns {string | null}
 */
public static parseTime(time:any, cFormat:string) {
  if (arguments.length === 0) {
    return null;
  }
  const format = cFormat || '{y}-{m}-{d} {h}:{i}:{s}';
  let date;
  if (typeof time === 'object') {
    date = time;
  } else {
    if (typeof time === 'string' && /^[0-9]+$/.test(time)) {
      time = parseInt(time);
    }
    if (typeof time === 'number' && time.toString().length === 10) {
      time = time * 1000;
    }
    date = new Date(time);
  }
  const formatObj:any = {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    i: date.getMinutes(),
    s: date.getSeconds(),
    a: date.getDay()
  };
  const time_str = format.replace(/{([ymdhisa])+}/g, (result, key) => {
    const value = formatObj[key];
    // Note: getDay() returns 0 on Sunday
    if (key === 'a') {
      return ['日', '一', '二', '三', '四', '五', '六'][value];
    }
    return value.toString().padStart(2, '0');
  });
  return time_str;
  }
  /**
  * Merges two objects, giving the last one precedence
  * @param {Object} target
  * @param {(Object|Array)} source
  * @returns {Object}
  */
   public static objectMerge(target:any, source:any) {
   if (typeof target !== 'object') {
     target = {}
   }
   if (Array.isArray(source)) {
     return source.slice()
   }
   Object.keys(source).forEach(property => {
     const sourceProperty = source[property]
     if (typeof sourceProperty === 'object') {
       target[property] = Utils.objectMerge(target[property], sourceProperty)
     } else {
       target[property] = sourceProperty
     }
   })
   return target
   }
  /**
 * 对象深度合并
 * @param source 
 * @param target 
 */
   public static objectDeepMerge(source: any, target: any) {
    const mergeJson: any = {} // 创建一个新对象
    const cloneSource = Utils.deepClone(source)

    Object.keys(cloneSource).forEach((property) => {
      mergeJson[property] = cloneSource[property]
    })

    // 执行合并
    Object.keys(mergeJson).forEach((property) => {
      if (target.hasOwnProperty(property)) {
        mergeJson[property] = target[property]
      }
    })
    return mergeJson
  }
  /**
   * 将对象进行深度拷贝
   * @param obj 需要拷贝的对象
   * @returns 
   */
  private static deepClone = (obj: any): any => {
    const keys = Object.keys(obj)
    if (Array.isArray(obj)) {
      return keys.reduce((pre: any, current: any) => {
        const value = obj[current]
        if (typeof value === 'object') {
          // 如果当前结果是一个对象，那我们就继续递归这个结果
          return pre.push(Utils.deepClone(value))
        }
        return pre.push({
          [current]: value
        })
      }, [])
    } else {
      return keys.reduce((memo, current) => {
        const value = obj[current]
        if (typeof value === 'object') {
          // 如果当前结果是一个对象，那我们就继续递归这个结果
          return {
            ...memo,
            [current]: Utils.deepClone(value)
          }
        }
        return {
          ...memo,
          [current]: value
        }
      }, {})
    }
  }
}
