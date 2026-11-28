/**
 * API 文档的英文注释翻译层（仅 `npm run docs:typedoc:en` 使用）。
 *
 * 背景：TypeDoc 的 `lang: "en"` 只翻译框架 UI，`@param` / 属性说明来自源码 JSDoc
 * 的中文原文，所以英文站里会看到 `show (boolean): 是否显示` 这种混排。
 *
 * 这里做的是「确定性术语翻译」，不是机器翻译：
 * 1. EXACT —— 整行精确映射（属性、参数、高频方法说明）；
 * 2. RULES —— `是否X` / `X颜色` / `返回X实例` 这类模式化句子；
 * 3. TERMS —— 贪心分词后逐词翻译（`点大小` -> Point size），只在整句被完整
 *    切分且长度有限时才采用，避免把整段中文译成乱码。
 * 四条路都失败时保留中文原文，并写进未翻译清单（.i18n-untranslated.md）。
 * 原则：宁可保留中文，也不输出中英混排。
 */
import fs from 'node:fs'
import path from 'node:path'

const CJK_RE = /[\u4e00-\u9fa5]/

/** 整行精确映射：属性 / 参数 / 高频方法说明 */
const EXACT = {
  // ---- 通用属性 ----
  '是否显示': 'Whether to display',
  '是否贴地': 'Whether to clamp to ground',
  '是否填充': 'Whether to fill',
  '是否显示外边线': 'Whether to show the outline',
  '是否显示背景颜色': 'Whether to show the background color',
  '是否绘制图表': 'Whether to draw the chart',
  '显示条件': 'Display condition',
  '名称': 'Name',
  '尺寸': 'Dimensions',
  '图形名称': 'Graphic name',
  '原始id': 'Original id',
  '材质': 'Material',
  '材质图片': 'Texture image',
  '图片': 'Image',
  '图片 url': 'Image URL',
  '模型url': 'Model URL',
  '颜色': 'Color',
  '扫描颜色': 'Scan color',
  '轮廓线颜色': 'Outline color',
  '外边线颜色': 'Outline color',
  '边线颜色': 'Outline color',
  '背景颜色': 'Background color',
  '线宽': 'Line width',
  '外边线宽度': 'Outline width',
  '边线宽': 'Outline width',
  '宽度': 'Width',
  '长度': 'Length',
  '高度': 'Height',
  '半径': 'Radius',
  '顶部半径': 'Top radius',
  '底部半径': 'Bottom radius',
  '长半轴': 'Semi-major axis',
  '短半轴': 'Semi-minor axis',
  '内球半径': 'Inner radius',
  '最大高度': 'Maximum height',
  '拉伸高度': 'Extrusion height',
  '长宽高': 'Length, width and height',
  '盒子长宽高': 'Box length, width and height',
  '点大小': 'Point size',
  '坐标数组': 'Array of coordinates',
  'Cartesian3坐标': 'Cartesian3 coordinates',
  '缩放比例': 'Scale',
  '缩放远近距离': 'Scale by distance',
  '偏移': 'Offset',
  '视角偏移设置': 'Eye offset settings',
  '速度': 'Speed',
  '频率': 'Frequency',
  '采样频率': 'Sampling rate',
  '发光强度': 'Glow intensity',
  '经度': 'Longitude',
  '纬度': 'Latitude',
  '垂直方向': 'Vertical direction',
  '垂直分段数量': 'Number of vertical segments',
  '垂直分段数': 'Number of vertical partitions',
  '平行分段数': 'Number of parallel partitions',
  '椭圆最大角度': 'Maximum cone angle',
  '持续时长': 'Duration',
  '时间间隔': 'Time interval',
  '朝向（度）': 'Orientation (degrees)',
  '倾斜度（度）': 'Tilt (degrees)',
  '翻滚角（度）': 'Roll angle (degrees)',
  '扫描半径（米）': 'Scan radius (m)',
  '单次扫描时长（秒）': 'Scan duration (s)',
  '卫星位置': 'Satellite position',
  '雷达位置': 'Radar position',
  '裁剪大小': 'Clip size',
  '四周贴图': 'Surrounding texture',
  '底部贴图': 'Bottom texture',
  '高程参照设置': 'Height reference settings',
  '实体对象': 'Entity object',
  '数据源': 'Data source',
  'Cesium 全局对象': 'Cesium global object',
  'cesium viewer 实例': 'Cesium viewer instance',
  '模块内部持有的 cesium 全局对象': 'Cesium global object held by the module',
  'cesium global object 实例': 'Cesium global instance',
  '其它自定义字段': 'Other custom fields',
  '静态资源（defaultStatic）配置': 'Static assets (defaultStatic) configuration',
  '自定义图元': 'Custom primitive',
  '光锥图元': 'Light cone primitive',
  '阴影图元': 'Shadow primitive',
  '卫星雷达波': 'Satellite radar wave',
  '序列化格式': 'Serialization format',
  '深度共享方式': 'Depth sharing mode',
  '相机矩阵精度策略': 'Camera matrix precision strategy',
  '材质(与图片二选一)': 'Material (mutually exclusive with image)',
  '材质，可传颜色或 MaterialProperty': 'Material; accepts a color or a MaterialProperty',
  '配置线段材质': 'Configure the line segment material',
  '绘制线图形的坐标数组': 'Coordinates of the line to draw',
  '绘制label图形的参数': 'Parameters for drawing a label graphic',
  '采样点数量，默认 100': 'Number of sample points, default 100',
  '采样点数量': 'Number of sample points',

  // ---- 标签 / 广告牌等图形属性（Graphics 模块高频）----
  '标签文字': 'Label text',
  '字体': 'Font',
  '风格': 'Style',
  '背景图地址': 'Background image URL',
  '中心点': 'Center point',
  '中心点（笛卡尔坐标）': 'Center point (Cartesian)',
  '方位，包含[朝向|倾斜角|翻滚角]': 'Orientation: [heading | pitch | roll]',
  '旋转角度（弧度）': 'Rotation angle (radians)',
  '粒度（弧度）': 'Granularity (radians)',
  '角度（弧度，仅 computeSectorEdgePositions 使用）':
    'Angle (radians, used only by computeSectorEdgePositions)',
  '距离': 'Distance',
  '倾斜度': 'Pitch',

  // ---- 方法 / 模块说明 ----
  '销毁绘制操作': 'Dispose the draw operation',
  '判断对象是否有某个属性': 'Check whether the object has a given property',
  '释放当前模块持有的监听器 / DataSource（幂等）': 'Release listeners / DataSource held by this module (idempotent)',
  '由 createScopedConstructor 在每次 new 时调用。': 'Called by createScopedConstructor on every `new`.',
  '为每个实例创建独立闭包，避免模块级 Cesium/dfSt 及交互状态在多个 viewer 间共享。':
    'Creates an isolated closure per instance so module-level Cesium/dfSt and interaction state are not shared across viewers.',
  '构造函数由 createScopedConstructor 提供，实例请用 createKit 或 new 传入 viewer':
    'The constructor comes from createScopedConstructor; create an instance with createKit or new, passing a viewer',
  '图形模块': 'Graphics module',
  '用于向地图加载各种实体对象': 'Loads entity graphics onto the map',
  '获取标签图形': 'Create a label graphic',
  '获取广告牌图形': 'Create a billboard graphic',
  '获取盒子图形': 'Create a box graphic',
  '获取面板图形': 'Create a plane graphic',
  '获取椭圆': 'Create an ellipse',
  '分析模块': 'Analysis module',
  '移除所有实体': 'Remove all entities',
  '移除所以handler 监听': 'Remove all handler listeners',
  '移除每帧回调': 'Remove the per-frame callback',
  '移除剖面图': 'Remove the profile chart',
  '移除绘制的路径': 'Remove the drawn path',
  '移除全部视域': 'Remove all viewsheds',
  '移除全部开挖': 'Remove all excavations',
  '初始化容器': 'Initialize the container',
  '初始化three': 'Initialize three',
  '设置 three 对象(模型/网格等)在地球上显示的位置': 'Set the position of the three object (model / mesh) on the globe',
  '获取 three 对象当前所在的地理位置': 'Get the current geographic position of the three object',
  'three对象销毁': 'Dispose the three object',
  '融合运行时状态（诊断用）': 'Fused runtime state (for diagnostics)',
  '单上下文可用性检查': 'Single-context availability check',
  '读取当前笔刷参数': 'Read the current brush parameters',
  '开始一次涂抹（记录撤销快照）': 'Start a stroke (records an undo snapshot)',
  '结束一次涂抹（落定等高线与统计）': 'End a stroke (finalizes contours and statistics)',
  '回调': 'Callback',
  '回调函数': 'Callback function',
  '目标元素': 'Target element',
  '父容器': 'Parent container',
  '绘制箭头的数据': 'Data used to draw the arrow',
  '多个点的数组': 'Array of points',
  '转换后的笛卡尔积数组': 'Converted Cartesian array',
  '方位角度': 'Orientation angles',
  '监听的事件对象': 'Event object being listened to',
  "移动标识，可选['move','rotate','scale']": "Movement mode, one of ['move', 'rotate', 'scale']",
  '事件发生时的屏幕二维坐标（像素）': 'Screen coordinates of the event (px)',
  '鼠标移动时的结束位置，仅 MOUSE_MOVE 事件有': 'End position on mouse move; only present for MOUSE_MOVE',
  'gui 组件绑定的dom': 'DOM element bound to the GUI component',
  '距离': 'Distance',
  '坐标（单个或数组）': 'Coordinates (single value or array)',
  '坐标': 'Coordinates',
  '剖面线坐标（不传则交互绘制）': 'Profile line coordinates (drawn interactively when omitted)',

  // ---- 示例类方法（绘图 / 标绘）----
  '画点': 'Draw a point',
  '画线 or 测距': 'Draw a line or measure distance',
  '画面 or 测面积': 'Draw a polygon or measure area',
  '画矩形': 'Draw a rectangle',
  '画圆': 'Draw a circle',
  '画三角量测': 'Draw a triangle measurement',
  '画围栏': 'Draw a fence',
  '绘制球体': 'Draw a sphere',
  '绘制圆柱体 or 圆锥': 'Draw a cylinder or cone',
  '绘制走廊': 'Draw a corridor',
  '绘制管道': 'Draw a pipe',
  '箭头线': 'Arrow line',
  '图元点': 'Primitive point',
  '水面效果': 'Water effect',
  '纹理图 视频图像': 'Texture map / video image',
  '三维热力图': '3D heatmap',
  '圆形扩散效果': 'Circular diffusion effect',
  '雷达扫描': 'Radar sweep',
  '卫星扫描': 'Satellite sweep',
  '光锥扫描': 'Light cone sweep',
  '创建火焰粒子': 'Create flame particles',
  '路径漫游': 'Path roaming',
  '驾车路线查询': 'Driving route query',
  '驾车/步行/骑行路线查询': 'Driving / walking / cycling route query',
  '安装拓展图元': 'Install the extended primitive',
  '开始绘制攻击箭头': 'Start drawing an attack arrow',
  '通过数据 绘制攻击箭头': 'Draw an attack arrow from data',
  '通过数据 绘制钳击箭头': 'Draw a pincer arrow from data',
  '通过数据 绘制直线箭头': 'Draw a straight arrow from data',
  '攻击箭头 - 编辑': 'Attack arrow - editing',
  '钳击箭头 - 编辑': 'Pincer arrow - editing',
  '直线箭头 - 编辑': 'Straight arrow - editing',
  '获取攻击箭头中的关键点 经纬度': 'Get the key points of the attack arrow (lon/lat)',
  '获取攻击箭头中的关键点 世界坐标': 'Get the key points of the attack arrow (world coordinates)',
  '获取钳击箭头中的关键点 经纬度': 'Get the key points of the pincer arrow (lon/lat)',
  '获取钳击箭头中的关键点 世界坐标': 'Get the key points of the pincer arrow (world coordinates)',
  '获取直线箭头中的关键点 经纬度': 'Get the key points of the straight arrow (lon/lat)',
  '获取直线箭头中的关键点 世界坐标': 'Get the key points of the straight arrow (world coordinates)',
  '开始绘制钳击箭头': 'Start drawing a pincer arrow',
  '开始绘制直线箭头': 'Start drawing a straight arrow',

  // ---- 空间分析 ----
  '创建通视分析': 'Create a line-of-sight analysis',
  '创建通视分析参数': 'Line-of-sight analysis parameters',
  '创建环视分析': 'Create a viewshed analysis',
  '创建环视分析参数': 'Viewshed analysis parameters',
  '创建可视域分析': 'Create a visibility analysis',
  '创建可视域分析参数': 'Visibility analysis parameters',
  '地形开挖分析': 'Terrain excavation analysis',
  '地形开挖分析参数': 'Terrain excavation analysis parameters',
  '创建淹没分析': 'Create an inundation analysis',
  '淹没分析参数': 'Inundation analysis parameters',
  '创建坡度分析': 'Create a slope analysis',
  '坡度分析参数': 'Slope analysis parameters',
  '坡向分析': 'Aspect analysis',
  '坡向分析参数': 'Aspect analysis parameters',
  '坡向分析结果': 'Aspect analysis result',
  '剖面分析': 'Profile analysis',
  '剖面分析参数': 'Profile analysis parameters',
  '剖面分析结果': 'Profile analysis result',
  '方量分析': 'Cut-and-fill volume analysis',
  '方量分析参数': 'Cut-and-fill volume analysis parameters',
  '方量对比分析': 'Cut-and-fill comparison analysis',
  '方量对比参数': 'Cut-and-fill comparison parameters',
  '方量对比结果': 'Cut-and-fill comparison result',
  '单个设计标高的方量对比项': 'Cut-and-fill comparison item for one design elevation',
  '多观察点可视域分析': 'Multi-observer viewshed analysis',
  '多观察点可视域参数': 'Multi-observer viewshed parameters',
  '多观察点可视域结果': 'Multi-observer viewshed result',
  '多观察点可视域的单个观察点配置': 'Single observer configuration for multi-observer viewshed',
  '批量地形开挖': 'Batch terrain excavation',
  '批量地形开挖参数': 'Batch terrain excavation parameters',
  '批量地形开挖结果': 'Batch terrain excavation result',
  '通视路径分析': 'Line-of-sight path analysis',
  '通视路径参数': 'Line-of-sight path parameters',
  '通视路径结果': 'Line-of-sight path result',
  '每个采样点是否可见': 'Whether each sample point is visible',
  '第一个被遮挡的采样点索引，-1 表示全程通视':
    'Index of the first occluded sample point; -1 means the whole path is visible',
  '通视比例（0~1）': 'Visible ratio (0-1)',
  '参与统计的网格单元数': 'Number of grid cells included in the statistics',
  '采样范围 [minLng, minLat, maxLng, maxLat]': 'Sample extent [minLng, minLat, maxLng, maxLat]',
  '采样点（距离 / 高程 / 经纬度）': 'Sample points (distance / elevation / lon-lat)',
  '统计结果（最高 / 最低 / 平均 / 累计爬升下降）':
    'Statistics (max / min / mean / cumulative ascent and descent)',
  '距起点的水平距离（米）': 'Horizontal distance from the start (m)',
  '地面高程（米）': 'Ground elevation (m)',
  '该点坡度（度）': 'Slope at this point (degrees)',
  '该点坡向（度），0=北、顺时针；平地返回 -1':
    'Aspect at this point (degrees), 0 = north, clockwise; -1 on flat ground',
  '平均坡度（度），只统计非平地样本': 'Mean slope (degrees), flat samples excluded',
  '主导坡向（度），做向量平均；全为平地时 -1':
    'Dominant aspect (degrees) from vector averaging; -1 when everything is flat',
  '观察点 [lng, lat, height?]；height 缺省时按地形采样':
    'Observer [lng, lat, height?]; height is sampled from terrain when omitted',
  '瞄准目标 [lng, lat, height?]；不传则按 direction / pitch / distance 摆姿势':
    'Target [lng, lat, height?]; when omitted the pose comes from direction / pitch / distance',
  '观察点：坐标数组，或 { position, target } 对象；不传则交互（左键放置 → 移动瞄准 → 再次左键确认）':
    'Observers: coordinate array or { position, target } object; when omitted you place them interactively',
  '无 target 时的默认朝向（度，0=北、顺时针），默认 0':
    'Default heading without a target (degrees, 0 = north, clockwise), default 0',
  '无 target 时的默认俯仰（度，负值向下看），默认 0':
    'Default pitch without a target (degrees, negative looks down), default 0',
  '无 target 时的默认视距（米），默认 500': 'Default view distance without a target (m), default 500',
  '观察者眼睛离地高度（米），默认 1.7；设为 0 则直接用观察点高度':
    'Observer eye height above ground (m), default 1.7; 0 uses the observer height directly',
  '交互模式下最多添加的观察点数量，默认 5': 'Maximum number of observers added interactively, default 5',
  '追加一个观察点；target 可选，用于指定该观察点的瞄准目标':
    'Append an observer; optional target sets where this observer looks',
  '结束交互：停止放置/瞄准并解绑鼠标事件（非交互模式下为空操作）':
    'Finish interaction: stop placing / aiming and unbind mouse events (no-op in non-interactive mode)',
  '直接给定多边形（[lng, lat, height?] 数组）；不传则交互绘制':
    'Polygon given directly (array of [lng, lat, height?]); when omitted you draw it interactively',
  '对比的设计标高列表（米）；不传则按地形高低自动生成若干档':
    'Design elevations to compare (m); when omitted several steps are derived from the terrain',
  '网格采样步长（度），默认按范围自适应（约 40×40）':
    'Grid sampling step (degrees), default adapts to the extent (about 40x40)',
  '是否绘制对比柱状图，默认 true': 'Whether to draw the comparison bar chart, default true',
  '路径坐标（[lng, lat] 或 [lng, lat, height]）；不传则交互绘制':
    'Path coordinates ([lng, lat] or [lng, lat, height]); when omitted you draw it interactively',
  '多个开挖区域（[lng, lat, height?] 数组）；不传则交互绘制一个':
    'Multiple excavation areas (array of [lng, lat, height?]); when omitted you draw one interactively',
  '直接给定剖面线（[lng, lat] 或 [lng, lat, height]）。':
    'Profile line given directly ([lng, lat] or [lng, lat, height]).',
  '不传则在地图上交互绘制一条直线。': 'When omitted you draw a straight line on the map.',
  '采样点数量，默认 100（越大曲线越平滑，开销也越大）':
    'Number of sample points, default 100 (more points give a smoother curve at higher cost)',
  '是否绘制剖面图，默认 true': 'Whether to draw the profile chart, default true',
  'echarts 实例；chart: false 或 echarts 未就绪时为 null':
    'echarts instance; null when `chart: false` or echarts is not ready',
  '直接替换全部内容，不进入撤销栈（用于初始化 / fromJSON）':
    'Replace everything without pushing an undo entry (init / fromJSON)',
  '从快照创建 store（不产生撤销记录）': 'Create the store from a snapshot (no undo entry)',

  // ---- 面板 / 控件 ----
  '百度影像拓展': 'Baidu imagery extension',
  '后处理面板': 'Post-processing panel',
  '环境控制': 'Environment control',
  '图层参数调整': 'Layer parameter tuning',
  '图层切换': 'Layer switching',
  '场景效果调整面板': 'Scene effect panel',
  '实体位置、角度编辑面板': 'Entity position and angle panel',
  '平移模型': 'Translate the model',
  '旋转模型': 'Rotate the model',
  '缩放模型': 'Scale the model',
  '伞形传感器': 'Umbrella sensor',
  '锥形传感器': 'Cone sensor',
  '左键按下': 'Left mouse button pressed',
  '全局类：': 'Global classes:',

  // ---- 插件 / 工具类高频方法 ----
  '天空盒': 'Sky box',
  '天空盒2': 'Sky box 2',
  '天空盒3': 'Sky box 3',
  '近景天空盒': 'Near-field sky box',
  '近景天空盒2': 'Near-field sky box 2',
  '近景天空盒3': 'Near-field sky box 3',
  '黑夜特效': 'Night effect',
  '场景蓝光': 'Scene blue glow',
  '雨天特效': 'Rain effect',
  '雪天特效': 'Snow effect',
  '雾天': 'Foggy weather',
  '默认场景配置': 'Default scene configuration',
  '场景泛光': 'Scene bloom',
  '删除后置效果': 'Remove the post-processing effect',
  '相机定位': 'Fly the camera to a position',
  '相机飞行': 'Camera flight',
  '相机绕点旋转': 'Rotate the camera around a point',
  '笛卡尔转坐标WGS84': 'Convert Cartesian to WGS84',
  '坐标数组转换 笛卡尔转84': 'Convert a Cartesian array to WGS84',
  '坐标转换 84转笛卡尔': 'Convert WGS84 to Cartesian',
  '笛卡尔积坐标数组转换 84地理坐标': 'Convert a Cartesian array to WGS84 geographic coordinates',
  '经纬度坐标数组转笛卡尔积世界坐标数组': 'Convert lon/lat arrays to Cartesian world coordinates',
  '拾取位置点': 'Pick a position on the scene',
  '获取鼠标点击后的位置信息': 'Get the position of a mouse click',
  '鼠标事件注册': 'Register mouse events',
  '获取鼠标信息': 'Get mouse information',
  '保存当前场景png': 'Save the current scene as PNG',
  '移除绑定的handler事件': 'Remove bound handler events',
  '控件模块': 'Controls module',
  '画笔模块': 'Brush module',
  '标绘（攻击箭头）模块': 'Plot module (attack arrow)',
  '获取调整后的模型矩阵与平移矩阵': 'Get the adjusted model and translation matrices',
  '定义事件（拖拽 / 旋转 / 缩放）': 'Define events (drag / rotate / scale)',
  '自定义插件(传感器)': 'Custom plugin (sensor)',
  '卫星覆盖锥': 'Satellite coverage cone',
  '创建dom元素': 'Create a DOM element',
  '删除 element': 'Remove the element',
  '清空 element 的所有子节点': 'Remove all child nodes of the element',
  '添加 class': 'Add a class',
  '删除 class': 'Remove a class',
  '设置 class': 'Set a class',
  '获取元素 class': 'Get the element class',
  '创建 svg 元素': 'Create an SVG element',
  '生成 uuid': 'Generate a UUID',
  '获取锥体图形': 'Create a cone graphic',
  '创建点信息': 'Create point information',
  '创建渐变锥体': 'Create a gradient cone',
  '自定义标牌气泡框': 'Custom label bubble',
  '视频投放': 'Video projection',
  '设置图形旋转': 'Set the graphic rotation',
  '图形浮动': 'Float the graphic',
  '创建扇形': 'Create a sector',
  '添加动态炫光线材质': 'Add a dynamic glowing line material',
  '获取一个动态线材质': 'Get a dynamic line material',
  '添加 动态围栏/炫光墙体': 'Add a dynamic fence / glowing wall',
  '获取一个材质围栏': 'Get a material fence',
  '基本构造方法base': 'Base constructor',
  '创建一个Graphics实体': 'Create a Graphics entity',
  '标签名': 'Tag name',
  '宽': 'Width',
  '高': 'Height',
  '屏幕二维坐标': 'Screen coordinates (2D)',
  '经纬度坐标数组': 'Lon/lat coordinate array',
  '笛卡尔积坐标数组': 'Cartesian coordinate array',
  '后置场景对象数组': 'Array of post-processing scene objects',
  '高层': 'Altitude',
  'z轴高层': 'Altitude (z axis)',
  '坐标点1': 'Coordinate point 1',
  '坐标点2': 'Coordinate point 2',
  '坐标1': 'Coordinate 1',
  '坐标2': 'Coordinate 2',
  '圆心坐标 x': 'Center x',
  '圆心坐标 y': 'Center y',
  '等分个数': 'Number of equal parts',
  '角数量': 'Number of corners',
  '外圆半径': 'Outer radius',
  '内圆半径': 'Inner radius',
  '前缀，默认 "D"': 'Prefix, default "D"',
  '前缀': 'Prefix',
  'class 名称（多个 class 用空格分隔）': 'Class names (separated by spaces)',
  "handler名称数组，如['LEFT_CLICK','MOUSE_MOVE']": "Handler names, e.g. ['LEFT_CLICK', 'MOUSE_MOVE']",
  '已弃用的兼容别名（不再列出，请改用对应的 `create*` 方法）':
    'Deprecated aliases (no longer listed; use the corresponding `create*` method)'
}

