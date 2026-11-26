import { loadEcharts } from './lazyLoad'
import { Base } from "./Base";
import { Math3d } from "./Math3d";
import { Graphics } from "./Graphics";
import type { BaseInstance, BindHandleEventOptions, CesiumGlobal, MouseEventHandler, StaticResourceConf } from './Base'
import type { Cartographic } from 'cesium'
import { asProperty, mixinPrototype, attachDestroy, registerCleanup, disposeModule } from './Base'
import type { Math3dInstance } from './Math3d'
import type { GraphicsInstance } from './Graphics'
import { createScopedConstructor } from './Base'
import { createDefaultStatic } from '../defaultStatic'
import { wgs84ArrayToDegreesArrayHeights } from './pathUtils'
import { computeProfileStats, buildProfileChartData } from './analysis/profile'
import type { ProfileSample, ProfileStats } from './analysis/profile'
import {
  computeSlopeAspect,
  computeVolumeCompare,
  isPointInPolygon,
  computeSightlineVisibility,
  buildAspectChartData,
  buildVolumeCompareChartData
} from './analysis/terrainSurface'
import type { LngLat, VolumeCell } from './analysis/terrainSurface'

/** 模块内部持有的 cesium 全局对象 */

/**
 * 绑定分析类的交互鼠标事件。
 *
 * `bindHandleEvent` 每次都会 new 一个 ScreenSpaceEventHandler，且只在模块销毁时才清理，
 * 不销毁上一次的就会层层叠加：每点一次按钮多一层，一次左键触发多个回调
 * （表现就是观察点成倍冒出的「套娃」）。这里保证同一实例上只保留最后一层。
 */
function bindAnalysisEvent($this: any, options: BindHandleEventOptions): any {
  var prev = $this._analysisEventHandler;
  if (prev && typeof prev.isDestroyed === "function" && !prev.isDestroyed()) {
    prev.destroy();
  }
  $this._analysisEventHandler = $this.bindHandleEvent(options);
  return $this._analysisEventHandler;
}

/** 画笔类方法的通用参数（Analysis 中调用的 draw* 方法） */
export interface DrawMethodOptions {
  type?: string
  clampToGround?: boolean
  height?: number
  style?: Record<string, unknown>
  callback?: (...args: any[]) => void
  [key: string]: unknown
}

/** 通视/环视/坡度/方量等分析实例（含 remove 方法） */
export interface AnalysisResultInstance {
  remove(): void
}

/** 创建通视分析参数 */
export interface VisibilityAnalysisOptions {
  callback?: (result: AnalysisResultInstance) => void
}

/** 创建环视分析参数 */
export interface LookAroundAnalysisOptions {
  callback?: (result: AnalysisResultInstance) => void
}

/** 创建可视域分析参数 */
export interface VisualFieldAnalysisOptions {
  callback?: (result: AnalysisResultInstance) => void
}

/** 地形开挖分析参数 */
export interface ClipPlanAnalysisOptions {
  /** 高度 */
  height?: number
  /** 裁剪大小 */
  splitNum?: number
  /** 四周贴图 */
  wallImg?: string
  /** 底部贴图 */
  bottomImg?: string
  callback?: (result: unknown) => void
}

/** 淹没分析参数 */
export interface SubmergedAnalysisOptions {
  /** 最大高度 */
  maxH?: number
  /** 速度 */
  speed?: number
  /** 时间间隔 */
  interval?: number
  /** 材质 */
  matrialUrl?: string
}

/** 坡度分析参数 */
export interface SlopeAnalysisOptions {
  callback?: (result: AnalysisResultInstance) => void
}

/** 方量分析参数 */
export interface CutVolumeAnalysisOptions {
  callback?: (result: AnalysisResultInstance) => void
}

/** 剖面分析参数 */
export interface ProfileAnalysisOptions {
  /**
   * 直接给定剖面线（[lng, lat] 或 [lng, lat, height]）。
   * 不传则在地图上交互绘制一条直线。
   */
  positions?: Array<[number, number, number?]>
  /** 采样点数量，默认 100（越大曲线越平滑，开销也越大） */
  samples?: number
  /** 是否绘制剖面图，默认 true */
  chart?: boolean
  callback?: (result: ProfileAnalysisResult) => void
}

/** 剖面分析结果 */
export interface ProfileAnalysisResult {
  /** 采样点（距离 / 高程 / 经纬度） */
  samples: ProfileSample[]
  /** 统计结果（最高 / 最低 / 平均 / 累计爬升下降） */
  stats: ProfileStats
  /** echarts 实例；chart: false 或 echarts 未就绪时为 null */
  chart: any | null
  /** 移除剖面图 */
  remove(): void
}

/** 坡向分析参数 */
export interface AspectAnalysisOptions {
  /** 直接给定剖面线（[lng, lat] 或 [lng, lat, height]）；不传则交互绘制 */
  positions?: Array<[number, number, number?]>
  /** 采样点数量，默认 100 */
  samples?: number
  /** 是否绘制图表，默认 true */
  chart?: boolean
  callback?: (result: AspectAnalysisResult) => void
}

/** 单个坡向采样点 */
export interface AspectSample {
  /** 距起点的水平距离（米） */
  distance: number
  lng: number
  lat: number
  /** 地面高程（米） */
  height: number
  /** 该点坡度（度） */
  slopeDeg: number
  /** 该点坡向（度），0=北、顺时针；平地返回 -1 */
  aspectDeg: number
}

/** 坡向分析结果 */
export interface AspectAnalysisResult {
  samples: AspectSample[]
  /** 平均坡度（度），只统计非平地样本 */
  avgSlopeDeg: number
  /** 主导坡向（度），做向量平均；全为平地时 -1 */
  dominantAspectDeg: number
  /** echarts 实例；chart: false 或 echarts 未就绪时为 null */
  chart: any | null
  remove(): void
}

/** 多观察点可视域的单个观察点配置 */
export interface MultiViewshedObserver {
  /** 观察点 [lng, lat, height?]；height 缺省时按地形采样 */
  position: [number, number, number?]
  /** 瞄准目标 [lng, lat, height?]；不传则按 direction / pitch / distance 摆姿势 */
  target?: [number, number, number?]
}

/** 多观察点可视域参数 */
export interface MultiViewshedAnalysisOptions {
  /** 观察点：坐标数组，或 { position, target } 对象；不传则交互（左键放置 → 移动瞄准 → 再次左键确认） */
  observers?: Array<[number, number, number?] | MultiViewshedObserver>
  /** 无 target 时的默认朝向（度，0=北、顺时针），默认 0 */
  direction?: number
  /** 无 target 时的默认俯仰（度，负值向下看），默认 0 */
  pitch?: number
  /** 无 target 时的默认视距（米），默认 500 */
  distance?: number
  /** 观察者眼睛离地高度（米），默认 1.7；设为 0 则直接用观察点高度 */
  eyeHeight?: number
  /** 交互模式下最多添加的观察点数量，默认 5 */
  maxObservers?: number
  callback?: (result: MultiViewshedAnalysisResult) => void
}

/** 多观察点可视域结果 */
export interface MultiViewshedAnalysisResult {
  /** 当前观察点数量 */
  readonly observerCount: number
  /** 追加一个观察点；target 可选，用于指定该观察点的瞄准目标 */
  addObserver(
    lng: number,
    lat: number,
    height?: number,
    target?: [number, number, number?]
  ): void
  /** 结束交互：停止放置/瞄准并解绑鼠标事件（非交互模式下为空操作） */
  finish(): void
  /** 移除全部视域 */
  remove(): void
}

/** 方量对比参数 */
export interface CutVolumeCompareOptions {
  /** 直接给定多边形（[lng, lat, height?] 数组）；不传则交互绘制 */
  positions?: Array<[number, number, number?]>
  /** 对比的设计标高列表（米）；不传则按地形高低自动生成若干档 */
  designHeights?: number[]
  /** 网格采样步长（度），默认按范围自适应（约 40×40） */
  gridStep?: number
  /** 是否绘制对比柱状图，默认 true */
  chart?: boolean
  callback?: (result: CutVolumeCompareResult) => void
}

/** 单个设计标高的方量对比项 */
export interface VolumeCompareItem {
  designHeight: number
  cut: number
  fill: number
  net: number
  total: number
}

/** 方量对比结果 */
export interface CutVolumeCompareResult {
  items: VolumeCompareItem[]
  /** 参与统计的网格单元数 */
  cellCount: number
  /** 采样范围 [minLng, minLat, maxLng, maxLat] */
  bounds: [number, number, number, number]
  chart: any | null
  remove(): void
}

/** 批量地形开挖参数 */
export interface BatchClipPlanOptions {
  /** 多个开挖区域（[lng, lat, height?] 数组）；不传则交互绘制一个 */
  regions?: Array<Array<[number, number, number?]>>
  height?: number
  splitNum?: number
  wallImg?: string
  bottomImg?: string
  callback?: (result: BatchClipPlanResult) => void
}

/** 批量地形开挖结果 */
export interface BatchClipPlanResult {
  /** 已创建的开挖区域数量 */
  readonly count: number
  /** 移除全部开挖 */
  remove(): void
}

/** 通视路径参数 */
export interface VisibilityPathOptions {
  /** 路径坐标（[lng, lat] 或 [lng, lat, height]）；不传则交互绘制 */
  positions?: Array<[number, number, number?]>
  /** 观察者眼睛离地高度（米），默认 1.7 */
  observerHeight?: number
  /** 目标离地高度（米），默认 0 */
  targetHeight?: number
  /** 采样点数量，默认 100 */
  samples?: number
  callback?: (result: VisibilityPathResult) => void
}

/** 通视路径结果 */
export interface VisibilityPathResult {
  /** 每个采样点是否可见 */
  visible: boolean[]
  /** 第一个被遮挡的采样点索引，-1 表示全程通视 */
  firstBlockerIndex: number
  /** 通视比例（0~1） */
  visibleRatio: number
  /** 移除绘制的路径 */
  remove(): void
}

