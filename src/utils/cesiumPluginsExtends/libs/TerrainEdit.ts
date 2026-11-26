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
  benchHeight,
  buildContourSegments,
  buildGridFromHeightField,
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
import { buildImageryTextureFromLayers, slopeDrapeOffset } from './terrain/terrainTexture'
import { packHeights, unpackHeights } from './terrain/terrainData'
import type { TerrainHeightsPayload } from './terrain/terrainData'
import type { HeightField } from './terrain/terrainInterchange'
import type {
  TerrainBounds,
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
/** 高度场载荷（`TerrainEditSnapshot.grid` 的类型），便于自行拼装 / 校验数据 */
export type { TerrainHeightsPayload }
/** 高度场（`getHeightField()` 返回值 / `importHeightField()` 参数） */
export type { HeightField }

/**
 * 按住左键时的持续施加速度（毫秒一次）。
 *
 * 地形软件的手感是「按住不放就一直挖」，而不是「拖一下算一次」：
 * 指针停住不动也应该继续加深。这里用一个固定节拍的循环来施加，
 * 笔刷现在按「一级一级的台阶」推进（每拍降 `maxDelta`），不是连续磨高度，
 * 节拍太快会把台阶糊成一片。140ms 约 7 级/秒 × 默认 3m ≈ 21m/s，
 * 既能感到持续下挖，又留得住每一级的层次。
 */
const SPRAY_INTERVAL = 140

/**
 * 判定「指针已停住」的静默时间（毫秒）。
 *
 * 按住左键期间：
 * - 指针还在移动 → 由 `MOUSE_MOVE` 按路径施加，定时器不介入（否则同一位置会被
 *   移动事件和定时器双重累加，拖一下就成了深井）；
 * - 指针停住超过这个时间 → 才由定时器以 `SPRAY_INTERVAL` 的节拍持续加深。
 *
 * 250ms 比一般鼠标的移动事件间隔（8~16ms）大一个量级，即使设备掉到 4fps、
 * 两次 `mousemove` 之间隔了两百多毫秒，也不会把「还在拖」误判成「停住了」；
 * 同时又短到让人感觉不出「按住之后才开始挖」的延迟。
 */
const SPRAY_IDLE = 250

/**
 * 指针移动时，每走过这么远才施加一次（按笔刷半径的比例算）。
 *
 * 不能「每次 mousemove 都施加」：鼠标 16ms 报一次位置，慢慢拖时几十次都落在
 * 同一个笔刷圈内，同一片地形被反复减，拖动反而比按住不动还深。
 * 按距离节流后，涂抹密度只跟走过的路程有关，快拖慢拖的深浅一致。
 */
const STROKE_STEP_RATIO = 0.1

/** 小于这个屏幕像素位移视为「指针没动」（手抖 / 亚像素噪声） */
const MOVE_IDLE_PX = 1

/** 导出数据的格式标识：用来判断一份 JSON 到底是不是本模块导出的地形 */
const TERRAIN_SNAPSHOT_KIND = 'cesium-dev-kit:terrain-edit' as const

/**
 * 导出数据的版本号。
 *
 * 结构发生**不兼容**变更时才递增；载入时版本对不上会直接报错，
 * 而不是按新结构去读旧数据（高度场错位是最难排查的一类问题）。
 */
const TERRAIN_SNAPSHOT_VERSION = 1

/**
 * 光照方向（局部坐标），与 `_rebuild` 里给水面用的平行光保持一致。
 *
 * 地表用的是 `MeshBasicMaterial`（不吃实时光照，才能跟周围影像同色），
 * 但开挖出来的坡面需要明暗才看得出体积，所以在 CPU 端按这个方向把明暗烘进顶点色。
 */
const SUN_DIR = { x: 0.35, y: 1, z: 0.3 }

/**
 * 开挖面孔隙噪声 + 岩土色（GLSL 片段，注入 `MeshBasicMaterial` 的片元着色器）。
 *
 * 默认开启的「岩土断面」材质（可用 `setCutSurfaceEnabled(false)` 关闭）。
 * 陡壁上的卫星影像是平面俯视图，竖向铺到立面上必然发虚 / 折叠；这里的 3D 噪声
 * 按坡度 + 挖填深度逐渐盖住影像，近垂直立面看起来像真实的土石断面。
 *
 * 用局部三维坐标算噪声（不做投影），所以密度处处一致、不会被拉伸；
 * 再叠一层沿高度方向的层理，看着像被机械挖开的岩土断面。
 */
const EARTH_COMMON_GLSL = `
varying float vCut;
varying vec3 vLocalPos;
float teHash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.23, 0.37));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float teNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(teHash(i), teHash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(teHash(i + vec3(0.0, 1.0, 0.0)), teHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(teHash(i + vec3(0.0, 0.0, 1.0)), teHash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(teHash(i + vec3(0.0, 1.0, 1.0)), teHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}
float teFbm(vec3 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += amp * teNoise(p);
    p *= 2.07;
    amp *= 0.5;
  }
  return sum;
}
`

const EARTH_APPLY_GLSL = `
{
  float teAmt = clamp(abs(vCut), 0.0, 1.0);
  if (teAmt > 0.004) {
    vec3 p = vLocalPos;
    // 每像素覆盖多少米：远看时要把高频细节淡出，否则细密噪声会糊成一层「毛毡」
    float px = max(fwidth(p.x), max(fwidth(p.y), fwidth(p.z)));
    float fineFade = 1.0 - smoothstep(0.35, 1.1, px);

    // 三个尺度：整片色区（约 200m）→ 斑块（约 30m）→ 碎石（约 7m）
    float macro = teFbm(p * 0.005);
    float coarse = teFbm(p * 0.032);
    float medium = teFbm(p * 0.14);
    float fine = teNoise(p * 1.1);

    // 层理：用低频噪声把条带的相位扭一扭，不然等高的地方会连成一圈同心环
    float warp = teFbm(p * 0.016 + vec3(0.0, 0.0, 3.7));
    float band = fract((p.y + warp * 30.0) * 0.075);
    float strata = smoothstep(0.08, 0.42, band) * (1.0 - smoothstep(0.56, 0.92, band));

    vec3 rock = mix(vec3(0.062, 0.046, 0.034), vec3(0.145, 0.112, 0.082), coarse);
    // 大尺度色区：偏黄褐 / 偏青灰，避免整面墙一个色
    rock = mix(rock, vec3(0.175, 0.132, 0.086), macro * 0.72);
    rock = mix(rock, vec3(0.088, 0.086, 0.082), (1.0 - macro) * 0.42);
    rock = mix(rock, vec3(0.225, 0.186, 0.146), strata * 0.3);
    rock *= 0.90 + 0.20 * medium;
    rock *= 1.0 + (fine - 0.5) * 0.5 * fineFade;
    // 借一点当地地表色相：挖在城市里偏暖、挖在草坡上偏绿，
    // 免得整块坑壁像一块灰色补丁贴上去
  #ifdef USE_MAP
    vec3 localTone = texture2D(map, vMapUv, 2.0).rgb;
    float toneLum = max(dot(localTone, vec3(0.299, 0.587, 0.114)), 0.04);
    rock *= mix(vec3(1.0), localTone / toneLum, 0.34);
  #endif

    // 碎屑的凹凸：用噪声沿光照方向的差分当微法线，近看才有「土石」的颗粒感
    if (fineFade > 0.01) {
      float bump0 = teNoise(p * 1.6);
      float bumpX = teNoise(p * 1.6 + vec3(0.6, 0.0, 0.0));
      float bumpZ = teNoise(p * 1.6 + vec3(0.0, 0.0, 0.6));
      float bump = ((bumpX - bump0) * 0.32 + (bumpZ - bump0) * 0.27) * 3.2;
      rock *= clamp(1.0 + bump * fineFade, 0.55, 1.6);
    }
    diffuseColor.rgb = mix(diffuseColor.rgb, rock, teAmt);
  }
}
`

/** 两个经纬度点之间的近似地面距离（米），只用于判断指针走了多远 */
function geoDistanceMeters(a: TerrainLngLat, b: TerrainLngLat): number {
  const mPerDegLat = 111319.49079327358
  const mPerDegLng = mPerDegLat * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180)
  const dx = (b.lng - a.lng) * mPerDegLng
  const dy = (b.lat - a.lat) * mPerDegLat
  return Math.sqrt(dx * dx + dy * dy)
}

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
  /** 笔刷半径（米），默认 110 */
  radius?: number
  /**
   * 向目标标高推进的比例 0~1，默认 1（一步压到绝对平）。
   *
   * 小于 1 时坑底永远压不平、会留着原地面的起伏，看起来就是一片糊。
   * 需要软笔触请换 `mode: 'smooth'`，不要调低这个值。
   */
  strength?: number
  /** 平整核心占半径的比例 0~1，默认 0.9：平台几乎铺满笔刷，边缘只留一圈窄立面 */
  hardness?: number
  /**
   * 坑口不规则度 0~1，默认 0.28。
   *
   * 用世界坐标的值噪声轻微掰动有效半径，让边界不是圆规画出来的。
   * 它只负责「不那么规整」；让笔迹清楚的是一刀切平的标高，不是这个参数。
   * 噪声按世界坐标取样，按住不放反复加深时图案固定，不会抖动或漂移。
   */
  roughness?: number
  /**
   * 一级台阶的落差（米），默认 3。
   *
   * 每次落笔都把笔刷核心压到同一个**目标标高**，拖动时整条笔画锁这个值，
   * 于是刷出来是平底平台而不是碗。按住不放由 `SPRAY_INTERVAL` 按拍逐级下降，
   * 所以这个值同时决定台阶的高度和下挖速度。
   */
  maxDelta?: number
  /**
   * 一笔之内的累计上限系数（`maxDelta × strokeLimit`）。
   *
   * 默认 `0` 表示**不限制**：按住左键就一直累加，松开才停，和地形软件一致。
   * 只有需要「一刀最多挖多深」时才设置它。
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
  /** 是否把区域内部被包住的空洞填平，默认 true（见 setPolygon） */
  fillHoles?: boolean
  /**
   * 是否启用程序化岩土材质，默认 true。
   *
   * 陡壁上的卫星影像是平面俯视图，竖向铺到立面上必然发虚；打开后按「坡度 + 挖填深度」
   * 在影像之上叠一层 3D 噪声岩土，近垂直立面会逐渐换成土石断面。缓坡仍以影像为主。
   * 需要完全保留影像时显式关掉。
   */
  cutSurface?: boolean
}