/** Draw 与 TerrainEdit 的长参数说明（这两个模块占了英文站剩余中文的大头） */
Object.assign(EXACT, {
  '图形样式（Cesium 实体属性子集：width / material / clampToGround / granularity / arcType 等）；不传时各方法自带默认样式':
    'Graphic style (a subset of Cesium entity properties: width / material / clampToGround / granularity / arcType, etc.); each method falls back to its own default style',
  '绘制完成回调。回调参数随方法不同：画线/画矩形为 `(positions, entity)`，画圆为 `({ center, radius }, entity)`':
    'Completion callback. Arguments depend on the method: `(positions, entity)` for lines and rectangles, `({ center, radius }, entity)` for circles',
  '是否开启量算：画线时实时测距、画面时实时测面积':
    'Whether to measure while drawing: live distance for lines, live area for polygons',
  '宽度（米）：画走廊时的走廊宽度，默认 100': 'Width (m): corridor width when drawing a corridor, default 100',
  '高度（米）：画矩形的挤出高度、画走廊时的走廊高度，默认 1':
    'Height (m): extrusion height for rectangles, corridor height when drawing a corridor, default 1',
  '材质，覆盖 `style.material`': 'Material; overrides `style.material`',
  '是否贴合 S3M 倾斜模型表面': 'Whether to clamp to the S3M photogrammetry surface',
  '采样粒度（弧度），默认 `Cesium.Math.RADIANS_PER_DEGREE`':
    'Sampling granularity (radians), default `Cesium.Math.RADIANS_PER_DEGREE`',
  '绘制子类型，如 `straightLine` 表示三点直线量测':
    'Drawing subtype; `straightLine` means a three-point straight-line measurement',
  '圆柱 / 圆锥顶面半径（米）': 'Top radius of the cylinder / cone (m)',
  '圆柱 / 圆锥底面半径（米）': 'Bottom radius of the cylinder / cone (m)',
  '圆柱 / 圆锥长度（米），不传时按绘制圆量出的半径推算':
    'Length of the cylinder / cone (m); derived from the drawn radius when omitted',
  '挤出高度（米）': 'Extrusion height (m)',
  '材质颜色，如画管道，默认 `Cesium.Color.RED`': 'Material color (e.g. for pipes), default `Cesium.Color.RED`',
  '星形截面外半径（像素），默认 150': 'Outer radius of the star section (px), default 150',
  '星形截面内半径（像素），默认 75': 'Inner radius of the star section (px), default 75',
  '星形截面角数，默认 7': 'Number of corners of the star section, default 7',
  '圆形截面半径（像素），默认 20': 'Radius of the circular section (px), default 20',
  '管道截面形状：`fivePoint` 为五角星，其余为圆形':
    'Pipe cross-section: `fivePoint` for a five-point star, anything else for a circle',
  '采样粒度（弧度）': 'Sampling granularity (radians)',
  '线条颜色，默认 `#7defff`': 'Line color, default `#7defff`',
  '绘制完成后回调，参数为经纬度顶点（度）': 'Called after drawing; receives the polygon vertices (degrees)',
  '网格分辨率（每边划分数），默认 64': 'Grid resolution (partitions per side), default 64',
  '是否重建水面（默认 true）': 'Whether to rebuild the water surface (default true)',
  '相对水位（0~1）/ 绝对高程（米）/ \'auto\' / null':
    "Relative water level (0-1) / absolute elevation (m) / 'auto' / null",
  '多边形顶点，支持 `[lng, lat]` / `{lng, lat}` / Cartesian3':
    'Polygon vertices; accepts `[lng, lat]` / `{lng, lat}` / Cartesian3',
  '网格分辨率等参数': 'Grid resolution and related options',
  '形变参数': 'Deformation options',
  '模板类型与参数': 'Template type and options',
  '绘制样式与回调': 'Drawing style and callback',
  '统计结果；未设置范围时返回 null': 'Statistics result; null when no range is set',
  'true 显示，false 隐藏': 'true to show, false to hide'
})

