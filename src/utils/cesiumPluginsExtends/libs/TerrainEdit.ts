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
import { applyTerrainTemplate } from './terrain/terrainTemplates'
import type { TerrainTemplateOptions } from './terrain/terrainTemplates'
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
/** 地形模板（`applyTemplate()` 的参数类型） */
export type { TerrainTemplateType, TerrainTemplateOptions } from './terrain/terrainTemplates'

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
  /**
   * 编辑块边界裙边的基础深度（米），默认 `0`（关闭）。
   *
   * 编辑块现在会把边缘逐点对齐到当前画面里的地形（见 `followTerrain`），
   * 块面和地形直接重合，不再需要一圈土色侧壁去兜缝。
   * 只有特殊场景（例如外部地形服务不可用、拿不到当前渲染高度）才建议显式传正数。
   */
  skirtDepth?: number
  /**
   * 编辑块整体下沉的距离（米），默认 `0`。
   *
   * 早期用整体下沉来把边缘藏进地形，但下沉会在裁剪洞边留下一道台阶，
   * 低角度下反而更明显。现在默认不下沉，改用「边缘逐点对齐当前渲染地形」
   * 来消除接缝；保留这个选项只是为了兼容旧调用。
   */
  settle?: number
  /**
   * 是否让编辑块边缘跟随当前**已渲染**地形自动对齐，默认 `true`
   * （区域模式现在只显示真正编辑过的范围，不再需要整块对齐；该选项主要用于手绘多边形模式）。
   *
   * 编辑块本体的高度来自与视角无关的地形采样，相机怎么旋转 / 翻滚 / 缩放，
   * 块体的形状都不会变。但屏幕上显示的地形会随距离切换 LOD，和真值差一两米；
   * 开启后，相机停稳时沿边界采样当前渲染高度，把块面边缘逐点对齐过去，
   * 接缝、台阶和裙边都不会再出现。
   */
  followTerrain?: boolean
  /**
   * 边缘对齐的采样间隔（毫秒），默认 `200`。
   *
   * 只在相机停稳、地形瓦片加载完成后才重算，移动过程中沿用上一次的对齐量，
   * 避免旋转时每帧扫一遍边界把主线程拖住。
   */
  followInterval?: number
  /**
   * 相机钻到地表以下时是否隐藏编辑块，默认 `true`。
   *
   * Cesium 的地形是单面渲染，相机翻到地面以下时原本就看不到地形；如果编辑块仍
   * 双面渲染，就会像一张悬在空中的毯子，看起来和地图「脱开」。隐藏后与地形表现一致。
   */
  hideWhenUnderground?: boolean
  /**
   * 是否在编辑区下方「挖掉」Cesium 原地形，默认 `true`。
   *
   * 编辑块是一张独立的 three 网格，如果不把底下的 Cesium 地表去掉，同一个位置
   * 就有两层地表：一层在原地形高度、一层在块面高度。相机压低视角时，原地形会
   * 从块面里「穿」出来，看起来就像编辑区贴在地图上、没有和地图融为一体。
   *
   * 开启后按编辑区范围给 `globe.clippingPolygons` 设一个内缩一圈的多边形
   * （内缩量等于边缘羽化宽度），块面边缘的渐隐带仍压在保留的地形上，
   * 中间则只剩编辑块这一层地表。需要 WebGL2；拿不到裁剪能力时自动跳过。
   */
  cutTerrain?: boolean
  /**
   * 裁剪多边形相对编辑区内缩的距离（米），默认取 `feather` 的值。
   *
   * 内缩是为了让编辑块最外圈的渐隐带仍然盖在真实地形上：羽化带需要底下的地形
   * 才能「化」进去，若一直挖到块边界，渐隐带会变成透明的洞。
   */
  cutInset?: number
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
   * 一键应用地形模板（基坑 / 土堆 / 平台 / 坡道）。
   *
   * 是 `apply()` 的语义化封装：基坑≈下沉、土堆≈抬升、平台≈整平，坡道按方向线性起坡。
   * 会自动记入撤销历史。
   * @param options - 模板类型与参数
   * @example
   * terrainEdit.applyTemplate({ type: 'pit', depth: 60, stepHeight: 6 })
   * terrainEdit.applyTemplate({ type: 'ramp', direction: 90, startHeight: 500, endHeight: 540 })
   */
  applyTemplate(options: TerrainTemplateOptions): TerrainEditInstance

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
  /** 边缘对齐的默认重算间隔（毫秒） */
  const DEFAULT_FOLLOW_INTERVAL = 200
  /** 相机停下多久之后才重算边缘对齐：留出瓦片精化的时间，避免刚停下就按旧 LOD 定高度 */
  const SEAM_SETTLE_MS = 320
  /** 边界上每隔几个顶点采一次渲染高度，中间线性过渡（160 段的块约 220 次采样） */
  const SEAM_SAMPLE_STRIDE = 3
  /**
   * 裙边默认基础深度（米）。
   *
   * 默认 **0（关闭）**：编辑块现在按「当前画面里的地形」逐点对齐（见 `_refreshSeam`），
   * 边缘直接和地形重合，不再需要一圈土色侧壁去兜缝。显式传正数仍会生成裙边，
   * 但那是给特殊场景的兜底，正常使用不需要。
   */
  const DEFAULT_SKIRT_DEPTH = 0
  /** 采到的「当前渲染高度」偏离真实高度超过这个值就当它不可信（米） */
  const SEAM_TRUST_GAP = 600
  /** 采样值的绝对合理区间：超出这个范围一律当成采样失败 */
  const HEIGHT_ABS_MAX = 9000
  const HEIGHT_ABS_MIN = -1500
  /**
   * 对齐量的单次上限（米）。
   *
   * 正常情况下块面和当前渲染地形只差一两米；上限只用来兜「瓦片还没加载完」的
   * 极端情况，避免把块面一下拉出几十米的深沟。
   */
  const STITCH_MAX = 30
  /**
   * 对齐量从裁剪洞边往块内衰减的格数。
   *
   * 洞边必须严丝合缝（衰减 0），但块面内部是编辑后的真实高度，不应该被
   * 当前 LOD 拖着走；给 8 格过渡，洞边到内部之间就不会出现硬折。
   */
  const FIT_FADE_CELLS = 8
  /** 「被编辑过」的判定阈值（米）：低于这个高差视为没动过 */
  const EDIT_EPS = 0.05
  /** 编辑区出现后，外圈再保持不透明的一格数（保证裁剪洞边被完全盖住） */
  const EDIT_PLATEAU_CELLS = 1
  /** 编辑范围向外额外扩几格再裁：让裁剪边落在未编辑的原始地面上，避免洞边高差 */
  const EDIT_PAD_CELLS = 3
  /** 从不透明边缘向外渐隐的格数 */
  const EDIT_FADE_CELLS = 3
  /** 非区域模式下，对齐量向内扩散的圈数 */
  const STITCH_SPREAD_PASSES = 10
  /** 每向内扩散一圈的衰减 */
  const STITCH_DECAY = 0.7

  const nowMs = () =>
    typeof performance !== 'undefined' && performance.now
      ? performance.now()
      : Date.now()

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
    // 编辑块**本体**的高度来自与视角无关的地形采样（_sampleHeights），
    // 相机怎么旋转 / 翻滚都不会改变它，所以块体不会「偏离地图」。
    // 下面这套逐帧逻辑只负责两件事：
    //   1) 相机钻到地表以下时隐藏块体，避免看到一张悬空的毯子；
    //   2) 按当前渲染地形把块面边缘逐点对齐，把 LOD 造成的接缝消掉。
    this._followTerrain = this._options.followTerrain !== false
    this._followInterval = Math.max(
      30,
      Number(this._options.followInterval) || DEFAULT_FOLLOW_INTERVAL
    )
    this._skirtBaseDepth =
      this._options.skirtDepth == null
        ? DEFAULT_SKIRT_DEPTH
        : Math.max(0, Number(this._options.skirtDepth) || 0)
    // 块面整体下沉量：先把用户给的值记下来，等网格建好再按格网大小补默认值
    // （见 `_resolveSink`）。它只影响「画在哪里」，不影响高度场本身。
    this._sinkOption = this._options.settle == null ? null : Math.max(0, Number(this._options.settle) || 0)
    this._sinkDepth = this._sinkOption == null ? 0 : this._sinkOption
    // 边缘缝合：每个顶点「额外再往下让多少」，由 _refreshSeam 按当前渲染地形算
    this._stitch = null
    this._stitchDirty = false
    // 编辑区域掩膜：只有真正被刷动过的格网附近才显示 three 网格，
    // 其余部分保持透明，让 Cesium 的真实地球露出来（见 _refreshEditRegion）。
    this._editAlpha = null
    this._editActive = false
    this._editRange = null
    this._editClipBounds = null
    this._editClipSig = ''
    this._hideWhenUnderground = this._options.hideWhenUnderground !== false
    this._followUninstall = null
    this._tileProgressRemove = null
    this._seamLastAt = 0
    this._seamDeadline = 0
    this._seamDirty = true
    this._followCamera = null
    this._followCarto = null
    this._underground = false
    // 边界裙边：顶点索引对 + 每个边界顶点当前的裙边深度
    this._skirtEdges = null
    this._skirtVerts = null
    this._skirtDepths = null
    this._skirtMesh = null
    // 挖掉编辑区底下的 Cesium 原地形（globe.clippingPolygons）
    this._cutTerrain = this._options.cutTerrain !== false
    this._cutInset = this._options.cutInset == null ? null : Math.max(0, Number(this._options.cutInset) || 0)
    this._clip = null
    this._clipWarned = false
    this._depthHinted = false

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
     * 取「当前画面已经渲染出来」的地形高度（米）。
     *
     * `globe.getHeight()` 读的是当前 LOD 的 renderedMesh，和屏幕上看到的地形一致，
     * 但**只能用来算边缘对齐量**：它会随视角变化，绝不能拿它当编辑块的基准面。
     * 它返回 `undefined` 而不是 `null`，瓦片没建好时恒为 `undefined`；
     * 页面上取到几十公里 / 接近 0 的离谱值也时有发生（粗 LOD 的 renderedMesh），
     * 所以这里统一按「不合理就当没采到」处理。
     * @private
     */
    _sampleRenderedHeight(
      this: TerrainEditInstance & Record<string, any>,
      lng: number,
      lat: number
    ): number | null {
      const scene = this._viewer && this._viewer.scene
      const globe = scene && scene.globe
      if (!globe || typeof globe.getHeight !== 'function') return null
      // `_levelZeroTiles` 还没建立时 getHeight 一定拿不到值
      const surface = (globe as any)._surface
      if (!surface || !(surface as any)._levelZeroTiles) return null
      if (!this._followCarto) this._followCarto = new Cesium.Cartographic()
      const carto = Cesium.Cartographic.fromDegrees(lng, lat, 0, this._followCarto)
      const height = globe.getHeight(carto)
      if (typeof height !== 'number' || !Number.isFinite(height)) return null
      if (height > HEIGHT_ABS_MAX || height < HEIGHT_ABS_MIN) return null
      return height
    },

    /**
     * 安装「贴合地表」的逐帧回调（幂等）。
     *
     * 只做两件事：相机钻到地表以下时隐藏块体、相机停稳后把块面边缘对齐到当前地形。
     * 编辑块本体的基准面**不随视角改变**：只在边缘那一圈叠加显示修正量，
     * 避免旋转 / 翻滚时整块跟着 LOD 一起抖。
     * @private
     */
    _ensureFollowLoop(this: TerrainEditInstance & Record<string, any>) {
      if (this._disposed || this._followUninstall) return this
      let scene: any = null
      try {
        scene = this._getScene()
      } catch (err) {
        return this
      }
      if (!scene || typeof scene.addFrameCallback !== 'function') return this
      // 回调里拿到的 time 和 performance.now() 同一个时钟；
      // 放在 three 融合帧的最前面执行，本帧就能用新的对齐结果绘制。
      this._followUninstall = scene.addFrameCallback((time: number) => {
        this._onTerrainFrame(time)
      })
      this._installTileProgress()
      this._seamDirty = true
      this._seamDeadline = nowMs() + SEAM_SETTLE_MS
      return this
    },

    /**
     * 监听地形瓦片加载进度：一批瓦片加载完成（队列归零）后补算一次边缘对齐。
     *
     * 相机旋转 / 翻滚时 LOD 会换瓦片，地形高低的变化正好发生在加载完成的时刻；
     * 监听这个事件比每帧轮询「是否加载完」更省，也不会漏掉精化。
     * @private
     */
    _installTileProgress(this: TerrainEditInstance & Record<string, any>) {
      if (this._tileProgressRemove) return this
      const globe = this._viewer && this._viewer.scene && this._viewer.scene.globe
      const event = globe && globe.tileLoadProgressEvent
      if (!event || typeof event.addEventListener !== 'function') return this
      const remove = event.addEventListener((queued: number) => {
        if (this._disposed || !this._followTerrain) return
        if (queued > 0) return
        this._seamDirty = true
        this._seamDeadline = nowMs() + SEAM_SETTLE_MS
      })
      this._tileProgressRemove = typeof remove === 'function' ? remove : null
      return this
    },

    /**
     * 每帧检查：相机是否停稳、地形是否已加载完，需要时把边缘重新对齐到当前地形。
     *
     * 编辑块本体的高度来自与视角无关的地形采样（见 `_sampleHeights`），
     * 相机旋转 / 翻滚 / 缩放时它在世界坐标里不会跟着 LOD 变形；这里只按
     * 当前画面里的地形修正**边缘那一圈显示高度**，让接缝消失。
     * @private
     */
    _onTerrainFrame(this: TerrainEditInstance & Record<string, any>, time?: number) {
      if (this._disposed) return
      const grid = this._grid
      const root = this._root
      if (!grid || !root) return
      const now =
        typeof time === 'number' && Number.isFinite(time) ? time : nowMs()

      // 相机翻到编辑面以下时隐藏，避免出现「一块悬空毯子」的观感
      this._updateTerrainVisibility()

      // 涂抹中不对齐：这一笔还没结束，块面高度每帧都在变，抬笔后再统一算
      if (this._stroking) {
        this._seamDirty = true
        return
      }
      if (!this._followTerrain) return

      if (this._cameraMoved()) this._seamDeadline = now + SEAM_SETTLE_MS
      // 相机还在动：沿用上一次的结果，等停稳再算，避免旋转时每帧扫边界
      if (now < this._seamDeadline) return
      // 这里**不等** `tilesLoaded`：我们要对齐的正是「此刻画面上的地形」，
      // 而 `getHeight` 读的就是当前渲染的网格。停稳就先对一次，
      // 瓦片精化后 `tileLoadProgressEvent` 会自动再来一次。
      if (!this._seamDirty) return
      if (now - this._seamLastAt < this._followInterval) return
      this._seamLastAt = now
      // 采样失败（瓦片还没建好，`getHeight` 恒为 undefined）时不要把标记清掉，
      // 否则这一轮没对齐就再也不会重试，边缘会一直悬着
      this._seamDirty = !this._refreshSeam()
    },

    /**
     * 相机位置 / 朝向 / up 是否变化（旋转、翻滚都会体现在 up 上）。
     * @private
     */
    _cameraMoved(this: TerrainEditInstance & Record<string, any>) {
      const camera = this._viewer && this._viewer.camera
      if (!camera) return false
      const p = camera.position
      const d = camera.direction
      const u = camera.up
      const prev = this._followCamera
      const next = {
        px: p.x, py: p.y, pz: p.z,
        dx: d.x, dy: d.y, dz: d.z,
        ux: u.x, uy: u.y, uz: u.z
      }
      this._followCamera = next
      if (!prev) return true
      // 米级位移 / 方向微小变化都算移动；阈值足够小，能捕捉到缓慢的倾斜和翻滚
      const moved =
        Math.abs(next.px - prev.px) > 0.01 ||
        Math.abs(next.py - prev.py) > 0.01 ||
        Math.abs(next.pz - prev.pz) > 0.01 ||
        Math.abs(next.dx - prev.dx) > 1e-7 ||
        Math.abs(next.dy - prev.dy) > 1e-7 ||
        Math.abs(next.dz - prev.dz) > 1e-7 ||
        Math.abs(next.ux - prev.ux) > 1e-7 ||
        Math.abs(next.uy - prev.uy) > 1e-7 ||
        Math.abs(next.uz - prev.uz) > 1e-7
      return moved
    },

    /**
     * 把编辑块边缘对齐到「当前画面里的地形」。
     *
     * 编辑块本体的高度来自与视角无关的 `sampleTerrainMostDetailed`，而屏幕上
     * 的地形是随距离切换的 LOD：同一座山，粗 LOD 会比真值低一两米甚至几十米。
     * 块面如果按真值画，就会比看到的地形高出一截，边缘要么露出一圈土色裙边，
     * 要么在裁剪洞边留下一道台阶。
     *
     * 这里沿**裁剪洞边**（区域模式）或**编辑块边界**（多边形模式）采样
     * `globe.getHeight()`，得到「真值 - 当前渲染值」的差值，再把它作为每个顶点
     * 的显示修正量：洞边修正 100%，向块内按 `FIT_FADE_CELLS` 格渐隐到 0。
     *
     * 效果是：块面边缘和真实地形**逐点重合**，没有裙边、没有台阶；
     * 块面内部仍是编辑后的真实高度，不会被 LOD 拖着走。
     * @private
     */
    _refreshSeam(this: TerrainEditInstance & Record<string, any>) {
      const grid: TerrainGrid | null = this._grid
      const xz: Float32Array | null = this._localXZ
      const up = this._up
      const surface = this._surface
      if (!grid || !xz || !up || !surface) return false
      const stitch = this._ensureStitch(grid)
      let anySample = false

      // 区域模式已经改成「只显示编辑范围」：裁剪洞边就是编辑范围外扩一格，
      // 网格在洞边 alpha=1 已经完全盖住，不需要再做整块内缩的环形对齐。
      // 没有编辑时连 getHeight 采样都省掉，整块保持透明、真实地球原样显示。
      if (this._areaMode) {
        stitch.fill(0)
        this._updateSurfacePositions()
        surface.geometry.computeVertexNormals()
        this._updateSurfaceUVs(surface.geometry)
        surface.geometry.computeBoundingSphere()
        this._buildContours()
        this._stitchDirty = true
        return true
      }

      if (this._areaMode && this._clip) {
        anySample = this._fitAreaEdge(grid, stitch)
      } else {
        anySample = this._fitPolygonBoundary(grid, stitch)
      }
      if (!anySample) return false

      // 块面位置、法线、贴图 UV、等高线都跟着修正量重算。
      // 这里刻意不走 `_updateSurface()`：它会把 `_seamDirty` 重新点着，
      // 于是每 320ms 又跑一遍本函数，永远停不下来。
      this._updateSurfacePositions()
      surface.geometry.computeVertexNormals()
      this._updateSurfaceUVs(surface.geometry)
      surface.geometry.computeBoundingSphere()
      this._buildContours()
      // 显式开启了裙边（`skirtDepth > 0`）时，顶边跟着块面一起走
      if (this._skirtMesh) this._updateSkirtGeometry(grid, stitch)
      this._stitchDirty = true
      return true
    },

    /**
     * 取某个格网顶点的「当前渲染地形高度」，失败返回 null。
     * @private
     */
    _renderedAt(
      this: TerrainEditInstance & Record<string, any>,
      grid: TerrainGrid,
      index: number
    ): number | null {
      const row = Math.floor(index / grid.stride)
      const col = index % grid.stride
      const lng = grid.bounds.minLng + col * grid.dLng
      const lat = grid.bounds.minLat + row * grid.dLat
      const rendered = this._sampleRenderedHeight(lng, lat)
      if (rendered === null) return null
      const ref = grid.base[index]
      // 采到的值必须和真实地形对得上：粗 LOD 偶尔会给出接近 0 / 几十公里的数，
      // 照它对齐会在块边上拉出几百米的深沟
      if (!Number.isFinite(ref) || Math.abs(rendered - ref) > SEAM_TRUST_GAP) return null
      return rendered
    },

    /**
     * 区域模式：沿裁剪洞边采样，把差值铺满外圈并往块内渐隐。
     *
     * 洞边是块面和 Cesium 地形真正交接的地方，必须严丝合缝；块边界比洞边
     * 还外扩了一圈（`cutInset`），那一圈直接沿用洞边的修正量，块面就正好
     * 压在真实地形上，既不会浮起来也不会陷下去。
     * @private
     */
    _fitAreaEdge(this: TerrainEditInstance & Record<string, any>, grid: TerrainGrid, stitch: Float32Array) {
      const stride = grid.stride
      const segments = grid.segments
      const cellM = grid.cellSize > 0 ? grid.cellSize : 1
      const inset = Math.max(1, Math.round(this._clipInsetMeters() / cellM))
      const r0 = Math.max(0, Math.min(segments - 2, inset))
      const r1 = Math.min(segments, Math.max(r0 + 2, segments - inset))
      const c0 = Math.max(0, Math.min(segments - 2, inset))
      const c1 = Math.min(segments, Math.max(c0 + 2, segments - inset))
      if (r1 - r0 < 2 || c1 - c0 < 2) return false

      // 洞边一圈顶点，按顺时针排成一条闭合的折线
      const ring: number[] = []
      for (let c = c0; c <= c1; c++) ring.push(r0 * stride + c)
      for (let r = r0 + 1; r <= r1; r++) ring.push(r * stride + c1)
      for (let c = c1 - 1; c >= c0; c--) ring.push(r1 * stride + c)
      for (let r = r1 - 1; r > r0; r--) ring.push(r * stride + c0)
      const n = ring.length
      if (n < 4) return false

      const corr = new Float32Array(n)
      const known = new Uint8Array(n)
      let any = false
      for (let k = 0; k < n; k += Math.max(1, SEAM_SAMPLE_STRIDE)) {
        const i = ring[k]
        const rendered = this._renderedAt(grid, i)
        if (rendered === null) continue
        let delta = grid.current[i] - rendered
        if (delta > STITCH_MAX) delta = STITCH_MAX
        else if (delta < -STITCH_MAX) delta = -STITCH_MAX
        corr[k] = delta
        known[k] = 1
        any = true
      }
      if (!any) return false

      // 采样点之间用前后最近的有效值补上（环是闭合的，扫两遍）
      this._fillRing(corr, known)

      const ringCorr = new Float32Array(grid.vertexCount)
      for (let k = 0; k < n; k++) ringCorr[ring[k]] = corr[k]
      const ringAt = (r: number, c: number) => ringCorr[r * stride + c]

      for (let row = 0; row <= segments; row++) {
        for (let col = 0; col <= segments; col++) {
          if (row < r0 || row > r1 || col < c0 || col > c1) {
            // 洞边以外（含块最外圈）：沿用最近洞边点的修正量，完全贴合当前地形
            const rr = row < r0 ? r0 : row > r1 ? r1 : row
            const cc = col < c0 ? c0 : col > c1 ? c1 : col
            stitch[row * stride + col] = ringAt(rr, cc)
          } else {
            // 洞边以内：取到四条洞边的距离，按反距离加权得到该点的修正量，
            // 再按最近一条边的深度渐隐到 0。不能直接读 ringCorr[row][col]——
            // 内部顶点不在环上，值为 0，那样只会在洞边留下一格宽的硬折。
            const dTop = row - r0
            const dBottom = r1 - row
            const dLeft = col - c0
            const dRight = c1 - col
            const depth = Math.min(dTop, dBottom, dLeft, dRight)
            if (depth === 0) {
              // 正落在洞边上的顶点：修正量必须是 100%，和裁剪边严丝合缝
              stitch[row * stride + col] = ringAt(row, col)
              continue
            }
            const fade = Math.max(0, 1 - depth / FIT_FADE_CELLS)
            if (fade <= 0) {
              stitch[row * stride + col] = 0
              continue
            }
            const wTop = 1 / (dTop + 1)
            const wBottom = 1 / (dBottom + 1)
            const wLeft = 1 / (dLeft + 1)
            const wRight = 1 / (dRight + 1)
            const wSum = wTop + wBottom + wLeft + wRight
            const edge =
              (ringAt(r0, col) * wTop +
                ringAt(r1, col) * wBottom +
                ringAt(row, c0) * wLeft +
                ringAt(row, c1) * wRight) /
              wSum
            stitch[row * stride + col] = edge * fade
          }
        }
      }
      return true
    },

    /**
     * 多边形模式：沿编辑块外边界采样，差值向块内扩散。
     * @private
     */
    _fitPolygonBoundary(this: TerrainEditInstance & Record<string, any>, grid: TerrainGrid, stitch: Float32Array) {
      const ring = this._collectBoundaryVerts(grid)
      const n = ring.length
      if (n < 4) return false
      const corr = new Float32Array(n)
      const known = new Uint8Array(n)
      let any = false
      for (let k = 0; k < n; k += Math.max(1, SEAM_SAMPLE_STRIDE)) {
        const i = ring[k]
        const rendered = this._renderedAt(grid, i)
        if (rendered === null) continue
        let delta = grid.current[i] - rendered
        if (delta > STITCH_MAX) delta = STITCH_MAX
        else if (delta < -STITCH_MAX) delta = -STITCH_MAX
        corr[k] = delta
        known[k] = 1
        any = true
      }
      if (!any) return false
      this._fillRing(corr, known)
      for (let k = 0; k < n; k++) stitch[ring[k]] = corr[k]
      this._spreadSigned(grid, stitch)
      return true
    },

    /**
     * 把环上未采样的点补成前后最近的有效值（首尾相接）。
     * @private
     */
    _fillRing(this: TerrainEditInstance & Record<string, any>, values: Float32Array, known: Uint8Array) {
      const n = values.length
      if (!n) return
      let last = NaN
      for (let k = 0; k < n * 2; k++) {
        const i = k % n
        if (known[i]) last = values[i]
        else if (!Number.isNaN(last)) {
          values[i] = last
          known[i] = 1
        }
      }
      // 整圈都没有有效值时保持 0
    },

    /**
     * 把边界修正量按「绝对值最大」向块内扩散，正负都保留。
     * @private
     */
    _spreadSigned(this: TerrainEditInstance & Record<string, any>, grid: TerrainGrid, values: Float32Array) {
      const stride = grid.stride
      const inside = grid.inside
      let scratch: Float32Array = this._stitchScratch
      if (!scratch || scratch.length !== values.length) {
        scratch = new Float32Array(values.length)
        this._stitchScratch = scratch
      }
      for (let pass = 0; pass < STITCH_SPREAD_PASSES; pass++) {
        let changed = false
        for (let r = 0; r < stride; r++) {
          for (let c = 0; c < stride; c++) {
            const i = r * stride + c
            if (!inside[i]) {
              scratch[i] = values[i]
              continue
            }
            let best = values[i]
            const consider = (j: number) => {
              const v = values[j] * STITCH_DECAY
              if (Math.abs(v) > Math.abs(best)) best = v
            }
            if (c > 0) consider(i - 1)
            if (c + 1 < stride) consider(i + 1)
            if (r > 0) consider(i - stride)
            if (r + 1 < stride) consider(i + stride)
            scratch[i] = best
            if (Math.abs(best) > Math.abs(values[i]) + 1e-4) changed = true
          }
        }
        values.set(scratch)
        if (!changed) break
      }
      return this
    },

    /**
     * 收集编辑块外边界顶点（渲染单元与未渲染单元之间的边），按行扫描顺序。
     * @private
     */
    _collectBoundaryVerts(this: TerrainEditInstance & Record<string, any>, grid: TerrainGrid): number[] {
      const stride = grid.stride
      const segments = grid.segments
      const renderedCell = (row: number, col: number) => {
        if (row < 0 || col < 0 || row >= segments || col >= segments) return false
        const a = row * stride + col
        return !!(grid.inside[a] && grid.inside[a + 1] && grid.inside[a + stride] && grid.inside[a + stride + 1])
      }
      const seen = new Set<number>()
      for (let row = 0; row < segments; row++) {
        for (let col = 0; col < segments; col++) {
          if (!renderedCell(row, col)) continue
          const a = row * stride + col
          const b = a + 1
          const c = a + stride
          const d = c + 1
          if (!renderedCell(row - 1, col)) { seen.add(a); seen.add(b) }
          if (!renderedCell(row, col + 1)) { seen.add(b); seen.add(d) }
          if (!renderedCell(row + 1, col)) { seen.add(c); seen.add(d) }
          if (!renderedCell(row, col - 1)) { seen.add(a); seen.add(c) }
        }
      }
      return Array.from(seen)
    },

    /**
     * 显式开启裙边时，把顶边贴到当前块面（含对齐修正），底边保持基础深度。
     * @private
     */
    _updateSkirtGeometry(this: TerrainEditInstance & Record<string, any>, grid: TerrainGrid, stitch: Float32Array) {
      const skirt = this._skirtMesh
      const edges: Int32Array | null = this._skirtEdges
      const verts: number[] | null = this._skirtVerts
      const depths: Float32Array | null = this._skirtDepths
      const xz: Float32Array | null = this._localXZ
      const up = this._up
      if (!skirt || !edges || !verts || !depths || !xz || !up) return this
      const posAttr = skirt.geometry.getAttribute('position')
      if (!posAttr) return this
      const arr = posAttr.array as Float32Array
      const sink = this._sinkDepth || 0
      const topHeight = (i: number) => grid.current[i] - sink - stitch[i]
      let cursor = 0
      const write = (i: number, h: number) => {
        arr[cursor++] = xz[i * 3] + up.x * h
        arr[cursor++] = xz[i * 3 + 1] + up.y * h
        arr[cursor++] = xz[i * 3 + 2] + up.z * h
      }
      for (let e = 0; e < edges.length; e += 2) {
        const v0 = edges[e]
        const v1 = edges[e + 1]
        const h0 = topHeight(v0)
        const h1 = topHeight(v1)
        write(v0, h0)
        write(v1, h1)
        write(v1, h1 - depths[v1])
        write(v0, h0)
        write(v1, h1 - depths[v1])
        write(v0, h0 - depths[v0])
      }
      posAttr.needsUpdate = true
      skirt.geometry.computeBoundingSphere()
      return this
    },

    /**
     * 相机钻进编辑面以下时隐藏 three 网格，和 Cesium 地形的单面渲染表现一致。
     * @private
     */
    _updateTerrainVisibility(this: TerrainEditInstance & Record<string, any>) {
      const root = this._root
      if (!root) return
      if (!this._hideWhenUnderground || !this._grid) {
        if (!root.visible) root.visible = true
        this._underground = false
        return
      }
      const camera = this._viewer && this._viewer.camera
      const globe = this._viewer && this._viewer.scene && this._viewer.scene.globe
      if (!camera || !globe) return
      if (!this._followCarto) this._followCarto = new Cesium.Cartographic()
      const carto = Cesium.Cartographic.fromCartesian(
        camera.positionWC,
        globe.ellipsoid,
        this._followCarto
      )
      if (!carto) return
      const lng = Cesium.Math.toDegrees(carto.longitude)
      const lat = Cesium.Math.toDegrees(carto.latitude)
      const b = this._grid.bounds
      // 只在编辑块自身的范围内做判断：相机钻进旁边山体时，
      // 编辑块仍可能从山体另一侧露出来，不该整块隐藏。
      if (lng < b.minLng || lng > b.maxLng || lat < b.minLat || lat > b.maxLat) {
        if (!root.visible) root.visible = true
        this._underground = false
        return
      }
      const surface = this._heightAt(lng, lat)
      if (!Number.isFinite(surface)) return
      const below = carto.height < surface - (this._sinkDepth || 0) - 0.5
      if (below !== this._underground) {
        this._underground = below
        root.visible = !below
      }
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
     * 采样格网顶点的真实地形高度。
     *
     * 这里是「编辑块会不会偏离地图」的关键：**必须用与视角无关的数据源**。
     *
     * `globe.getHeight()` 读的是当前 LOD 的 renderedMesh，同一块山地在不同视角下
     * 会返回不同的高度（缩远一点、跨过一条瓦片边界，数值能差几十上百米，瓦片没
     * 精化时甚至给出几十公里或接近 0 的离谱值）。拿它当基准面，结果就是：
     * 相机一转，块体跟着 LOD 变形，边缘垂下一整面「竖直幕布」，看起来和地图脱开。
     *
     * 所以基准面统一用 `sampleTerrainMostDetailed`（与相机无关，同一经纬度永远
     * 得到同一个高度），采样不到的少数量再走低级别兜底，最后剔除离谱值并补洞。
     * 这样无论怎么旋转 / 翻滚 / 缩放，块体的形状和位置都完全不变。
     * @private
     */
    async _sampleHeights(this: TerrainEditInstance & Record<string, any>, grid: TerrainGrid) {
      // 格网顶点数量固定，先全部标成 NaN（未采样），最后再统一补洞。
      // 不能像以前那样用 0 兜底：在海拔 1000m 的山上，一个没采到的点会被当成
      // 海平面，网格里就会垂下一整面「竖直幕布」，看起来和地图完全脱离。
      for (let i = 0; i < grid.vertexCount; i++) {
        if (grid.inside[i]) grid.base[i] = NaN
      }

      const insideCount = grid.inside.reduce((n, ok) => n + (ok ? 1 : 0), 0)
      if (!insideCount) {
        grid.current = new Float32Array(grid.base)
        return grid
      }

      const provider = this._viewer.terrainProvider
      const isEllipsoid =
        !provider ||
        (Cesium.EllipsoidTerrainProvider && provider instanceof Cesium.EllipsoidTerrainProvider)
      const cartographics: any[] = []
      const indices: number[] = []
      for (let i = 0; i < grid.vertexCount; i++) {
        if (!grid.inside[i]) continue
        const { lng, lat } = gridLngLat(grid, i)
        cartographics.push(Cesium.Cartographic.fromDegrees(lng, lat))
        indices.push(i)
      }

      let heights: number[] | null = null
      if (isEllipsoid) {
        // 没有真实地形（椭球）：整块按 0 高程铺平，和地图上的平地一致
        heights = new Array(cartographics.length).fill(0)
      } else {
        try {
          const sampled = await Cesium.sampleTerrainMostDetailed(provider, cartographics)
          heights = sampled.map((c: any) =>
            c && typeof c.height === 'number' && Number.isFinite(c.height) ? c.height : NaN
          )
        } catch (err) {
          try {
            const level = this._terrainSampleLevel(provider)
            const sampled = await Cesium.sampleTerrain(provider, level, cartographics)
            heights = sampled.map((c: any) =>
              c && typeof c.height === 'number' && Number.isFinite(c.height) ? c.height : NaN
            )
          } catch (err2) {
            reportError(err2, { scope: 'TerrainEdit.sampleHeights' })
          }
        }
      }

      for (let k = 0; k < indices.length; k++) {
        const value = heights ? heights[k] : NaN
        grid.base[indices[k]] = Number.isFinite(value) ? (value as number) : NaN
      }

      // 采样服务整块都不可用（离线 / 全部超时）时的最后一招：
      // 退回「当前渲染地形」逐点取高度 —— 它随视角变，但至少能让块落在山上，
      // 而不是整块沉到 0 高程、从画面里消失。
      let validCount = 0
      for (let i = 0; i < grid.vertexCount; i++) {
        if (grid.inside[i] && Number.isFinite(grid.base[i])) validCount++
      }
      if (!validCount && !isEllipsoid) {
        for (let i = 0; i < grid.vertexCount; i++) {
          if (!grid.inside[i]) continue
          const { lng, lat } = gridLngLat(grid, i)
          const live = this._sampleRenderedHeight(lng, lat)
          if (live !== null) grid.base[i] = live
        }
      }

      this._sanitizeHeights(grid)
      this._fillMissingHeights(grid)
      grid.current = new Float32Array(grid.base)
      return grid
    },

    /**
     * 取地形服务可用的最高级别，作为 `sampleTerrain` 的兜底级别。
     * @private
     */
    _terrainSampleLevel(this: TerrainEditInstance & Record<string, any>, provider: any) {
      try {
        const availability = provider && provider.availability
        const levels = availability && availability._levels
        if (levels && levels.length) {
          // 取最后一个有区间的级别
          for (let i = levels.length - 1; i >= 0; i--) {
            if (levels[i] && levels[i].length) return i
          }
        }
      } catch (err) {
        /* 忽略：拿不到就用默认级别 */
      }
      return 13
    },

    /**
     * 剔除明显不可能是地形高度的采样值。
     *
     * 采样服务、瓦片缺失、粗 LOD 都可能给出离谱的数（几十公里、接近 0、
     * 或者比四周突然低一千米）。这些点在网格里就是一面「竖直幕布」，
     * 正是编辑块看起来和地图脱开的直接原因，所以宁可当成没采到，
     * 交给 `_fillMissingHeights` 用邻域补一个连续的值。
     * @private
     */
    _sanitizeHeights(this: TerrainEditInstance & Record<string, any>, grid: TerrainGrid) {
      const { stride, segments, inside, base } = grid
      // 1) 绝对范围：地球陆地高度基本落在这个区间内
      for (let i = 0; i < grid.vertexCount; i++) {
        if (!inside[i]) continue
        const h = base[i]
        if (!Number.isFinite(h) || h > HEIGHT_ABS_MAX || h < HEIGHT_ABS_MIN) base[i] = NaN
      }

      // 2) 孤立尖峰：与 8 邻域中位数的差超过阈值，且邻居大多互相一致
      const SPIKE = 800
      const neighbors: number[] = []
      for (let pass = 0; pass < 2; pass++) {
        const spikes: number[] = []
        for (let i = 0; i < grid.vertexCount; i++) {
          if (!inside[i]) continue
          const h = base[i]
          if (!Number.isFinite(h)) continue
          const row = Math.floor(i / stride)
          const col = i % stride
          neighbors.length = 0
          for (let dr = -1; dr <= 1; dr++) {
            const r = row + dr
            if (r < 0 || r > segments) continue
            for (let dc = -1; dc <= 1; dc++) {
              if (!dr && !dc) continue
              const c = col + dc
              if (c < 0 || c > segments) continue
              const j = r * stride + c
              if (!inside[j]) continue
              const v = base[j]
              if (Number.isFinite(v)) neighbors.push(v)
            }
          }
          if (neighbors.length < 5) continue
          neighbors.sort((a, b) => a - b)
          const median = neighbors[neighbors.length >> 1]
          if (Math.abs(h - median) > SPIKE) spikes.push(i)
        }
        if (!spikes.length) break
        for (let k = 0; k < spikes.length; k++) base[spikes[k]] = NaN
      }
      return this
    },

    /**
     * 用邻域平均值补齐没有采到高度的内部顶点。
     *
     * 采样服务偶尔会漏点 / 超时，一个孤立顶点如果留成 0，会和周围差上千米，
     * 网格里直接撕出一面竖墙。这里先按 4/8 邻域逐圈扩散，实在没有邻居的
     * 极端情况才退回整块平均值。
     * @private
     */
    _fillMissingHeights(this: TerrainEditInstance & Record<string, any>, grid: TerrainGrid) {
      const { stride, segments, inside, base } = grid
      let missing: number[] = []
      let validSum = 0
      let validCount = 0
      for (let i = 0; i < grid.vertexCount; i++) {
        if (!inside[i]) continue
        if (Number.isFinite(base[i])) {
          validSum += base[i]
          validCount++
        } else {
          missing.push(i)
        }
      }
      if (!missing.length) return
      // 轮数给足：采样大面积失败时（例如地形服务短暂不可用）也能从少量有效点
      // 一圈圈扩散把整块补成连续曲面，而不是留一片平面平均值的「补丁」
      for (let pass = 0; pass < 24 && missing.length; pass++) {
        const next: number[] = []
        for (let k = 0; k < missing.length; k++) {
          const i = missing[k]
          const row = Math.floor(i / stride)
          const col = i % stride
          let sum = 0
          let count = 0
          for (let dr = -1; dr <= 1; dr++) {
            const r = row + dr
            if (r < 0 || r > segments) continue
            for (let dc = -1; dc <= 1; dc++) {
              if (!dr && !dc) continue
              const c = col + dc
              if (c < 0 || c > segments) continue
              const j = r * stride + c
              if (!inside[j] || !Number.isFinite(base[j])) continue
              sum += base[j]
              count++
            }
          }
          if (count) base[i] = sum / count
          else next.push(i)
        }
        missing = next
      }
      // 整块一个有效点都没有（例如采样服务完全不可用）：用平均值兜底，
      // 至少保证网格是平的，而不是一排 0 高程的深井。
      const fallback = validCount ? validSum / validCount : 0
      for (let k = 0; k < missing.length; k++) base[missing[k]] = fallback
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
      // 范围已经换成手绘多边形，之前为矩形区域挖的地形洞必须补回来
      this._clearTerrainClip()
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
     * 算一次「块面整体下沉量」（米）。
     *
     * 默认 **0**：块面不再整体沉进地形，而是按当前画面里的地形逐点对齐
     * （见 `_refreshSeam`）。只有用户显式传了 `settle` 才保留这个旧行为。
     *
     * 注意它只影响「画在哪里」：`grid.current` / `getStats()` / `getHeightAt()`
     * 拿到的仍然是真实地形高度，导出的高度场不受影响。
     * @private
     */
    _resolveSink(this: TerrainEditInstance & Record<string, any>, grid: TerrainGrid | null) {
      if (this._sinkOption != null) {
        this._sinkDepth = this._sinkOption
        return this._sinkDepth
      }
      this._sinkDepth = 0
      return this._sinkDepth
    },

    /**
     * 取/重置「显示修正量」数组（每个顶点减掉多少米，负数表示抬高）。
     * @private
     */
    _ensureStitch(this: TerrainEditInstance & Record<string, any>, grid: TerrainGrid) {
      const n = grid.vertexCount
      if (!this._stitch || this._stitch.length !== n) this._stitch = new Float32Array(n)
      else this._stitch.fill(0)
      return this._stitch
    },

    /**
     * 取经纬度处的「显示修正量」（米），格网外为 0。
     * @private
     */
    _stitchAt(this: TerrainEditInstance & Record<string, any>, lng: number, lat: number) {
      const stitch: Float32Array | null = this._stitch
      const grid: TerrainGrid | null = this._grid
      if (!stitch || !grid) return 0
      const b = grid.bounds
      const fx = ((lng - b.minLng) / (b.maxLng - b.minLng)) * grid.segments
      const fy = ((lat - b.minLat) / (b.maxLat - b.minLat)) * grid.segments
      if (!(fx >= 0 && fy >= 0 && fx <= grid.segments && fy <= grid.segments)) return 0
      const stride = grid.stride
      const col = Math.min(grid.segments - 1, Math.max(0, Math.floor(fx)))
      const row = Math.min(grid.segments - 1, Math.max(0, Math.floor(fy)))
      const tx = Math.max(0, Math.min(1, fx - col))
      const ty = Math.max(0, Math.min(1, fy - row))
      const i00 = row * stride + col
      const a = stitch[i00] * (1 - tx) + stitch[i00 + 1] * tx
      const c = stitch[i00 + stride] * (1 - tx) + stitch[i00 + stride + 1] * tx
      return a * (1 - ty) + c * ty
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
      this._skirtMesh = null
      this._skirtEdges = null
      this._skirtVerts = null
      this._skirtDepths = null
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
      // 挂上「贴合地表」的逐帧回调（幂等）：只负责地下隐藏 + 边缘对齐，
      // 不会改变块体基准面（块体高度来自与视角无关的采样，见 _sampleHeights）。
      this._ensureFollowLoop()
      this._seamDirty = true
      this._seamDeadline = nowMs() + SEAM_SETTLE_MS

      const grid = this._grid
      this._resolveSink(grid)
      // 重建时旧网格的缝合量已经没有意义，清掉等 _refreshSeam 重算
      this._stitch = null
      this._stitchDirty = false
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
        // 整体下沉（见 settle）：块面比采样高度低几米，边缘藏进真实地形里
        const h = grid.current[i] - (this._sinkDepth || 0)
        positions[i * 3] = base.x + up.x * h
        positions[i * 3 + 1] = base.y + up.y * h
        positions[i * 3 + 2] = base.z + up.z * h
        if (texture && texture.uv) {
          const pair = texture.uv(lng, lat)
          uvs[i * 2] = pair[0]
          uvs[i * 2 + 1] = pair[1]
        }
        const ratio = (stats.maxHeight - h) / span
        const underwater = waterLevel != null && grid.current[i] < waterLevel
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
      // 编辑区域掩膜：初始全 0（未编辑），刷过之后由 _refreshEditRegion 更新
      geometry.setAttribute('aEdit', new THREE.BufferAttribute(new Float32Array(grid.vertexCount), 1))
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

      // 初始没有任何编辑：整块网格 alpha=0，让真实地球直接露出来
      this._refreshEditRegion(geometry)

      // 可选裙边：仅当显式设置 `skirtDepth > 0` 时生成（默认关闭，靠边缘对齐贴合地形）
      this._buildSkirt(grid, positions, up)

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

      this._buildRim()

      if (waterLevel != null) {
        this._buildWater(waterLevel)
      }

      return this
    },

    /**
     * 绘制矿坑 / 地块的轮廓线（贴地，随当前高度场重建）。
     * @private
     */
    _buildRim(this: TerrainEditInstance & Record<string, any>) {
      const root = this._root
      if (!root || !THREE) return this
      const old = root.getObjectByName('terrain-edit-rim')
      if (old) {
        if (old.geometry) old.geometry.dispose()
        if (old.material) old.material.dispose()
        root.remove(old)
      }
      // 笔刷区域模式不需要：边界是人为划的矩形，画出来反而像一层贴片
      if (this._areaMode || !this._polygon.length) return this
      const rimPositions: number[] = []
      // 轮廓线要贴在实际画出来的块面上（块面整体下沉了多少，线也要跟着沉），
      // 否则深挖后边框会像一圈悬浮的圈
      const rimSink = this._sinkDepth || 0
      this._polygon.forEach((p: TerrainLngLat) => {
        const local = this._toLocal(p.lng, p.lat, this._heightAt(p.lng, p.lat) - rimSink + 0.6)
        rimPositions.push(local.x, local.y, local.z)
      })
      if (rimPositions.length < 6) return this
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
      return this
    },

    /**
     * 计算「编辑区域掩膜」：只有真正被刷动过的格网附近才显示 three 网格。
     *
     * 编辑区默认是一整块 2.4km 的独立网格，即使一笔都没刷，它也会整块盖在
     * Cesium 地球上——贴图分辨率 / 色调和实时影像对不上，看起来就是「一块
     * 颜色不同的贴片」。这里把没动过的顶点 alpha 置 0，three 网格只在编辑过的
     * 地方可见；配合只挖掉编辑区域底下的地形，未编辑的地方完全就是真实地球。
     *
     * 掩膜向编辑区外保持 `EDIT_PLATEAU_CELLS` 格不透明、再渐隐 `EDIT_FADE_CELLS`
     * 格；裁剪矩形就取在这圈不透明平台内，确保洞边永远被网格盖住，不会透空。
     * @private
     */
    _refreshEditRegion(this: TerrainEditInstance & Record<string, any>, geometry?: any) {
      const grid: TerrainGrid | null = this._grid
      if (!grid) return this
      const seg = grid.segments
      const stride = grid.stride
      const count = grid.vertexCount
      let alpha = this._editAlpha
      if (!alpha || alpha.length !== count) alpha = this._editAlpha = new Float32Array(count)

      // 手绘多边形模式沿用旧行为：多边形本身就是用户圈定的编辑范围
      if (!this._areaMode) {
        alpha.fill(1)
        this._editActive = false
        this._editRange = null
        this._editClipBounds = null
        this._writeEditAlpha(geometry)
        return this
      }

      const base = grid.base
      const cur = grid.current
      let minR = seg
      let maxR = -1
      let minC = seg
      let maxC = -1
      for (let r = 0; r < seg; r++) {
        for (let c = 0; c < seg; c++) {
          const i = r * stride + c
          if (!grid.inside[i]) continue
          const d0 = Math.abs(cur[i] - base[i])
          const d1 = Math.abs(cur[i + 1] - base[i + 1])
          const d2 = Math.abs(cur[i + stride] - base[i + stride])
          const d3 = Math.abs(cur[i + stride + 1] - base[i + stride + 1])
          if (d0 > EDIT_EPS || d1 > EDIT_EPS || d2 > EDIT_EPS || d3 > EDIT_EPS) {
            if (r < minR) minR = r
            if (r > maxR) maxR = r
            if (c < minC) minC = c
            if (c > maxC) maxC = c
          }
        }
      }

      const active = maxR >= 0
      this._editActive = active
      this._editRange = active ? { minR, maxR, minC, maxC } : null

      if (!active) {
        alpha.fill(0)
        this._editClipBounds = null
        this._writeEditAlpha(geometry)
        this._syncTerrainClip()
        return this
      }

      // 裁剪矩形 = 活动范围外扩几格，并避开块边界（边界那圈有羽化 alpha，挖掉会透空）。
      // alpha 在整块裁剪矩形内都保持 1（不能只贴着编辑单元），否则矩形的
      // 四个角会透出裁剪洞；矩形外再渐隐 EDIT_FADE_CELLS 格融进真实地球。
      const pad = EDIT_PAD_CELLS
      const cellM = grid.cellSize > 0 ? grid.cellSize : 1
      const edgeInset = Math.max(EDIT_PLATEAU_CELLS, Math.ceil(this._clipInsetMeters() / cellM))
      let cMinR = Math.max(edgeInset, minR - pad)
      let cMaxR = Math.min(seg - edgeInset, maxR + pad)
      let cMinC = Math.max(edgeInset, minC - pad)
      let cMaxC = Math.min(seg - edgeInset, maxC + pad)
      // 编辑范围几乎铺满整块：退回「整块内缩」的裁剪方式
      if (cMinR > cMaxR - 2 || cMinC > cMaxC - 2) {
        cMinR = edgeInset
        cMaxR = seg - edgeInset
        cMinC = edgeInset
        cMaxC = seg - edgeInset
      }
      if (cMaxR <= cMinR || cMaxC <= cMinC) {
        // 范围太小（例如只有零星几格且贴边），不挖地形，保证不会露出洞
        alpha.fill(0)
        this._editClipBounds = null
        this._writeEditAlpha(geometry)
        this._syncTerrainClip()
        return this
      }
      const vMinR = cMinR
      const vMaxR = Math.min(seg, cMaxR + 1)
      const vMinC = cMinC
      const vMaxC = Math.min(seg, cMaxC + 1)
      for (let r = 0; r <= seg; r++) {
        const dr = r < vMinR ? vMinR - r : r > vMaxR ? r - vMaxR : 0
        for (let c = 0; c <= seg; c++) {
          const dc = c < vMinC ? vMinC - c : c > vMaxC ? c - vMaxC : 0
          const dist = Math.max(dr, dc)
          alpha[r * stride + c] =
            dist === 0 ? 1 : Math.max(0, 1 - dist / (EDIT_FADE_CELLS + 1))
        }
      }
      this._writeEditAlpha(geometry)

      const b = grid.bounds
      this._editClipBounds = {
        minLng: b.minLng + cMinC * grid.dLng,
        maxLng: b.minLng + (cMaxC + 1) * grid.dLng,
        minLat: b.minLat + cMinR * grid.dLat,
        maxLat: b.minLat + (cMaxR + 1) * grid.dLat
      }
      this._syncTerrainClip()
      return this
    },

    /**
     * 把编辑区域掩膜写进 `aEdit` 顶点属性（没有就创建）。
     * @private
     */
    _writeEditAlpha(this: TerrainEditInstance & Record<string, any>, geometry?: any) {
      const geo = geometry || (this._surface && this._surface.geometry)
      const alpha = this._editAlpha
      if (!geo || !alpha) return this
      const existing = geo.getAttribute('aEdit')
      if (!existing || existing.array.length !== alpha.length) {
        geo.setAttribute('aEdit', new THREE.BufferAttribute(new Float32Array(alpha), 1))
      } else {
        ;(existing.array as Float32Array).set(alpha)
        existing.needsUpdate = true
      }
      return this
    },

    /**
     * 让地形裁剪跟着「编辑区域」走：有编辑就只挖编辑范围底下，没有编辑就把地形还回去。
     * @private
     */
    _syncTerrainClip(this: TerrainEditInstance & Record<string, any>) {
      if (!this._areaMode) return this
      const bounds = this._editClipBounds
      if (!bounds) {
        if (this._clip || this._editClipSig) {
          this._editClipSig = ''
          this._clearTerrainClip()
        }
        return this
      }
      const sig = [
        bounds.minLng.toFixed(6),
        bounds.maxLng.toFixed(6),
        bounds.minLat.toFixed(6),
        bounds.maxLat.toFixed(6)
      ].join(',')
      // 外部 clear()/setPolygon() 可能已经把裁剪撤掉了，这里用 _clip 兜底判断，
      // 避免签名相同却不再重新挖洞。
      if (sig === this._editClipSig && this._clip) return this
      this._editClipSig = sig
      this._applyTerrainClip(bounds)
      return this
    },


    /**
     * 裁剪多边形的内缩距离（米）。
     *
     * 默认等于边缘羽化宽度：编辑块最外圈是半透明的渐隐带，它需要底下的地形
     * 才能「化」进原地表；如果一直挖到块边界，渐隐带底下就没有东西了，会变成
     * 一圈透空的暗边。内缩一圈后，洞的边界正好落在块面不透明的区域里。
     * @private
     */
    _clipInsetMeters(this: TerrainEditInstance & Record<string, any>) {
      if (this._cutInset != null) return this._cutInset
      const grid = this._grid
      const feather = grid ? Number(grid.slopeWidth) : NaN
      const band = Number.isFinite(feather) && feather > 0 ? feather : 80
      // 缩 1.8 倍：羽化带的 alpha 叠了低频扰动（振幅约 0.7 个带宽），
      // 洞边要落在扰动的最大外扩之外，边缘才不会透出一条暗缝
      return Math.max(8, band * 1.8)
    },

    /**
     * 把编辑区底下的 Cesium 原地形挖掉。
     *
     * 不挖的话，同一块地方会有两层地表：Cesium 地形还停在被编辑前的高度，编辑块
     * 是另一层。相机压低视角时，原地形从块面里穿出来，看着就是「编辑区域贴在
     * 地图上」；挖掉之后这个区域只剩编辑块一层地表，和地图真正连成一片。
     *
     * 只对矩形「区域」模式生效：手绘多边形模式下块面被 `inside` 掩膜裁过，
     * 用矩形去挖会多挖掉多边形外的一圈地形。
     * @private
     */
    _applyTerrainClip(
      this: TerrainEditInstance & Record<string, any>,
      boundsOverride?: { minLng: number; maxLng: number; minLat: number; maxLat: number }
    ) {
      if (!this._cutTerrain || !this._grid || !this._areaMode) return this
      const viewer = this._viewer
      const scene = viewer && !viewer.isDestroyed() ? viewer.scene : null
      const globe = scene && scene.globe
      if (!globe) return this
      if (!Cesium || !Cesium.ClippingPolygon || !Cesium.ClippingPolygonCollection) {
        if (!this._clipWarned) {
          this._clipWarned = true
          console.warn('[cesium_dev_kit] 当前 Cesium 版本不支持 globe.clippingPolygons，编辑区无法挖掉原地形')
        }
        return this
      }
      // 裁剪多边形只在 WebGL2 上下文可用
      const context = (scene as any).context
      if (context && context.webgl2 === false) {
        if (!this._clipWarned) {
          this._clipWarned = true
          console.warn('[cesium_dev_kit] 裁剪多边形需要 WebGL2，当前上下文不支持，编辑区无法挖掉原地形')
        }
        return this
      }
      // 已经设过别人的裁剪：不去覆盖，避免和外部功能互相打架
      const current = globe.clippingPolygons
      if (current && (!this._clip || current !== this._clip.collection)) return this

      let minLng: number
      let maxLng: number
      let minLat: number
      let maxLat: number
      if (boundsOverride) {
        // 只挖「真正编辑过」的范围：范围外保持 Cesium 真实地形，不再整块替换
        minLng = boundsOverride.minLng
        maxLng = boundsOverride.maxLng
        minLat = boundsOverride.minLat
        maxLat = boundsOverride.maxLat
      } else {
        // 兼容旧行为：整块编辑区按 feather 内缩
        const bounds = this._grid.bounds
        const inset = this._clipInsetMeters()
        const dLat = inset / 111319.49079327358
        const dLng = inset / metersPerDegLng((bounds.minLat + bounds.maxLat) / 2)
        minLng = bounds.minLng + dLng
        maxLng = bounds.maxLng - dLng
        minLat = bounds.minLat + dLat
        maxLat = bounds.maxLat - dLat
      }
      if (!(maxLng > minLng) || !(maxLat > minLat)) return this

      // 每条边多打几个点：几公里见方的范围，地球曲率已经不能忽略，
      // 只用四个角的话洞的边会往内凹一点，接缝就对不齐了
      const positions: any[] = []
      const add = (lng: number, lat: number) => {
        positions.push(Cesium.Cartesian3.fromDegrees(lng, lat, 0))
      }
      const N = 6
      for (let i = 0; i < N; i++) add(minLng + ((maxLng - minLng) * i) / N, minLat)
      for (let i = 0; i < N; i++) add(maxLng, minLat + ((maxLat - minLat) * i) / N)
      for (let i = 0; i < N; i++) add(maxLng - ((maxLng - minLng) * i) / N, maxLat)
      for (let i = 0; i < N; i++) add(minLng, maxLat - ((maxLat - minLat) * i) / N)

      try {
        const collection = new Cesium.ClippingPolygonCollection({
          polygons: [new Cesium.ClippingPolygon({ positions })]
        })
        this._clearTerrainClip()
        globe.clippingPolygons = collection
        this._clip = { globe, collection }
        // 地形洞已经挖好，但 three 若没有和 Cesium 共享深度，块面仍会整片盖在地形上：
        // 前景山体挡不住它，看起来还是「贴片」。这里提示一次，方便集成时对齐配置。
        const threeJs: any = this._threeJs
        const status = threeJs && typeof threeJs.getFusionStatus === 'function' ? threeJs.getFusionStatus() : null
        if (status && status.depth === 'none' && !this._depthHinted) {
          this._depthHinted = true
          console.warn(
            '[cesium_dev_kit] 编辑区已挖掉原地形，但 three 与 Cesium 未共享深度，' +
              '块面仍会盖住前景地形。请给 viewer 设 orderIndependentTranslucency: false、' +
              'msaaSamples: 1、contextOptions.webgl.antialias: false。'
          )
        }
      } catch (err) {
        reportError(err, { scope: 'TerrainEdit.applyTerrainClip' })
      }
      return this
    },

    /**
     * 撤掉编辑区的地形裁剪，把地形还给 Cesium。
     * @private
     */
    _clearTerrainClip(this: TerrainEditInstance & Record<string, any>) {
      const clip = this._clip
      if (!clip) return this
      this._clip = null
      try {
        const globe = clip.globe
        if (globe && !globe.isDestroyed?.() && globe.clippingPolygons === clip.collection) {
          globe.clippingPolygons = undefined
        }
      } catch (err) {
        /* 场景已销毁：不用再管 */
      }
      try {
        if (clip.collection && !clip.collection.isDestroyed()) clip.collection.destroy()
      } catch (err) {
        /* 销毁失败也不影响后续：集合已从 globe 上摘掉 */
      }
      return this
    },

    /**
     * 沿编辑块外边界建一圈向下的裙边（侧壁）。
     *
     * 默认**不生成**（`skirtDepth = 0`）：块面边缘已经按当前渲染地形逐点对齐，
     * 不需要土色侧壁。只有调用方显式传 `skirtDepth > 0` 时才建，
     * 用来在无法采样渲染高度、或外部地形服务不可用的特殊场景里兜底。
     * @private
     */
    _buildSkirt(
      this: TerrainEditInstance & Record<string, any>,
      grid: TerrainGrid,
      positions: Float32Array,
      up: any
    ) {
      this._skirtMesh = null
      this._skirtEdges = null
      this._skirtVerts = null
      this._skirtDepths = null
      if (!this._root || !THREE || !positions) return this
      // 默认不建裙边：块面已经按当前地形逐点对齐（见 `_refreshSeam`），
      // 边缘不再需要一圈土色侧壁。只有显式传了 `skirtDepth > 0` 才生成。
      if (!(this._skirtBaseDepth > 0)) return this
      const stride = grid.stride
      const segments = grid.segments

      // 某个单元格是否会渲染（四角都在编辑区内）
      const renderedCell = (row: number, col: number) => {
        if (row < 0 || col < 0 || row >= segments || col >= segments) return false
        const a = row * stride + col
        return !!(
          grid.inside[a] &&
          grid.inside[a + 1] &&
          grid.inside[a + stride] &&
          grid.inside[a + stride + 1]
        )
      }

      // 收集外边界边：渲染单元与未渲染单元之间的那条边
      const edges: number[] = []
      const seen = new Set<number>()
      for (let row = 0; row < segments; row++) {
        for (let col = 0; col < segments; col++) {
          if (!renderedCell(row, col)) continue
          const a = row * stride + col
          const b = a + 1
          const c = a + stride
          const d = c + 1
          if (!renderedCell(row - 1, col)) {
            edges.push(a, b)
            seen.add(a)
            seen.add(b)
          }
          if (!renderedCell(row, col + 1)) {
            edges.push(b, d)
            seen.add(b)
            seen.add(d)
          }
          if (!renderedCell(row + 1, col)) {
            edges.push(c, d)
            seen.add(c)
            seen.add(d)
          }
          if (!renderedCell(row, col - 1)) {
            edges.push(a, c)
            seen.add(a)
            seen.add(c)
          }
        }
      }
      if (!edges.length) return this

      // 每条边界边一个向下的四边形（两个三角形）：顶边贴块面，底边按各自深度下探
      const quadCount = edges.length / 2
      const verts = Array.from(seen)
      const depths = new Float32Array(grid.vertexCount)
      for (let k = 0; k < verts.length; k++) depths[verts[k]] = this._skirtBaseDepth
      const arr = new Float32Array(quadCount * 6 * 3)
      // 侧壁必须是**不透明**的土体。
      //
      // 早先这里让 alpha 从 1 渐隐到 0，想让侧壁「化」进地形；结果低角度下
      // 编辑区悬在一段被抹平的地形之上时，裙边下半截全是透明的，等于什么都没挡 ——
      // 底下那圈地形洞直接露出白底，看着比褐色土壁刺眼得多。
      // 现在整圈不透明：裙边平时埋在块面下方（块面本身已下沉几米），看不见；
      // 一旦露出来，就是一道实实在在的土体断面。
      const colors = new Float32Array(quadCount * 6 * 4)
      const xz: Float32Array = this._localXZ
      const baseDepth = this._skirtBaseDepth
      let n = 0
      let c = 0
      const writeColor = (alpha: number) => {
        colors[c++] = 1
        colors[c++] = 1
        colors[c++] = 1
        colors[c++] = alpha
      }
      const pushTop = (i: number) => {
        // 顶边必须贴着块面：块面整体下沉了多少，裙边顶边也要跟着下沉多少，
        // 否则显式打开裙边时会露出一条「顶边高出块面」的暗带
        const h = grid.current[i] - (this._sinkDepth || 0)
        if (xz) {
          arr[n++] = xz[i * 3] + up.x * h
          arr[n++] = xz[i * 3 + 1] + up.y * h
          arr[n++] = xz[i * 3 + 2] + up.z * h
        } else {
          arr[n++] = positions[i * 3]
          arr[n++] = positions[i * 3 + 1]
          arr[n++] = positions[i * 3 + 2]
        }
        writeColor(1)
      }
      const pushBottom = (i: number) => {
        arr[n++] = positions[i * 3] - up.x * baseDepth
        arr[n++] = positions[i * 3 + 1] - up.y * baseDepth
        arr[n++] = positions[i * 3 + 2] - up.z * baseDepth
        writeColor(1)
      }
      for (let k = 0; k < edges.length; k += 2) {
        const v0 = edges[k]
        const v1 = edges[k + 1]
        pushTop(v0)
        pushTop(v1)
        pushBottom(v1)
        pushTop(v0)
        pushBottom(v1)
        pushBottom(v0)
      }

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(arr, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4))
      geometry.computeVertexNormals()
      geometry.computeBoundingSphere()
      // 暗土色、双面、完全不透明：平时埋在块面下方看不见，
      // 露出来时就是一道实实在在的土体断面，挡住底下那个透空的地形洞
      const material = new THREE.MeshBasicMaterial({
        color: 0x3a2f25,
        vertexColors: true,
        side: THREE.DoubleSide,
        depthWrite: true
      })
      const skirt = new THREE.Mesh(geometry, material)
      skirt.name = 'terrain-edit-skirt'
      skirt.renderOrder = 1
      this._root.add(skirt)
      this._skirtMesh = skirt
      this._skirtEdges = Int32Array.from(edges)
      this._skirtVerts = verts
      this._skirtDepths = depths
      // 裙边建好先按基础深度摆着，等相机停稳、瓦片精化后再按实际地形补深
      this._seamDirty = true
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
      // 没有编辑时不画等高线，否则会在真实地球上露出一整块矩形范围
      if (this._areaMode && !this._editActive) return this

      const grid = this._grid
      const stats = terrainStats(grid, this._polygon)
      const interval =
        this._stepHeight > 0
          ? this._stepHeight
          : niceContourInterval(Math.max(1, stats.maxHeight - stats.minHeight), 26)
      const segs = buildContourSegments(grid, interval, grid.current)
      if (!segs.length) return this

      const range = this._editRange
      const margin = EDIT_PLATEAU_CELLS
      const positions: number[] = []
      const offset = Math.max(0.35, interval * 0.03)
      for (let i = 0; i < segs.length; i += 4) {
        if (range) {
          const r0 = segs[i]
          const c0 = segs[i + 1]
          const outRow = r0 < range.minR - margin || r0 > range.maxR + margin
          const outCol = c0 < range.minC - margin || c0 > range.maxC + margin
          if (outRow || outCol) continue
        }
        for (let k = 0; k < 2; k++) {
          const row = segs[i + k * 2]
          const col = segs[i + k * 2 + 1]
          const sample = this._sampleGrid(row, col)
          positions.push(sample.x, sample.y + offset, sample.z)
        }
      }
      if (!positions.length) return this

      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
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
        grid.current[i00] * w00 +
        grid.current[i01] * w01 +
        grid.current[i10] * w10 +
        grid.current[i11] * w11 -
        (this._sinkDepth || 0) -
        (this._stitch ? this._stitch[i00] * w00 + this._stitch[i01] * w01 + this._stitch[i10] * w10 + this._stitch[i11] * w11 : 0)
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
      if (!this._surface || !this._grid) return this
      this._updateSurfacePositions()
      const mesh = this._surface
      // 重新计算编辑区域掩膜：刷到哪儿，three 网格就显示到哪儿
      this._refreshEditRegion(mesh.geometry)
      mesh.geometry.computeVertexNormals()
      // 高度/法线变了，陡壁的展开 UV 得一起重算，否则刚挖出的立面又会退回成竖条
      this._updateSurfaceUVs(mesh.geometry)
      // 法线变了，明暗得跟着重烘，不然刚挖出来的坡面还是按旧法线打光，看着像贴了张图
      this._bakeShading(mesh.geometry)
      // 块面高度变了，边界裙边的顶边得跟着走，否则刷到边界时裙边会脱开一条缝
      this._seamDirty = true
      this._seamDeadline = nowMs() + SEAM_SETTLE_MS
      return this
    },

    /**
     * 只更新顶点位置（不算法线 / UV / 明暗），用于相机移动中的低频粗校正。
     * @private
     */
    _updateSurfacePositions(this: TerrainEditInstance & Record<string, any>) {
      const mesh = this._surface
      const grid: TerrainGrid = this._grid
      if (!mesh || !grid) return this
      const attr = mesh.geometry.getAttribute('position')
      const arr = attr.array as Float32Array
      const xz: Float32Array = this._localXZ
      const up = this._up
      // 与顶点色 / 拾取共用同一个下沉量：块面要整体沉进地形里，不能只有一部分沉
      const sink = this._sinkDepth || 0
      // 边缘缝合：最外几圈还要再按「当前渲染地形」让下去（见 _refreshSeam）
      const stitch: Float32Array | null = this._stitch
      for (let i = 0; i < grid.vertexCount; i++) {
        const h = grid.current[i] - sink - (stitch ? stitch[i] : 0)
        arr[i * 3] = xz[i * 3] + up.x * h
        arr[i * 3 + 1] = xz[i * 3 + 1] + up.y * h
        arr[i * 3 + 2] = xz[i * 3 + 2] + up.z * h
      }
      attr.needsUpdate = true
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
        transparent: true,
        // 未编辑区域的 alpha 由 aEdit 顶点属性压到 0；alphaTest 把这些片元直接丢弃，
        // 既不写深度也不盖住底下的真实地球影像。编辑区域 alpha=1，正常参与深度测试。
        alphaTest: 0.02,
        // 编辑网格和 Cesium 地形高度对齐后几乎共面，不加深度偏移会出现
        // 一条条闪烁的接缝（时而露出底下地形）；让编辑面稳定压在地形之上。
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
      }
      const material = new THREE.MeshBasicMaterial(params)
      // aEdit：编辑区域掩膜（见 _refreshEditRegion）。始终注入，只有刷过的地方才显示。
      material.onBeforeCompile = (shader: any) => {
        const vertexDecl =
          '\nattribute float aEdit;\nvarying float vEdit;' +
          (canvas ? '\nattribute float aCut;\nvarying float vCut;\nvarying vec3 vLocalPos;' : '')
        const vertexBody =
          '\nvEdit = aEdit;' + (canvas ? '\nvCut = aCut;\nvLocalPos = position;' : '')
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>' + vertexDecl)
          .replace('#include <begin_vertex>', '#include <begin_vertex>' + vertexBody)
        const fragCommon = '\nvarying float vEdit;' + (canvas ? '\n' + EARTH_COMMON_GLSL : '')
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>' + fragCommon)
          .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= vEdit;')
        if (canvas) {
          // 开挖面：把影像渐变成程序化岩土（详见 EARTH_COMMON_GLSL 的注释）
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            '#include <map_fragment>\n' + EARTH_APPLY_GLSL
          )
        }
      }
      material.customProgramCacheKey = () => (canvas ? 'terrain-edit-earth' : 'terrain-edit-editmask')
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
      // 渐隐带宽度要跟「挖掉地形」的内缩量对齐：那块地方底下已经没有 Cesium 地形，
      // 渐隐带太宽就会在洞的边缘露出一圈透空的暗边。按 `feather`（米）换算成比例，
      // 固定 10% 在 2.4km 的地块上是 240m，挖完地形后那圈就遮不住了。
      let bandRatio = 0.1
      const grid = this._grid
      if (grid && grid.bounds) {
        const sizeM =
          (grid.bounds.maxLng - grid.bounds.minLng) *
          metersPerDegLng((grid.bounds.minLat + grid.bounds.maxLat) / 2)
        const bandM = Math.max(6, Number(grid.slopeWidth) || 0)
        if (sizeM > 0) bandRatio = Math.min(0.16, Math.max(0.015, bandM / sizeM))
      }
      const band = Math.max(3, size * bandRatio)
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
     * 亮度只跟「法线与地表法线的夹角」有关：未编辑的顶点保持 1.0（影像原样输出），
     * 只有被刷动过的顶点才按坡度压到 0.84，所以翻出的坡面能看出体积感，
     * 而对齐的平地又不会比周围影像暗一块。
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
      const stride = this._grid.stride
      const segments = this._grid.segments
      const cellM = this._grid.cellSize > 0 ? this._grid.cellSize : 1
      const sunLen = Math.hypot(SUN_DIR.x, SUN_DIR.y, SUN_DIR.z) || 1
      const sx = SUN_DIR.x / sunLen
      const sy = SUN_DIR.y / sunLen
      const sz = SUN_DIR.z / sunLen
      for (let i = 0; i < count; i++) {
        const nx = normals.getX(i)
        const ny = normals.getY(i)
        const nz = normals.getZ(i)
        const moved = Math.abs(current[i] - origin[i])
        // 没被编辑过的顶点：亮度保持 1.0，让编辑区的影像和周围地球完全一致，
        // 看不出「贴上去的一块」。坡面明暗只在真的刷动过之后才烘进去。
        let shade = 1
        // 方向性明暗：只作用于被刷动过的顶点，迎光立面提亮、背光立面压暗。
        // 台阶「一眼看得出来」靠的是折点处这道明暗突变，而不是换一张贴图；
        // 天然陡崖没被刷过（moved = 0），保持影像原样。
        if (moved > 0.001) {
          const ndl = Math.abs(nx * up.x + ny * up.y + nz * up.z)
          shade = 0.84 + 0.16 * Math.min(1, ndl)
          const sunDot = nx * sx + ny * sy + nz * sz
          shade *= 1 + Math.min(1, moved / 6) * 0.3 * sunDot
        }
        let cut = 0
        if (cutArr) {
          const delta = current[i] - origin[i]
          if (this._cutSurface && moved > 2) {
            // 只对「真的动过」的顶点生效：没刷到的地方即使天然陡峭也保持影像原样
            const edited = Math.min(1, (moved - 2) / 6)
            // 坡度**直接由高度场算**，不要用顶点法线。
            // 法线是相邻三角面平均出来的：一整面陡壁上的法线会被上下两端的缓坡拉平，
            // `ndl` 仍然接近 1，于是「陡壁」判定几乎不触发（实测整面墙只有几十个顶点
            // 越过门槛），墙面上只剩被 UV 展开拉长的影像 —— 就是那条竖条纹「幕布」。
            // 高度场里的相邻高差不会骗人：一格之内差多少米，就是真实坡度。
            const row = Math.floor(i / stride)
            const col = i % stride
            let maxStep = 0
            if (col > 0) maxStep = Math.max(maxStep, Math.abs(current[i] - current[i - 1]))
            if (col < segments) maxStep = Math.max(maxStep, Math.abs(current[i] - current[i + 1]))
            if (row > 0) maxStep = Math.max(maxStep, Math.abs(current[i] - current[i - stride]))
            if (row < segments) maxStep = Math.max(maxStep, Math.abs(current[i] - current[i + stride]))
            const slope = Number.isFinite(maxStep) ? maxStep / cellM : 0
            // 约 39° 起、58° 满
            const steep = Math.min(1, Math.max(0, (slope - 0.8) / 0.8))
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
      // 高度场跟随地形后水面也要重算：先拆掉上一次的水面，避免叠出多层
      const old = this._root.getObjectByName('terrain-edit-water')
      if (old) {
        if (old.geometry) old.geometry.dispose()
        if (old.material) old.material.dispose()
        this._root.remove(old)
      }
      const grid = this._grid
      const stride = grid.stride
      // 水面跟着块面一起下沉，否则块面沉下去后水面会浮在坑口之上
      const displayLevel = waterLevel - (this._sinkDepth || 0)
      const positions = new Float32Array(grid.vertexCount * 3)
      for (let i = 0; i < grid.vertexCount; i++) {
        const { lng, lat } = gridLngLat(grid, i)
        const local = this._toLocal(lng, lat, displayLevel)
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
      // 区域和高度都定了：先按「是否真的编辑过」生成掩膜。
      // 没有编辑时整块网格透明、地形保持原样；有编辑时才挖掉编辑范围底下的地形。
      this._refreshEditRegion(this._surface && this._surface.geometry)
      this._syncTerrainClip()
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
      // 先求与「编辑块」的交点：块面才是用户看到、也是笔刷真正作用的那一层地表。
      // 放到原地形之后判断的话，块被抬高 / 挖低的地方都会退回地形交点，
      // 落笔点就会和鼠标差出几十上百米。
      const edited = this._pickEditedSurface(ray)
      if (edited) {
        return {
          lng: Cesium.Math.toDegrees(edited.longitude),
          lat: Cesium.Math.toDegrees(edited.latitude)
        }
      }
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
     * 沿拾取射线求与「编辑后地表」的交点
     *
     * 这里**必须用沿射线行进 + 二分求根**，不能用牛顿从「未编辑地形」的交点迭代：
     * - 牛顿的收敛判据是「高度差」，而平缓的视线下 1m 高度差可以对应几百米水平距离，
     *   于是迭代“收敛”了、落点却在几百米开外 —— 表现就是笔刷圈和鼠标错位；
     * - 块面被抬高 / 挖低之后，起点（原地形交点）离新地表很远，牛顿常常直接跑飞，
     *   最后退回原地形交点，落笔点就更偏了。
     *
     * 射线行进只依赖「射线高度 - 地表高度」这个标量场的符号翻转，几何上永远不会偏离
     * 射线，所以拿到的点投影回屏幕必然落在鼠标下面。
     *
     * @private
     */
    _pickEditedSurface(
      this: TerrainEditInstance & Record<string, any>,
      ray: any
    ) {
      const grid: TerrainGrid | null = this._grid
      const THREE_: any = THREE
      const surface: any = this._surface
      if (!grid || !Cesium) return null

      // 只在块的包围球范围里搜索：先算出射线进出球的两个 t，省掉几公里的空走
      let tStart = 1
      let tEnd = 0
      try {
        const scene = this._getScene()
        const geo = surface && surface.geometry
        if (!geo) return null
        if (!geo.boundingSphere) geo.computeBoundingSphere()
        const sphere: any = geo.boundingSphere
        if (!sphere || !THREE_) return null
        const centerWorld = surface.localToWorld(new THREE_.Vector3().copy(sphere.center))
        const origin = scene.getSceneOriginPosition()
        const ox = centerWorld.x + origin.x - ray.origin.x
        const oy = centerWorld.y + origin.y - ray.origin.y
        const oz = centerWorld.z + origin.z - ray.origin.z
        const R = sphere.radius
        // 求 |d·t - o|² = R² 的根，o = 球心 - 射线起点：
        //   t = (o·d) ± sqrt((o·d)² - (|o|² - R²))
        // 注意是「+b」而不是「-b」：写成 -b 的话根会落在相机身后几十米，
        // 后面的行进只在那一小段里找，永远找不到交点（笔刷圈直接不出现）。
        const b = ox * ray.direction.x + oy * ray.direction.y + oz * ray.direction.z
        const c = ox * ox + oy * oy + oz * oz - R * R
        const disc = b * b - c
        if (disc <= 0) return null
        const sq = Math.sqrt(disc)
        tStart = Math.max(1, b - sq)
        tEnd = b + sq
      } catch (err) {
        return null
      }
      if (!(tEnd > tStart)) return null

      const point = new Cesium.Cartesian3()
      const b = grid.bounds
      const padLng = grid.dLng
      const padLat = grid.dLat
      const sample = (t: number) => {
        Cesium.Cartesian3.multiplyByScalar(ray.direction, t, point)
        Cesium.Cartesian3.add(ray.origin, point, point)
        const carto = Cesium.Cartographic.fromCartesian(point)
        if (!carto) return null
        const lng = Cesium.Math.toDegrees(carto.longitude)
        const lat = Cesium.Math.toDegrees(carto.latitude)
        // 块外（留一格余量）不算命中：否则光标会跑到范围外的空气里
        if (
          lng < b.minLng - padLng ||
          lng > b.maxLng + padLng ||
          lat < b.minLat - padLat ||
          lat > b.maxLat + padLat
        ) {
          return null
        }
        // 求交要对「画出来的那一层」做：块面整体下沉了 sink 米、边缘还缝了
        // stitch 米，这里也必须用同样的高度，否则平缓视线下落点会偏出几百米
        const h = this._heightAt(lng, lat) - (this._sinkDepth || 0) - this._stitchAt(lng, lat)
        if (!Number.isFinite(h)) return null
        // 射线在该处的高度 - 地表高度：>0 在面上方，<0 已钻到面下
        return { lng, lat, diff: carto.height - h }
      }

      // 步长取半个格网：再细没必要（格网本身就这么密），再粗会漏掉薄脊
      const step = Math.max(1, grid.cellSize * 0.5)
      let prev = sample(tStart)
      let tPrev = tStart
      for (let t = tStart + step; t <= tEnd; t += step) {
        const cur = sample(t)
        if (cur && prev && prev.diff > 0 && cur.diff <= 0) {
          // 夹住符号翻转，再二分 24 次（16m 区间 -> 微米级，远小于一个像素）
          let lo = tPrev
          let hi = t
          let loDiff = prev.diff
          for (let k = 0; k < 24; k++) {
            const mid = (lo + hi) * 0.5
            const s = sample(mid)
            if (!s) break
            if (s.diff > 0) {
              lo = mid
              loDiff = s.diff
            } else {
              hi = mid
            }
          }
          const hitT = loDiff > 0 ? hi : lo
          Cesium.Cartesian3.multiplyByScalar(ray.direction, hitT, point)
          Cesium.Cartesian3.add(ray.origin, point, point)
          const carto = Cesium.Cartographic.fromCartesian(point)
          if (!carto) return null
          return carto
        }
        if (cur) {
          prev = cur
          tPrev = t
        }
      }
      // 射线没有穿过编辑块：交回调用方退回原始地形
      return null
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
      // 块面高度变了，边界裙边的顶边得跟着走（底边保持扎在地形以下）
      this._seamDirty = true
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
     * 一键应用地形模板
     * @function
     */
    applyTemplate(this: TerrainEditInstance & Record<string, any>, options: TerrainTemplateOptions) {
      if (!this._grid) {
        throw new CesiumDevKitError('INVALID_ARGUMENT', '请先调用 setPolygon 或 beginDraw 圈定编辑范围')
      }
      if (!options || !options.type) {
        throw new CesiumDevKitError('INVALID_ARGUMENT', '缺少地形模板类型 type')
      }
      this._history.push(new Float32Array(this._grid.current))
      if (this._history.length > MAX_HISTORY) this._history.shift()

      this._grid.current = applyTerrainTemplate(this._grid, options)
      this._stepHeight = options.stepHeight && options.stepHeight > 0 ? options.stepHeight : 0
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
      // 编辑区没了，之前挖掉的地形要还回去，否则地图上会留一个矩形洞
      this._clearTerrainClip()
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
      // 载入数据后重新计算编辑区域：区域数据只挖真正编辑过的地方，多边形数据把洞补回
      if (this._areaMode) this._refreshEditRegion(this._surface && this._surface.geometry)
      else this._clearTerrainClip()
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
      // 先摘掉逐帧跟随回调，避免场景销毁后还在访问已释放的格网
      if (typeof this._followUninstall === 'function') {
        try {
          this._followUninstall()
        } catch (err) {
          reportError(err, { scope: 'TerrainEdit.dispose' })
        }
      }
      this._followUninstall = null
      if (typeof this._tileProgressRemove === 'function') {
        try {
          this._tileProgressRemove()
        } catch (err) {
          reportError(err, { scope: 'TerrainEdit.dispose' })
        }
      }
      this._tileProgressRemove = null
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
      // 销毁前把地形洞补回去，避免 viewer 还在用时留下裁剪
      this._clearTerrainClip()
      this._grid = null
      this._polygon = []
      this._polygonHeight = []
      this._history = []
    }
  } as unknown as TerrainEditInstance

  return TerrainEdit
}

export const TerrainEdit = createScopedConstructor(createTerrainEditModule) as unknown as TerrainEditConstructor
