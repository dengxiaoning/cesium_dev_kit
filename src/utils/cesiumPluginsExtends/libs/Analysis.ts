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

/** 模块内部持有的 cesium 全局对象 */

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
      $this.bindHandleEvent({
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
} as unknown as AnalysisInstance;

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
