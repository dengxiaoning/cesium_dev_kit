import assert from 'node:assert'
import { disposeViewer } from '../src/utils/cesiumPluginsExtends/libs/Base'

// disposeViewer 必须幂等：重复调用 / 已销毁 / 空值都不应抛错
let destroyCount = 0
const viewer = {
  isDestroyed: () => destroyCount > 0,
  destroy: () => {
    destroyCount++
  }
}

disposeViewer(viewer)
disposeViewer(viewer)
disposeViewer(null)
disposeViewer(undefined)

assert.equal(destroyCount, 1, 'viewer 只应被销毁一次')

console.log('✔ disposeViewer 全部测试通过')