/** 分词词表：参与组合翻译的名词 / 动词（按最长优先切分） */
const TERMS = {
  '采样点数量': 'sample point count',
  '采样点': 'sample point',
  '垂直分段': 'vertical segment',
  '平行分段': 'parallel segment',
  '分段数量': 'number of segments',
  '分段数': 'partitions',
  '轮廓线': 'outline',
  '外边线': 'outline',
  '边线': 'outline edge',
  '背景图': 'background image',
  '背景颜色': 'background color',
  '背景': 'background',
  '标签文字': 'label text',
  '标签': 'label',
  '文字': 'text',
  '字体': 'font',
  '风格': 'style',
  '样式': 'style',
  '地址': 'URL',
  '广告牌': 'billboard',
  '内球': 'inner sphere',
  '椭圆': 'ellipse',
  '最大': 'maximum',
  '最小': 'minimum',
  '默认': 'default',
  '顶部': 'top',
  '底部': 'bottom',
  '边框': 'border',
  '边界': 'boundary',
  '扫描': 'scan',
  '垂直': 'vertical',
  '水平': 'horizontal',
  '动画': 'animation',
  '纹理': 'texture',
  '材质': 'material',
  '图片': 'image',
  '颜色': 'color',
  '半径': 'radius',
  '宽度': 'width',
  '高度': 'height',
  '长度': 'length',
  '坐标': 'coordinates',
  '位置': 'position',
  '方向': 'direction',
  '角度': 'angle',
  '数量': 'count',
  '时长': 'duration',
  '间隔': 'interval',
  '名称': 'name',
  '编号': 'id',
  '参数': 'parameters',
  '结果': 'result',
  '实例': 'instance',
  '数组': 'array',
  '列表': 'list',
  '对象': 'object',
  '图形': 'graphic',
  '实体': 'entity',
  '模型': 'model',
  '图层': 'layer',
  '相机': 'camera',
  '观察点': 'observer',
  '目标': 'target',
  '路径': 'path',
  '多边形': 'polygon',
  '线段': 'line segment',
  '线': 'line',
  '点': 'point',
  '面': 'polygon',
  '球': 'sphere',
  '圆': 'circle',
  '矩形': 'rectangle',
  '管道': 'pipe',
  '走廊': 'corridor',
  '围栏': 'fence',
  '大小': 'size',
  '距离': 'distance',
  '强度': 'intensity',
  '频率': 'frequency',
  '偏移': 'offset',
  '视角': 'view',
  '缩放': 'scale',
  '远近': 'near-far',
  '设置': 'settings',
  '类型': 'type',
  '贴地': 'clamp to ground',
  '显示': 'show',
  '绘制': 'draw',
  '填充': 'fill',
  '开启': 'enable',
  '启用': 'enable',
  '支持': 'support',
  '观察者': 'observer',
  '眼睛': 'eye',
  '离地': 'above ground',
  '屏幕': 'screen',
  '二维': '2D',
  '经纬度': 'lon/lat',
  '笛卡尔积': 'Cartesian',
  '坐标点': 'coordinate point',
  '圆心': 'center',
  '外圆': 'outer',
  '内圆': 'inner',
  '等分': 'equal',
  '个数': 'count',
  '角': 'corner',
  '前缀': 'prefix',
  '标签名': 'tag name',
  '设计标高': 'design elevation',
  '网格': 'grid',
  '步长': 'step',
  '采样': 'sampling',
  '元素': 'element',
  '子节点': 'child node',
  '场景': 'scene',
  '鼠标': 'mouse',
  '信息': 'information',
  '事件': 'event',
  '模块': 'module',
  '标识': 'identifier',
  '构造': 'constructor',
  '基本': 'basic',
  '天空盒': 'sky box',
  '实体': 'entity'
}