/** 分析模块内部使用的公共实例（由 Base / Draw / Math3d / Graphics 混入） */
export interface AnalysisSharedInstance {
  _viewer: any
  _analysisLayer: any
  _graphicsLayer: any
  _drawLayer: any
  /** 释放当前模块持有的监听器 / DataSource（幂等） */
  destroy(): void
  getDfSt(attrArr: string[]): string | undefined
  bindHandleEvent(options?: BindHandleEventOptions): void
  /** @deprecated 拼写有误，请使用 `bindHandleEvent` */
  bindHandelEvent(options?: BindHandleEventOptions): void
  createGraphics(): any
  drawLineGraphics(options?: DrawMethodOptions): void
  drawCircleGraphics(options?: DrawMethodOptions): void
  drawPolygonGraphics(options?: DrawMethodOptions): void
  drawWallGraphics(options?: DrawMethodOptions): void
  computeEllipseEdgePositions(options?: {
    semiMinorAxis: number
    semiMajorAxis: number
    rotation: number
    center: any
    granularity?: number
    angle?: number
  }): { numPts: number; outerPositions: number[] } | undefined
  computeInterpolateLineCartographic(
    start?: { longitude: number; latitude: number; height?: number },
    end?: { longitude: number; latitude: number; height?: number },
    _Delta?: number
  ): any[] | null
  computeCartographicPointsTerrainData(
    Cartographics: Cartographic[],
    callback?: (result: Cartographic[]) => void
  ): void
  computeInterpolateIndexLineHeightCartographic(
    start?: { longitude: number; latitude: number; height?: number },
    end?: { longitude: number; latitude: number; height?: number },
    num?: number,
    index?: number
  ): any | null
}

/** Analysis 实例类型 */
export interface AnalysisInstance extends AnalysisSharedInstance {
  $math3d: Math3dInstance
  $graphics: GraphicsInstance
  /** 创建通视分析 */
  createVisibilityAnalysis(options?: VisibilityAnalysisOptions): void,
  /** 创建环视分析 */
  createLookAroundAnalysis(options?: LookAroundAnalysisOptions): void,
  /** 创建可视域分析 */
  createVisualFieldAnalysis(options?: VisualFieldAnalysisOptions): void,
  /** 地形开挖分析 */
  createClipPlanAnalysis(options?: ClipPlanAnalysisOptions): void,
  /** 创建淹没分析 */
  createSubmergedAnalysis(options?: SubmergedAnalysisOptions): void,
  /** 创建坡度分析 */
  createSlopeAnalysis(options?: SlopeAnalysisOptions): boolean | void,
  /** 方量分析 */
  createCutVolumeAnalysis(options?: CutVolumeAnalysisOptions): void,
  /** 剖面分析（沿一条线采样地形，输出高程剖面图与统计） */
  createProfileAnalysis(options?: ProfileAnalysisOptions): void,
  /** 坡向分析（沿一条线计算坡度 / 坡向） */
  createAspectAnalysis(options?: AspectAnalysisOptions): void,
  /** 多观察点可视域分析 */
  createMultiViewshedAnalysis(options?: MultiViewshedAnalysisOptions): void,
  /** 方量对比分析（多设计标高挖填方对比） */
  createCutVolumeCompareAnalysis(options?: CutVolumeCompareOptions): void,
  /** 批量地形开挖 */
  createBatchClipPlanAnalysis(options?: BatchClipPlanOptions): void,
  /** 通视路径分析 */
  createVisibilityPathAnalysis(options?: VisibilityPathOptions): void,
}

/** Analysis 构造函数类型 */
export interface AnalysisConstructor {
  new (viewer?: any, cesiumGlobal?: CesiumGlobal, defaultStatic?: StaticResourceConf): AnalysisInstance
  prototype: AnalysisInstance
}

/**
 * 分析模块
 * @class
 * @augments  module:Base
 * @augments  module:Draw
 * @augments  module:Plugin
 * @param {object} viewer - cesium 实例
 * @param {object}  cesiumGlobal - cesium 全局对象
 * @param {Array}  defaultStatic - 静态资源
 * @exports Analysis
 */
/**
 * 为每个实例创建独立闭包，避免模块级 Cesium/dfSt 及交互状态在多个 viewer 间共享。
 * 由 createScopedConstructor 在每次 new 时调用。
 */
