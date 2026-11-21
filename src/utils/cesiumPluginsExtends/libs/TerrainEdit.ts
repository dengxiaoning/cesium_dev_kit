import {
  createScopedConstructor,
  attachDestroy,
  registerCleanup
} from './Base'
import type { Viewer } from './Base'
import { CesiumDevKitError, reportError } from './errors'
import type { ThreeJsInstance } from './ThreeJs'
import {
  applyBrush,
  buildContourSegments,
  buildTerrainGrid,
  deformTerrain,
  dedupePolygon,
  gridLngLat,
  hash2d,
  innerHeightRange,
  metersPerDegLng,
  niceContourInterval,
  polygonArea,
  polygonCenter,
  terrainStats,
  terrainVertexColor
} from './terrain/terrainGrid'
import { buildImageryTextureFromLayers } from './terrain/terrainTexture'
import type {
  TerrainBrushMode,
  TerrainDeformOptions,
  TerrainEditMode,
  TerrainGrid,
  TerrainLngLat,
  TerrainLngLatHeight,
  TerrainStats
} from './terrain/terrainGrid'

/* ===== 对外类型 ===== */

export type { TerrainEditMode }

/** 多边形顶点输入：`[lng, lat]`、`[lng, lat, height]`、`{lng, lat}` 或 Cesium.Cartesian3 */
export type TerrainEditPosition =
  | [number, number]
  | [number, number, number]
  | TerrainLngLat
  | TerrainLngLatHeight
  | any

/** 绘制参数 */
export interface TerrainEditDrawOptions {
  /** 线条颜色，默认 `#7defff` */
  color?: string
  /** 线宽（像素），默认 4 */
  width?: number
  /** 绘制完成后回调，参数为经纬度顶点（度） */
  callback?: (polygon: TerrainLngLatHeight[]) => void
  /** 网格分辨率（每边划分数），默认 64 */
  segments?: number
}

/** 形变参数（在地形模块基础上增加了水位） */
export interface TerrainEditApplyOptions extends TerrainDeformOptions {
  /**
   * 水面高度：
   * - `0~1` 视为相对坑底的相对水位（0.3 表示坑深的 30%）
   * - 大于 `1` 视为绝对高程（米）
   * - `'auto'` 自动取坑底以上 28%
   * - `null` 不显示水面
   */
  waterLevel?: number | 'auto' | null
  /** 是否重建水面（默认 true） */
  rebuildWater?: boolean
}

/** 地形统计（附加水位信息） */
export interface TerrainEditStatsResult extends TerrainStats {
  /** 当前水面高程（米），无水面时为 null */
  waterLevel: number | null
  /** 顶点数量 */
  vertices: number
}

/** 笔刷参数（对应「按住拖动连续刷」的交互） */
export interface TerrainEditBrushOptions {
  /** 笔刷模式，默认 `lower`（下沉） */
  mode?: TerrainBrushMode
  /** 笔刷半径（米），默认 120 */
  radius?: number
  /** 强度 0~1，默认 0.5 */
  strength?: number
  /** 硬边比例 0~1，默认 0，即整圆软衰减 */
  hardness?: number
  /** 单次施加的最大高度变化（米），默认 12 */
  maxDelta?: number
  /**
   * 一笔之内同一位置最多叠加几次，默认 6。
   *
   * 一笔最深刻度约为 `maxDelta * strokeLimit`：单击只改一次，按住拖动会逐步加深。
   * 设成 1 等于「拖一整笔也只抵一次点击」，笔刷会显得没反应。
   */
  strokeLimit?: number
  /** `level` 模式的目标高程（米），缺省取落笔处原地形高度 */
  targetHeight?: number | null
}

/** 笔刷区域参数 */
export interface TerrainEditAreaOptions {
  /** 区域边长（米），默认 2000 */
  size?: number
  /** 每边划分数，默认 160 */
  segments?: number
  /** 边缘过渡宽度（米），默认 80 */
  feather?: number
  /** 是否取影像作为地表贴图，默认 true */
  texture?: boolean
}


/** 创建地形编辑模块的参数 */
export interface TerrainEditModuleOptions {
  /** 复用 kit 的 ThreeJs 实例（必填，且需先调用 initThree） */
  threeJs?: ThreeJsInstance
  /** 默认网格分辨率，默认 64 */
  segments?: number
  /** 默认边缘过渡宽度（米） */
  slopeWidth?: number
  /** 默认线条颜色 */
  color?: string
}

/**
 * TerrainEdit 实例类型
 */
export interface TerrainEditInstance {
  _viewer: Viewer
  _threeJs: ThreeJsInstance | null
  /**
   * 开始在地形上绘制编辑范围。
   *
   * 左键加点、移动鼠标实时预览、双击或右键结束；至少 3 个点才会生成地形块。
   * 绘制时依赖 `scene.pickPosition` / `globe.pick` 贴合真实地形，因此需要先设置
   * `viewer.terrainProvider`（真实地形）并开启 `depthTestAgainstTerrain`。
   *
   * @param options - 绘制样式与回调
   * @example
   * // 打开绘制：双击结束后会自动生成可编辑地形块
   * terrainEdit.beginDraw({
   *   color: '#7defff',
   *   callback: (polygon) => console.log('绘制完成', polygon)
   * })
   */
  beginDraw(options?: TerrainEditDrawOptions): TerrainEditInstance

  /**
   * 手动结束绘制（等价于双击 / 右键）。
   *
   * 点数不足 3 个时会自动取消，并触发 `onError`。
   */
  finishDraw(): TerrainEditInstance

  /**
   * 取消绘制并清除草稿线。
   */
  cancelDraw(): TerrainEditInstance

  /**
   * 直接指定多边形范围（不经过鼠标绘制）。
   *
   * 生成过程会按格网采样真实地形高度，因此返回 Promise；
   * 采样失败（例如没有配置地形）时自动退化为 0 高程平面。
   *
   * @param positions - 多边形顶点，支持 `[lng, lat]` / `{lng, lat}` / Cartesian3
   * @param options - 网格分辨率等参数
   * @example
   * await terrainEdit.setPolygon([
   *   [117.095, 36.245],
   *   [117.105, 36.245],
   *   [117.105, 36.255],
   *   [117.095, 36.255]
   * ])
   */
  setPolygon(positions: TerrainEditPosition[], options?: { segments?: number; slopeWidth?: number }): Promise<TerrainEditInstance>

  /**
   * 对当前范围执行一次形变。
   *
   * @param options - 形变参数
   * @example
   * // 塌陷 60 米，台阶高 6 米，水面自动
   * terrainEdit.apply({ mode: 'sink', depth: 60, stepHeight: 6, waterLevel: 'auto' })
   * // 再往上堆 20 米
   * terrainEdit.apply({ mode: 'raise', depth: 20 })
   */
  apply(options?: TerrainEditApplyOptions): TerrainEditInstance

  /**
   * 设置水面高度并立即重绘。
   * @param level - 相对水位（0~1）/ 绝对高程（米）/ 'auto' / null
   */
  setWaterLevel(level: number | 'auto' | null): TerrainEditInstance

  /**
   * 显示 / 隐藏台阶等高线（青色网格线）。
   * @param visible - true 显示，false 隐藏
   */
  setContourVisible(visible: boolean): TerrainEditInstance

  /**
   * 撤销上一次形变（最多保留 20 步）。
   */
  undo(): TerrainEditInstance

  /**
   * 清除地形块、水面与绘制状态。
   */
  clear(): TerrainEditInstance

  /**
   * 读取当前范围的地形统计：面积、最高最低点、挖填方量、水面高程。
   * @returns 统计结果；未设置范围时返回 null
   */
  getStats(): TerrainEditStatsResult | null

  /**
   * 获取当前多边形（度）。
   */
  getPolygon(): TerrainLngLatHeight[]

  /**
   * 就地开辟一块可连续涂抹的地形编辑区域（不需要先画多边形）。
   *
   * 区域是一个边长 `size` 米的正方形，内部按 `segments` 划分成规则格网，
   * 边缘按 `feather` 米羽化，因此刷到边界时不会出现断崖。
   * 建好之后配合 `enableBrush()` + 鼠标拖动即可像地形笔刷一样连续涂抹。
   *
   * @param center - 区域中心：`[lng, lat]` / `{lng, lat}` / `Cartesian3`
   * @param options - 区域尺寸与格网分辨率
   * @example
   * // 以当前视野中心为原点，铺一块 2km、160x160 的可编辑器
   * await terrainEdit.setArea([117.1, 36.25], { size: 2000, segments: 160 })
   * terrainEdit.enableBrush({ mode: 'lower', radius: 150, strength: 0.6 })
   */
  setArea(center: TerrainEditPosition, options?: TerrainEditAreaOptions): Promise<TerrainEditInstance>

  /**
   * 设置笔刷参数（不影响已刷出的地形）。
   * @param options - 模式、半径、强度、硬边、目标高度
   * @example
   * terrainEdit.setBrush({ mode: 'level', radius: 200, strength: 0.8, targetHeight: 900 })
   */
  setBrush(options?: TerrainEditBrushOptions): TerrainEditInstance

