import {
  AttackArrow
} from './AttackArrow';
import {
  StraightArrow
} from './StraightArrow';
import {
  PincerArrow
} from './PincerArrow';



function initPlot(viewer: any, cesiumGlobal: any) {
  const AttackArrowObj = new (AttackArrow as any)(viewer, cesiumGlobal);
  const StraightArrowObj = new (StraightArrow as any)(viewer, cesiumGlobal);
  const PincerArrowObj = new (PincerArrow as any)(viewer, cesiumGlobal);

  return {
    AttackArrowObj,
    StraightArrowObj,
    PincerArrowObj
  }
}

export {
  initPlot
}

export { AttackArrow } from './AttackArrow'
export { PincerArrow } from './PincerArrow'
export { StraightArrow } from './StraightArrow'
export { PlotStore, PLOT_MIN_POINTS } from './PlotStore'
export { PlotLayer } from './PlotLayer'
export type {
  PlotItem,
  PlotInput,
  PlotSnapshot,
  PlotStoreOptions,
  PlotStoreState,
  PlotStoreListener,
  PlotType,
  PlotPosition
} from './PlotStore'
export type { PlotLayerOptions } from './PlotLayer'