export function createAnalysisModule() {
  let Cesium = null as unknown as CesiumGlobal;
  let dfSt: StaticResourceConf | undefined = undefined;
  let echartsMod: any = null;
  async function ensureEcharts() {
    if (!echartsMod) {
      echartsMod = await loadEcharts()
    }
    return echartsMod
  }

const Analysis = function (this: AnalysisInstance, viewer?: any, cesiumGlobal?: CesiumGlobal, defaultStatic?: StaticResourceConf) {
  if (viewer) {
    this._viewer = viewer;
    Cesium = cesiumGlobal as CesiumGlobal;
    // 未显式传入时回退到库内置配置，避免图片地址变成相对路径后静默 404
    dfSt = defaultStatic || createDefaultStatic();
    this._analysisLayer = new Cesium.CustomDataSource("analysisLayer");
    // 继承base，避免公共方法无法使用
    mixinPrototype(Math3d, Base);
    mixinPrototype(Graphics, Base);
    this.$math3d = new Math3d(viewer, cesiumGlobal);
    this.$graphics = new Graphics(viewer, cesiumGlobal);
    viewer && viewer.dataSources.add(this._analysisLayer);
    const analysisLayer = this._analysisLayer;
    const graphics = this.$graphics;
    const math3d = this.$math3d;
    attachDestroy(this);
    registerCleanup(this, () => {
      disposeModule(graphics);
      disposeModule(math3d);
      if (this._viewer && analysisLayer) {
        this._viewer.dataSources.remove(analysisLayer, true);
        if (this._analysisLayer === analysisLayer) this._analysisLayer = undefined;
      }
    });
  }
} as unknown as AnalysisConstructor

Analysis.prototype = {
  /**
   * 创建通视分析
   * @function
   * @param {object} options
   * @param {function} options.callback - 回调函数
   * @example
   * const analysis = new Analysis({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
   * // 调用后在地图上依次点击两点，即完成一次通视分析
   * analysis.createVisibilityAnalysis({
   *   callback: (result) => {
   *     console.log('通视分析对象', result)
   *     // result.remove() 移除本次分析
   *   }
   * })
   */
  createVisibilityAnalysis: function (this: AnalysisInstance, options?: VisibilityAnalysisOptions) {
    options = options || {};
    var $this = this;
    $this.drawLineGraphics({
      type: "straightLine",
      clampToGround: false,
      callback: function (line: unknown, lineObj: unknown) {
        var _visibilityAnalysis = new (VisibilityAnalysis as unknown as new (params: VisibilityAnalysisParams) => VisibilityAnalysisInstance)({
          positions: line as any[],
          that: $this,
        });

        if ($this._graphicsLayer) $this._graphicsLayer.entities.remove(lineObj as any);

        if (typeof options.callback === "function") {
          options.callback(_visibilityAnalysis);
        }
      },
    });
  },
  /**
   * 创建环视分析
   * @function
   * @param {object} options
   * @param {function} options.callback - 回调函数
   * @example
   * const analysis = new Analysis({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
   * // 调用后在地图上点击圆心并拖拽半径
   * analysis.createLookAroundAnalysis({
   *   callback: (result) => console.log('环视分析对象', result)
   * })
   */
  createLookAroundAnalysis: function (this: AnalysisInstance, options?: LookAroundAnalysisOptions) {
    options = options || {};
    if (this._viewer && options) {
      var $this = this;
      $this.drawCircleGraphics({
        callback: function (result: { radius: number; center: any }, obj: unknown) {
          $this._drawLayer.entities.remove(obj as any);

          let _lookAroundAnalysis = new (LookAroundAnalysis as unknown as new (params: LookAroundAnalysisParams) => LookAroundAnalysisInstance)({
            that: $this,
            radius: result.radius,
            center: result.center,
          });

          if (typeof options.callback === "function") {
            options.callback(_lookAroundAnalysis);
          }
        },
      });
    }
  },
  /**
   * 创建可视域分析
   * @function
   * @param {object} options
   * @param {function} options.callback - 回调函数
   * @example
   * const analysis = new Analysis({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
   * // 调用后点击模型位置放置视点，移动鼠标调整方向
   * analysis.createVisualFieldAnalysis({
   *   callback: (result) => console.log('可视域分析对象', result)
   * })
   */
  createVisualFieldAnalysis: function (this: AnalysisInstance, options?: VisualFieldAnalysisOptions) {
    options = options || {};
    if (this._viewer && options) {
      var $this = this,
        _shadowPrimitive: unknown = null;
      bindAnalysisEvent($this, {
        leftClick: (function click(event: any, _handlers: any) {
          var position = $this._viewer.scene.pickPosition(event.position);
          if (!position) return;
          if (!Cesium.defined(_shadowPrimitive)) {
            // 创建shadowPrimitve
            _shadowPrimitive = new Cesium.Scene.ShadowPrimitive({
              scene: $this._viewer.scene,
              viewerPosition: position,
            });

            ($this._analysisLayer as any & { _primitives: any })._primitives.add(_shadowPrimitive as never);
          } else {
            _handlers.destroy();
            _handlers = null as unknown as any;
          }
        }) as MouseEventHandler,
        mouseMove: (function move(event: any) {
          var position = $this._viewer.scene.pickPosition(event.endPosition);
          if (!position) return;
          if (_shadowPrimitive) (_shadowPrimitive as { setPoseByTargetPoint: (p: any) => void }).setPoseByTargetPoint(position);
        }) as MouseEventHandler,
      });
    }
  },
  /**
   * 地形开挖分析
   * @function
   * @param {object} options
   * @param {number} options.height - 高度
   * @param {number} options.splitNum - 裁剪大小
   * @param {string} options.wallImg - 四周贴图
   * @param {string} options.bottomImg - 底部贴图
   * @param {function} options.callback - 回调函数
   * @example
   * const analysis = new Analysis({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
   * // 调用后在地图上绘制一个多边形，作为开挖区域
   * analysis.createClipPlanAnalysis({
   *   height: 300,
   *   splitNum: 50,
   *   wallImg: 'static/data/images/clip/wall.png',
   *   bottomImg: 'static/data/images/clip/bottom.png',
   *   callback: (terrainClipPlan) => console.log('地形裁剪对象', terrainClipPlan)
   * })
   */
  createClipPlanAnalysis: function (this: AnalysisInstance, options?: ClipPlanAnalysisOptions) {
    options = options || {};
    if (this._viewer && options) {
      var $this = this;
      var _height = options.height || 30,
        _splitNum = options.splitNum || 50,
        _wallImg =
          options.wallImg ||
          this.getDfSt(["amalysis", "createClipPlanAnalysis_wallImg"]) ||
          "static/data/images/file/excavate_side_min.jpg",
        _bottomImg =
          options.bottomImg ||
          this.getDfSt(["amalysis", "createClipPlanAnalysis_bottomImg"]) ||
          "static/data/images/file/excavate_bottom_min.jpg";

      $this.drawPolygonGraphics({
        callback: function (polygon: unknown, polygonObj: unknown) {
          $this._drawLayer.entities.remove(polygonObj as any);
          // drawPolygonGraphics 回调返回 WGS84（{lng, lat, alt}），
          // TerrainClipPlan.updateData 需要 Cartesian3，这里显式转换。
          // 保留首尾重复的闭合点，updateData 内部按 length-1 计算环。
          const cartesian3Coor = Cesium.Cartesian3.fromDegreesArrayHeights(
            wgs84ArrayToDegreesArrayHeights(polygon)
          );
          let terrainClipPlan = new Cesium.Scene.TerrainClipPlan($this._viewer, {
            height: _height,
            splitNum: _splitNum,
            wallImg: _wallImg,
            bottomImg: _bottomImg,
          });
          terrainClipPlan.updateData(cartesian3Coor);

          if (typeof options.callback === "function") {
            options.callback(terrainClipPlan);
          }
        },
      });
    }
  },
  /**
   * 创建淹没分析
   * @function
   * @param {object} options
   * @param {number} options.maxH - 最大高度
   * @param {number} options.speed - 速度
   * @param {number} options.interval - 时间间隔
   * @param {string} options.matrialUrl - 材质
   * @example
   * const analysis = new Analysis({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
   * // 调用后绘制面，水面会按 speed 逐步上涨到 maxH
   * analysis.createSubmergedAnalysis({
   *   maxH: 120,
   *   speed: 10,
   *   interval: 100,
   *   matrialUrl: 'static/data/images/water.png'
   * })
   */
  createSubmergedAnalysis: function (this: AnalysisInstance, options?: SubmergedAnalysisOptions) {
    options = options || {};
    if (this._viewer && options) {
      var $this = this,
        _maxH = options.maxH || 15,
        _speed = options.speed || 1,
        _interval = options.interval || 10,
        _matrialUrl =
          options.matrialUrl ||
          this.getDfSt(["amalysis", "createSubmergedAnalysis"]) ||
          "static/data/images/file/water.png";
      $this.drawPolygonGraphics({
        height: 1,
        callback: function (polygon: unknown, polygonObj: unknown) {
          if (!$this._viewer.scene.globe.depthTestAgainstTerrain) {
            alert("请开启深度检测");
            return false;
          }
          if (polygonObj) {
            const polygonEntity = polygonObj as any;
            setTimeout(() => {
              polygonEntity.polygon!.heightReference = asProperty(Cesium.HeightReference.CLAMP_TO_GROUND);
              polygonEntity.polygon!.material = asProperty(_matrialUrl);
              var h = 0.0;
              polygonEntity.polygon!.extrudedHeight = asProperty(h);
              var st = setInterval(function () {
                h = h + _speed;
                if (h >= _maxH) {
                  h = _maxH;
                  clearTimeout(st);
                }
                polygonEntity.polygon!.extrudedHeight = asProperty(h);
              }, _interval);
            }, 2000);
          }
        },
      });
    }
  },

  /**
   * 创建坡度分析
   * @function
   * @param {object} options
   * @param {function} options.callback - 回调
   * @example
   * const analysis = new Analysis({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
   * // 调用后依次点击两点，得到两点间的坡度
   * analysis.createSlopeAnalysis({
   *   callback: (result) => console.log('坡度结果', result)
   * })
   */
  createSlopeAnalysis: function (this: AnalysisInstance, options?: SlopeAnalysisOptions) {
    options = options || {};
    var $this = this;
    if (this._viewer && options) {
      $this.drawLineGraphics({
        type: "straightLine",
        clampToGround: false,
        callback: async function (line: unknown, lineObj: unknown) {
          await ensureEcharts();
          var _slopeAnalysis = new (SlopeAnalysis as unknown as new (params: SlopeAnalysisParams) => SlopeAnalysisInstance)({
            positions: line as any[],
            that: $this,
          });

          if ($this._graphicsLayer) $this._graphicsLayer.entities.remove(lineObj as any);

          if (typeof options.callback === "function") {
            options.callback(_slopeAnalysis);
          }
        },
      });
    }
  },
  /**
   * 方量分析
   * @function
   * @param {object} options
   * @param {function} options.callback - 回调
   * @example
   * const analysis = new Analysis({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
   * // 调用后绘制一个面，再输入开挖深度即可得到挖填方量
   * analysis.createCutVolumeAnalysis({
   *   callback: (result) => console.log('方量分析对象', result)
   * })
   */
  createCutVolumeAnalysis: function (this: AnalysisInstance, options?: CutVolumeAnalysisOptions) {
    options = options || {};
    if (this._viewer && options) {
      var $this = this;
      $this.drawWallGraphics({
        callback: function (wall: unknown) {
          // 回调返回 WGS84，方量分析内部需要 Cartesian3
          var _cutVolumeAnalysis = new (CutVolumeAnalysis as unknown as new (params: CutVolumeAnalysisParams) => CutVolumeAnalysisInstance)({
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(
              wgs84ArrayToDegreesArrayHeights(wall)
            ) as unknown as any[],
            that: $this,
          });

          if (typeof options.callback === "function") {
            options.callback(_cutVolumeAnalysis);
          }
        },
      });
    }
  },
  /**
   * 剖面分析
   * @function
   * @param {object} options
   * @param {Array} [options.positions] - 剖面线坐标（不传则交互绘制）
   * @param {number} [options.samples] - 采样点数量，默认 100
   * @param {boolean} [options.chart] - 是否绘制剖面图，默认 true
   * @param {function} options.callback - 回调，参数含 samples / stats / chart / remove
   * @example
   * const analysis = new Analysis({ cesiumGlobal: Cesium, containerId: 'cesiumContainer' })
   * // 交互：在地图上点两个点，自动生成高程剖面图
   * analysis.createProfileAnalysis({
   *   callback: (result) => console.log('剖面统计', result.stats)
   * })
   *
   * // 也可以直接给定一条线
   * analysis.createProfileAnalysis({
   *   positions: [[104.09, 30.65], [104.11, 30.68]],
   *   samples: 200
   * })
   */
  createProfileAnalysis: function (this: AnalysisInstance, options?: ProfileAnalysisOptions) {
    options = options || {};
    var $this = this;
    if (!$this._viewer) return;
    var opts = options;
    var sampleCount = opts.samples && opts.samples > 1 ? Math.floor(opts.samples) : 100;

    var run = async function (positions: any[]) {
      var built = buildProfileSamples($this, positions, sampleCount);
      var chart: any = null;
      if (opts.chart !== false) {
        await ensureEcharts();
        chart = renderProfileChart($this, built.samples);
      }
      var result: ProfileAnalysisResult = {
        samples: built.samples,
        stats: built.stats,
        chart: chart,
        remove: function () {
          if (chart && typeof chart.dispose === "function") {
            chart.dispose();
          }
          if (chart && chart.__cdkContainer && chart.__cdkContainer.parentNode) {
            chart.__cdkContainer.parentNode.removeChild(chart.__cdkContainer);
          }
        },
      };
      if (typeof opts.callback === "function") opts.callback(result);
    };

    if (opts.positions && opts.positions.length >= 2) {
      var pts = opts.positions;
      var hasHeight = pts.some(function (p) {
        return p.length >= 3;
      });
      var flat: number[] = [];
      pts.forEach(function (p) {
        flat.push(p[0], p[1]);
        if (hasHeight) flat.push(p[2] ?? 0);
      });
      var cartesians = hasHeight
        ? Cesium.Cartesian3.fromDegreesArrayHeights(flat)
        : Cesium.Cartesian3.fromDegreesArray(flat);
      void run(cartesians);
    } else {
      $this.drawLineGraphics({
        type: "straightLine",
        clampToGround: false,
        callback: function (line: unknown, lineObj: unknown) {
          if ($this._graphicsLayer) $this._graphicsLayer.entities.remove(lineObj as any);
          void run(line as any[]);
        },
      });
    }
  },
  /**
   * 坡向分析
   * @function
   * @param {object} options
   * @param {Array} [options.positions] - 剖面线坐标（不传则交互绘制）
   * @param {number} [options.samples] - 采样点数量，默认 100
   * @param {boolean} [options.chart] - 是否绘制图表，默认 true
   * @param {function} options.callback - 回调，参数含 samples / avgSlopeDeg / dominantAspectDeg / chart / remove
   * @example
   * analysis.createAspectAnalysis({
   *   callback: (result) => console.log('主导坡向', result.dominantAspectDeg)
   * })
   */
  createAspectAnalysis: function (this: AnalysisInstance, options?: AspectAnalysisOptions) {
    options = options || {};
    var $this = this;
    if (!$this._viewer) return;
    var opts = options;
    var sampleCount = opts.samples && opts.samples > 1 ? Math.floor(opts.samples) : 100;

    var run = async function (positions: any[]) {
      var built = buildAspectSamples($this, positions, sampleCount);
      var chart: any = null;
      if (opts.chart !== false) {
        await ensureEcharts();
        chart = renderAspectChart($this, built.samples);
      }
      var result: AspectAnalysisResult = {
        samples: built.samples,
        avgSlopeDeg: built.avgSlopeDeg,
        dominantAspectDeg: built.dominantAspectDeg,
        chart: chart,
        remove: function () {
          disposeChart(chart);
        },
      };
      if (typeof opts.callback === "function") opts.callback(result);
    };

    if (opts.positions && opts.positions.length >= 2) {
      void run(toCartesianArray(opts.positions));
    } else {
      $this.drawLineGraphics({
        type: "straightLine",
        clampToGround: false,
        callback: function (line: unknown, lineObj: unknown) {
          if ($this._graphicsLayer) $this._graphicsLayer.entities.remove(lineObj as any);
          void run(line as any[]);
        },
      });
    }
  },
  /**
   * 多观察点可视域分析
   *
   * 每个观察点都会摆好视域姿态（朝向 / 俯仰 / 视距，或直接瞄准 target），
   * 否则 ShadowPrimitive 默认贴地朝北只看 100m，视域小到看不见。
   * @function
   * @param {object} options
   * @param {Array} [options.observers] - 观察点：`[lng, lat, height?]` 或 `{ position, target }`；不传则交互（左键放置 → 移动瞄准 → 再次左键确认）
   * @param {number} [options.direction] - 无 target 时的默认朝向（度，0=北），默认 0
   * @param {number} [options.pitch] - 无 target 时的默认俯仰（度，负值向下），默认 0
   * @param {number} [options.distance] - 无 target 时的默认视距（米），默认 500
   * @param {number} [options.eyeHeight] - 观察者眼睛离地高度（米），默认 1.7
   * @param {number} [options.maxObservers] - 交互模式下最多观察点数量，默认 5
   * @param {function} options.callback - 回调，参数含 observerCount / addObserver / finish / remove
   * @example
   * // 直接给观察点与瞄准目标
   * analysis.createMultiViewshedAnalysis({
   *   observers: [
   *     { position: [104.09, 30.65, 520], target: [104.11, 30.66, 480] },
   *     { position: [104.12, 30.63, 540] } // 无 target，按 direction/pitch/distance 摆姿势
   *   ],
   *   distance: 800
   * })
   *
   * // 交互：左键放一个观察点 → 移动鼠标瞄准 → 再次左键确认 → 下一击放下一个
   * // 最多 4 个；回调里可调用 result.finish() 提前结束
   * analysis.createMultiViewshedAnalysis({ maxObservers: 4 })
   */
  createMultiViewshedAnalysis: function (this: AnalysisInstance, options?: MultiViewshedAnalysisOptions) {
    options = options || {};
    var $this = this;
    if (!$this._viewer) return;
    var opts = options;
    var primitives: any[] = [];
    var layer = $this._analysisLayer as any;
    var eyeHeight = typeof opts.eyeHeight === "number" ? opts.eyeHeight : 1.7;
    var defaultDirection = typeof opts.direction === "number" ? opts.direction : 0;
    var defaultPitch = typeof opts.pitch === "number" ? opts.pitch : 0;
    var defaultDistance = typeof opts.distance === "number" ? opts.distance : 500;

    /** 解析高度：显式给定优先，否则按地形采样，最后回退 0 */
    var resolveHeight = function (lng: number, lat: number, height?: number): number {
      if (typeof height === "number") return height;
      var h = $this._viewer.scene.globe.getHeight(Cesium.Cartographic.fromDegrees(lng, lat));
      return typeof h === "number" ? h : 0;
    };

    /** 把观察点抬高 eyeHeight（眼睛离地），否则相机贴地会被地形挡住 */
    var applyEyeHeight = function (cartesian: any): any {
      if (!cartesian || !eyeHeight) return cartesian;
      var carto = Cesium.Cartographic.fromCartesian(cartesian);
      return Cesium.Cartesian3.fromRadians(
        carto.longitude,
        carto.latitude,
        carto.height + eyeHeight
      );
    };

    /**
     * 创建一个观察点并摆好视域姿态。
     *
     * 关键：ShadowPrimitive 构造后默认 _direction=0 / _pitch=0 / _distance=100，
     * 相机贴地朝北只看 100m，视域小到看不见（只剩黄色 debug 框架）。
     * 必须通过 setPoseByTargetPoint 或 direction/pitch/distance 显式摆姿势。
     */
    var addObserverCartesian = function (position: any, target?: any): any {
      if (!position) return undefined;
      var primitive = new Cesium.Scene.ShadowPrimitive({
        scene: $this._viewer.scene,
        viewerPosition: applyEyeHeight(position),
      });
      if (target) {
        primitive.setPoseByTargetPoint(target);
      } else {
        primitive.direction = defaultDirection;
        primitive.pitch = defaultPitch;
        primitive.distance = defaultDistance;
      }
      layer._primitives.add(primitive);
      primitives.push(primitive);
      return primitive;
    };

    var toCartesian = function (p: [number, number, number?]): any {
      return Cesium.Cartesian3.fromDegrees(p[0], p[1], resolveHeight(p[0], p[1], p[2]));
    };

    /** 交互模式下由下方赋值；非交互模式（显式传 observers）保持空操作 */
    var finishInteraction: () => void = function () {};

    var result: MultiViewshedAnalysisResult = {
      get observerCount() {
        return primitives.length;
      },
      addObserver: function (
        lng: number,
        lat: number,
        height?: number,
        target?: [number, number, number?]
      ) {
        var position = Cesium.Cartesian3.fromDegrees(lng, lat, resolveHeight(lng, lat, height));
        addObserverCartesian(position, target ? toCartesian(target) : undefined);
      },
      finish: function () {
        finishInteraction();
      },
      remove: function () {
        finishInteraction();
        removePrimitives(layer, primitives);
      },
    };

    if (opts.observers && opts.observers.length) {
      opts.observers.forEach(function (o) {
        if (Array.isArray(o)) {
          addObserverCartesian(toCartesian(o as [number, number, number?]));
        } else {
          var item = o as MultiViewshedObserver;
          addObserverCartesian(toCartesian(item.position), item.target ? toCartesian(item.target) : undefined);
        }
      });
      if (typeof opts.callback === "function") opts.callback(result);
      return;
    }

    // 交互模式，与 createVisualFieldAnalysis 一致的「两击一个观察点」节奏：
    //   第 1 击 → 放置观察点，之后移动鼠标把它瞄准到光标
    //   第 2 击 → 确认当前观察点（锁定瞄准），不新建
    //   第 3 击 → 放置下一个观察点…… 直到 maxObservers 或调用 finish()
    // 若每次点击都新建，用户想「点一下收尾」却会不断冒出新观察点（套娃）。
    var callbackFired = false;
    var maxObservers =
      opts.maxObservers && opts.maxObservers > 0 ? Math.floor(opts.maxObservers) : 5;
    var active: any = null;
    var aiming = false;
    var handlersRef: any = null;

    finishInteraction = function () {
      active = null;
      aiming = false;
      if (handlersRef && !handlersRef.isDestroyed()) handlersRef.destroy();
      handlersRef = null;
    };

    bindAnalysisEvent($this, {
      leftClick: (function click(event: any, handlers: any) {
        handlersRef = handlers;
        if (aiming) {
          // 第 2 击：确认当前观察点，绝不再新建
          active = null;
          aiming = false;
          if (primitives.length >= maxObservers && handlers) {
            handlers.destroy();
            handlersRef = null;
          }
          return;
        }
        var position = $this._viewer.scene.pickPosition(event.position);
        if (!position) return;
        active = addObserverCartesian(position);
        aiming = true;
        if (!callbackFired && typeof opts.callback === "function") {
          callbackFired = true;
          opts.callback(result);
        }
      }) as MouseEventHandler,
      mouseMove: (function move(event: any) {
        if (!aiming || !active) return;
        var target = $this._viewer.scene.pickPosition(event.endPosition);
        if (target) active.setPoseByTargetPoint(target);
      }) as MouseEventHandler,
    });
  },
  /**
   * 方量对比分析
   * @function
   * @param {object} options
   * @param {Array} [options.designHeights] - 对比的设计标高列表；不传则按地形自动生成
   * @param {number} [options.gridStep] - 网格采样步长（度）
   * @param {boolean} [options.chart] - 是否绘制对比柱状图，默认 true
   * @param {function} options.callback - 回调，参数含 items / cellCount / bounds / chart / remove
   * @example
   * analysis.createCutVolumeCompareAnalysis({
   *   designHeights: [500, 520, 540],
   *   callback: (result) => console.log(result.items)
   * })
   */
  createCutVolumeCompareAnalysis: function (this: AnalysisInstance, options?: CutVolumeCompareOptions) {
    options = options || {};
    var $this = this;
    if (!$this._viewer) return;
    var opts = options;

    var run = async function (polygon: unknown) {
      var ring = wgs84ToRing(polygon);
      if (ring.length < 3) return;
      var cells = sampleVolumeCells($this, ring, opts.gridStep);
      var bounds = computeRingBounds(ring);
      if (!cells.length) {
        if (typeof opts.callback === "function") {
          opts.callback({
            items: [],
            cellCount: 0,
            bounds: bounds,
            chart: null,
            remove: function () {},
          });
        }
        return;
      }
      var designHeights =
        opts.designHeights && opts.designHeights.length
          ? opts.designHeights
          : buildDefaultDesignHeights(cells);
      var items: VolumeCompareItem[] = designHeights.map(function (designHeight) {
        var r = computeVolumeCompare(cells, designHeight);
        return {
          designHeight: designHeight,
          cut: r.cut,
          fill: r.fill,
          net: r.net,
          total: r.total,
        };
      });
      var chart: any = null;
      if (opts.chart !== false) {
        await ensureEcharts();
        chart = renderVolumeCompareChart($this, items);
      }
      var result: CutVolumeCompareResult = {
        items: items,
        cellCount: cells.length,
        bounds: bounds,
        chart: chart,
        remove: function () {
          disposeChart(chart);
        },
      };
      if (typeof opts.callback === "function") opts.callback(result);
    };

    if (opts.positions && opts.positions.length >= 3) {
      void run(
        opts.positions.map(function (p) {
          return { lng: p[0], lat: p[1], alt: p[2] ?? 0 };
        })
      );
      return;
    }

    $this.drawPolygonGraphics({
      callback: function (polygon: unknown, polygonObj: unknown) {
        if ($this._drawLayer) $this._drawLayer.entities.remove(polygonObj as any);
        void run(polygon);
      },
    });
  },
  /**
   * 批量地形开挖
   * @function
   * @param {object} options
   * @param {Array} [options.regions] - 多个开挖区域；不传则交互绘制一个
   * @param {number} [options.height] - 开挖深度
   * @param {number} [options.splitNum] - 坑体细分
   * @param {string} [options.wallImg] - 四壁贴图
   * @param {string} [options.bottomImg] - 底部贴图
   * @param {function} options.callback - 回调，参数含 count / remove
   * @example
   * analysis.createBatchClipPlanAnalysis({
   *   regions: [
   *     [[104.08, 30.64], [104.09, 30.64], [104.09, 30.65]],
   *     [[104.11, 30.66], [104.12, 30.66], [104.12, 30.67]]
   *   ],
   *   height: 30
   * })
   */
  createBatchClipPlanAnalysis: function (this: AnalysisInstance, options?: BatchClipPlanOptions) {
    options = options || {};
    var $this = this;
    if (!$this._viewer) return;
    var opts = options;
    var plans: any[] = [];
    var _height = opts.height || 30;
    var _splitNum = opts.splitNum || 50;
    var _wallImg =
      opts.wallImg ||
      $this.getDfSt(["amalysis", "createClipPlanAnalysis_wallImg"]) ||
      "static/data/images/file/excavate_side_min.jpg";
    var _bottomImg =
      opts.bottomImg ||
      $this.getDfSt(["amalysis", "createClipPlanAnalysis_bottomImg"]) ||
      "static/data/images/file/excavate_bottom_min.jpg";

    var addPlan = function (wgs84: any[]) {
      var positions = Cesium.Cartesian3.fromDegreesArrayHeights(
        wgs84ArrayToDegreesArrayHeights(wgs84)
      );
      var plan = new Cesium.Scene.TerrainClipPlan($this._viewer, {
        height: _height,
        splitNum: _splitNum,
        wallImg: _wallImg,
        bottomImg: _bottomImg,
      });
      plan.updateData(positions);
      plans.push(plan);
    };

    var buildResult = function (): BatchClipPlanResult {
      return {
        get count() {
          return plans.length;
        },
        remove: function () {
          clearClipPlans(plans);
        },
      };
    };

    if (opts.regions && opts.regions.length) {
      opts.regions.forEach(function (region) {
        addPlan(
          region.map(function (p) {
            return { lng: p[0], lat: p[1], alt: p[2] ?? 0 };
          })
        );
      });
      if (typeof opts.callback === "function") opts.callback(buildResult());
      return;
    }

    $this.drawPolygonGraphics({
      callback: function (polygon: unknown, polygonObj: unknown) {
        if ($this._drawLayer) $this._drawLayer.entities.remove(polygonObj as any);
        addPlan(polygon as any[]);
        if (typeof opts.callback === "function") opts.callback(buildResult());
      },
    });
  },
  /**
   * 通视路径分析
   * @function
   * @param {object} options
   * @param {Array} [options.positions] - 路径坐标（不传则交互绘制）
   * @param {number} [options.observerHeight] - 观察者离地高度，默认 1.7
   * @param {number} [options.targetHeight] - 目标离地高度，默认 0
   * @param {number} [options.samples] - 采样点数量，默认 100
   * @param {function} options.callback - 回调，参数含 visible / firstBlockerIndex / visibleRatio / remove
   * @example
   * analysis.createVisibilityPathAnalysis({
   *   positions: [[104.09, 30.65], [104.11, 30.68]],
   *   observerHeight: 1.7
   * })
   */
  createVisibilityPathAnalysis: function (this: AnalysisInstance, options?: VisibilityPathOptions) {
    options = options || {};
    var $this = this;
    if (!$this._viewer) return;
    var opts = options;
    var sampleCount = opts.samples && opts.samples > 1 ? Math.floor(opts.samples) : 100;

    var run = function (positions: any[]) {
      var samples = buildPathSightSamples($this, positions, sampleCount);
      var sight = computeSightlineVisibility(samples, {
        observerHeight: opts.observerHeight ?? 1.7,
        targetHeight: opts.targetHeight ?? 0,
      });
      var entities: any[] = [];
      for (var i = 1; i < samples.length; i++) {
        var color = sight.visible[i] ? Cesium.Color.GREEN : Cesium.Color.RED;
        var start = Cesium.Cartesian3.fromDegrees(
          samples[i - 1].lng,
          samples[i - 1].lat,
          samples[i - 1].groundHeight + 2
        );
        var end = Cesium.Cartesian3.fromDegrees(
          samples[i].lng,
          samples[i].lat,
          samples[i].groundHeight + 2
        );
        entities.push(
          $this._analysisLayer.entities.add({
            polyline: {
              positions: [start, end],
              width: 4,
              arcType: Cesium.ArcType.NONE,
              material: color,
            },
          })
        );
      }
      var visibleCount = 0;
      for (var k = 0; k < sight.visible.length; k++) if (sight.visible[k]) visibleCount++;
      var result: VisibilityPathResult = {
        visible: sight.visible,
        firstBlockerIndex: sight.firstBlockerIndex,
        visibleRatio: samples.length ? visibleCount / samples.length : 0,
        remove: function () {
          for (var e = 0; e < entities.length; e++) $this._analysisLayer.entities.remove(entities[e]);
          entities.length = 0;
        },
      };
      if (typeof opts.callback === "function") opts.callback(result);
    };

    if (opts.positions && opts.positions.length >= 2) {
      run(toCartesianArray(opts.positions));
    } else {
      $this.drawLineGraphics({
        type: "straightLine",
        clampToGround: false,
        callback: function (line: unknown, lineObj: unknown) {
          if ($this._graphicsLayer) $this._graphicsLayer.entities.remove(lineObj as any);
          run(line as any[]);
        },
      });
    }
  },
} as unknown as AnalysisInstance;

/** 把 [lng, lat, height?] 数组转成 Cartesian3 数组（内部使用） */
function toCartesianArray(positions: Array<[number, number, number?]>): any[] {
  var hasHeight = positions.some(function (p) {
    return p.length >= 3;
  });
  var flat: number[] = [];
  positions.forEach(function (p) {
    flat.push(p[0], p[1]);
    if (hasHeight) flat.push(p[2] ?? 0);
  });
  return hasHeight
    ? Cesium.Cartesian3.fromDegreesArrayHeights(flat)
    : Cesium.Cartesian3.fromDegreesArray(flat);
}

/** 读取指定经纬度（弧度）处的地形高程，取不到时返回 0 */
function sampleTerrainHeight(that: AnalysisInstance, lonRad: number, latRad: number): number {
  var carto = new Cesium.Cartographic(lonRad, latRad);
  var h = that._viewer.scene.globe.getHeight(carto);
  return typeof h === "number" ? h : 0;
}

/** 创建一个统一的 echarts 浮层容器（内部使用） */
function createEchartContainer(that: AnalysisInstance): HTMLDivElement {
  var container = document.createElement("div");
  container.className = "echart-viewer";
  that._viewer.container.appendChild(container);
  container.style.position = "absolute";
  container.style.left = "20px";
  container.style.bottom = "20px";
  container.style.height = "300px";
  container.style.width = "640px";
  container.style.overflow = "hidden";
  container.style.zIndex = "9999";
  container.style.opacity = "0.9";
  return container;
}

/** 释放 echarts 实例与容器（内部使用） */
function disposeChart(chart: any): void {
  if (chart && typeof chart.dispose === "function") chart.dispose();
  if (chart && chart.__cdkContainer && chart.__cdkContainer.parentNode) {
    chart.__cdkContainer.parentNode.removeChild(chart.__cdkContainer);
  }
}

/**
 * 沿一条线段采样坡度 / 坡向（内部使用）
 */
function buildAspectSamples(
  that: AnalysisInstance,
  positions: any[],
  sampleCount: number
): { samples: AspectSample[]; avgSlopeDeg: number; dominantAspectDeg: number } {
  var start = positions[0];
  var end = positions[positions.length - 1];
  var samples: AspectSample[] = [];
  var total = 0;
  var prevCarto: any = null;
  var lerp = new Cesium.Cartesian3();
  var stepMeters = 10;

  for (var i = 0; i <= sampleCount; i++) {
    var t = i / sampleCount;
    Cesium.Cartesian3.lerp(start, end, t, lerp);
    var carto = Cesium.Cartographic.fromCartesian(lerp);
    var lng = Cesium.Math.toDegrees(carto.longitude);
    var lat = Cesium.Math.toDegrees(carto.latitude);
    var height = that._viewer.scene.globe.getHeight(carto);
    if (typeof height !== "number") height = 0;
    if (prevCarto) {
      total += new Cesium.EllipsoidGeodesic(prevCarto, carto).surfaceDistance;
    }

    var dLng = stepMeters / (111320 * Math.max(0.01, Math.cos(carto.latitude)));
    var dLat = stepMeters / 110540;
    var dLngRad = Cesium.Math.toRadians(dLng);
    var dLatRad = Cesium.Math.toRadians(dLat);
    var sa = computeSlopeAspect({
      center: height,
      east: sampleTerrainHeight(that, carto.longitude + dLngRad, carto.latitude),
      west: sampleTerrainHeight(that, carto.longitude - dLngRad, carto.latitude),
      north: sampleTerrainHeight(that, carto.longitude, carto.latitude + dLatRad),
      south: sampleTerrainHeight(that, carto.longitude, carto.latitude - dLatRad),
      dx: stepMeters,
      dy: stepMeters,
    });

    samples.push({
      distance: total,
      lng: lng,
      lat: lat,
      height: height,
      slopeDeg: sa.slopeDeg,
      aspectDeg: sa.aspectDeg,
    });
    prevCarto = carto;
  }

  var slopeSum = 0;
  var slopeCount = 0;
  var vx = 0;
  var vy = 0;
  samples.forEach(function (s) {
    if (s.slopeDeg > 0.01) {
      slopeSum += s.slopeDeg;
      slopeCount++;
    }
    if (s.aspectDeg >= 0) {
      var r = Cesium.Math.toRadians(s.aspectDeg);
      vx += Math.sin(r);
      vy += Math.cos(r);
    }
  });

  var dominant = -1;
  if (vx !== 0 || vy !== 0) {
    dominant = (Math.atan2(vx, vy) * 180) / Math.PI;
    if (dominant < 0) dominant += 360;
  }

  return {
    samples: samples,
    avgSlopeDeg: slopeCount ? slopeSum / slopeCount : 0,
    dominantAspectDeg: dominant,
  };
}

/** 渲染坡向 / 坡度图（内部使用） */
function renderAspectChart(that: AnalysisInstance, samples: AspectSample[]): any {
  var data = buildAspectChartData(samples);
  var container = createEchartContainer(that);
  var chart = echartsMod.init(container);
  chart.setOption({
    title: {
      text: "坡向 / 坡度分析",
      left: "center",
      textStyle: { color: "white", fontSize: 15 },
    },
    tooltip: { trigger: "axis" },
    legend: { data: ["坡向", "坡度"], textStyle: { color: "white" }, top: 24 },
    grid: { left: 60, right: 70, top: 70, bottom: 50 },
    xAxis: [
      {
        type: "category",
        name: "距离(米)",
        boundaryGap: false,
        data: data.distance.map(function (d) {
          return d.toFixed(1);
        }),
        axisLabel: { textStyle: { color: "white" } },
        axisLine: { lineStyle: { color: "white" } },
      },
    ],
    yAxis: [
      {
        type: "value",
        name: "坡向(°)",
        min: 0,
        max: 360,
        axisLabel: { textStyle: { color: "white" } },
        axisLine: { lineStyle: { color: "white" } },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
      },
      {
        type: "value",
        name: "坡度(°)",
        axisLabel: { textStyle: { color: "white" } },
        axisLine: { lineStyle: { color: "white" } },
        splitLine: { show: false },
      },
    ],
    series: [
      { name: "坡向", type: "line", smooth: true, connectNulls: false, data: data.aspect, yAxisIndex: 0 },
      { name: "坡度", type: "line", smooth: true, data: data.slope, yAxisIndex: 1 },
    ],
  });
  chart.__cdkContainer = container;
  return chart;
}

/** 把 drawPolygonGraphics 回调的 WGS84 数组转成 [lng, lat] 环（内部使用） */
function wgs84ToRing(polygon: unknown): LngLat[] {
  var list = polygon as any[];
  var ring: LngLat[] = [];
  if (!list) return ring;
  for (var i = 0; i < list.length; i++) {
    var p = list[i];
    var lng = p.lng !== undefined ? p.lng : p.longitude;
    var lat = p.lat !== undefined ? p.lat : p.latitude;
    if (typeof lng === "number" && typeof lat === "number") ring.push([lng, lat]);
  }
  if (ring.length > 1) {
    var first = ring[0];
    var last = ring[ring.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) ring.pop();
  }
  return ring;
}

/** 计算经纬度环的包围盒（内部使用） */
function computeRingBounds(ring: LngLat[]): [number, number, number, number] {
  var minLng = Infinity;
  var minLat = Infinity;
  var maxLng = -Infinity;
  var maxLat = -Infinity;
  for (var i = 0; i < ring.length; i++) {
    var p = ring[i];
    if (p[0] < minLng) minLng = p[0];
    if (p[0] > maxLng) maxLng = p[0];
    if (p[1] < minLat) minLat = p[1];
    if (p[1] > maxLat) maxLat = p[1];
  }
  return [minLng, minLat, maxLng, maxLat];
}

/** 在多边形内按网格采样高程，返回带面积的单元（内部使用） */
function sampleVolumeCells(that: AnalysisInstance, ring: LngLat[], gridStep?: number): VolumeCell[] {
  var bounds = computeRingBounds(ring);
  var spanLng = bounds[2] - bounds[0];
  var spanLat = bounds[3] - bounds[1];
  if (spanLng <= 0 || spanLat <= 0) return [];

  var step = gridStep && gridStep > 0 ? gridStep : Math.max(spanLng, spanLat) / 40;
  if (step <= 0) step = 0.0005;

  var midLat = (bounds[1] + bounds[3]) / 2;
  var metersPerDegLat = 110540;
  var metersPerDegLng = 111320 * Math.max(0.01, Math.cos((midLat * Math.PI) / 180));
  var area = step * metersPerDegLng * step * metersPerDegLat;

  var cells: VolumeCell[] = [];
  for (var lng = bounds[0] + step / 2; lng < bounds[2]; lng += step) {
    for (var lat = bounds[1] + step / 2; lat < bounds[3]; lat += step) {
      if (!isPointInPolygon([lng, lat], ring)) continue;
      var carto = Cesium.Cartographic.fromDegrees(lng, lat);
      var h = that._viewer.scene.globe.getHeight(carto);
      if (typeof h !== "number") continue;
      cells.push({ height: h, area: area });
    }
  }
  return cells;
}

/** 按地形高低生成默认的对比设计标高（内部使用） */
function buildDefaultDesignHeights(cells: VolumeCell[]): number[] {
  if (!cells.length) return [];
  var min = Infinity;
  var max = -Infinity;
  for (var i = 0; i < cells.length; i++) {
    if (cells[i].height < min) min = cells[i].height;
    if (cells[i].height > max) max = cells[i].height;
  }
  var out: number[] = [];
  for (var k = 1; k <= 5; k++) out.push(min + ((max - min) * k) / 6);
  return out;
}

/** 渲染方量对比柱状图（内部使用） */
function renderVolumeCompareChart(that: AnalysisInstance, items: VolumeCompareItem[]): any {
  var data = buildVolumeCompareChartData(items);
  var container = createEchartContainer(that);
  var chart = echartsMod.init(container);
  chart.setOption({
    title: {
      text: "方量对比（挖方 / 填方）",
      left: "center",
      textStyle: { color: "white", fontSize: 15 },
    },
    tooltip: { trigger: "axis" },
    legend: { data: ["挖方", "填方"], textStyle: { color: "white" }, top: 24 },
    grid: { left: 70, right: 30, top: 70, bottom: 50 },
    xAxis: [
      {
        type: "category",
        name: "设计标高(米)",
        data: data.designHeights.map(function (h) {
          return h.toFixed(1);
        }),
        axisLabel: { textStyle: { color: "white" } },
        axisLine: { lineStyle: { color: "white" } },
      },
    ],
    yAxis: [
      {
        type: "value",
        name: "方量(m³)",
        axisLabel: { textStyle: { color: "white" } },
        axisLine: { lineStyle: { color: "white" } },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.12)" } },
      },
    ],
    series: [
      { name: "挖方", type: "bar", data: data.cut, itemStyle: { color: "#ff7043" } },
      { name: "填方", type: "bar", data: data.fill, itemStyle: { color: "#42a5f5" } },
    ],
  });
  chart.__cdkContainer = container;
  return chart;
}