/** 后缀模式：优先于分词，译法更自然（`外边线宽度` -> Outline width） */
const SUFFIX_RULES = [
  ['颜色', ' color'],
  ['宽度', ' width'],
  ['高度', ' height'],
  ['长度', ' length'],
  ['半径', ' radius'],
  ['深度', ' depth'],
  ['间隔', ' interval'],
  ['时长', ' duration'],
  ['范围', ' range'],
  ['方向', ' direction'],
  ['位置', ' position'],
  ['角度', ' angle'],
  ['坐标', ' coordinates'],
  ['数组', ' array'],
  ['列表', ' list'],
  ['名称', ' name'],
  ['编号', ' id'],
  ['数量', ' count'],
  ['大小', ' size'],
  ['参数', ' parameters'],
  ['结果', ' result'],
  ['实例', ' instance'],
  ['对象', ' object']
]

/** `X（单位）` 的括号单位 */
const UNIT_RULES = [
  ['米', 'm'],
  ['度', 'degrees'],
  ['弧度', 'radians'],
  ['像素', 'px'],
  ['秒', 's'],
  ['毫秒', 'ms']
]

const stats = { total: 0, translated: 0, kept: new Set() }

const TERM_KEYS = Object.keys(TERMS).sort((a, b) => b.length - a.length)