/** 笔刷参数快照（不含只在一次笔画内有效的 `targetHeight`） */
export type TerrainEditBrushState = Required<Omit<TerrainEditBrushOptions, 'targetHeight'>>

/** 笔刷区域参数快照，便于按同样的范围重建 */
export interface TerrainEditAreaInfo {
  /** 区域中心 */
  center: TerrainLngLat
  /** 边长（米） */
  size: number
  /** 每边划分数 */
  segments: number
  /** 边缘过渡宽度（米） */
  feather: number
}

/** 导出时一并带走的表现状态 */
export interface TerrainEditViewState {
  /** 水面高程（米），null 表示没有水面 */
  waterLevel: number | null
  /** 是否显示等高线 */
  contour: boolean
  /** 等高距（米），0 表示按高差自动取 */
  contourInterval: number
  /** 是否使用影像贴图 */
  texture: boolean
  /** 是否启用程序化岩土材质 */
  cutSurface: boolean
}

/**
 * 地形编辑数据包（`exportData()` 的返回值）。
 *
 * 整体是可 `JSON.stringify` 的纯数据：没有类实例、没有 TypedArray、没有 DOM 引用，
 * 所以能直接 `POST` 给后端、塞进 `localStorage`、写进 IndexedDB 或做成文件下载。
 *
 * 高度场是 **base + current** 两份：只存 current 的话，载入后就没法再算挖填方、
 * 也没法把坡面明暗重新烘对，二次编辑会「看起来一样、但所有统计都变 0」。
 */
export interface TerrainEditSnapshot {
  /** 固定标识：`cesium-dev-kit:terrain-edit`，用来识别数据来源 */
  kind: 'cesium-dev-kit:terrain-edit'
  /** 数据格式版本，当前为 1；结构不兼容变更时递增 */
  version: number
  /** 导出时间（ISO 8601） */
  createdAt: string
  /** `area`：`setArea()` 铺的矩形；`polygon`：手绘 / `setPolygon()` 的范围 */
  mode: 'area' | 'polygon'
  /** `setArea()` 的原始参数，`polygon` 模式下为 null */
  area: TerrainEditAreaInfo | null
  /** 编辑范围顶点（含高度） */
  polygon: TerrainLngLatHeight[]
  /** 高度场与重建格网所需的参数 */
  grid: TerrainHeightsPayload
  /** 表现状态 */
  view: TerrainEditViewState
  /** 笔刷参数，载入后可接着刷 */
  brush: TerrainEditBrushState
  /** 导出时的土方统计，便于「不载入模型也能读数据」的展示场景 */
  stats: TerrainEditStatsResult | null
}

/**
 * 内存形态的高度场（`getHeightField()` 的返回值）。
 *
 * 不需要序列化、只想马上算点东西时用它：数组是副本，改它不会影响场景。
 */
export interface TerrainHeightField {
  /** 每边划分数（顶点数 = segments + 1） */
  segments: number
  /** 格网覆盖的经纬度范围 */
  bounds: TerrainBounds
  /** 原始地形高度（米） */
  base: Float32Array
  /** 编辑后地形高度（米）；与 `base` 之差即每点挖填量（负数挖、正数填） */
  current: Float32Array
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
  setPolygon(
    positions: TerrainEditPosition[],
    options?: { segments?: number; slopeWidth?: number; fillHoles?: boolean }
  ): Promise<TerrainEditInstance>

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
   * 导出当前编辑结果，得到一份可直接 `JSON.stringify` 的数据包。
   *
   * **为什么是「返回数据」而不是「保存文件」**：这个模块跑在调用方的页面里，
   * 数据落到哪儿（后端接口、localStorage、对象存储、GIS 文件、剪贴板）属于业务决定，
   * 库不该替用户选。所以这里只产出**完整、自包含、可序列化**的快照，
   * 存哪儿、存多久、要不要加密压缩，交给调用方；示例页里的「保存数据」
   * 就是拿这个返回值自己做了个下载，而不是库内置了一套存储。
   *
   * 快照不只包含高度：二次编辑需要「原始地形 + 几何参数」才能正确重算挖填方、
   * 重烘坡面明暗、继续用笔刷，所以 `grid.base` 与 `grid.current` 两份高度场都会带上
   * （Float32 原样 base64，往返逐位无损），并附带多边形、区域参数、水面 / 等高线 /
   * 贴图状态以及笔刷设置。
   *
   * 体量：`segments = 160` 时约 277KB（两份 161×161 的 Float32，base64 后），gzip 约 180KB。
   * 这份开销是「无损」换来的：需要更小的载荷就降低 `setArea({ segments })`，
   * 或者只用 `getHeightField()` 自己量化 / 转成 GeoTIFF 等格式。
   *
   * @returns 数据包；尚未圈定编辑范围时返回 null
   * @example
   * // 存到自己的后端
   * const data = terrainEdit.exportData()
   * await fetch('/api/terrain/1', { method: 'POST', body: JSON.stringify(data) })
   *
   * // 或者做成文件让用户下载（下载这一步属于业务侧，不在库里）
   * const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
   * const a = document.createElement('a')
   * a.href = URL.createObjectURL(blob)
   * a.download = 'terrain.json'
   * a.click()
   */
  exportData(): TerrainEditSnapshot | null

