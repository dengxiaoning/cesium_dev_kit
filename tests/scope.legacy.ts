import assert from 'node:assert'
import { Math3d } from '../src/utils/cesiumPluginsExtends/libs/Math3d'
import { Base } from '../src/utils/cesiumPluginsExtends/libs/Base'
import { Graphics as GraphicsCom } from '../src/utils/cesiumPluginsExtends/libs/Graphics'
import { initSingleImportModule } from '../src/utils/cesiumPluginsExtends/singleImport/Base'
import { getErrorHandler, setErrorHandler } from '../src/utils/cesiumPluginsExtends/libs/errors'

/** 构造一个最小可用的 Cesium 全局对象 mock，用 marker 区分不同实例 */
function makeCesium(marker: string) {
  const Cesium: any = {}
  const Scene: any = {}
  Cesium.Scene = Scene

  class Cartesian3 {
    x: number
    y: number
    z: number
    constructor(x: number, y: number, z: number) {
      this.x = x
      this.y = y
      this.z = z
    }
  }
  class Entity {
    marker = marker
  }
  class CustomDataSource {
    constructor(public name: string) {}
  }

  Cesium.Cartesian3 = Cartesian3
  Cesium.Entity = Entity
  Cesium.CustomDataSource = CustomDataSource
  Cesium.UrlTemplateImageryProvider = class {
    constructor(public options: any) {}
  }
  Cesium.WebMapTileServiceImageryProvider = class {
    constructor(public options: any) {}
  }
  Cesium.defaultValue = (a: any, b: any) => (a !== undefined ? a : b)
  Cesium.defined = (a: any) => a !== undefined && a !== null
  Cesium.destroyObject = (o: any) => o
  Cesium.Matrix3 = class {}
  Cesium.Matrix4 = {
    IDENTITY: {},
    clone: () => ({}),
    getMatrix3: () => ({}),
    getRotation: () => ({})
  }
  Cesium.DrawCommand = class {
    constructor(o: any) {
      Object.assign(this, o)
    }
  }
  Cesium.SceneMode = { SCENE3D: 1, MORPHING: 2 }
  Cesium.BoxGeometry = class {}
  Cesium.Transforms = {}
  Cesium.VertexFormat = {}
  Cesium.BufferUsage = {}
  Cesium.CubeMap = class {}
  Cesium.loadCubeMap = () => {}
  Cesium.RenderState = {}
  Cesium.VertexArray = class {}
  Cesium.BlendingState = {}
  Cesium.ShaderProgram = class {}
  Cesium.ShaderSource = class {}
  Cesium.GeometryPipeline = { createAttributeLocations: () => ({}) }
  Cesium.ScreenSpaceEventType = {}
  Cesium.Math = {}
  return Cesium
}

function makeViewer() {
  const layers: any[] = []
  return {
    dataSources: {
      add: (ds: any) => layers.push(ds),
      _layers: layers
    },
    entities: { add: (e: any) => e },
    imageryLayers: { addImageryProvider: (p: any) => p },
    scene: { primitives: { add: (p: any) => p } },
    cesiumWidget: { creditContainer: { style: {} } },
    screenSpaceEventHandler: { removeInputAction: () => {} }
  }
}

// 1. Math3d 闭包按实例隔离
{
  class A {
    aX: number
    constructor(x: number, _y: number, _z: number) {
      this.aX = x
    }
  }
  class B {
    bX: number
    constructor(x: number, _y: number, _z: number) {
      this.bX = x
    }
  }
  const a: any = new Math3d({}, { Cartesian3: A })
  const b: any = new Math3d({}, { Cartesian3: B })
  const av = a.splitCartesians3([1, 2, 3])[0]
  const bv = b.splitCartesians3([4, 5, 6])[0]
  assert.equal(av.aX, 1, 'a 实例应使用自己的 Cesium.Cartesian3')
  assert.equal(av.bX, undefined, 'a 实例不应受 b 实例 Cesium 影响')
  assert.equal(bv.bX, 4, 'b 实例应使用自己的 Cesium.Cartesian3')
  // 创建 b 之后 a 仍应使用自己的闭包
  const av2 = a.splitCartesians3([7, 8, 9])[0]
  assert.equal(av2.aX, 7, 'a 实例在 b 创建后仍应保持独立')
}

// 2. Base 闭包按实例隔离（含 createGraphics）
{
  const cesiumA = makeCesium('A')
  const cesiumB = makeCesium('B')
  const baseA: any = new Base(makeViewer(), cesiumA, {})
  const baseB: any = new Base(makeViewer(), cesiumB, {})
  const ea = baseA.createGraphics()
  const eb = baseB.createGraphics()
  assert.equal(ea.marker, 'A', 'baseA 的 Entity 来自 cesiumA')
  assert.equal(eb.marker, 'B', 'baseB 的 Entity 来自 cesiumB')
  // baseA 在 baseB 创建后仍使用自己的闭包
  const ea2 = baseA.createGraphics()
  assert.equal(ea2.marker, 'A', 'baseA 在 baseB 创建后仍应保持独立')
}

// 3. singleImport 混入：父模块（Base）方法应绑定到已初始化的闭包，而非共享样例
{
  const cesium = makeCesium('single')
  const viewer = makeViewer()
  const result: any = initSingleImportModule({
    cesiumGlobal: cesium,
    viewer,
    baseExtendsCom: [Base],
    extendsCom: GraphicsCom,
    extendsComName: 'graphics'
  })
  const g = result.graphics
  assert.equal(typeof g.createGraphics, 'function', 'Base 方法应混入 Graphics 实例')
  assert.equal(typeof g.getPointGraphics, 'function', 'Graphics 自身方法应存在')
  assert.equal(g.myname, 'BASE', 'Base 构造字段应拷贝到实例')
  const e = g.createGraphics()
  assert.equal(e.marker, 'single', '混入后的 Base 方法应使用已初始化的 Cesium 闭包')
}

// 4. singleImport 支持 `Cesium` / `three` 别名（与 createContext 行为一致）
{
  const cesium = makeCesium('alias')
  const viewer = makeViewer()
  const result: any = initSingleImportModule({
    Cesium: cesium,
    viewer,
    baseExtendsCom: [Base],
    extendsCom: GraphicsCom,
    extendsComName: 'graphics'
  })
  const g = result.graphics
  const e = g.createGraphics()
  assert.equal(e.marker, 'alias', '只传 Cesium 别名时也应正常初始化，而不是抛 MISSING_CESIUM')
}

// 5. singleImport 与 createKit 参数对齐：assetsBaseUrl / onError 都应生效
{
  const cesium = makeCesium('opts')
  const viewer = makeViewer()
  const handler = () => {}
  const result: any = initSingleImportModule({
    Cesium: cesium,
    viewer,
    assetsBaseUrl: 'https://cdn.example.com/static/',
    onError: handler,
    baseExtendsCom: [Base],
    extendsCom: GraphicsCom,
    extendsComName: 'graphics'
  })
  assert.equal(getErrorHandler(), handler, 'onError 应被注册为错误处理器')
  assert.equal(
    result.graphics.getDfSt(['skyBox', 'one', 'positiveX']),
    'https://cdn.example.com/static/static/data/images/SkyBox/00h+00.jpg',
    'assetsBaseUrl 应作为静态资源前缀'
  )
  setErrorHandler(null)
}

console.log('✔ scope 闭包隔离测试通过')