/** 贪心分词：整句都被词表覆盖才算成功 */
function segment(text) {
  const words = []
  let i = 0
  while (i < text.length) {
    let matched = null
    for (const key of TERM_KEYS) {
      if (text.startsWith(key, i)) {
        matched = key
        break
      }
    }
    if (!matched) return null
    words.push(TERMS[matched])
    i += matched.length
  }
  return words
}

function titleCase(text) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * 翻译一句说明。返回 null 表示无法确定译法（调用方保留原文）。
 * 翻完仍含中文就当失败，绝不出中英混排。
 */
function translatePhrase(raw) {
  const text = raw.trim().replace(/[。.]$/, '')
  if (!text) return raw
  if (EXACT[text]) return EXACT[text]
  if (!CJK_RE.test(text)) return raw

  // 长前缀命中（`已弃用的兼容别名…：` 后面跟一长串名字）
  for (const [key, en] of Object.entries(EXACT)) {
    if (key.length >= 8 && text.startsWith(key)) return en + text.slice(key.length)
  }

  let m
  // 是否X -> Whether to X
  if ((m = text.match(/^是否(.+)$/))) {
    const rest = translatePhrase(m[1])
    if (rest && !CJK_RE.test(rest)) return `Whether to ${rest.charAt(0).toLowerCase()}${rest.slice(1)}`
  }
  // 默认值后缀：X，默认 Y
  if ((m = text.match(/^(.+?)，默认\s*(.+)$/))) {
    const head = translatePhrase(m[1])
    if (head && !CJK_RE.test(head)) return `${head}, default ${m[2]}`
  }
  // 返回X -> Returns X
  if ((m = text.match(/^返回(.+)$/))) {
    const rest = translatePhrase(m[1])
    if (rest && !CJK_RE.test(rest)) {
      const lower = rest.charAt(0).toLowerCase() + rest.slice(1)
      return /实例$|instance$/.test(rest) ? `Returns the ${lower}` : `Returns ${lower}`
    }
  }
  // X的Y -> Y of X
  if ((m = text.match(/^(.+?)的(.+)$/))) {
    const head = translatePhrase(m[1])
    const tail = translatePhrase(m[2])
    if (head && tail && !CJK_RE.test(head + tail)) return `${tail} of ${head.charAt(0).toLowerCase()}${head.slice(1)}`
  }
  // X（单位）
  if ((m = text.match(/^(.+)（([^）]+)）$/))) {
    const head = translatePhrase(m[1])
    const unit = UNIT_RULES.find(([cn]) => cn === m[2])
    if (head && unit && !CJK_RE.test(head)) return `${head} (${unit[1]})`
  }
  // X颜色 / X宽度 / ...
  for (const [suffix, en] of SUFFIX_RULES) {
    if (text.endsWith(suffix) && text.length > suffix.length) {
      const head = translatePhrase(text.slice(0, -suffix.length))
      if (head && !CJK_RE.test(head)) return `${titleCase(head)}${en}`
    }
  }
  // 开始绘制X / 通过数据绘制X / 创建X / 移除X / 获取X
  const verbPrefixes = [
    ['开始绘制', 'Start drawing '],
    ['通过数据 绘制', 'Draw '],
    ['通过数据绘制', 'Draw '],
    ['创建', 'Create '],
    ['移除', 'Remove '],
    ['获取', 'Get '],
    ['绘制', 'Draw '],
    ['画', 'Draw ']
  ]
  for (const [prefix, en] of verbPrefixes) {
    if (text.startsWith(prefix) && text.length > prefix.length) {
      const rest = translatePhrase(text.slice(prefix.length))
      if (rest && !CJK_RE.test(rest)) {
        const lower = rest.charAt(0).toLowerCase() + rest.slice(1)
        return `${en}${prefix === '画' ? 'a ' : ''}${lower}`
      }
    }
  }
  // 纯词根组合（`点大小` -> Point size）
  if (text.length <= 24) {
    const words = segment(text)
    if (words && words.length <= 6) return titleCase(words.join(' '))
  }
  return null
}