/** 沿路径采样地面高程与累计距离（通视路径用，内部使用） */
function buildPathSightSamples(
  that: AnalysisInstance,
  positions: any[],
  sampleCount: number
): Array<{ distance: number; groundHeight: number; lng: number; lat: number }> {
  var start = positions[0];
  var end = positions[positions.length - 1];
  var samples: Array<{ distance: number; groundHeight: number; lng: number; lat: number }> = [];
  var total = 0;
  var prevCarto: any = null;
  var lerp = new Cesium.Cartesian3();

  for (var i = 0; i <= sampleCount; i++) {
    var t = i / sampleCount;
    Cesium.Cartesian3.lerp(start, end, t, lerp);
    var carto = Cesium.Cartographic.fromCartesian(lerp);
    var h = that._viewer.scene.globe.getHeight(carto);
    if (typeof h !== "number") h = 0;
    if (prevCarto) total += new Cesium.EllipsoidGeodesic(prevCarto, carto).surfaceDistance;
    samples.push({
      distance: total,
      groundHeight: h,
      lng: Cesium.Math.toDegrees(carto.longitude),
      lat: Cesium.Math.toDegrees(carto.latitude),
    });
    prevCarto = carto;
  }
  return samples;
}

/** 安全移除一组自定义 primitive（ShadowPrimitive 没有 destroy，内部使用） */
function removePrimitives(layer: any, primitives: any[]): void {
  if (!layer || !layer._primitives) {
    primitives.length = 0;
    return;
  }
  var collection = layer._primitives;
  var prevDestroy = collection.destroyPrimitives;
  collection.destroyPrimitives = false;
  for (var i = 0; i < primitives.length; i++) {
    try {
      collection.remove(primitives[i]);
    } catch (e) {
      /* ignore */
    }
  }
  collection.destroyPrimitives = prevDestroy;
  primitives.length = 0;
}