  /** 读取当前笔刷参数 */
  getBrush(): Required<Omit<TerrainEditBrushOptions, 'targetHeight'>> & { targetHeight: number | null }

  /**
   * 开启 / 关闭鼠标涂抹。
   *
   * 开启后会接管左键拖动（Cesium 的旋转相机被临时关闭，滚轮缩放仍可用），
   * 并显示贴地的圆形笔刷光标；关闭后恢复相机操作。
   * @param enabled - true 开启，false 关闭
   */
  enableBrush(enabled: boolean): TerrainEditInstance

  /**
   * 手动落笔：在一次涂抹中连续调用即可画出连续轨迹（等价于按住拖动）。
   *
   * 只在 `beginStroke()` 与 `endStroke()` 之间调用才会被合并成一步撤销。
   * @param lng - 经度
   * @param lat - 纬度
   */
  strokeAt(lng: number, lat: number): TerrainEditInstance

  /** 开始一次涂抹（记录撤销快照） */
  beginStroke(): TerrainEditInstance

  /** 结束一次涂抹（落定等高线与统计） */
  endStroke(): TerrainEditInstance

  /**
   * 是否用影像贴图显示编辑区（默认 true）。
   *
   * 开启后会向当前影像图层要瓦片，把地表纹理贴到编辑区，
   * 挖开的地表仍是它本来的颜色，而不是一块纯色网格。
   */
  setTextureEnabled(enabled: boolean): TerrainEditInstance

  /**
   * 重建地表贴图（例如切换了影像图层、或区域范围变了之后）。
   */
  refreshTexture(): Promise<TerrainEditInstance>

  /**
   * 释放全部资源（three 网格、绘制的实体、事件监听）。
   */
  dispose(): void

  /** 兼容 kit 的统一销毁入口 */
  destroy(): void
}

/** TerrainEdit 构造函数类型 */
export interface TerrainEditConstructor {
  new (
    viewer?: Viewer,
    cesiumGlobal?: any,
    threeGlobal?: any,
    threeJs?: ThreeJsInstance,
    options?: TerrainEditModuleOptions
  ): TerrainEditInstance
  prototype: TerrainEditInstance
}

/**
 * 地形编辑：在 Cesium 地球上圈定范围，做塌陷 / 抬升 / 平整 / 平滑，并叠加水面与台阶。
 *
 * ## 实现思路
 *
 * Cesium 没有开放「写地形」的接口（`terrainProvider` 只读），所以这里采用
 * **采样真实地形 + Three.js 局部网格覆盖** 的方式：
 *
 * 1. 绘制多边形后，在多边形包围盒内生成规则格网，用 `sampleTerrainMostDetailed`
 *    采样真实地形高度作为基准面；
 * 2. 形变只在多边形内部按「到边界的距离」加权生效，边界处权重为 0，
 *    因此覆盖网格与原始地形在坑口处严丝合缝，不会有悬空或裂缝；
 * 3. 用 Three.js 渲染这张带顶点色的网格，配合 `stepHeight` 生成台阶、
 *    水面与等高线，视觉上就是被挖开的矿坑 / 被堆起来的土方。
 *
 * 如果后续要把形变写回 Cesium 地形，可以基于同一份 `TerrainGrid` 生成
 * `CustomHeightmapTerrainProvider` 的高度图，形变算法不需要改。
 *
 * @class
 * @param viewer - cesium viewer 实例
 * @param cesiumGlobal - Cesium 全局对象
 * @param threeGlobal - THREE 全局对象
 * @param threeJs - 已 initThree 的 ThreeJs 实例
 * @param options - 默认参数
 */
/**
 * 为每个实例创建独立闭包，避免模块级 Cesium/THREE 在多个 viewer 间共享。
 * 由 createScopedConstructor 在每次 new 时调用。
 */