  /**
   * 载入 `exportData()` 导出的数据，恢复到可继续编辑的状态。
   *
   * 与 `setPolygon()` 的关键区别：**不会再采样地形**。高度直接从数据包里恢复，
   * 所以即使此刻没有配置地形服务、或者原地形数据已经变了，也能一模一样地复原；
   * 载入后笔刷、撤销、统计、水面、等高线照常工作，地表贴图按新范围在后台重新取。
   *
   * 数据包结构不对（不是本模块导出的、版本不匹配、base64 损坏、长度对不上、
   * 范围与 polygon 不匹配）都会抛 `INVALID_ARGUMENT`，不会渲染出一块错位的地形。
   *
   * @param snapshot - `exportData()` 的返回值，或它 `JSON.parse` 之后的对象；
   * 也可以直接给 JSON 字符串（例如 `localStorage.getItem()` 的返回值），内部会自己解析
   * @example
   * const data = await (await fetch('/api/terrain/1')).json()
   * terrainEdit.importData(data).enableBrush(true)
   *
   * // 从 localStorage 读也一样
   * terrainEdit.importData(localStorage.getItem('terrain-1') || '')
   */
  importData(snapshot: TerrainEditSnapshot | string): TerrainEditInstance

  /**
   * 取当前高度场（Float32Array 副本），用于在内存里做二次计算。
   *
   * 不需要序列化、只要数值时用这个：不经过 base64，直接拿到 `base` / `current`，
   * 两者之差就是每个顶点的挖填量（负数挖、正数填），可以直接喂给等高线、
   * 坡度分析、导出成 GeoTIFF 或自己的格网格式。数组是副本，改它不影响场景。
   *
   * @returns 高度场；尚未圈定编辑范围时返回 null
   * @example
   * const field = terrainEdit.getHeightField()
   * const delta = field.current.map((h, i) => h - field.base[i])
   * console.log('最大挖深', Math.min(...delta))
   */
  getHeightField(): TerrainHeightField | null

  /**
   * 把一份高度场（DEM / GeoTIFF / XYZ 等）载入为可继续编辑的地形块。
   *
   * 与 {@link importData}（载入本库的快照）不同，这里不要求多边形 / 快照结构，
   * 直接按高度场的 `bounds` 铺一块格网、把 `base` / `current` 填进去即可。
   * 适合把 `cesium_dev_kit/terrain` 的 `geoTIFFToHeightField()` 等解码结果接进来。
   *
   * @param field - `{ segments, bounds, base, current }`（与 `getHeightField()` 返回值同构）
   * @example
   * import { geoTIFFToHeightField } from 'cesium_dev_kit/terrain'
   * const field = geoTIFFToHeightField(bytes)
   * terrainEdit.importHeightField(field).enableBrush(true)
   */
  importHeightField(field: HeightField): TerrainEditInstance

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
   * terrainEdit.setBrush({ mode: 'lower', radius: 150, maxDelta: 3 }).enableBrush(true)
   */
  setArea(center: TerrainEditPosition, options?: TerrainEditAreaOptions): Promise<TerrainEditInstance>