/** 清空批量开挖（内部使用） */
function clearClipPlans(plans: any[]): void {
  for (var i = 0; i < plans.length; i++) {
    var plan = plans[i];
    try {
      if (plan && typeof plan.clear === "function") plan.clear();
    } catch (e) {
      /* ignore */
    }
  }
  plans.length = 0;
}

/**
 * 沿一条线段采样地形，得到剖面点与统计（内部使用）
 * @param that - Analysis 实例（提供 viewer）
 * @param positions - Cartesian3 数组（至少首尾两点）
 * @param sampleCount - 采样段数
 */
function buildProfileSamples(
  that: AnalysisInstance,
  positions: any[],
  sampleCount: number
): { samples: ProfileSample[]; stats: ProfileStats } {
  var start = positions[0];
  var end = positions[positions.length - 1];
  var samples: ProfileSample[] = [];
  var total = 0;
  var prevCarto: any = null;
  var lerp = new Cesium.Cartesian3();
  for (var i = 0; i <= sampleCount; i++) {
    var t = i / sampleCount;
    Cesium.Cartesian3.lerp(start, end, t, lerp);
    var carto = Cesium.Cartographic.fromCartesian(lerp);
    var height = that._viewer.scene.globe.getHeight(carto);
    if (typeof height !== "number") height = 0;
    if (prevCarto) {
      // 用椭球测地线算水平距离，避免把高差算进 x 轴
      var geodesic = new Cesium.EllipsoidGeodesic(prevCarto, carto);
      total += geodesic.surfaceDistance;
    }
    samples.push({
      distance: total,
      height: height,
      lng: Cesium.Math.toDegrees(carto.longitude),
      lat: Cesium.Math.toDegrees(carto.latitude),
    });
    prevCarto = carto;
  }
  return { samples: samples, stats: computeProfileStats(samples) };
}

