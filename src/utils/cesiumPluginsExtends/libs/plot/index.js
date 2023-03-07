import {
  AttackArrow
} from './AttackArrow';
import {
  StraightArrow
} from './StraightArrow';
import {
  PincerArrow
} from './PincerArrow';

function initPlot(viewer, cesiumGlobal) {
  const AttackArrowObj = new AttackArrow(viewer, cesiumGlobal);
  const StraightArrowObj = new StraightArrow(viewer, cesiumGlobal);
  const PincerArrowObj = new PincerArrow(viewer, cesiumGlobal);

  return {
    AttackArrowObj,
    StraightArrowObj,
    PincerArrowObj
  }
}

export {
  initPlot
}