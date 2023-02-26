import { parse as jsonparse, stringify as jsonstringify } from 'flatted'
// 设置永久缓存
export function setLocal(key: string, val: any) {
  if (val) {
    try {
      window.localStorage.setItem(key, jsonstringify(val))
    } catch (e: any) {
      // sessionStorage容量不够，根据保存的时间删除已缓存到 sessionStorage
      if (e.name.toUpperCase().indexOf('QUOTA') >= 0) {
        let item
        const tempArr = []
        // 先把所有的缓存对象来出来，放到 tempArr 里

        for (item in localStorage) {
          if (item.indexOf(key) === 0) {
            tempArr.push(JSON.parse(localStorage[item]))
          }
        }
        // 如果有缓存对象
        if (tempArr.length) {
          // 按缓存时间升序排列数组
          tempArr.sort((a, b) => a.stamp - b.stamp)
          // 删除缓存时间最早的
          localStorage.removeItem(tempArr[0].key)
          // 删除后在再添加，利用递归完成
          window.localStorage.setItem(key, jsonstringify(val))
        }
      }
    }
  }
}

// 获取永久缓存
export function getLocal(key: string) {
  let json: any = window.localStorage.getItem(key)
  return json ? jsonparse(json) : null
}

// 2. sessionStorage
// 设置临时缓存
export function setSession(key: string, val: any) {
  if (val) {
    try {
      window.sessionStorage.setItem(key, jsonstringify(val))
    } catch (e: any) {
      // sessionStorage容量不够，根据保存的时间删除已缓存到 sessionStorage
      if (e.name.toUpperCase().indexOf('QUOTA') >= 0) {
        let item
        const tempArr = []
        // 先把所有的缓存对象来出来，放到 tempArr 里

        for (item in sessionStorage) {
          if (item.indexOf(key) >= 0) {
            tempArr.push(JSON.parse(sessionStorage[item]))
          }
        }
        // 如果有缓存对象
        if (tempArr.length) {
          // 按缓存时间升序排列数组
          tempArr.sort((a, b) => a.stamp - b.stamp)
          // 删除缓存时间最早的
          removeSession(tempArr[0].key)
          // 删除后在再添加，利用递归完成
          setSession(key, jsonstringify(val))
        }
      }
    }
  }
}
// 获取临时缓存
export function getSession(key: string) {
  let json: any = window.sessionStorage.getItem(key)
  return json ? jsonparse(json) : null
}
// 移除临时缓存
export function removeSession(key: string) {
  window.sessionStorage.removeItem(key)
}
// 移除全部临时缓存
export function clearSession() {
  window.sessionStorage.clear()
}