/**
 * 渲染剖面高程图（内部使用）
 * @param that - Analysis 实例
 * @param samples - 剖面采样点
 */
function renderProfileChart(that: AnalysisInstance, samples: ProfileSample[]): any {
  var data = buildProfileChartData(samples);
  var container = document.createElement("div");
  container.className = "echart-viewer";
  that._viewer.container.appendChild(container);
  container.style.position = "absolute";
  container.style.left = "20px";
  container.style.bottom = "20px";
  container.style.height = "300px";
  container.style.width = "640px";
  container.style.overflow = "hidden";
  container.style.zIndex = "9999";
  container.style.opacity = "0.9";
  var chart = echartsMod.init(container);
  chart.setOption({
    title: {
      text: "剖面分析",
      left: "center",
      textStyle: { color: "white", fontSize: 15 },
    },
    tooltip: { trigger: "axis" },
    grid: { left: 60, right: 30, top: 50, bottom: 50 },
    xAxis: [
      {
        type: "category",
        name: "距离(米)",
        boundaryGap: false,
        data: data.distance.map(function (d) {
          return d.toFixed(1);
        }),
        axisLabel: { textStyle: { color: "white" } },
        axisLine: { lineStyle: { color: "white" } },
      },
    ],
    yAxis: [
      {
        type: "value",
        name: "高程(米)",
        axisLabel: { textStyle: { color: "white" } },
        axisLine: { lineStyle: { color: "white" } },
        splitLine: { lineStyle: { color: "rgba(255,255,255,0.15)" } },
      },
    ],
    series: [
      {
        name: "高程",
        type: "line",
        smooth: true,
        areaStyle: {},
        data: data.height,
        markPoint: {
          data: [
            { type: "max", name: "最高点" },
            { type: "min", name: "最低点" },
          ],
        },
        markLine: { data: [{ type: "average", name: "平均" }] },
      },
    ],
  });
  chart.__cdkContainer = container;
  return chart;
}

