import { createSingleImport } from './Base'
import type { SingleImportOptions, SingleImportConstructor } from './Base'
import { Base, Math3d, Math2d, Draw as DrawCom, AttackArrow, StraightArrow, PincerArrow } from '../libs'
import type { DrawInstance } from '../libs/Draw'
import type { BaseInstance } from '../libs/Base'
import type { Math3dInstance } from '../libs/Math3d'
import type { Math2dInstance } from '../libs/Math2d'
import type { AttackArrowInstance } from '../libs/plot/AttackArrow'
import type { StraightArrowInstance } from '../libs/plot/StraightArrow'
import type { PincerArrowInstance } from '../libs/plot/PincerArrow'
import type { Viewer } from '../libs/Base'

/** draw 模块主体（仅含绘制能力，箭头标绘在外部追加） */
interface DrawTempApi {
  /** cesium viewer 实例 */
  viewer: Viewer
  /** 绘制模块实例（已混入 Base/Math3d/Math2d 等方法） */
  draw: DrawInstance & BaseInstance & Math3dInstance & Math2dInstance
}

/** new Draw(...) 返回的实例结构 */
export interface DrawExtendsApi extends DrawTempApi {
  /** 攻击箭头标绘模块 */
  attackArrowObj: AttackArrowInstance
  /** 直线箭头标绘模块 */
  straightArrowObj: StraightArrowInstance
  /** 钳击箭头标绘模块 */
  pincerArrowObj: PincerArrowInstance
}

/** 绘制模块主体（混入 Base、Math3d、Math2d 的方法） */
const DrawTemp = createSingleImport<DrawTempApi>([Base, Math3d, Math2d], DrawCom, 'draw')

/**
 * 创建绘制模块：在基础绘制能力上追加三种箭头标绘实例
 * @param obj - 初始化参数
 * @returns 完整的绘制模块对象
 */
function createDraw(obj: SingleImportOptions): DrawExtendsApi {
  const res = new DrawTemp(obj)
  // 与 initSingleImportModule 一致：`Cesium` 是 `cesiumGlobal` 的别名
  const cesiumGlobal = obj.cesiumGlobal ?? obj.Cesium
  const attackArrowObj = new AttackArrow(res.viewer, cesiumGlobal)
  const straightArrowObj = new StraightArrow(res.viewer, cesiumGlobal)
  const pincerArrowObj = new PincerArrow(res.viewer, cesiumGlobal)
  return {
    ...res,
    attackArrowObj,
    straightArrowObj,
    pincerArrowObj
  }
}

/**
 * 标绘模块（单独引入版）
 */
export const Draw = createDraw as unknown as SingleImportConstructor<DrawExtendsApi>