  /**
   * 设置笔刷参数（不影响已刷出的地形）。
   * @param options - 模式、半径、台阶落差、目标高度
   * @example
   * terrainEdit.setBrush({ mode: 'level', radius: 200, targetHeight: 900 })
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
   * 挖/填出来的坡面是否叠加程序化岩土材质（默认 true）。
   *
   * 陡壁上的卫星影像是平面俯视图，近垂直面会发虚；打开后按「坡度 + 挖填深度」
   * 在影像之上叠一层 3D 噪声岩土，更像真实的开挖断面。缓坡仍保留影像。
   * @example
   * terrainEdit.setCutSurfaceEnabled(false)
   */
  setCutSurfaceEnabled(enabled: boolean): TerrainEditInstance

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
      strength: 1,
      hardness: 0.9,
      roughness: 0.28,
      maxDelta: 3,
      strokeLimit: 0,
      targetHeight: null
    }
    this._brushEnabled = false
    this._brushHandler = null
    this._stroking = false
    this._brushCursor = null
    this._brushPointer = null
    // 按住左键期间的持续施加循环与当前落笔位置
    this._sprayTimer = null
    this._sprayAt = null
    this._onWindowUp = null
    this._onCanvasLeave = null
    this._lastMoveAt = 0
    this._lastHit = null
    this._lastMovePos = null
    this._strokeDist = 0
    // 本笔起始高度快照，仅用于「一笔 = 一步撤销」
    this._strokeBase = null
    // 本次笔画锁定的目标标高：拖动的所有落笔共用它，才会刷出平底平台
    this._strokeTarget = null
    // 定时器按拍施加时置位，用来把「按住不动」和「拖动」区分开
    this._sprayTick = false
    // level 模式自动推断出来的目标高度：只在本次笔画内有效，抬笔后清掉
    this._targetAuto = false
    // 贴图与网格缓存
    this._useTexture = true
    // 程序化岩土材质默认开启：陡壁上的卫星影像无论怎么投影都容易发虚 / 折叠，
    // 用 3D 噪声岩土把近垂直立面盖住，缓坡仍保留影像
    this._cutSurface = true
    this._texture = null
    this._surface = null
    this._localXZ = null
    this._baseColors = null
    this._lastContourAt = 0
    this._up = null
    // 经度 / 纬度方向在 three 局部坐标中的单位向量：把顶点法线分解成
    // 「东西 / 南北 / 上下」三个分量，用于陡壁贴图的弧长展开（见 _updateSurfaceUVs）
    this._east = null
    this._north = null
    this._areaMode = false
    this._areaInfo = null
    // 建格网时是否填平内部空洞：导出/载入要按同一个值重建，inside 掩膜才对得上
    this._fillHoles = true
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
     *
     * 手绘多边形如果有折返/自交，射线法会把交点旁的一小块判成「区域外」，
     * 那块地方在网格里既没有面、笔刷也刷不到，下沉之后就变成一块顶着原地面、
     * 看起来像「叠加层被戳穿」的孤岛。默认会把这类**被包住的内部空洞**补成实心
     * （`fillHoles`），需要保留镂空时再显式关掉。
     *
     * @function
     * @param positions - 范围顶点
     * @param options - 每边划分数与边缘过渡宽度、是否填平内部空洞
     * @example
     * await terrainEdit.setPolygon(points, { segments: 160, slopeWidth: 80 })
     */
    async setPolygon(
      this: TerrainEditInstance & Record<string, any>,
      positions: TerrainEditPosition[],
      options?: { segments?: number; slopeWidth?: number; fillHoles?: boolean }
    ) {
      const list: TerrainLngLatHeight[] = dedupePolygon(this._normalizePositions(positions), 1e-9)
      if (list.length < 3) {
        throw new CesiumDevKitError('INVALID_ARGUMENT', '地形编辑至少需要 3 个有效顶点')
      }
      const segments = (options && options.segments) || this._options.segments || DEFAULT_SEGMENTS
      const slopeWidth = (options && options.slopeWidth) || this._options.slopeWidth
      const grid = buildTerrainGrid(list, {
        segments,
        slopeWidth,
        fillHoles: options ? options.fillHoles : undefined
      })
      await this._sampleHeights(grid)

      this._polygon = list.map((p) => ({ lng: p.lng, lat: p.lat }))
      this._polygonHeight = list.map((p) => p.height || 0)
      this._grid = grid
      // 记下这次建格网用的参数：导出时要带上，载入时才能重建出同一张 inside 掩膜
      this._fillHoles = !(options && options.fillHoles === false)
      this._areaInfo = null
      // 直接给多边形（含手绘结束）就是「手绘范围」，之前若用过 setArea 要把区域标记清掉，
      // 否则边框会因为 areaMode 仍在而被隐藏
      this._areaMode = false
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
      // 先拆旧边框：从 area 切到手绘（或反过来）时，旧边框不能留在场上
      if (this._boundaryEntity && this._draftSource) {
        this._draftSource.entities.remove(this._boundaryEntity)
      }
      this._boundaryEntity = null
      // 笔刷区域是人为划的矩形，画出来像「贴片」，不显示
      if (this._areaMode) return
      const source = this._ensureDraftSource()
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
      // 东 / 北方向的局部单位向量。只在中心取一次：范围只有几公里，
      // 局部平面内方向变化可以忽略；每个顶点都要用，不能每次都去算经纬度投影。
      const eastB = this._toLocal(center.lng + 1e-5, center.lat, 0)
      const northB = this._toLocal(center.lng, center.lat + 1e-5, 0)
      this._east = new THREE.Vector3().subVectors(eastB, upA).normalize()
      this._north = new THREE.Vector3().subVectors(northB, upA).normalize()

      const positions = new Float32Array(grid.vertexCount * 3)
      const colors = new Float32Array(grid.vertexCount * 3)
      const uvs = new Float32Array(grid.vertexCount * 2)
      // 每顶点的「开挖量」：-1 是挖到底、+1 是堆到顶、0 是没动过。
      // 片元着色器按它把影像渐变成岩土（见 EARTH_APPLY_GLSL），值在 _bakeShading 里写。
      const cuts = new Float32Array(grid.vertexCount)
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
      geometry.setAttribute('aCut', new THREE.BufferAttribute(cuts, 1))
      geometry.setIndex(indices)
      geometry.computeVertexNormals()
      // 法线出来之后才能算「立面展开」UV：把陡壁的贴图坐标按坡面弧长铺开
      this._updateSurfaceUVs(geometry)
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
      // 高度/法线变了，陡壁的展开 UV 得一起重算，否则刚挖出的立面又会退回成竖条
      this._updateSurfaceUVs(mesh.geometry)
      // 法线变了，明暗得跟着重烘，不然刚挖出来的坡面还是按旧法线打光，看着像贴了张图
      this._bakeShading(mesh.geometry)
      mesh.geometry.computeBoundingSphere()
      return this
    },

    /**
     * 按坡面弧长重算贴图 UV，消除陡壁上的「竖向拉伸」
     *
     * 影像是经纬度平面投影：同一个像元会被摊到整条立面上，坡越陡拉得越长。
     * 这里把 UV 沿坡面方向补上「弧长比平面投影多出来的那一段」，
     * 于是纹理在立面上按 1:1 的尺度铺开，而不是被拉成竖条。
     *
     * 关键点：
     * - 只补偿 `L - R`（弧长 - 水平投影），不是把整条立面重新展开到外侧，
     *   所以缓坡上补偿量趋于 0，不会把原本正常的平地/缓坡纹理拉花；
     * - 补偿方向取「从参考边（坑口 / 坡脚）指向当前顶点」的一侧，
     *   也就是把纹理顺着立面往里续，接缝落在坑底 / 平台内侧这种硬折边上；
     * - 近垂直立面（约 49°~64° 起）逐渐淡出：竖直面上网格法线容易左右跳，
     *   继续展开会把纹理折成锯齿；这一段交给默认开启的程序化岩土材质。
     * @private
     */
    _updateSurfaceUVs(this: TerrainEditInstance & Record<string, any>, geometry?: any) {
      const geo = geometry || (this._surface && this._surface.geometry)
      const texture = this._texture
      const grid: TerrainGrid | null = this._grid
      const up = this._up
      const east = this._east
      const north = this._north
      if (!geo || !texture || !texture.uv || !grid || !up || !east || !north) return this
      const normals = geo.getAttribute('normal')
      const uvAttr = geo.getAttribute('uv')
      if (!normals || !uvAttr) return this

      const arr = uvAttr.array as Float32Array
      const current = grid.current
      const origin = grid.base
      const stride = grid.stride
      const dLng = grid.dLng
      const dLat = grid.dLat
      const b = grid.bounds
      const mPerDegLat = 111319.49079327358
      // 每纬度 1 度的经度米数只随行变化，按行缓存一次即可（涂抹时每帧都会跑）
      let mLng = metersPerDegLng(b.minLat)
      // 复用同一个对象，避免每个顶点都新建一个 { east, north }
      const off = { east: 0, north: 0 }
      for (let i = 0; i < grid.vertexCount; i++) {
        const row = Math.floor(i / stride)
        const col = i % stride
        const lng = b.minLng + col * dLng
        const lat = b.minLat + row * dLat
        if (col === 0) mLng = metersPerDegLng(lat)
        let dlng = 0
        let dlat = 0
        const d = current[i] - origin[i]
        if (Math.abs(d) > 1e-3) {
          const nx = normals.getX(i)
          const ny = normals.getY(i)
          const nz = normals.getZ(i)
          // 法线在「东 / 北 / 上」三个方向的分量
          const nLng = nx * east.x + ny * east.y + nz * east.z
          const nLat = nx * north.x + ny * north.y + nz * north.z
          const nUp = Math.abs(nx * up.x + ny * up.y + nz * up.z)
          // 平面投影比坡面弧长短走的那一段，按米算好后换成经纬度偏移。
          // 缓坡上这个量趋于 0，陡壁上约等于高差，过渡是连续的。
          slopeDrapeOffset(d, nLng, nLat, nUp, off)
          dlng = off.east / mLng
          dlat = off.north / mPerDegLat
        }
        const pair = texture.uv(lng + dlng, lat + dlat)
        arr[i * 2] = pair[0]
        arr[i * 2 + 1] = pair[1]
      }
      uvAttr.needsUpdate = true
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
     * 唯一的例外是「开挖面换岩土色」：这一步必须逐像素混合两张材质，
     * 用 `onBeforeCompile` 在 `map_fragment` 之后插一段就够，其余流程仍是内置材质，
     * 不会碰到裁剪、透明、色彩空间这些容易出错的地方。
     * @private
     */
    _makeSurfaceMaterial(this: TerrainEditInstance & Record<string, any>, canvas?: HTMLCanvasElement) {
      const params: any = {
        vertexColors: true,
        side: THREE.DoubleSide,
        transparent: true
      }
      const material = new THREE.MeshBasicMaterial(params)
      if (canvas) {
        const tex = new THREE.CanvasTexture(canvas)
        // 影像本身是 sRGB：标成 sRGBColorSpace 后，three 采样时解到线性、输出时
        // 再编码回 sRGB，等于原样输出；标成 NoColorSpace 会被二次编码，整体发白。
        if ('colorSpace' in tex && THREE.SRGBColorSpace !== undefined) {
          tex.colorSpace = THREE.SRGBColorSpace
        } else if (THREE.sRGBEncoding != null) {
          tex.encoding = THREE.sRGBEncoding
        }
        // 斜视角下 mipmap 各向异性决定远处地表糊不糊：按显卡上限给足，
        // 否则越靠近地平线越糊成一片，看着像没贴图。
        tex.minFilter = THREE.LinearMipmapLinearFilter
        tex.magFilter = THREE.LinearFilter
        tex.generateMipmaps = true
        tex.anisotropy = this._maxAnisotropy()
        tex.needsUpdate = true
        params.map = tex
        material.map = tex
        // 边缘羽化：把编辑区「化」进原地表，避免一圈生硬的矩形接缝
        const alpha = this._makeEdgeAlphaMap()
        if (alpha) {
          params.alphaMap = alpha
          material.alphaMap = alpha
        }
        // 开挖面：把影像渐变成程序化岩土（详见 EARTH_COMMON_GLSL 的注释）
        material.onBeforeCompile = (shader: any) => {
          shader.vertexShader = shader.vertexShader
            .replace(
              '#include <common>',
              '#include <common>\nattribute float aCut;\nvarying float vCut;\nvarying vec3 vLocalPos;'
            )
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCut = aCut;\nvLocalPos = position;')
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\n' + EARTH_COMMON_GLSL)
            .replace('#include <map_fragment>', '#include <map_fragment>\n' + EARTH_APPLY_GLSL)
        }
        material.customProgramCacheKey = () => 'terrain-edit-earth'
      }
      return material
    },

    /**
     * 取当前渲染器支持的最大各向异性过滤等级（拿不到就退回 4）
     * @private
     */
    _maxAnisotropy(this: TerrainEditInstance & Record<string, any>) {
      try {
        const renderer = this._threeJs && (this._threeJs as any)._three && (this._threeJs as any)._three.renderer
        const caps = renderer && renderer.capabilities
        const max = caps && typeof caps.getMaxAnisotropy === 'function' ? caps.getMaxAnisotropy() : 4
        return Math.max(4, Math.min(16, Number(max) || 4))
      } catch (e) {
        return 4
      }
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
     * 把明暗重新烘进顶点色，并刷新「开挖量」属性
     *
     * 亮度只跟「法线与地表法线的夹角」有关：平地 1.0（影像原样输出）、陡坡压到 0.84，
     * 所以翻出的坡面能看出体积感，而对齐的平地又不会比周围影像暗一块。
     * 顶点色是破坏性相乘，所以必须从 `_baseColors` 底色重算，不能在上一次结果上再乘。
     *
     * 被刷动过的顶点额外烘一层**方向性明暗**：迎光立面提亮、背光立面压暗。
     * 台阶之所以一眼看得出来，靠的是坡折处这道明暗突变，而不是换一张贴图；
     * 天然陡崖没被刷过（相对 base 位移为 0）不受影响，保持影像原样。
     *
     * 另外把「开挖强度」写进 `aCut`：只有显式打开 `setCutSurfaceEnabled(true)`
     * 时才由片元着色器据此把陡壁渐变成程序化岩土，默认关闭。
     * @private
     */
    _bakeShading(this: TerrainEditInstance & Record<string, any>, geometry?: any) {
      const geo = geometry || (this._surface && this._surface.geometry)
      const base: Float32Array | undefined = this._baseColors
      const up = this._up
      if (!geo || !base || !up || !this._grid) return this
      const normals = geo.getAttribute('normal')
      const colorsAttr = geo.getAttribute('color')
      const cutAttr = geo.getAttribute('aCut')
      if (!normals || !colorsAttr) return this
      const arr = colorsAttr.array as Float32Array
      const cutArr = cutAttr ? (cutAttr.array as Float32Array) : null
      const count = this._grid.vertexCount
      const current = this._grid.current
      const origin = this._grid.base
      const sunLen = Math.hypot(SUN_DIR.x, SUN_DIR.y, SUN_DIR.z) || 1
      const sx = SUN_DIR.x / sunLen
      const sy = SUN_DIR.y / sunLen
      const sz = SUN_DIR.z / sunLen
      for (let i = 0; i < count; i++) {
        const nx = normals.getX(i)
        const ny = normals.getY(i)
        const nz = normals.getZ(i)
        const ndl = Math.abs(nx * up.x + ny * up.y + nz * up.z)
        let shade = 0.84 + 0.16 * Math.min(1, ndl)
        const moved = Math.abs(current[i] - origin[i])
        // 方向性明暗：只作用于被刷动过的顶点，迎光立面提亮、背光立面压暗。
        // 台阶「一眼看得出来」靠的是折点处这道明暗突变，而不是换一张贴图；
        // 天然陡崖没被刷过（moved = 0），保持影像原样。
        if (moved > 0.001) {
          const sunDot = nx * sx + ny * sy + nz * sz
          shade *= 1 + Math.min(1, moved / 6) * 0.3 * sunDot
        }
        let cut = 0
        if (cutArr) {
          const delta = current[i] - origin[i]
          if (this._cutSurface && moved > 2) {
            // 只对「真的动过」的顶点生效：没刷到的地方即使天然陡峭也保持影像原样
            const edited = Math.min(1, (moved - 2) / 6)
            // 坡度门槛：约 37° 起、53° 满。缓坡（<30°）保留影像——那种坡上影像拉伸不严重，
            // 硬换成岩土反而把整片山坡刷成灰面；真正的陡壁才需要换材质。
            const steep = Math.min(1, Math.max(0, (0.8 - ndl) / 0.22))
            const deep = Math.min(1, Math.max(0, (moved - 60) / 160))
            // `deep` 只对下挖生效：抬升出来的平台顶部是平的，应该保留影像，
            // 不能因为「高差大」就把整个平台顶也刷成岩土。
            let amount = edited * Math.max(steep, delta < 0 ? deep * 0.85 : 0)
            // 中间段往上顶一点：避免出现「半影像半岩石」的糊状过渡
            amount = Math.pow(amount, 0.7)
            if (amount > 0.002) {
              const sunDot = Math.min(1, Math.max(0, nx * sx + ny * sy + nz * sz))
              shade *= 1 - amount * (1 - (0.34 + 0.66 * sunDot))
              // 越深越暗：坑底见不到斜射光，靠这个把「深度」交代清楚
              shade *= 1 - 0.22 * Math.min(1, moved / 320) * amount
              cut = delta < 0 ? -amount : amount
            }
          }
          cutArr[i] = cut
        }
        arr[i * 3] = base[i * 3] * shade
        arr[i * 3 + 1] = base[i * 3 + 1] * shade
        arr[i * 3 + 2] = base[i * 3 + 2] * shade
      }
      colorsAttr.needsUpdate = true
      if (cutAttr) cutAttr.needsUpdate = true
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
      // 贴图分辨率按范围大小自适应：范围越大，同样的画布越糊，
      // 2400m 用 2048 只有 1.2m/像素，平地上都能看出比周围影像软一档。
      // 这里把长边对齐到「约 0.8m/像素」的档位，并在瓦片数上限内取层级。
      const centerLat = (b.minLat + b.maxLat) / 2
      const longSide = Math.max(
        (b.maxLng - b.minLng) * 111319.49 * Math.cos((centerLat * Math.PI) / 180),
        (b.maxLat - b.minLat) * 111319.49
      )
      const texPreset =
        longSide > 3500
          ? { maxSize: 4096, maxTiles: 256, metersPerPixel: 0.9 }
          : longSide > 1200
            ? { maxSize: 3072, maxTiles: 144, metersPerPixel: 0.8 }
            : { maxSize: 2048, maxTiles: 96, metersPerPixel: 0.5 }
      let result = null
      // 刚进页面时影像图层可能还没 ready，取瓦片会全部落空；
      // 这里退避重试几次，避免「第一次进来看不到地表纹理、点一下才有」。
      for (let attempt = 0; attempt < 5 && !result; attempt++) {
        try {
          result = await buildImageryTextureFromLayers(
            Cesium,
            list,
            { minLng: b.minLng, minLat: b.minLat, maxLng: b.maxLng, maxLat: b.maxLat },
            texPreset
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
      const segments = options.segments ?? 160
      const feather = options.feather ?? 80
      this._useTexture = options.texture !== false
      if (options.cutSurface !== undefined) this._cutSurface = options.cutSurface !== false
      await this.setPolygon(
        [
          [point.lng - dLng, point.lat - dLat],
          [point.lng + dLng, point.lat - dLat],
          [point.lng + dLng, point.lat + dLat],
          [point.lng - dLng, point.lat + dLat]
        ],
        { segments, slopeWidth: feather, fillHoles: options.fillHoles }
      )
      // setPolygon 会把范围当成「手绘」重置，这里再标回区域模式：
      // 区域是人为划的矩形，不该画边框；导出时也要带上原始参数，便于原样重建
      this._areaMode = true
      this._areaInfo = { center: { lng: point.lng, lat: point.lat }, size, segments, feather }
      this._renderBoundary()
      return this
    },

    /**
     * 设置笔刷参数
     * @param options - 模式、半径、台阶落差、目标高度
     */
    setBrush(this: TerrainEditInstance & Record<string, any>, options: TerrainEditBrushOptions = {}) {
      const b = this._brush
      this._brush = {
        mode: options.mode || b.mode,
        radius: Math.max(1, options.radius ?? b.radius),
        strength: Math.min(1, Math.max(0.01, options.strength ?? b.strength)),
        hardness: Math.min(0.95, Math.max(0, options.hardness ?? b.hardness)),
        roughness: Math.min(1, Math.max(0, options.roughness ?? b.roughness)),
        maxDelta: Math.max(0.5, options.maxDelta ?? b.maxDelta),
        strokeLimit: Math.max(0, Math.min(200, options.strokeLimit ?? b.strokeLimit)),
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
        // 收笔：先停掉持续施加，再把没结束的这一笔落定
        //（否则 `_stroking` 一直是 true，等高线不更新）
        this._finishStroke()
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
      this._strokeTarget = null
      this._sprayTick = false
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
      if (brush.mode === 'lower' || brush.mode === 'raise') {
        const dir: -1 | 1 = brush.mode === 'lower' ? -1 : 1
        const step = Math.max(0.5, brush.maxDelta)
        if (this._strokeTarget == null) {
          // 第一笔：按落笔处高度对齐到「下一级台阶」，整条笔画都锁这个标高。
          // 拖动时沿途的新地面同样被压到这里，于是刷出来是平底平台 / 沟槽，
          // 而不是每笔各降一级、坑底跟着原地形起伏的一串碗。
          this._strokeTarget = benchHeight(this._heightAt(lng, lat) + dir * step, step, dir)
        } else if (this._sprayTick) {
          // 指针停住不动、定时器按拍施加：每拍再走一级，按住才会一层层往下掉
          this._strokeTarget += dir * step
        }
        target = this._strokeTarget
      }
      this._sprayTick = false
      const impact = applyBrush(this._grid, {
        mode: brush.mode,
        lng,
        lat,
        radius: brush.radius,
        strength: brush.strength,
        hardness: brush.hardness,
        roughness: brush.roughness,
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
      // 抬笔即释放锁定标高，下一笔重新按脚下地形取台阶
      this._strokeTarget = null
      this._sprayTick = false
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
     * 挖/填出来的坡面是否叠加程序化岩土
     *
     * 默认开启：近垂直立面用 3D 噪声岩土替代影像，避免影像被拉成竖条 / 折叠；
     * 缓坡仍以影像为主。关掉则完全保留影像。
     * @param enabled - 是否启用开挖面材质
     */
    setCutSurfaceEnabled(this: TerrainEditInstance & Record<string, any>, enabled: boolean) {
      const next = !!enabled
      if (next === this._cutSurface) return this
      this._cutSurface = next
      if (this._surface) this._bakeShading(this._surface.geometry)
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
     *
     * Cesium 的 `globe.pick` 只能打到**原始地形**上；编辑区是叠在上面的 three 网格，
     * 挖下去以后射线会先命中原始地表，落笔点会比指针偏出一大截（坑越深偏得越远）。
     * 所以命中后再沿射线和「编辑后的高度场」求一次交点，让笔刷圈始终跟着指针。
     * @private
     */
    _pickLngLat(this: TerrainEditInstance & Record<string, any>, windowPosition: any) {
      const scene = this._viewer.scene
      const ray = this._viewer.camera.getPickRay(windowPosition)
      if (!ray || !scene.globe) return null
      const cartesian = scene.globe.pick(ray, scene)
      if (!cartesian) return null
      let carto = Cesium.Cartographic.fromCartesian(cartesian)
      if (!carto) return null
      const edited = this._pickEditedSurface(ray, cartesian)
      if (edited) carto = edited
      return {
        lng: Cesium.Math.toDegrees(carto.longitude),
        lat: Cesium.Math.toDegrees(carto.latitude)
      }
    },

    /**
     * 沿拾取射线求与「编辑后地表」的交点
     *
     * 射线高度随距离单调变化，所以「射线当前高度 = 该处地表高度」这个不动点
     * 用几次牛顿迭代就能收敛。只在编辑区内计算；交点跑到范围外时返回 null，
     * 调用方退回原始地形交点。
     * @private
     */
    _pickEditedSurface(
      this: TerrainEditInstance & Record<string, any>,
      ray: any,
      cartesian: any
    ) {
      const grid: TerrainGrid | null = this._grid
      if (!grid || !Cesium) return null
      const b = grid.bounds
      const toDeg = Cesium.Math.toDegrees
      // 允许一格误差：圈边缘的拾取点可能刚好落在格网外
      const padLng = grid.dLng
      const padLat = grid.dLat
      const inside = (lng: number, lat: number) =>
        lng >= b.minLng - padLng &&
        lng <= b.maxLng + padLng &&
        lat >= b.minLat - padLat &&
        lat <= b.maxLat + padLat

      let t = Cesium.Cartesian3.distance(ray.origin, cartesian)
      if (!Number.isFinite(t) || t <= 0) return null
      const tMax = t + 20000
      const point = new Cesium.Cartesian3()
      const up = new Cesium.Cartesian3()
      let best: any = null
      let bestErr = Infinity
      let initialErr = Infinity

      for (let k = 0; k < 8; k++) {
        Cesium.Cartesian3.multiplyByScalar(ray.direction, t, point)
        Cesium.Cartesian3.add(ray.origin, point, point)
        const current = Cesium.Cartographic.fromCartesian(point)
        if (!current) break
        const lng = toDeg(current.longitude)
        const lat = toDeg(current.latitude)
        if (!inside(lng, lat)) break
        const surface = this._heightAt(lng, lat)
        const err = Math.abs(surface - current.height)
        if (k === 0) initialErr = err
        if (err < bestErr) {
          bestErr = err
          best = current
        }
        if (err < 0.05) break
        Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(point, up)
        const dhdt = Cesium.Cartesian3.dot(ray.direction, up)
        if (!Number.isFinite(dhdt) || Math.abs(dhdt) < 1e-6) break
        const next = t + (surface - current.height) / dhdt
        if (!Number.isFinite(next) || next < 0 || next > tMax) break
        if (Math.abs(next - t) < 0.01) break
        t = next
      }

      // 迭代没有把误差压下去（陡壁上来回跳）就退回原始地形交点，别把落笔点甩得更远
      if (!best) return null
      if (bestErr > grid.cellSize && bestErr >= initialErr) return null
      return best
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
        if (!hit) return
        this._sprayAt = { lng: hit.lng, lat: hit.lat }
        this._lastHit = { lng: hit.lng, lat: hit.lat }
        this._lastMovePos = { x: movement.position.x, y: movement.position.y }
        this._strokeDist = 0
        this._lastMoveAt = typeof performance !== 'undefined' ? performance.now() : Date.now()
        this.beginStroke().strokeAt(hit.lng, hit.lat)
        // 按住不放也要继续挖：起一个固定节拍的循环反复施加，
        // 指针停住不动时深度照样累加，松开左键才停。
        this._startSpray()
      }, Cesium.ScreenSpaceEventType.LEFT_DOWN)

      handler.setInputAction((movement: any) => {
        if (!this._brushEnabled) return
        const p = movement.endPosition
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
        // 用「屏幕像素」判断有没有动：远景下 1px 可能只有几厘米，
        // 若用米做阈值，慢拖会被误判成静止，定时器就会接管、把拖动变成原地深挖。
        const lastPos = this._lastMovePos
        const pixelDist = lastPos ? Math.hypot(p.x - lastPos.x, p.y - lastPos.y) : Infinity
        if (pixelDist < MOVE_IDLE_PX) {
          // 指针基本没动：这里不施加，也不刷新 `_lastMoveAt`，
          // 让定时器在静止超过 SPRAY_IDLE 后接管「原地持续加深」
          return
        }
        // 只要指针真的动了就先记账，**哪怕这一帧没拾取到地形**。
        // 否则指针滑出地表时 hit 为 null 直接 return，`_lastMoveAt` 停在旧值，
        // 定时器会误以为用户「按着没动」，继续在旧位置往下挖。
        this._lastMoveAt = now
        this._lastMovePos = { x: p.x, y: p.y }
        const hit = this._pickLngLat(p)
        this._updateBrushCursor(hit)
        if (!this._stroking) return
        if (!hit) {
          // 指针移到了地形之外：停止持续施加，避免在旧位置继续加深
          this._stopSpray()
          this._sprayAt = null
          this._lastHit = null
          return
        }
        this._sprayAt = { lng: hit.lng, lat: hit.lat }
        // 用「地面距离」累积步长：涂抹密度只跟走过的路程有关，快拖慢拖深浅一致
        const lastHit = this._lastHit
        this._strokeDist += lastHit ? geoDistanceMeters(lastHit, hit) : 0
        this._lastHit = { lng: hit.lng, lat: hit.lat }
        const step = Math.max(1, (this._brush.radius || 100) * STROKE_STEP_RATIO)
        if (this._strokeDist >= step) {
          this._strokeDist -= step
          this.strokeAt(hit.lng, hit.lat)
        }
        // 指针移出画布后循环会被停掉，移回来时这里再补起来
        this._startSpray()
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

      handler.setInputAction(() => {
        if (!this._brushEnabled) return
        this._finishStroke()
      }, Cesium.ScreenSpaceEventType.LEFT_UP)

      // 指针移出画布后 Cesium 不再派发事件，用窗口级抬起兜底，避免「松手了还在挖」
      if (typeof window !== 'undefined') {
        const onUp = () => {
          if (this._brushEnabled && this._stroking) this._finishStroke()
        }
        this._onWindowUp = onUp
        window.addEventListener('mouseup', onUp)
      }
      // 移出画布时先停下持续施加；移回来由 MOUSE_MOVE 重新拉起
      const canvas = this._viewer.scene.canvas
      if (canvas && typeof canvas.addEventListener === 'function') {
        const onLeave = () => this._stopSpray()
        this._onCanvasLeave = onLeave
        canvas.addEventListener('mouseleave', onLeave)
      }
      return this
    },

    /** 结束当前这一笔：停掉持续施加循环、清掉落笔位置，再收笔落定 */
    _finishStroke(this: TerrainEditInstance & Record<string, any>) {
      this._stopSpray()
      this._sprayAt = null
      this._lastHit = null
      this._lastMovePos = null
      this._strokeDist = 0
      this.endStroke()
      return this
    },

    /**
     * 开始按住期间的持续施加。
     *
     * 地形笔刷的手感是「按住不放就一直挖」，而不是「移动一次算一次」：
     * 指针停在原地时也要继续加深 / 抬高，松开左键即停。
     * @private
     */
    _startSpray(this: TerrainEditInstance & Record<string, any>) {
      if (this._sprayTimer) return this
      if (typeof window === 'undefined') return this
      this._sprayTimer = window.setInterval(() => {
        if (!this._brushEnabled || !this._stroking || !this._sprayAt) return
        // 指针还在移动：这一笔由 MOUSE_MOVE 按路径施加，定时器不参与，
        // 否则「移动 + 定时」会把同一位置叠加两遍，拖一下就成深井
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
        if (now - (this._lastMoveAt || 0) < SPRAY_IDLE) return
        // 标记这一拍来自「原地按住」，strokeAt 才会把锁定标高再推进一级
        this._sprayTick = true
        this.strokeAt(this._sprayAt.lng, this._sprayAt.lat)
      }, SPRAY_INTERVAL)
      return this
    },

    /** 停止持续施加 */
    _stopSpray(this: TerrainEditInstance & Record<string, any>) {
      if (this._sprayTimer) {
        if (typeof window !== 'undefined') window.clearInterval(this._sprayTimer)
        else clearInterval(this._sprayTimer)
        this._sprayTimer = null
      }
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
      // 先把持续施加和兜底监听都撤掉，再销毁 Cesium 的事件处理器
      this._stopSpray()
      this._sprayAt = null
      this._lastHit = null
      this._lastMovePos = null
      this._strokeDist = 0
      if (this._onWindowUp && typeof window !== 'undefined') {
        window.removeEventListener('mouseup', this._onWindowUp)
      }
      this._onWindowUp = null
      const canvas = this._viewer && this._viewer.scene && this._viewer.scene.canvas
      if (this._onCanvasLeave && canvas && typeof canvas.removeEventListener === 'function') {
        canvas.removeEventListener('mouseleave', this._onCanvasLeave)
      }
      this._onCanvasLeave = null
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
      this._east = null
      this._north = null
      this._areaMode = false
      this._areaInfo = null
      this._fillHoles = true
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
     * 导出当前编辑结果（纯数据，可直接序列化）
     * @function
     */
    exportData(this: TerrainEditInstance & Record<string, any>): TerrainEditSnapshot | null {
      if (!this._grid) return null
      const brush = this._brush
      const info = this._areaInfo
      return {
        kind: TERRAIN_SNAPSHOT_KIND,
        version: TERRAIN_SNAPSHOT_VERSION,
        createdAt: new Date().toISOString(),
        mode: this._areaMode ? 'area' : 'polygon',
        area: info
          ? {
              center: { lng: info.center.lng, lat: info.center.lat },
              size: info.size,
              segments: info.segments,
              feather: info.feather
            }
          : null,
        polygon: this.getPolygon(),
        // base 与 current 都带上：只存 current 的话，载入后挖填方会归零、坡面明暗也失效
        grid: packHeights(this._grid, { fillHoles: this._fillHoles }),
        view: {
          waterLevel: this._waterLevel,
          contour: this._showGrid,
          contourInterval: this._stepHeight,
          texture: this._useTexture,
          cutSurface: this._cutSurface
        },
        brush: {
          mode: brush.mode,
          radius: brush.radius,
          strength: brush.strength,
          hardness: brush.hardness,
          roughness: brush.roughness,
          maxDelta: brush.maxDelta,
          strokeLimit: brush.strokeLimit
        },
        stats: this.getStats()
      }
    },

    /**
     * 载入编辑结果（不重新采样地形）
     * @function
     */
    importData(
      this: TerrainEditInstance & Record<string, any>,
      snapshot: TerrainEditSnapshot | string
    ): TerrainEditInstance {
      const invalid = (message: string) => new CesiumDevKitError('INVALID_ARGUMENT', message)
      let data: any = snapshot
      // 允许直接塞 localStorage / 后端返回的 JSON 字符串，省掉调用方一次 JSON.parse
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data)
        } catch (err: any) {
          throw invalid('地形数据不是合法 JSON：' + (err && err.message ? err.message : String(err)))
        }
      }
      if (!data || typeof data !== 'object') throw invalid('地形数据为空')
      if (data.kind !== TERRAIN_SNAPSHOT_KIND) {
        throw invalid('不是 TerrainEdit.exportData() 导出的数据')
      }
      if (data.version !== TERRAIN_SNAPSHOT_VERSION) {
        throw invalid(`地形数据版本不支持：${data.version}`)
      }
      const list: TerrainLngLatHeight[] = this._normalizePositions(data.polygon || [])
      if (list.length < 3) throw invalid('地形数据里的 polygon 少于 3 个顶点')

      let grid: TerrainGrid
      try {
        grid = unpackHeights(list, data.grid)
      } catch (err: any) {
        throw invalid('地形数据无法还原：' + (err && err.message ? err.message : String(err)))
      }

      // 正在涂抹时先收笔：否则这一笔的定时器会在数据换掉之后继续往新格网里写
      if (this._stroking) this._finishStroke()

      this._polygon = list.map((p) => ({ lng: p.lng, lat: p.lat }))
      this._polygonHeight = list.map((p) => p.height || 0)
      this._grid = grid
      this._fillHoles = data.grid.fillHoles !== false
      this._areaMode = data.mode === 'area'
      this._areaInfo =
        data.area && data.area.center
          ? {
              center: { lng: Number(data.area.center.lng), lat: Number(data.area.center.lat) },
              size: Number(data.area.size) || 0,
              segments: Number(data.area.segments) || grid.segments,
              feather: Number(data.area.feather) || grid.slopeWidth
            }
          : null

      const view = data.view || {}
      this._useTexture = view.texture !== false
      this._cutSurface = view.cutSurface !== false
      this._showGrid = view.contour !== false
      this._stepHeight = Number(view.contourInterval) || 0
      this._waterLevel = typeof view.waterLevel === 'number' ? view.waterLevel : null

      // 历史属于上一份地形，载入后不该还能撤回去；贴图按新范围重取
      this._history = []
      this._texture = null
      this._textureToken++
      this._strokeBase = null
      this._strokeTarget = null
      this._targetAuto = false
      if (data.brush) this.setBrush({ ...data.brush, targetHeight: null })
      else this._brush.targetHeight = null

      this._rebuild()
      this._renderBoundary()
      if (this._useTexture) this._requestTexture()
      return this
    },

    /**
     * 取当前高度场（Float32Array 副本）
     * @function
     */
    getHeightField(this: TerrainEditInstance & Record<string, any>): TerrainHeightField | null {
      const grid: TerrainGrid | null = this._grid
      if (!grid) return null
      return {
        segments: grid.segments,
        bounds: { ...grid.bounds },
        base: new Float32Array(grid.base),
        current: new Float32Array(grid.current)
      }
    },

    /**
     * 载入高度场（DEM / GeoTIFF / XYZ 解码结果），不重新采样地形
     * @function
     */
    importHeightField(this: TerrainEditInstance & Record<string, any>, field: HeightField) {
      if (this._disposed) return this
      if (!field || typeof field !== 'object') {
        throw new CesiumDevKitError('INVALID_ARGUMENT', '缺少高度场数据')
      }
      const segments = Math.round(field.segments)
      if (!Number.isFinite(segments) || segments < 8 || segments > 256) {
        throw new CesiumDevKitError('INVALID_ARGUMENT', `格网分段非法：${field.segments}`)
      }
      const expected = (segments + 1) * (segments + 1)
      if (!field.current || field.current.length !== expected) {
        throw new CesiumDevKitError('INVALID_ARGUMENT', `高度场长度不匹配：期望 ${expected}`)
      }
      const b = field.bounds
      if (!b || b.maxLng <= b.minLng || b.maxLat <= b.minLat) {
        throw new CesiumDevKitError('INVALID_ARGUMENT', '高度场范围非法')
      }
      const base = field.base && field.base.length === expected ? field.base : field.current

      const grid = buildGridFromHeightField(segments, b, base, field.current)

      // 正在涂抹时先收笔：否则这一笔的定时器会往新格网里写
      if (this._stroking) this._finishStroke()

      this._polygon = [
        { lng: b.minLng, lat: b.minLat },
        { lng: b.maxLng, lat: b.minLat },
        { lng: b.maxLng, lat: b.maxLat },
        { lng: b.minLng, lat: b.maxLat }
      ]
      this._polygonHeight = [0, 0, 0, 0]
      this._grid = grid
      this._fillHoles = true
      this._areaMode = true
      const centerLat = (b.minLat + b.maxLat) / 2
      const sizeMeters = Math.max(
        (b.maxLng - b.minLng) * metersPerDegLng(centerLat),
        (b.maxLat - b.minLat) * 111319.49079327358
      )
      this._areaInfo = {
        center: { lng: (b.minLng + b.maxLng) / 2, lat: centerLat },
        size: sizeMeters,
        segments,
        feather: 0
      }
      // 历史 / 贴图 / 笔刷状态属于上一份地形，载入后不再沿用
      this._history = []
      this._waterLevel = null
      this._texture = null
      this._textureToken++
      this._strokeBase = null
      this._strokeTarget = null
      this._targetAuto = false

      this._rebuild()
      this._renderBoundary()
      if (this._useTexture) this._requestTexture()
      return this
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