/** 通视分析参数 */
interface VisibilityAnalysisParams {
  positions: any[]
  that: AnalysisInstance
}

/** 相交检测结果项（drillPick 返回的元素） */
interface IntersectResultItem {
  object?: any
  position?: any
}

/** 通视分析实例 */
interface VisibilityAnalysisInstance {
  remove(): void
}

/**
 * 通视分析
 * @private
 * @param {*} params
 */
function VisibilityAnalysis(this: VisibilityAnalysisInstance, params: VisibilityAnalysisParams) {
  if (params && params.positions) {
    var positions = params.positions,
      that = params.that,
      points: any[] = [],
      lines: any[] = [],
      pickedObjs: unknown[] = [],
      position1 = positions[0],
      position2 = positions[1];
    points = that.$graphics.createPointsGraphics({
      point: true,
      positions: [position1, position2],
    }) as any[];

    var results = that.$math3d.getIntersectObj(position1, position2, points, true) as unknown as IntersectResultItem[]; //碰撞检测

    if (!results || results.length === 0) {
      alert("没有取到相交点 , 请检查是否开启深度检测。");
      return false;
    }
    //显示相交对象 高亮
    function showIntersections() {
      for (let i = 0; i < results.length; ++i) {
        var object = results[i].object;
        if (object) {
          if (object instanceof Cesium.Cesium3DTileFeature) {
            pickedObjs.push(object);
            ;(object as any & { oldColor?: any }).oldColor = object.color.clone();
            object.color = Cesium.Color.fromAlpha(Cesium.Color.YELLOW, object.color.alpha);
          } else if ((object as { id?: unknown }).id instanceof Cesium.Entity) {
            var entity = (object as { id: any }).id,
              checkEntity = (entity.polygon || entity.polyline) as any & any & { oldColor?: any };
            pickedObjs.push(entity);

            var color = ((checkEntity.material as unknown) as { color: { getValue: () => any } }).color.getValue();
            checkEntity.oldColor = color.clone();
            checkEntity.material = asProperty(Cesium.Color.fromAlpha(Cesium.Color.YELLOW, color.alpha));
          }
        }
        //相交点
        points.push(
          that._analysisLayer.entities.add({
            position: results[i].position,
            ellipsoid: {
              radii: new Cesium.Cartesian3(0.8, 0.8, 0.8),
              material: Cesium.Color.RED,
            },
          })
        );
      }
    }
    // 计算分析结果
    function computesResult() {
      //分析一下是否都有position
      for (let index = results.length - 1; index >= 0; index--) {
        const element = results[index];
        if (!Cesium.defined(element.position)) {
          results.splice(index, 1);
        }
      }
      if (!Cesium.defined(results[0].position)) {
        throw new Cesium.DeveloperError("position is undefined");
      }
      var pickPos1 = results[0].position!;
      var dis = Cesium.Cartesian3.distance(pickPos1, position2);
      var bVisibility = dis < 5 ? true : false;
      var arrowPositions = [position1, results[0].position!];
      //通视线
      var greenLine = that._analysisLayer.entities.add({
        polyline: {
          positions: arrowPositions,
          width: 10,
          arcType: Cesium.ArcType.NONE,
          material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.GREEN),
        },
      });
      lines.push(greenLine);
      //不通视
      if (!bVisibility) {
        var unArrowPositions = [results[0].position!, position2];
        var redLine = that._analysisLayer.entities.add({
          polyline: {
            positions: unArrowPositions,
            width: 10,
            arcType: Cesium.ArcType.NONE,
            material: new Cesium.PolylineArrowMaterialProperty(Cesium.Color.RED),
          },
        });

        lines.push(redLine);
      }
      showIntersections();
      var rad1 = Cesium.Cartographic.fromCartesian(position1);
      var rad2 = Cesium.Cartographic.fromCartesian(position2);
      var degree1 = {
        longitude: (rad1.longitude / Math.PI) * 180,
        latitude: (rad1.latitude / Math.PI) * 180,
        height: rad1.height,
      };
      var degree2 = {
        longitude: (rad2.longitude / Math.PI) * 180,
        latitude: (rad2.latitude / Math.PI) * 180,
        height: rad2.height,
      };

      var length_ping = Math.sqrt(
        Math.pow(position1.x - position2.x, 2) +
          Math.pow(position1.y - position2.y, 2) +
          Math.pow(position1.z - position2.z, 2)
      );
      var length_h = Math.abs(degree2.height - degree1.height);
      var length = Math.sqrt(Math.pow(length_ping, 2) + Math.pow(length_h, 2));

      var visTxt = bVisibility ? "是" : "否";
      var text =
        "起点坐标: " +
        ("   (" + degree1.longitude.toFixed(6)) +
        "\u00B0" +
        "," +
        degree1.latitude.toFixed(6) +
        "\u00B0" +
        "," +
        degree1.height.toFixed(2) +
        ")" +
        "\n终点坐标: " +
        ("   (" + degree2.longitude.toFixed(6)) +
        "\u00B0" +
        "," +
        degree2.latitude.toFixed(6) +
        "\u00B0" +
        "," +
        degree2.height.toFixed(2) +
        ")" +
        "\n垂直距离: " +
        "   " +
        length_h.toFixed(2) +
        "m" +
        "\n水平距离: " +
        "   " +
        length_ping.toFixed(2) +
        "m" +
        "\n空间距离: " +
        "   " +
        length.toFixed(2) +
        "m" +
        "\n是否可视: " +
        "   " +
        visTxt;

      if (points && points[0]) {
        points[0].label = {
          text: text,
          showBackground: true,
          font: "14px monospace",
          fillColor: Cesium.Color.YELLOW,
          pixelOffset: {
            x: 0,
            y: -20,
          },
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
        } as unknown as any;
      }
    }

    computesResult(); // 计算相交结果
  }

  VisibilityAnalysis.prototype.remove = function () {};
}

/** 环视分析参数 */
interface LookAroundAnalysisParams {
  that: AnalysisInstance
  radius: number
  center: any
  viewHeight?: number
}

/** 环视分析实例 */
interface LookAroundAnalysisInstance {
  remove(): void
  _pointsKSYResult?: unknown
}

/**
 * 环视分析
 * @private
 * @param {object} params
 */
function LookAroundAnalysis(this: LookAroundAnalysisInstance, params: LookAroundAnalysisParams) {
  if (!(params as unknown) && !params.center && !params.radius && params.that) {
    alert("没有获取到分析参数");
    return false;
  }

  var that = params.that,
    $this = this;
  if (!that._viewer.scene.globe.depthTestAgainstTerrain) {
    alert("请开启深度检测");
    return false;
  }

  var viewHeight = params.viewHeight || 10;
  var cartographicCenter = Cesium.Cartographic.fromCartesian(params.center);
  // 分析
  try {
    var ab = params.radius;
    var eopt = {
      semiMinorAxis: ab,
      semiMajorAxis: ab,
      rotation: 0,
      center: params.center,
      granularity: Math.PI / 30.0,
    };
    let ellipse = that.computeEllipseEdgePositions(eopt); //范围当前椭圆位置的数组
    for (let i = 0; i < ellipse!.outerPositions.length; i += 3) {
      //逐条计算可视域
      let cartesian = new Cesium.Cartesian3(
        ellipse!.outerPositions[i],
        ellipse!.outerPositions[i + 1],
        ellipse!.outerPositions[i + 2]
      );
      let cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      let deltaRadian = (0.0005 * Math.PI) / 180.0;
      let cartographicArr = that.computeInterpolateLineCartographic(cartographicCenter, cartographic, deltaRadian);
      that.computeCartographicPointsTerrainData(cartographicArr || [], function (terrainData: any[]) {
        if (terrainData.length > 0) {
          let preVisible = true;
          let cartesiansLine: any[] = [];
          let colors: number[] = [];
          for (let j = 1; j < terrainData.length; j++) {
            //逐点计算可见性
            let visible = true; //该点可见性
            if (j > 1) {
              let cartographicCenterHV = new Cesium.Cartographic(
                terrainData[0].longitude,
                terrainData[0].latitude,
                terrainData[0].height + viewHeight
              );
              if (preVisible) {
                //
                let curPoint = that.computeInterpolateIndexLineHeightCartographic(
                  cartographicCenterHV,
                  terrainData[j],
                  j,
                  j - 1
                );
                if (curPoint!.height >= terrainData[j - 1].height) {
                  preVisible = true;
                  visible = true;
                } else {
                  preVisible = false;
                  visible = false;
                }
              } else {
                //插值到当前
                let curPointArr = that.computeInterpolateIndexLineHeightCartographic(
                  cartographicCenterHV,
                  terrainData[j],
                  j,
                  j - 1
                );
                for (let k = 0; k < (curPointArr as unknown as any[]).length; k++) {
                  if ((curPointArr as unknown as any[])[k].height >= terrainData[k].height) {
                    preVisible = true;
                    visible = true;
                  } else {
                    preVisible = false;
                    visible = false;
                    break;
                  }
                }
              }
            }
            let cartesianTemp = Cesium.Cartesian3.fromRadians(
              terrainData[j].longitude,
              terrainData[j].latitude,
              terrainData[j].height + 1
            );
            cartesiansLine.push(cartesianTemp);
            //绘制点
            if (visible) {
              colors.push(0);
              colors.push(0);
              colors.push(1);
              colors.push(1);
            } else {
              colors.push(1);
              colors.push(0);
              colors.push(0);
              colors.push(1);
            }
          }
          //绘制结果
          $this._pointsKSYResult = new Cesium.Scene.PointsPrimitive({
            viewer: that._viewer,
            Cartesians: cartesiansLine,
            Colors: colors,
          });
        } else {
          alert("高程异常！");
        }
      });
    }
  } catch (error) {
    console.log(error);
  }

  LookAroundAnalysis.prototype.remove = function () {};
}

/** 坡度分析参数 */
interface SlopeAnalysisParams {
  positions: any[]
  that: AnalysisInstance
}

/** 坡度分析实例 */
interface SlopeAnalysisInstance {
  remove(): void
}

/**
 * 坡度分析
 * @private
 * @param {object} params
 */