export function createTerrainEditModule() {
  let Cesium: any = null
  let THREE: any = null

  const DEFAULT_SEGMENTS = 64
  const MAX_HISTORY = 20
  const DRAFT_SOURCE_NAME = 'cesium-dev-kit-terrain-edit'

  const TerrainEdit = function (
    this: TerrainEditInstance & Record<string, any>,
    viewer?: Viewer,
    cesiumGlobal?: any,
    threeGlobal?: any,
    threeJs?: ThreeJsInstance,
    options?: TerrainEditModuleOptions
  ) {
    if (!viewer) {
      throw new CesiumDevKitError('INVALID_ARGUMENT', 'TerrainEdit 需要传入 viewer')
    }
    if (!cesiumGlobal) {
      throw new CesiumDevKitError('INVALID_ARGUMENT', 'TerrainEdit 需要传入 Cesium 全局对象')
    }
    Cesium = cesiumGlobal
    THREE = threeGlobal || null
    this._viewer = viewer
    this._threeJs = threeJs || (options && options.threeJs) || null
    this._options = options || {}
    this._polygon = []
    this._polygonHeight = []
    this._grid = null
    this._history = []
    this._root = null
    this._waterLevel = null
    this._stepHeight = 0
    this._showGrid = true
    // 笔刷
    this._brush = {
      mode: 'lower',
      radius: 110,
      strength: 0.5,
      hardness: 0,
      maxDelta: 12,
      strokeLimit: 6,
      targetHeight: null
    }
    this._brushEnabled = false
    this._brushHandler = null
    this._stroking = false
    this._brushCursor = null
    this._brushPointer = null
    // 本笔起始高度快照：同一定点被反复命中也只累计到 maxDelta * strokeLimit，
    // 既不会刷出几百米深井，也不会像「只给 maxDelta」那样整笔和单击一样浅
    this._strokeBase = null
    // level 模式自动推断出来的目标高度：只在本次笔画内有效，抬笔后清掉
    this._targetAuto = false
    // 贴图与网格缓存
    this._useTexture = true
    this._texture = null
    this._surface = null
    this._localXZ = null
    this._baseColors = null
    this._lastContourAt = 0
    this._up = null
    this._areaMode = false
    this._textureToken = 0
    this._contourInterval = 0
    this._dirty = false
    this._prevController = undefined
    this._drawing = false
    this._draftPoints = []
    this._handler = null
    this._draftSource = null
    this._disposed = false

    attachDestroy(this)
    registerCleanup(this, () => this.dispose())
  } as unknown as TerrainEditConstructor

  TerrainEdit.prototype = {
    /**
     * 获取 three 场景（ThreeJs.initThree 的返回值）
     * @private
     */
    _getScene(this: TerrainEditInstance & Record<string, any>) {
      const threeJs: any = this._threeJs
      const scene = threeJs && threeJs._three && threeJs._three.scene
      if (!scene) {
        throw new CesiumDevKitError(
          'INVALID_ARGUMENT',
          'TerrainEdit 需要 three.js 场景：请先 createKit({ three: THREE })，再调用 kit.threeJs.initThree({ center })'
        )
      }
      return scene
    },

    /**
     * 经纬度 + 高度 -> three 局部坐标（以 initThree 的 center 为原点）
     * @private
     */
    _toLocal(this: TerrainEditInstance & Record<string, any>, lng: number, lat: number, height: number) {
      const scene = this._getScene()
      const world = scene.positionToWorldVector([lng, lat, height])
      return scene.childrenGroup.worldToLocal(world.clone())
    },

    /**
     * 把各种入参统一成 {lng, lat, height}
     * @private
     */
    _normalizePositions(this: TerrainEditInstance & Record<string, any>, positions: TerrainEditPosition[]) {
      const list: TerrainLngLatHeight[] = []
      for (const item of positions || []) {
        if (!item) continue
        if (Array.isArray(item)) {
          if (item.length < 2) continue
          const lng = Number(item[0])
          const lat = Number(item[1])
          const height = item.length > 2 ? Number(item[2]) : 0
          if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue
          list.push({ lng, lat, height: Number.isFinite(height) ? height : 0 })
          continue
        }
        if (typeof item.longitude === 'number' && typeof item.latitude === 'number') {
          const c = Cesium.Cartographic.fromRadians(item.longitude, item.latitude, item.height || 0)
          list.push({
            lng: Cesium.Math.toDegrees(c.longitude),
            lat: Cesium.Math.toDegrees(c.latitude),
            height: c.height || 0
          })
          continue
        }
        if (typeof item.lng === 'number' && typeof item.lat === 'number') {
          list.push({ lng: item.lng, lat: item.lat, height: Number(item.height) || 0 })
          continue
        }
        if (typeof item.x === 'number' && typeof item.y === 'number' && typeof item.z === 'number') {
          const c = Cesium.Cartographic.fromCartesian(item)
          list.push({
            lng: Cesium.Math.toDegrees(c.longitude),
            lat: Cesium.Math.toDegrees(c.latitude),
            height: c.height || 0
          })
        }
      }
      return list
    },

    /**
     * 拾取屏幕坐标对应的地形点
     * @private
     */
    _pickTerrain(this: TerrainEditInstance & Record<string, any>, windowPosition: any) {
      const viewer = this._viewer
      const scene = viewer.scene
      let cartesian: any = null
      try {
        if (scene.pickPositionSupported && scene.globe.depthTestAgainstTerrain) {
          cartesian = scene.pickPosition(windowPosition)
        }
      } catch (err) {
        cartesian = null
      }
      if (!cartesian) {
        const ray = viewer.camera.getPickRay(windowPosition)
        if (ray) cartesian = scene.globe.pick(ray, scene)
      }
      if (!cartesian) {
        cartesian = viewer.camera.pickEllipsoid(windowPosition, scene.globe.ellipsoid)
      }
      return cartesian
    },

    /**
     * 创建绘制用的数据源
     * @private
     */
    _ensureDraftSource(this: TerrainEditInstance & Record<string, any>) {
      if (this._draftSource) return this._draftSource
      const source = new Cesium.CustomDataSource(DRAFT_SOURCE_NAME)
      this._viewer.dataSources.add(source)
      this._draftSource = source
      return source
    },

    /**
     * 草稿顶点转 Cartesian3（可附带鼠标位置的预览点）
     * @private
     */
    _draftCartesians(this: TerrainEditInstance & Record<string, any>, includeCursor: boolean, minCount: number) {
      const points: TerrainLngLatHeight[] = this._draftPoints.slice()
      if (includeCursor && this._draftCursor) points.push(this._draftCursor)
      if (points.length < minCount) return []
      return points.map((p: TerrainLngLatHeight) => Cesium.Cartesian3.fromDegrees(p.lng, p.lat, 0))
    },

    /**
     * 创建绘制草稿（折线用 CallbackProperty 跟随鼠标，避免每帧重建实体）
     * @private
     */
    _ensureDraftGraphics(this: TerrainEditInstance & Record<string, any>) {
      if (this._draftOutline) return
      const source = this._ensureDraftSource()
      const color = Cesium.Color.fromCssColorString(this._drawColor || '#7defff')
      this._draftOutline = source.entities.add({
        name: 'terrain-edit-outline',
        polyline: {
          positions: new Cesium.CallbackProperty(() => this._draftCartesians(true, 2), false),
          width: this._drawWidth || 4,
          clampToGround: true,
          material: new Cesium.PolylineGlowMaterialProperty({ glowPower: 0.18, color })
        }
      })
    },

    /**
     * 第 3 个点落下后补一块半透明填充
     * @private
     */
    _ensureDraftFill(this: TerrainEditInstance & Record<string, any>) {
      if (this._draftFill) return
      const source = this._ensureDraftSource()
      const color = Cesium.Color.fromCssColorString(this._drawColor || '#3fd8ff')
      this._draftFill = source.entities.add({
        name: 'terrain-edit-fill',
        polygon: {
          hierarchy: new Cesium.CallbackProperty(
            () => new Cesium.PolygonHierarchy(this._draftCartesians(true, 3)),
            false
          ),
          material: color.withAlpha(0.16),
          classificationType: Cesium.ClassificationType.BOTH,
          perPositionHeight: false
        }
      })
    },

    /**
     * 追加一个绘制顶点
     * @private
     */
    _addDraftVertex(this: TerrainEditInstance & Record<string, any>, point: TerrainLngLatHeight) {
      const source = this._ensureDraftSource()
      this._draftPoints.push(point)
      this._draftCursor = null
      source.entities.add({
        name: 'terrain-edit-vertex',
        position: Cesium.Cartesian3.fromDegrees(point.lng, point.lat, 0),
        point: {
          pixelSize: this._draftPoints.length === 1 ? 10 : 8,
          color: Cesium.Color.fromCssColorString(this._draftPoints.length === 1 ? '#ffe066' : '#ffffff'),
          outlineColor: Cesium.Color.fromCssColorString('#0b2a3a'),
          outlineWidth: 2,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        }
      })
      if (this._draftPoints.length >= 3) this._ensureDraftFill()
    },

    /**
     * 移除草稿图形
     * @private
     */
    _clearDraft(this: TerrainEditInstance & Record<string, any>) {
      if (this._draftSource && this._viewer && !this._viewer.isDestroyed()) {
        this._draftSource.entities.removeAll()
      }
      this._draftPoints = []
      this._draftCursor = null
      this._draftOutline = null
      this._draftFill = null
    },

    /**
     * 解绑鼠标事件
     * @private
     */
    _destroyHandler(this: TerrainEditInstance & Record<string, any>) {
      const handler = this._handler
      this._handler = null
      if (handler) {
        try {
          if (!handler.isDestroyed()) handler.destroy()
        } catch (err) {
          reportError(err, { scope: 'TerrainEdit.destroyHandler' })
        }
      }
    },

    /**
     * 开始绘制编辑范围
     * @function
     */
    beginDraw(this: TerrainEditInstance & Record<string, any>, options?: TerrainEditDrawOptions) {
      if (this._disposed) return this
      this.cancelDraw()
      this._drawing = true
      this._draftPoints = []
      this._drawColor = (options && options.color) || this._options.color || '#7defff'
      this._drawWidth = (options && options.width) || 4
      this._drawSegments = (options && options.segments) || this._options.segments || DEFAULT_SEGMENTS
      this._drawCallback = options && options.callback
      this._draftCursor = null
      this._ensureDraftSource()
      this._ensureDraftGraphics()

      const handler = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas)
      this._handler = handler

      handler.setInputAction((movement: any) => {
        const cartesian = this._pickTerrain(movement.position)
        if (!cartesian) return
        const carto = Cesium.Cartographic.fromCartesian(cartesian)
        if (!carto) return
        this._addDraftVertex({
          lng: Cesium.Math.toDegrees(carto.longitude),
          lat: Cesium.Math.toDegrees(carto.latitude),
          height: carto.height || 0
        })
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

      handler.setInputAction((movement: any) => {
        if (!this._draftPoints.length) return
        const cartesian = this._pickTerrain(movement.endPosition)
        if (!cartesian) {
          this._draftCursor = null
          return
        }
        const carto = Cesium.Cartographic.fromCartesian(cartesian)
        if (!carto) return
        // CallbackProperty(isConstant=false) 每帧重新取值，这里只更新数据
        this._draftCursor = {
          lng: Cesium.Math.toDegrees(carto.longitude),
          lat: Cesium.Math.toDegrees(carto.latitude),
          height: carto.height || 0
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

      handler.setInputAction(() => this.finishDraw(), Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
      handler.setInputAction(() => this.finishDraw(), Cesium.ScreenSpaceEventType.RIGHT_CLICK)
      return this
    },

    /**
     * 结束绘制
     * @function
     */
    finishDraw(this: TerrainEditInstance & Record<string, any>) {
      if (!this._drawing) return this
      const raw = this._draftPoints.slice()
      const polygon = dedupePolygon(raw, 1e-7)
      this._drawing = false
      this._destroyHandler()

      if (polygon.length < 3) {
        this._clearDraft()
        reportError(
          new CesiumDevKitError('INVALID_ARGUMENT', '地形编辑至少需要 3 个顶点，请重新绘制'),
          { scope: 'TerrainEdit.finishDraw' }
        )
        return this
      }

      this._clearDraft()
      const callback = this._drawCallback
      const done = this.setPolygon(polygon, {
        segments: this._drawSegments,
        slopeWidth: this._options.slopeWidth
      })
      done
        .then(() => {
          if (typeof callback === 'function') callback(this.getPolygon())
        })
        .catch((err) => reportError(err, { scope: 'TerrainEdit.finishDraw' }))
      return this
    },

    /**
     * 取消绘制
     * @function
     */
    cancelDraw(this: TerrainEditInstance & Record<string, any>) {
      this._drawing = false
      this._destroyHandler()
      this._clearDraft()
      return this
    },

    /**
     * 采样格网顶点的真实地形高度
     * @private
     */
    async _sampleHeights(this: TerrainEditInstance & Record<string, any>, grid: TerrainGrid) {
      const cartographics: any[] = []
      const indices: number[] = []
      for (let i = 0; i < grid.vertexCount; i++) {
        if (!grid.inside[i]) continue
        const { lng, lat } = gridLngLat(grid, i)
        cartographics.push(Cesium.Cartographic.fromDegrees(lng, lat))
        indices.push(i)
      }

      let heights: number[] | null = null
      if (cartographics.length) {
        const provider = this._viewer.terrainProvider
        const isEllipsoid =
          !provider || (Cesium.EllipsoidTerrainProvider && provider instanceof Cesium.EllipsoidTerrainProvider)
        if (!isEllipsoid) {
          try {
            const sampled = await Cesium.sampleTerrainMostDetailed(provider, cartographics)
            heights = sampled.map((c: any) => c.height || 0)
          } catch (err) {
            try {
              const sampled = await Cesium.sampleTerrain(provider, 13, cartographics)
              heights = sampled.map((c: any) => c.height || 0)
            } catch (err2) {
              reportError(err2, { scope: 'TerrainEdit.sampleHeights' })
            }
          }
        }
      }

      for (let k = 0; k < indices.length; k++) {
        const index = indices[k]
        grid.base[index] = heights ? heights[k] || 0 : 0
      }
      grid.current = new Float32Array(grid.base)
      return grid
    },

    /**
     * 设置编辑范围
     * @function
     */
    async setPolygon(
      this: TerrainEditInstance & Record<string, any>,
      positions: TerrainEditPosition[],
      options?: { segments?: number; slopeWidth?: number }
    ) {
      const list: TerrainLngLatHeight[] = dedupePolygon(this._normalizePositions(positions), 1e-9)
      if (list.length < 3) {
        throw new CesiumDevKitError('INVALID_ARGUMENT', '地形编辑至少需要 3 个有效顶点')
      }
      const segments = (options && options.segments) || this._options.segments || DEFAULT_SEGMENTS
      const slopeWidth = (options && options.slopeWidth) || this._options.slopeWidth
      const grid = buildTerrainGrid(list, { segments, slopeWidth })
      await this._sampleHeights(grid)

      this._polygon = list.map((p) => ({ lng: p.lng, lat: p.lat }))
      this._polygonHeight = list.map((p) => p.height || 0)
      this._grid = grid
      this._history = []
      this._waterLevel = null
      // 范围变了，旧贴图（按旧包围盒裁的 UV）不能再用
      this._texture = null
      this._textureToken++
      this._rebuild()
      this._renderBoundary()
      if (this._useTexture) this._requestTexture()
      return this
    },

    /**
     * 在地面上绘制编辑范围边框（贴地）
     * @private
     */
    _renderBoundary(this: TerrainEditInstance & Record<string, any>) {
      if (!this._polygon.length) return
      // 笔刷区域是人为划的矩形，画出来像「贴片」，不显示
      if (this._areaMode) return
      const source = this._ensureDraftSource()
      if (this._boundaryEntity) {
        source.entities.remove(this._boundaryEntity)
        this._boundaryEntity = null
      }
      const positions = this._polygon.map((p: TerrainLngLat) =>
        Cesium.Cartesian3.fromDegrees(p.lng, p.lat, 0)
      )
      positions.push(positions[0])
      this._boundaryEntity = source.entities.add({
        name: 'terrain-edit-boundary',
        polyline: {
          positions,
          width: 3,
          clampToGround: true,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.12,
            color: Cesium.Color.fromCssColorString('#9ff6ff')
          })
        }
      })
    },

    /**
     * 用双线性插值取格网上任意点的高度
     * @private
     */
    _heightAt(this: TerrainEditInstance & Record<string, any>, lng: number, lat: number) {
      const grid: TerrainGrid | null = this._grid
      if (!grid) return 0
      const { bounds, stride, segments, current } = grid
      const fx = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * segments
      const fy = ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * segments
      const col = Math.max(0, Math.min(segments - 1, Math.floor(fx)))
      const row = Math.max(0, Math.min(segments - 1, Math.floor(fy)))
      const tx = Math.max(0, Math.min(1, fx - col))
      const ty = Math.max(0, Math.min(1, fy - row))
      const i00 = row * stride + col
      const i10 = i00 + 1
      const i01 = i00 + stride
      const i11 = i01 + 1
      const a = current[i00] * (1 - tx) + current[i10] * tx
      const b = current[i01] * (1 - tx) + current[i11] * tx
      return a * (1 - ty) + b * ty
    },

    /**
     * 清空 three 场景里的地形对象
     * @private
     */
    _clearMeshes(this: TerrainEditInstance & Record<string, any>) {
      const root = this._root
      const scene = this._threeJs && (this._threeJs as any)._three && (this._threeJs as any)._three.scene
      if (!root) return
      root.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material]
          materials.forEach((m: any) => m && m.dispose && m.dispose())
        }
      })
      if (scene && scene.remove) scene.remove(root)
      this._root = null
    },

    /**
     * 重建 three 网格、水面与等高线
     * @private
     */
    _rebuild(this: TerrainEditInstance & Record<string, any>) {
      if (!this._grid || !THREE || !this._polygon.length) return this
      const scene = this._getScene()
      // 以多边形中心为新原点：three 局部坐标范围更小，避免远离原点时的精度抖动
      const center = polygonCenter(this._polygon)
      scene.lngLat = [center.lng, center.lat]
      scene.updateGroupMatrixWorld()
      scene.updateMatrixWorld(true)

      this._clearMeshes()
      const root = new THREE.Group()
      root.name = 'terrain-edit-root'
      scene.add(root)
      this._root = root

      const grid = this._grid
      const stats = terrainStats(grid, this._polygon, grid.current)
      const waterLevel = this._waterLevel
      const span = Math.max(1, stats.maxHeight - stats.minHeight)
      const stride = grid.stride

      // 局部坐标缓存：position = baseXZ + up * height。
      // 涂抹时只有高度变，把水平位置与「上方向」缓存下来，每帧只改一个分量，
      // 不必对每个顶点重新做 ECEF -> 局部 的换算（160x160 会直接掉帧）。
      const upA = this._toLocal(center.lng, center.lat, 0)
      const upB = this._toLocal(center.lng, center.lat, 100)
      const up = new THREE.Vector3().subVectors(upB, upA).normalize()
      this._up = up

      const positions = new Float32Array(grid.vertexCount * 3)
      const colors = new Float32Array(grid.vertexCount * 3)
      const uvs = new Float32Array(grid.vertexCount * 2)
      const localXZ = new Float32Array(grid.vertexCount * 3)
      const texture = this._texture
      const useMap = !!(texture && texture.canvas)

      for (let i = 0; i < grid.vertexCount; i++) {
        const row = Math.floor(i / stride)
        const col = i % stride
        const { lng, lat } = gridLngLat(grid, i)
        const base = this._toLocal(lng, lat, 0)
        localXZ[i * 3] = base.x
        localXZ[i * 3 + 1] = base.y
        localXZ[i * 3 + 2] = base.z
        const h = grid.current[i]
        positions[i * 3] = base.x + up.x * h
        positions[i * 3 + 1] = base.y + up.y * h
        positions[i * 3 + 2] = base.z + up.z * h
        if (texture && texture.uv) {
          const pair = texture.uv(lng, lat)
          uvs[i * 2] = pair[0]
          uvs[i * 2 + 1] = pair[1]
        }
        const ratio = (stats.maxHeight - h) / span
        const underwater = waterLevel != null && h < waterLevel
        // 有贴图时顶点色只负责「明暗」，颜色交给影像；没贴图时才用岩土色
        const color = useMap ? ([1, 1, 1] as [number, number, number]) : terrainVertexColor(ratio, hash2d(col, row), underwater)
        colors[i * 3] = color[0]
        colors[i * 3 + 1] = color[1]
        colors[i * 3 + 2] = color[2]
      }
      this._localXZ = localXZ

      const indices: number[] = []
      for (let row = 0; row < grid.segments; row++) {
        for (let col = 0; col < grid.segments; col++) {
          const a = row * stride + col
          const b = a + 1
          const c = a + stride
          const d = c + 1
          if (!(grid.inside[a] && grid.inside[b] && grid.inside[c] && grid.inside[d])) continue
          indices.push(a, c, b, b, c, d)
        }
      }

      if (!indices.length) return this

      // 统一绕序：保证法线朝上（局部坐标系经过多次旋转，不能凭经验假设正方向）
      const pA = new THREE.Vector3(positions[indices[0] * 3], positions[indices[0] * 3 + 1], positions[indices[0] * 3 + 2])
      const pB = new THREE.Vector3(positions[indices[1] * 3], positions[indices[1] * 3 + 1], positions[indices[1] * 3 + 2])
      const pC = new THREE.Vector3(positions[indices[2] * 3], positions[indices[2] * 3 + 1], positions[indices[2] * 3 + 2])
      const normal = new THREE.Vector3().subVectors(pB, pA).cross(new THREE.Vector3().subVectors(pC, pA))
      if (normal.dot(up) < 0) {
        for (let i = 0; i < indices.length; i += 3) {
          const tmp = indices[i + 1]
          indices[i + 1] = indices[i + 2]
          indices[i + 2] = tmp
        }
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
      geometry.setIndex(indices)
      geometry.computeVertexNormals()
      geometry.computeBoundingSphere()

      // 按「法线相对地表法线」把明暗烘进顶点色：平地面亮度严格 1.0
      // （有贴图时影像原样输出），只有坡面才变暗，这样贴图颜色和周围影像对得上，
      // 同时还能看出地形起伏。
      // 底色单独存一份，涂抹时按新的法线重烘一次，否则挖出来的坑看着还是平的。
      this._baseColors = (geometry.getAttribute('color').array as Float32Array).slice()
      this._bakeShading(geometry)

      const material = this._makeSurfaceMaterial(texture && texture.canvas)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.name = 'terrain-edit-surface'
      root.add(mesh)
      this._surface = mesh

      // 灯光只给水面等其它元素用；地表靠顶点色明暗，不再参与实时光照。
      const hemi = new THREE.HemisphereLight(0xffffff, 0x5a6572, 1.0)
      hemi.name = 'terrain-edit-hemi'
      const sun = new THREE.DirectionalLight(0xffffff, 0.55)
      sun.position.set(0.35, 1, 0.3)
      sun.name = 'terrain-edit-sun'
      root.add(hemi)
      root.add(sun)

      // 等高线：用 marching squares 按固定等高距生成，跟地形软件的观感一致
      // （缓坡上稀疏、陡坡上密集），而不是把格网边画成三角线框
      this._buildContours()

      // 坑口轮廓线：笔刷区域模式下不需要（边界是人为划的，画出来反而像贴片）
      if (!this._areaMode) {
        const rimPositions: number[] = []
        this._polygon.forEach((p: TerrainLngLat) => {
          const local = this._toLocal(p.lng, p.lat, this._heightAt(p.lng, p.lat) + 0.6)
          rimPositions.push(local.x, local.y, local.z)
        })
        if (rimPositions.length >= 6) {
          const rimGeometry = new THREE.BufferGeometry()
          rimGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rimPositions, 3))
          const rimMaterial = new THREE.LineBasicMaterial({
            color: 0xc4f7ff,
            transparent: true,
            opacity: 0.95
          })
          const rim = new THREE.LineLoop(rimGeometry, rimMaterial)
          rim.name = 'terrain-edit-rim'
          root.add(rim)
        }
      }

      if (waterLevel != null) {
        this._buildWater(waterLevel)
      }

      return this
    },

    /**
     * 构建等高线（marching squares）
     *
     * 与「把格网边画成线框」不同，这里按固定等高距求等值线，
     * 所以缓坡上线稀疏、陡坡上线密集，观感与地形软件一致。
     * @private
     */
    _buildContours(this: TerrainEditInstance & Record<string, any>) {
      if (!this._root || !this._grid || !THREE) return this
      const old = this._root.getObjectByName('terrain-edit-contour')
      if (old) {
        if (old.geometry) old.geometry.dispose()
        if (old.material) old.material.dispose()
        this._root.remove(old)
      }
      if (!this._showGrid) return this

      const grid = this._grid
      const stats = terrainStats(grid, this._polygon)
      const interval =
        this._stepHeight > 0
          ? this._stepHeight
          : niceContourInterval(Math.max(1, stats.maxHeight - stats.minHeight), 26)
      const segs = buildContourSegments(grid, interval, grid.current)
      if (!segs.length) return this

      const count = segs.length / 4
      const positions = new Float32Array(count * 6)
      const offset = Math.max(0.35, interval * 0.03)
      let n = 0
      for (let i = 0; i < segs.length; i += 4) {
        for (let k = 0; k < 2; k++) {
          const row = segs[i + k * 2]
          const col = segs[i + k * 2 + 1]
          const sample = this._sampleGrid(row, col)
          positions[n++] = sample.x
          positions[n++] = sample.y + offset
          positions[n++] = sample.z
        }
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.computeBoundingSphere()
      const material = new THREE.LineBasicMaterial({
        color: 0x1d2a1a,
        transparent: true,
        opacity: 0.42,
        depthWrite: false
      })
      const lines = new THREE.LineSegments(geometry, material)
      lines.name = 'terrain-edit-contour'
      lines.renderOrder = 5
      this._root.add(lines)
      this._contourInterval = interval
      return this
    },

    /**
     * 取格网上任意分数坐标处的位置（双线性插值），等高线与笔刷光标用
     * @private
     */
    _sampleGrid(this: TerrainEditInstance & Record<string, any>, row: number, col: number) {
      const grid: TerrainGrid = this._grid
      const localXZ: Float32Array = this._localXZ
      const up = this._up
      const maxRow = grid.segments
      const maxCol = grid.segments
      const r = Math.min(Math.max(row, 0), maxRow)
      const c = Math.min(Math.max(col, 0), maxCol)
      const r0 = Math.min(Math.floor(r), maxRow - (maxRow > 0 ? 1 : 0))
      const c0 = Math.min(Math.floor(c), maxCol - (maxCol > 0 ? 1 : 0))
      const fr = r - r0
      const fc = c - c0
      const i00 = r0 * grid.stride + c0
      const i01 = i00 + 1
      const i10 = i00 + grid.stride
      const i11 = i10 + 1
      const w00 = (1 - fr) * (1 - fc)
      const w01 = (1 - fr) * fc
      const w10 = fr * (1 - fc)
      const w11 = fr * fc
      const h =
        grid.current[i00] * w00 + grid.current[i01] * w01 + grid.current[i10] * w10 + grid.current[i11] * w11
      const x = localXZ[i00 * 3] * w00 + localXZ[i01 * 3] * w01 + localXZ[i10 * 3] * w10 + localXZ[i11 * 3] * w11
      const y = localXZ[i00 * 3 + 1] * w00 + localXZ[i01 * 3 + 1] * w01 + localXZ[i10 * 3 + 1] * w10 + localXZ[i11 * 3 + 1] * w11
      const z = localXZ[i00 * 3 + 2] * w00 + localXZ[i01 * 3 + 2] * w01 + localXZ[i10 * 3 + 2] * w10 + localXZ[i11 * 3 + 2] * w11
      return { x: x + up.x * h, y: y + up.y * h, z: z + up.z * h, h }
    },

    /**
     * 取经纬度处的地形高度（格网内双线性，格网外退回真实地形）
     * @private
     */
    _sampleHeightAt(this: TerrainEditInstance & Record<string, any>, lng: number, lat: number) {
      const grid: TerrainGrid = this._grid
      if (!grid) return this._heightAt(lng, lat)
      const b = grid.bounds
      const col = (lng - b.minLng) / grid.dLng
      const row = (lat - b.minLat) / grid.dLat
      if (col < 0 || col > grid.segments || row < 0 || row > grid.segments) {
        return this._heightAt(lng, lat)
      }
      return this._sampleGrid(row, col).h
    },

    /**
     * 把格网高度同步到 three 网格（只改位置，不重建几何体）
     * @private
     */
    _updateSurface(this: TerrainEditInstance & Record<string, any>) {
      const mesh = this._surface
      const grid: TerrainGrid = this._grid
      if (!mesh || !grid) return this
      const attr = mesh.geometry.getAttribute('position')
      const arr = attr.array as Float32Array
      const xz: Float32Array = this._localXZ
      const up = this._up
      for (let i = 0; i < grid.vertexCount; i++) {
        const h = grid.current[i]
        arr[i * 3] = xz[i * 3] + up.x * h
        arr[i * 3 + 1] = xz[i * 3 + 1] + up.y * h
        arr[i * 3 + 2] = xz[i * 3 + 2] + up.z * h
      }
      attr.needsUpdate = true
      mesh.geometry.computeVertexNormals()
      // 法线变了，明暗得跟着重烘，不然刚挖出来的坡面还是按旧法线打光，看着像贴了张图
      this._bakeShading(mesh.geometry)
      mesh.geometry.computeBoundingSphere()
      return this
    },

    /**
     * 生成地表材质。
     *
     * 用内置 `MeshBasicMaterial` 而不是自写 shader：
     * - 影像本身不受光，Basic 能保证「原色输出」，与周围 cesium 影像颜色一致；
     * - 明暗已经烘进顶点色，`map * vertexColor` 就是最终结果；
     * - 自己不写 GLSL，就不会踩到 three 与 cesium 渲染器组合下的各种坑。
     *
     * @private
     */
    _makeSurfaceMaterial(this: TerrainEditInstance & Record<string, any>, canvas?: HTMLCanvasElement) {
      const params: any = {
        vertexColors: true,
        side: THREE.DoubleSide,
        transparent: true
      }
      if (canvas) {
        const tex = new THREE.CanvasTexture(canvas)
        // 影像本身是 sRGB：标成 sRGBColorSpace 后，three 采样时解到线性、输出时
        // 再编码回 sRGB，等于原样输出；标成 NoColorSpace 会被二次编码，整体发白。
        if ('colorSpace' in tex && THREE.SRGBColorSpace !== undefined) {
          tex.colorSpace = THREE.SRGBColorSpace
        } else if (THREE.sRGBEncoding != null) {
          tex.encoding = THREE.sRGBEncoding
        }
        tex.anisotropy = 4
        tex.needsUpdate = true
        params.map = tex
        // 边缘羽化：把编辑区「化」进原地表，避免一圈生硬的矩形接缝
        const alpha = this._makeEdgeAlphaMap()
        if (alpha) params.alphaMap = alpha
      }
      return new THREE.MeshBasicMaterial(params)
    },

    /**
     * 生成边缘羽化贴图（画布四周往内渐隐），UV 与地表贴图共用
     *
     * 不用「四条直线渐变」：那样四条边的渐隐带是笔直的，一眼就能看出这是贴上去的一块方形地块。
     * 这里按像素算到最近边的距离，再叠上低频扰动 + 细颗粒抖动，边界就变成一条不规则的过渡带，
     * 远看是「地块自然融进山体」，而不是「贴片边缘」。
     * @private
     */
    _makeEdgeAlphaMap(this: TerrainEditInstance & Record<string, any>) {
      if (typeof document === 'undefined') return null
      const size = 256
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      const image = ctx.createImageData(size, size)
      const data = image.data
      const band = size * 0.1 // 渐隐带宽度（约占整块的 10%）
      const hash = (x: number, y: number) => {
        const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
        return n - Math.floor(n)
      }
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          // 到最近边的距离（像素）
          const d = Math.min(x + 0.5, size - x - 0.5, y + 0.5, size - y - 0.5)
          // 低频扰动让边界起伏，几个不同频率的正弦叠加就够了，不必上噪声函数
          const wobble =
            Math.sin(x * 0.11) * 0.42 +
            Math.sin(y * 0.073 + 1.7) * 0.36 +
            Math.sin((x + y) * 0.041 + 0.6) * 0.5
          let a = (d + wobble * band * 0.55) / band
          a = a <= 0 ? 0 : a >= 1 ? 1 : a * a * (3 - 2 * a)
          // 极轻微颗粒：避免渐隐带看起来像一条干净的半透明尺子
          a *= 0.9 + 0.1 * hash(x, y)
          const i = (y * size + x) * 4
          const v = Math.round(a * 255)
          data[i] = v
          data[i + 1] = v
          data[i + 2] = v
          data[i + 3] = 255
        }
      }
      ctx.putImageData(image, 0, 0)
      const tex = new THREE.CanvasTexture(canvas)
      if ('colorSpace' in tex && THREE.NoColorSpace !== undefined) {
        tex.colorSpace = THREE.NoColorSpace
      }
      tex.needsUpdate = true
      return tex
    },

    /**
     * 把明暗重新烘进顶点色
     *
     * 亮度只跟「法线与地表法线的夹角」有关：平地 1.0（影像原样输出）、陡坡压到 0.84，
     * 所以翻出的坡面能看出体积感，而对齐的平地又不会比周围影像暗一块。
     * 顶点色是破坏性相乘，所以必须从 `_baseColors` 底色重算，不能在上一次结果上再乘。
     * @private
     */
    _bakeShading(this: TerrainEditInstance & Record<string, any>, geometry?: any) {
      const geo = geometry || (this._surface && this._surface.geometry)
      const base: Float32Array | undefined = this._baseColors
      const up = this._up
      if (!geo || !base || !up || !this._grid) return this
      const normals = geo.getAttribute('normal')
      const colorsAttr = geo.getAttribute('color')
      if (!normals || !colorsAttr) return this
      const arr = colorsAttr.array as Float32Array
      const count = this._grid.vertexCount
      for (let i = 0; i < count; i++) {
        const ndl = Math.abs(normals.getX(i) * up.x + normals.getY(i) * up.y + normals.getZ(i) * up.z)
        const shade = 0.84 + 0.16 * Math.min(1, ndl)
        arr[i * 3] = base[i * 3] * shade
        arr[i * 3 + 1] = base[i * 3 + 1] * shade
        arr[i * 3 + 2] = base[i * 3 + 2] * shade
      }
      colorsAttr.needsUpdate = true
      return this
    },

    /**
     * 向影像图层取一块覆盖当前范围的地表贴图
     * @private
     */
    async _requestTexture(this: TerrainEditInstance & Record<string, any>) {
      if (!this._grid || !this._useTexture) return this
      const layers = this._viewer.imageryLayers
      const list: any[] = []
      for (let i = 0; i < layers.length; i++) {
        const layer = layers.get(i)
        if (layer && layer.show !== false) list.push(layer)
      }
      const b = this._grid.bounds
      const token = ++this._textureToken
      let result = null
      // 刚进页面时影像图层可能还没 ready，取瓦片会全部落空；
      // 这里退避重试几次，避免「第一次进来看不到地表纹理、点一下才有」。
      for (let attempt = 0; attempt < 5 && !result; attempt++) {
        try {
          result = await buildImageryTextureFromLayers(
            Cesium,
            list,
            { minLng: b.minLng, minLat: b.minLat, maxLng: b.maxLng, maxLat: b.maxLat },
            { maxSize: 2048, metersPerPixel: 1.0, maxTiles: 120 }
          )
        } catch (e) {
          result = null
        }
        if (token !== this._textureToken || this._disposed) return this
        if (!result && attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 700))
          if (token !== this._textureToken || this._disposed) return this
        }
      }
      // 期间范围又变了，丢弃这次结果
      if (token !== this._textureToken || this._disposed) return this
      if (result) {
        this._texture = result
        this._rebuild()
      }
      return this
    },

    /**
     * 构建水面
     *
     * 水面按格网裁剪：只保留「四角都低于水位」的格子，因此水只出现在坑底，
     * 不会顺着多边形把边坡一起淹掉。
     * @private
     */
    _buildWater(this: TerrainEditInstance & Record<string, any>, waterLevel: number) {
      if (!this._root || !this._grid || !this._polygon.length) return
      const grid = this._grid
      const stride = grid.stride
      const positions = new Float32Array(grid.vertexCount * 3)
      for (let i = 0; i < grid.vertexCount; i++) {
        const { lng, lat } = gridLngLat(grid, i)
        const local = this._toLocal(lng, lat, waterLevel)
        positions[i * 3] = local.x
        positions[i * 3 + 1] = local.y
        positions[i * 3 + 2] = local.z
      }

      const indices: number[] = []
      for (let row = 0; row < grid.segments; row++) {
        for (let col = 0; col < grid.segments; col++) {
          const a = row * stride + col
          const b = a + 1
          const c = a + stride
          const d = c + 1
          if (!(grid.inside[a] && grid.inside[b] && grid.inside[c] && grid.inside[d])) continue
          if (
            grid.current[a] >= waterLevel ||
            grid.current[b] >= waterLevel ||
            grid.current[c] >= waterLevel ||
            grid.current[d] >= waterLevel
          ) {
            continue
          }
          indices.push(a, c, b, b, c, d)
        }
      }
      if (!indices.length) return

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setIndex(indices)
      geometry.computeVertexNormals()
      const material = new THREE.MeshStandardMaterial({
        color: 0x1f8fc6,
        transparent: true,
        opacity: 0.82,
        roughness: 0.16,
        metalness: 0.32,
        side: THREE.DoubleSide,
        depthWrite: false
      })
      const water = new THREE.Mesh(geometry, material)
      water.name = 'terrain-edit-water'
      this._root.add(water)
    },

    /**
     * 解析水位参数
     * @private
     */
    _resolveWaterLevel(
      this: TerrainEditInstance & Record<string, any>,
      level: number | 'auto' | null | undefined
    ) {
      if (level === null || level === undefined || !this._grid) return null
      const value = level === 'auto' ? 0.6 : Number(level)
      if (!Number.isFinite(value)) return null
      if (value > 1) return value
      const grid = this._grid
      const floor = innerHeightRange(grid, grid.current).min
      // 以「开挖前的平台高度」当作坑口，水面按坑深百分比抬高
      const bench = innerHeightRange(grid, grid.base).average
      if (!(bench > floor)) return floor
      return floor + (bench - floor) * value
    },

    /**
     * 就地开辟一块可连续涂抹的地形编辑区域
     * @param center - 区域中心
     * @param options - 尺寸、分辨率、羽化、是否贴图
     */
    async setArea(
      this: TerrainEditInstance & Record<string, any>,
      center: TerrainEditPosition,
      options: TerrainEditAreaOptions = {}
    ) {
      const point = this._normalizePositions([center])[0]
      const size = Math.max(200, options.size ?? 2000)
      const half = size / 2
      const dLat = half / 111319.49079327358
      const dLng = half / metersPerDegLng(point.lat)
      this._areaMode = true
      this._useTexture = options.texture !== false
      await this.setPolygon(
        [
          [point.lng - dLng, point.lat - dLat],
          [point.lng + dLng, point.lat - dLat],
          [point.lng + dLng, point.lat + dLat],
          [point.lng - dLng, point.lat + dLat]
        ],
        { segments: options.segments ?? 160, slopeWidth: options.feather ?? 80 }
      )
      return this
    },

    /**
     * 设置笔刷参数
     * @param options - 模式、半径、强度、硬边、目标高度
     */
    setBrush(this: TerrainEditInstance & Record<string, any>, options: TerrainEditBrushOptions = {}) {
      const b = this._brush
      this._brush = {
        mode: options.mode || b.mode,
        radius: Math.max(1, options.radius ?? b.radius),
        strength: Math.min(1, Math.max(0.01, options.strength ?? b.strength)),
        hardness: Math.min(0.95, Math.max(0, options.hardness ?? b.hardness)),
        maxDelta: Math.max(0.5, options.maxDelta ?? b.maxDelta),
        strokeLimit: Math.max(1, Math.min(20, options.strokeLimit ?? b.strokeLimit)),
        targetHeight: options.targetHeight === undefined ? b.targetHeight : options.targetHeight
      }
      // 外部明确给了目标高度就不再算「自动推断」，抬笔时不能清掉
      if (options.targetHeight !== undefined) this._targetAuto = false
      return this
    },

    /** 读取当前笔刷参数 */
    getBrush(this: TerrainEditInstance & Record<string, any>) {
      return { ...this._brush }
    },

    /**
     * 开启 / 关闭鼠标涂抹
     * @param enabled - true 接管左键拖动
     */
    enableBrush(this: TerrainEditInstance & Record<string, any>, enabled: boolean) {
      const next = !!enabled
      // 只有「开启」才需要有可编辑区域；关闭时哪怕已经 clear() 了也要能把相机操作还回去
      if (next && !this._grid) {
        throw new CesiumDevKitError('INVALID_ARGUMENT', '请先调用 setArea 或 setPolygon 圈定可编辑范围')
      }
      // 幂等：重复调用不该把「原始相机配置」覆盖成改过的配置，
      // 否则关掉笔刷后左键还是不能旋转地图。
      if (next === this._brushEnabled) {
        if (next) this._ensureBrushHandler()
        return this
      }
      this._brushEnabled = next
      const controller = this._viewer.scene.screenSpaceCameraController
      // Cesium 这几个属性既可能是单个枚举值，也可能是数组（默认 rotateEventTypes 就是 `0`）。
      // 统一存成数组：单值 `0` 是 falsy，用 `if (prev.rotateEventTypes)` 判断会漏掉恢复。
      const toEvents = (v: any) => (v == null ? undefined : Array.isArray(v) ? v.slice() : [v])
      if (next) {
        // 左键要留给笔刷，把旋转改到右键、倾斜改到中键，滚轮缩放不动。
        // （直接 enableRotate=false 会让用户没法转视角，体验反而更差）
        if (this._prevController === undefined) {
          this._prevController = {
            enableRotate: controller.enableRotate,
            enableTilt: controller.enableTilt,
            // 存副本：Cesium 里这是数组属性，存引用容易被别处改掉
            rotateEventTypes: toEvents(controller.rotateEventTypes),
            tiltEventTypes: toEvents(controller.tiltEventTypes)
          }
        }
        controller.enableRotate = true
        controller.enableTilt = true
        controller.rotateEventTypes = [Cesium.ScreenSpaceEventType.RIGHT_DOWN]
        controller.tiltEventTypes = [Cesium.ScreenSpaceEventType.MIDDLE_DOWN]
        this._ensureBrushHandler()
      } else {
        // 收笔：把没结束的这一笔落定（否则 `_stroking` 一直是 true，等高线不更新）
        this.endStroke()
        this._destroyBrushHandler()
        this._removeBrushCursor()
        if (this._prevController) {
          controller.enableRotate = this._prevController.enableRotate
          controller.enableTilt = this._prevController.enableTilt
          if (this._prevController.rotateEventTypes != null) {
            controller.rotateEventTypes = toEvents(this._prevController.rotateEventTypes)
          }
          if (this._prevController.tiltEventTypes != null) {
            controller.tiltEventTypes = toEvents(this._prevController.tiltEventTypes)
          }
          this._prevController = undefined
        }
        // 兜底：关闭笔刷后左键必须能拖动 / 旋转地图。
        // 万一进入笔刷前左键就被从旋转事件里摘掉了（被外部配置过），这里也要把左键还给相机。
        controller.enableRotate = true
        controller.enableTilt = true
        const leftDown = Cesium.ScreenSpaceEventType.LEFT_DOWN
        const rotateTypes = toEvents(controller.rotateEventTypes)
        const hasLeftDown = Array.isArray(rotateTypes)
          ? rotateTypes.some((t: any) => t === leftDown || (t && t.eventType === leftDown))
          : rotateTypes === leftDown
        if (!hasLeftDown) {
          controller.rotateEventTypes = Array.isArray(rotateTypes) && rotateTypes.length
            ? [leftDown, ...rotateTypes]
            : [leftDown]
        }
      }
      return this
    },

    /** 开始一次涂抹（记录撤销快照） */
    beginStroke(this: TerrainEditInstance & Record<string, any>) {
      if (!this._grid) return this
      this._stroking = true
      this._strokeBase = new Float32Array(this._grid.current)
      this._popStrokeSnapshot()
      return this
    },

    /**
     * 在某点落笔（一次涂抹中连续调用即形成轨迹）
     * @param lng - 经度
     * @param lat - 纬度
     */
    strokeAt(this: TerrainEditInstance & Record<string, any>, lng: number, lat: number) {
      if (!this._grid) return this
      if (!this._stroking) this.beginStroke()
      const brush = this._brush
      let target = brush.targetHeight
      if (brush.mode === 'level' && target == null) {
        // 未指定目标高度时，取「第一次落笔处的地形高度」，符合地形软件的习惯。
        // 只在本次笔画内有效：抬笔后清掉，否则下一次落笔会以旧目标整平，看着像没反应。
        target = this._heightAt(lng, lat)
        this._brush.targetHeight = target
        this._targetAuto = true
      }
      const impact = applyBrush(this._grid, {
        mode: brush.mode,
        lng,
        lat,
        radius: brush.radius,
        strength: brush.strength,
        hardness: brush.hardness,
        maxDelta: brush.maxDelta,
        strokeLimit: brush.strokeLimit,
        targetHeight: target == null ? undefined : target,
        strokeBase: this._strokeBase
      })
      if (impact && impact.changed) {
        this._dirty = true
        this._updateSurface()
        // 等高线跟着笔迹实时重画（120ms 一次，折中流畅与开销）
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
        if (now - (this._lastContourAt || 0) > 120) {
          this._lastContourAt = now
          this._buildContours()
        }
      }
      return this
    },

    /** 结束一次涂抹（落定等高线与统计） */
    endStroke(this: TerrainEditInstance & Record<string, any>) {
      if (!this._stroking) return this
      this._stroking = false
      this._strokeBase = null
      this._lastContourAt = 0
      // 自动推断的目标高度用完即弃，避免下一次整平沿用上一笔的旧目标
      if (this._targetAuto) {
        this._brush.targetHeight = null
        this._targetAuto = false
      }
      if (this._dirty) {
        this._dirty = false
        this._buildContours()
      }
      return this
    },

    /**
     * 是否用影像贴图显示编辑区
     * @param enabled - true 取影像瓦片贴地
     */
    setTextureEnabled(this: TerrainEditInstance & Record<string, any>, enabled: boolean) {
      const next = !!enabled
      if (next === this._useTexture) return this
      this._useTexture = next
      if (!next) {
        this._texture = null
        this._rebuild()
      } else {
        this._requestTexture()
      }
      return this
    },

    /** 重建地表贴图（切换影像图层后调用） */
    async refreshTexture(this: TerrainEditInstance & Record<string, any>) {
      this._texture = null
      this._useTexture = true
      await this._requestTexture()
      return this
    },

    /**
     * 屏幕坐标 -> 经纬度（贴地）
     * @private
     */
    _pickLngLat(this: TerrainEditInstance & Record<string, any>, windowPosition: any) {
      const scene = this._viewer.scene
      const ray = this._viewer.camera.getPickRay(windowPosition)
      if (!ray || !scene.globe) return null
      const cartesian = scene.globe.pick(ray, scene)
      if (!cartesian) return null
      const carto = Cesium.Cartographic.fromCartesian(cartesian)
      if (!carto) return null
      return {
        lng: Cesium.Math.toDegrees(carto.longitude),
        lat: Cesium.Math.toDegrees(carto.latitude)
      }
    },

    /**
     * 绑定涂抹用的鼠标事件
     *
     * 回调里都先判 `_brushEnabled`：关闭笔刷后 handler 会被销毁，这里再加一道保险，
     * 避免极端时序下（关闭动画/事件队列里还残留一次 move）又给地形落了一笔。
     * @private
     */
    _ensureBrushHandler(this: TerrainEditInstance & Record<string, any>) {
      if (this._brushHandler) return this
      const handler = new Cesium.ScreenSpaceEventHandler(this._viewer.scene.canvas)
      this._brushHandler = handler

      handler.setInputAction((movement: any) => {
        if (!this._brushEnabled) return
        const hit = this._pickLngLat(movement.position)
        this._updateBrushCursor(hit)
        if (hit) this.beginStroke().strokeAt(hit.lng, hit.lat)
      }, Cesium.ScreenSpaceEventType.LEFT_DOWN)

      handler.setInputAction((movement: any) => {
        if (!this._brushEnabled) return
        const hit = this._pickLngLat(movement.endPosition)
        this._updateBrushCursor(hit)
        if (this._stroking && hit) this.strokeAt(hit.lng, hit.lat)
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

      handler.setInputAction(() => {
        if (!this._brushEnabled) return
        this.endStroke()
      }, Cesium.ScreenSpaceEventType.LEFT_UP)

      return this
    },

    /**
     * 解绑涂抹事件。
     *
     * 必须 destroy，不能只把 `_brushEnabled` 置 false：`ScreenSpaceEventHandler`
     * 不销毁就一直挂在 canvas 上，左键拖地图时照样会落笔——表现就是「笔刷关不掉」。
     * @private
     */
    _destroyBrushHandler(this: TerrainEditInstance & Record<string, any>) {
      const handler = this._brushHandler
      this._brushHandler = null
      this._stroking = false
      if (!handler) return this
      try {
        handler.destroy()
      } catch (err) {
        reportError(err, { scope: 'TerrainEdit.destroyBrushHandler' })
      }
      return this
    },

    /**
     * 创建贴地的圆形笔刷光标
     * @private
     */
    _ensureBrushCursor(this: TerrainEditInstance & Record<string, any>) {
      if (this._brushCursor || !THREE) return this._brushCursor
      const segments = 96
      const ringPositions = new Float32Array(segments * 3)
      const ringGeometry = new THREE.BufferGeometry()
      ringGeometry.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3))
      const ring = new THREE.LineLoop(
        ringGeometry,
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthTest: false })
      )
      ring.renderOrder = 900

      const discPositions = new Float32Array((segments + 1) * 3)
      const discIndices: number[] = []
      for (let i = 0; i < segments; i++) {
        discIndices.push(0, i + 1, ((i + 1) % segments) + 1)
      }
      const discGeometry = new THREE.BufferGeometry()
      discGeometry.setAttribute('position', new THREE.BufferAttribute(discPositions, 3))
      discGeometry.setIndex(discIndices)
      const disc = new THREE.Mesh(
        discGeometry,
        new THREE.MeshBasicMaterial({
          // 笔刷范围用极淡的白色填充（像地形软件的笔刷圈），
          // 别用重色：重色会盖住坑底纹理，反而让人看不清自己挖成什么样
          color: 0xffffff,
          transparent: true,
          opacity: 0.12,
          depthTest: false,
          side: THREE.DoubleSide
        })
      )
      disc.renderOrder = 899

      const group = new THREE.Group()
      group.name = 'terrain-edit-brush'
      group.add(disc)
      group.add(ring)
      const scene = this._getScene()
      scene.add(group)
      this._brushCursor = group
      return group
    },

    /**
     * 更新笔刷光标位置（跟随地形起伏）
     * @private
     */
    _updateBrushCursor(this: TerrainEditInstance & Record<string, any>, hit: { lng: number; lat: number } | null) {
      if (!this._brushEnabled || !this._grid) return this
      if (!hit) {
        this._removeBrushCursor()
        return this
      }
      const group = this._ensureBrushCursor()
      if (!group) return this
      const radius = this._brush.radius
      const mLng = metersPerDegLng(hit.lat)
      const ring = group.children[1]
      const disc = group.children[0]
      const ringAttr = ring.geometry.getAttribute('position')
      const discAttr = disc.geometry.getAttribute('position')
      const segments = ringAttr.count
      const up = this._up || { x: 0, y: 1, z: 0 }
      const lift = 1.2

      const put = (attr: any, index: number, angle: number, scale = 1) => {
        const lng = hit.lng + (Math.cos(angle) * radius * scale) / mLng
        const lat = hit.lat + (Math.sin(angle) * radius * scale) / 111319.49079327358
        const col = (lng - this._grid.bounds.minLng) / this._grid.dLng
        const row = (lat - this._grid.bounds.minLat) / this._grid.dLat
        let x: number, y: number, z: number
        if (col >= 0 && col <= this._grid.segments && row >= 0 && row <= this._grid.segments) {
          const s = this._sampleGrid(row, col)
          x = s.x
          y = s.y
          z = s.z
        } else {
          const local = this._toLocal(lng, lat, this._heightAt(lng, lat))
          x = local.x
          y = local.y
          z = local.z
        }
        attr.array[index * 3] = x + up.x * lift
        attr.array[index * 3 + 1] = y + up.y * lift
        attr.array[index * 3 + 2] = z + up.z * lift
      }

      for (let i = 0; i < segments; i++) {
        put(ringAttr, i, (i / segments) * Math.PI * 2)
      }
      put(discAttr, 0, 0, 0)
      for (let i = 0; i < segments; i++) {
        put(discAttr, i + 1, (i / segments) * Math.PI * 2)
      }
      ringAttr.needsUpdate = true
      discAttr.needsUpdate = true
      ring.geometry.computeBoundingSphere()
      disc.geometry.computeBoundingSphere()
      group.visible = true
      return this
    },

    /**
     * 移除笔刷光标
     * @private
     */
    _removeBrushCursor(this: TerrainEditInstance & Record<string, any>) {
      const group = this._brushCursor
      if (!group) return this
      const scene = (this._threeJs as any)?._three?.scene
      if (scene) scene.remove(group)
      group.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) child.material.dispose()
      })
      this._brushCursor = null
      return this
    },

    /**
     * 涂抹的撤销快照（同一笔画内的多次落笔合并为一步）
     * @private
     */
    _popStrokeSnapshot(this: TerrainEditInstance & Record<string, any>) {
      if (!this._grid) return
      this._history.push(new Float32Array(this._grid.current))
      if (this._history.length > MAX_HISTORY) this._history.shift()
    },

    /**
     * 执行一次形变
     * @function
     */
    apply(this: TerrainEditInstance & Record<string, any>, options?: TerrainEditApplyOptions) {
      if (!this._grid) {
        throw new CesiumDevKitError('INVALID_ARGUMENT', '请先调用 setPolygon 或 beginDraw 圈定编辑范围')
      }
      const opts = options || {}
      this._history.push(new Float32Array(this._grid.current))
      if (this._history.length > MAX_HISTORY) this._history.shift()

      this._grid.current = deformTerrain(this._grid, opts)
      // 记下本次台阶高度：等高线只在这些「台阶断面」上画线
      this._stepHeight = opts.stepHeight && opts.stepHeight > 0 ? opts.stepHeight : 0
      if (Object.prototype.hasOwnProperty.call(opts, 'waterLevel')) {
        this._waterLevel = this._resolveWaterLevel(opts.waterLevel)
      }
      this._rebuild()
      return this
    },

    /**
     * 设置水面高度
     * @function
     */
    setWaterLevel(this: TerrainEditInstance & Record<string, any>, level: number | 'auto' | null) {
      if (!this._grid) return this
      this._waterLevel = this._resolveWaterLevel(level)
      this._rebuild()
      return this
    },

    /**
     * 显示 / 隐藏等高线
     * @function
     */
    setContourVisible(this: TerrainEditInstance & Record<string, any>, visible: boolean) {
      this._showGrid = !!visible
      this._rebuild()
      return this
    },

    /**
     * 撤销上一次形变
     * @function
     */
    undo(this: TerrainEditInstance & Record<string, any>) {
      if (!this._grid || !this._history.length) return this
      this._grid.current = this._history.pop() as Float32Array
      this._rebuild()
      return this
    },

    /**
     * 清除地形块与绘制状态
     * @function
     */
    clear(this: TerrainEditInstance & Record<string, any>) {
      this.cancelDraw()
      this.enableBrush(false)
      this._clearMeshes()
      if (this._draftSource && !this._viewer.isDestroyed()) {
        try {
          this._viewer.dataSources.remove(this._draftSource, true)
        } catch (err) {
          reportError(err, { scope: 'TerrainEdit.clear' })
        }
      }
      this._draftSource = null
      this._grid = null
      this._polygon = []
      this._polygonHeight = []
      this._history = []
      this._waterLevel = null
      this._texture = null
      this._surface = null
      this._localXZ = null
      this._baseColors = null
      this._areaMode = false
      this._strokeBase = null
      if (this._targetAuto) {
        this._brush.targetHeight = null
        this._targetAuto = false
      }
      this._textureToken++
      return this
    },

    /**
     * 读取地形统计
     * @function
     */
    getStats(this: TerrainEditInstance & Record<string, any>): TerrainEditStatsResult | null {
      if (!this._grid) return null
      const stats = terrainStats(this._grid, this._polygon, this._grid.current)
      return {
        ...stats,
        area: stats.area || polygonArea(this._polygon),
        waterLevel: this._waterLevel,
        vertices: this._grid.vertexCount
      }
    },

    /**
     * 获取当前多边形
     * @function
     */
    getPolygon(this: TerrainEditInstance & Record<string, any>): TerrainLngLatHeight[] {
      return this._polygon.map((p: TerrainLngLat, index: number) => ({
        lng: p.lng,
        lat: p.lat,
        height: this._polygonHeight[index] || 0
      }))
    },

    /**
     * 释放资源
     * @function
     */
    dispose(this: TerrainEditInstance & Record<string, any>) {
      if (this._disposed) return
      this._disposed = true
      // 先收笔并解绑涂抹事件，再把相机操作还给 cesium
      this._destroyBrushHandler()
      this.enableBrush(false)
      this._removeBrushCursor()
      this.cancelDraw()
      this._clearMeshes()
      if (this._draftSource && this._viewer && !this._viewer.isDestroyed()) {
        try {
          this._viewer.dataSources.remove(this._draftSource, true)
        } catch (err) {
          reportError(err, { scope: 'TerrainEdit.dispose' })
        }
      }
      this._draftSource = null
      this._grid = null
      this._polygon = []
      this._polygonHeight = []
      this._history = []
    }
  } as unknown as TerrainEditInstance

  return TerrainEdit
}

export const TerrainEdit = createScopedConstructor(createTerrainEditModule) as unknown as TerrainEditConstructor
