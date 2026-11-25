import assert from 'node:assert'
import { AttackArrow } from '../src/utils/cesiumPluginsExtends/libs/plot/AttackArrow'
import { StraightArrow } from '../src/utils/cesiumPluginsExtends/libs/plot/StraightArrow'
import { PincerArrow } from '../src/utils/cesiumPluginsExtends/libs/plot/PincerArrow'

/** 构造一个最小可用的 Cesium mock，用 marker 区分不同实例 */
function makeCesium(marker: string) {
  function Color(_r?: any, _g?: any, _b?: any, _a?: any) {
    this.marker = marker
  }
  Color.RED = { withAlpha: () => ({ marker: marker + ':RED' }) }
  Color.YELLOW = { withAlpha: () => ({ marker: marker + ':YELLOW' }) }
  Color.fromCssColorString = () => ({ withAlpha: () => ({ marker: marker + ':BLUE' }) })
  Color.CYAN = { marker: marker + ':CYAN' }
  Color.BLACK = { marker: marker + ':BLACK' }
  Color.GOLD = { marker: marker + ':GOLD' }

  return {
    Color,
    ScreenSpaceEventHandler: class {
      constructor() {}
      destroy() {}
      setInputAction() {}
    },
    Cartesian3: { fromDegrees: () => ({}) },
    Cartesian2: class {
      constructor() {}
    },
    CustomDataSource: class {
      name: string
      constructor(name: string) {
        this.name = name
      }
    },
    LabelGraphics: class {
      constructor(o: any) {
        Object.assign(this, o)
      }
    },
    LabelStyle: { FILL_AND_OUTLINE: 'fill-outline' },
    VerticalOrigin: { BOTTOM: 0 },
    HeightReference: { NONE: 0, RELATIVE_TO_TERRAIN: 1 },
    defined: (v: any) => v !== undefined && v !== null,
    Math: { toDegrees: (r: number) => (r * 180) / Math.PI }
  }
}

function makeViewer() {
  const layers: any[] = []
  return {
    scene: {
      canvas: {},
      globe: { ellipsoid: { cartesianToCartographic: () => ({ latitude: 0, longitude: 0 }) } }
    },
    dataSources: { add: (ds: any) => layers.push(ds) },
    entities: { add: (e: any) => e, remove: () => {} },
    camera: { getPickRay: () => null }
  }
}

// 1. 三个箭头模块构造不抛错，且使用各自传入的 Cesium
{
  const cA = makeCesium('A')
  const cB = makeCesium('B')
  const a: any = new AttackArrow(makeViewer(), cA)
  const b: any = new AttackArrow(makeViewer(), cB)
  assert.equal(a.fillMaterial.marker, 'A:RED', 'AttackArrow a 使用 cA 的材质')
  assert.equal(b.fillMaterial.marker, 'B:RED', 'AttackArrow b 使用 cB 的材质')
  // 创建 b 之后 a 仍保持自己的 _Cesium
  assert.equal(a._Cesium.Color.CYAN.marker, 'A:CYAN', 'a 实例闭包隔离')

  const s: any = new StraightArrow(makeViewer(), cA)
  const p: any = new PincerArrow(makeViewer(), cB)
  assert.equal(s.fillMaterial.marker, 'A:BLUE', 'StraightArrow 使用 cA')
  assert.equal(p.fillMaterial.marker, 'B:YELLOW', 'PincerArrow 使用 cB')
}

console.log('✔ plot 模块闭包隔离测试通过')
