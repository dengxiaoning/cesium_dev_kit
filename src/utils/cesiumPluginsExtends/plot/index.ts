/**
 * `cesium_dev_kit/plot` —— 标绘（攻击箭头 / 钳击箭头 / 直线箭头）与序列化 / 撤销重做。
 *
 * 用法：
 * ```ts
 * import * as Cesium from 'cesium'
 * import { PlotStore, PlotLayer } from 'cesium_dev_kit/plot'
 *
 * const store = new PlotStore()
 * const layer = new PlotLayer({ Cesium, viewer, store })
 *
 * store.add({
 *   type: 'AttackArrow',
 *   positions: [[104.09, 30.65], [104.11, 30.68], [104.10, 30.70]]
 * })
 * store.undo()
 * const json = store.toJSON() // 持久化
 * ```
 */
export {
  AttackArrow,
  PincerArrow,
  StraightArrow,
  PlotStore,
  PlotLayer,
  PLOT_MIN_POINTS,
  initPlot
} from '../libs/plot'
export type {
  PlotItem,
  PlotInput,
  PlotSnapshot,
  PlotStoreOptions,
  PlotStoreState,
  PlotStoreListener,
  PlotType,
  PlotPosition,
  PlotLayerOptions
} from '../libs/plot'
