/**
 * 存储封装对外提供统一的方法及接口使用
 * Localstorage 存储到客户端
 */
import { StorageType } from './index'

class LocalStorageAPI implements StorageType {
  set(key: string, value: string): void {
    // sessionStorage对大小是有限制的，所以要进行try catch
    // 500KB左右的东西保存起来就会令到Resources变卡
    // 2M左右就可以令到Resources卡死，操作不了
    // 5M就到了Chrome的极限
    // 超过之后会抛出如下异常：
    // DOMException: Failed to execute 'setItem' on 'Storage': Setting the value of 'basket-http://file.com/ykq/wap/v3Templates/timeout/timeout/large.js' exceeded the quota
    try {
      localStorage.setItem(key, value)
    } catch (e) {
      // sessionStorage容量不够，根据保存的时间删除已缓存到 sessionStorage
      if (e.name.toUpperCase().indexOf('QUOTA') >= 0) {
        let item
        const tempArr = []
        // 先把所有的缓存对象来出来，放到 tempArr 里

        for (item in sessionStorage) {
          if (item.indexOf(key) === 0) {
            tempArr.push(JSON.parse(sessionStorage[item]))
          }
        }
        // 如果有缓存对象
        if (tempArr.length) {
          // 按缓存时间升序排列数组
          tempArr.sort((a, b) => a.stamp - b.stamp)
          // 删除缓存时间最早的
          sessionStorage.removeItem(tempArr[0].key)
          // 删除后在再添加，利用递归完成
          localStorage.setItem(key, value)
        }
      }
    }
  }

  get(key: string): string {
    return localStorage.getItem(key) ?? ''
  }

  remove(key: string): void {
    localStorage.removeItem(key)
  }

  setExpire(key: string, value: string, expire: number): void {
    const currTime = new Date().getTime()
    return this.set(
      key,
      JSON.stringify({ val: value, time: currTime + expire })
    )
  }

  getExpire(key: string): string {
    const val: string = this.get(key)
    const dataObj = JSON.parse(val)
    if (new Date().getTime() - dataObj.time > 0) {
      return dataObj.val
    } else {
      return ''
    }
  }
}

export default LocalStorageAPI