/** 带前缀的行：`@param options.show 是否显示`、`- \`show\`（\`boolean\`）：是否显示` */
function translateWithPrefix(line) {
  let m
  if ((m = line.match(/^(@internal\s+)(.+)$/))) {
    const out = translatePhrase(m[2])
    return out ? m[1] + out : null
  }
  if ((m = line.match(/^(@param\s+[^\s]+\s+)(.+)$/))) {
    const out = translatePhrase(m[2])
    return out ? m[1] + out : null
  }
  if ((m = line.match(/^(@returns?\s+)(.+)$/))) {
    const out = translatePhrase(m[2])
    return out ? m[1] + out : null
  }
  if (line.startsWith('@')) return null
  if (line.startsWith('- ')) {
    const idx = line.indexOf('：')
    if (idx > 0) {
      const out = translatePhrase(line.slice(idx + 1))
      if (out) return line.slice(0, idx + 1) + out
    }
    return null
  }
  return false
}

const CODE_LINE_RE =
  /^(```|~~~|\/\/|import\s|const\s|let\s|var\s|function\s|new\s|class\s|export\s|[{}<>]|[a-zA-Z_$][\w$.]*\s*[=(:]|.*<div|.*console\.)/

/**
 * 翻译一个 JSDoc 行数组（normalizeDoc 之后的形态）。
 * 代码块（``` 围栏）、示例代码行、URL 行原样保留。
 */
export function translateDocLines(lines) {
  let inFence = false
  return lines.map((line) => {
    const trimmed = line.trim()
    if (/^```/.test(trimmed)) {
      inFence = !inFence
      return line
    }
    if (inFence || !CJK_RE.test(line)) return line
    // 引用块 `> xxx` 先剥掉前缀再判断，否则会当成代码行跳过
    const quote = /^>\s?/.test(trimmed) ? '> ' : ''
    const body = quote ? trimmed.slice(quote.length).trim() : trimmed
    if (CODE_LINE_RE.test(body) || /https?:\/\//.test(body)) return line

    stats.total += 1
    const prefixed = translateWithPrefix(body)
    if (prefixed) {
      stats.translated += 1
      return line.replace(trimmed, quote + prefixed)
    }
    if (prefixed === false) {
      const out = translatePhrase(body)
      if (out) {
        stats.translated += 1
        return line.replace(trimmed, quote + out)
      }
    }
    stats.kept.add(trimmed)
    return line
  })
}

/** 写出未翻译清单（按行内容排序），供后续补词表 */
export function writeUntranslatedReport(outFile) {
  const lines = [...stats.kept].sort()
  const header = [
    '# Untranslated JSDoc lines',
    '',
    `Translated ${stats.translated} / ${stats.total} comment lines; ${lines.length} distinct lines still Chinese.`,
    'Add them to EXACT / TERMS in `scripts/api-i18n-en.mjs` to translate more.',
    ''
  ]
  fs.writeFileSync(outFile, [...header, ...lines.map((l) => `- ${l}`)].join('\n'), 'utf8')
  return lines.length
}

export function i18nCoverage() {
  return {
    total: stats.total,
    translated: stats.translated,
    kept: stats.kept.size,
    rate: stats.total ? stats.translated / stats.total : 0
  }
}

export function reportPath(root) {
  return path.join(root, '.i18n-untranslated.md')
}