function SlopeAnalysis(this: SlopeAnalysisInstance, params: SlopeAnalysisParams) {
  if (params && params.positions) {
    var positions = params.positions,
      that = params.that,
      position1 = positions[0],
      position2 = positions[1];
    //显示结果
    function showResult(startPoint: any, endPoint: any) {
      //起止点相关信息
      var scartographic = Cesium.Cartographic.fromCartesian(startPoint);
      var samplePoint = [scartographic];
      var pointSum = 10; //取样点个数
      var tempCartesians = new Cesium.Cartesian3();
      var slopePercent = [0];
      var disL = [0];
      var angle = 0;
      for (var i = 1; i <= pointSum; i++) {
        Cesium.Cartesian3.lerp(startPoint, endPoint, i / pointSum, tempCartesians);
        var tempCartographic = Cesium.Cartographic.fromCartesian(tempCartesians);
        var surfaceHeight = that._viewer.scene.globe.getHeight(tempCartographic) as number;
        tempCartographic.height = surfaceHeight;
        samplePoint.push(tempCartographic);
        var lastCarto = samplePoint[i - 1];
        var dis = Cesium.Cartesian3.distance(
          Cesium.Cartographic.toCartesian(lastCarto),
          Cesium.Cartographic.toCartesian(tempCartographic)
        );
        disL.push(disL[i - 1] + dis);
        angle = Math.asin((tempCartographic.height - lastCarto.height) / dis);
        slopePercent.push(Math.tan(angle) * 100);
      }

      var echartContainer = document.createElement("div");
      echartContainer.className = "echart-viewer";
      that._viewer.container.appendChild(echartContainer);
      echartContainer.style.position = "absolute";
      echartContainer.style.left = "20px";
      echartContainer.style.bottom = "20px";
      echartContainer.style.height = "300px";
      echartContainer.style.width = "640px";
      echartContainer.style.overflow = "hidden";
      echartContainer.style.zIndex = "9999";
      echartContainer.style.opacity = "0.9";
      var myChart = echartsMod.init(echartContainer);
      var option = {
        title: {
          text: "剖面示意图",
          left: "center",
          subtext: "",
          textStyle: {
            color: "white",
            fontSize: 15,
          },
        },
        tooltip: {
          trigger: "axis",
        },
        legend: {
          data: [""],
        },
        //右上角工具条
        toolbox: {
          show: false,
          feature: {
            mark: {
              show: true,
            },
            dataView: {
              show: true,
              readOnly: false,
            },
            magicType: {
              show: true,
              type: ["line", "bar"],
            },
            restore: {
              show: true,
            },
            saveAsImage: {
              show: true,
            },
          },
        },
        calculable: true,
        xAxis: [
          {
            type: "category",
            name: "长度(米)",
            boundaryGap: false,
            data: disL,
            axisLabel: {
              textStyle: {
                color: "white",
              },
            },
            axisLine: {
              lineStyle: {
                color: "white",
              },
            },
          },
        ],
        yAxis: [
          {
            type: "value",
            name: "坡度（%）",
            axisLabel: {
              formatter: function (data: number) {
                return data.toFixed(2) + "%";
              },
              textStyle: {
                color: "white",
              },
            },
            axisLine: {
              lineStyle: {
                color: "white",
              },
            },
          },
        ],
        series: [
          {
            name: "坡度",
            type: "line",
            areaStyle: {},
            smooth: true,
            data: slopePercent,
            markPoint: {
              data: [
                {
                  type: "max",
                  name: "最大值",
                },
                {
                  type: "min",
                  name: "最小值",
                },
              ],
            },
            markLine: {
              data: [
                {
                  type: "average",
                  name: "平均值",
                },
              ],
            },
          },
        ],
      };

      // 为echarts对象加载数据
      myChart.setOption(option);
      return myChart;
    }
    showResult(position1, position2);
  }

  SlopeAnalysis.prototype.remove = function () {};
}

/** 方量分析参数 */
interface CutVolumeAnalysisParams {
  positions: any[]
  that: AnalysisInstance
}

/** 方量分析实例 */
interface CutVolumeAnalysisInstance {
  remove(): void
  _volumeLabel?: any
}

/**
 * 方量分析
 * @private
 * @param {object} params
 */
function CutVolumeAnalysis(this: CutVolumeAnalysisInstance, params: CutVolumeAnalysisParams) {
  if (params && params.positions && params.that) {
    var that = params.that,
      positions = params.positions,
      _debugShowSubTriangles = true,
      $this = this;

    computeCutVolume(positions);
  }
  /**
   * 计算多边形的重心点
   * @param {*} positions
   */
  function computeCentroidOfPolygon(positions: any[]) {
    var x: number[] = [];
    var y: number[] = [];

    for (var i = 0; i < positions.length; i++) {
      var cartographic = Cesium.Cartographic.fromCartesian(positions[i]);

      x.push(cartographic.longitude);
      y.push(cartographic.latitude);
    }

    var x0 = 0.0,
      y0 = 0.0,
      x1 = 0.0,
      y1 = 0.0;
    var signedArea = 0.0;
    var a = 0.0;
    var centroidx = 0.0,
      centroidy = 0.0;

    for (i = 0; i < positions.length; i++) {
      x0 = x[i];
      y0 = y[i];

      if (i == positions.length - 1) {
        x1 = x[0];
        y1 = y[0];
      } else {
        x1 = x[i + 1];
        y1 = y[i + 1];
      }

      a = x0 * y1 - x1 * y0;
      signedArea += a;
      centroidx += (x0 + x1) * a;
      centroidy += (y0 + y1) * a;
    }

    signedArea *= 0.5;
    centroidx /= 6.0 * signedArea;
    centroidy /= 6.0 * signedArea;

    return new Cesium.Cartographic(centroidx, centroidy);
  }

  /**
   * 计算三角形的面积
   * @param {*} pos1
   * @param {*} pos2
   * @param {*} pos3
   */
  function computeAreaOfTriangle(pos1: any, pos2: any, pos3: any) {
    var a = Cesium.Cartesian3.distance(pos1, pos2);
    var b = Cesium.Cartesian3.distance(pos2, pos3);
    var c = Cesium.Cartesian3.distance(pos3, pos1);

    var S = (a + b + c) / 2;

    return Math.sqrt(S * (S - a) * (S - b) * (S - c));
  }
  /**
   * 计算方量
   */
  function computeCutVolume(positions: any[]) {
    var tileAvailability = that._viewer.terrainProvider.availability;
    if (!tileAvailability) {
      alert("未获取到地形");
      return false;
    }
    var maxLevel = 0;
    var minHeight = 15000;

    var granularity = Math.PI / Math.pow(2, 11);
    granularity = granularity / 64;
    var polygonGeometry = Cesium.PolygonGeometry.fromPositions({
      positions: positions,
      vertexFormat: Cesium.PerInstanceColorAppearance.FLAT_VERTEX_FORMAT,
      granularity: granularity,
    });

    //polygon subdivision

    var geom = Cesium.PolygonGeometry.createGeometry(polygonGeometry)!;

    var totalCutVolume = 0;
    var maxHeight = 0;

    var i0: number, i1: number, i2: number;
    var height1: number, height2: number, height3: number;
    var p1: any, p2: any, p3: any;
    var bottomP1: any, bottomP2: any, bottomP3: any;
    var scratchCartesian = new Cesium.Cartesian3();
    var cartographic: any;
    var bottomArea: number;
    var subTrianglePositions: Float32Array;

    for (let i = 0; i < geom.indices!.length; i += 3) {
      i0 = geom.indices![i];
      i1 = geom.indices![i + 1];
      i2 = geom.indices![i + 2];

      subTrianglePositions = geom.attributes.position!.values as Float32Array;

      scratchCartesian.x = subTrianglePositions[i0 * 3];
      scratchCartesian.y = subTrianglePositions[i0 * 3 + 1];
      scratchCartesian.z = subTrianglePositions[i0 * 3 + 2];

      cartographic = Cesium.Cartographic.fromCartesian(scratchCartesian);

      height1 = that._viewer.scene.globe.getHeight(cartographic) as number;

      p1 = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, height1);
      bottomP1 = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0);

      if (maxHeight < height1) maxHeight = height1;

      scratchCartesian.x = subTrianglePositions[i1 * 3];
      scratchCartesian.y = subTrianglePositions[i1 * 3 + 1];
      scratchCartesian.z = subTrianglePositions[i1 * 3 + 2];

      cartographic = Cesium.Cartographic.fromCartesian(scratchCartesian);

      height2 = that._viewer.scene.globe.getHeight(cartographic) as number;

      p2 = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, height2);
      bottomP2 = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0);

      if (maxHeight < height2) maxHeight = height2;

      scratchCartesian.x = subTrianglePositions[i2 * 3];
      scratchCartesian.y = subTrianglePositions[i2 * 3 + 1];
      scratchCartesian.z = subTrianglePositions[i2 * 3 + 2];

      cartographic = Cesium.Cartographic.fromCartesian(scratchCartesian);

      height3 = that._viewer.scene.globe.getHeight(cartographic) as number;

      p3 = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, height3);
      bottomP3 = Cesium.Cartesian3.fromRadians(cartographic.longitude, cartographic.latitude, 0);

      if (maxHeight < height3) maxHeight = height3;

      bottomArea = computeAreaOfTriangle(bottomP1, bottomP2, bottomP3);

      totalCutVolume =
        totalCutVolume + (bottomArea * (height1 - minHeight + height2 - minHeight + height3 - minHeight)) / 3;

      if (_debugShowSubTriangles) {
        var positionsarr: any[] = [];

        positionsarr.push(p1);
        positionsarr.push(p2);
        positionsarr.push(p3);

        var drawingPolygon = {
          polygon: {
            hierarchy: {
              positions: positionsarr,
            },
            extrudedHeight: 0,
            perPositionHeight: true,
            material: Cesium.Color.fromRandom().withAlpha(0.5),
            outline: true,
            closeTop: true,
            closeBottom: true,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2,
          },
        };

        that._analysisLayer.entities.add(drawingPolygon as unknown as any);
      }
    }
    var centroid = computeCentroidOfPolygon(positions);
    $this._volumeLabel = that._analysisLayer.entities.add({
      position: Cesium.Cartesian3.fromRadians(centroid.longitude, centroid.latitude, maxHeight + 1000),
      label: {
        text: "Cut Volume " + totalCutVolume.toString() + "m3",
      },
    });

    return maxHeight;
  }

  CutVolumeAnalysis.prototype.remove = function () {};
}

  return Analysis
}

export const Analysis = createScopedConstructor(createAnalysisModule) as unknown as AnalysisConstructor
