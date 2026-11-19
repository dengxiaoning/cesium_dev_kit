import type { StaticResourceConf } from './libs/Base'

/**
 * 默认静态资源 CDN。
 *
 * 库内所有「未显式传入图片/模型地址」的功能都会回退到这里的资源，例如天空盒、
 * 点图标、光锥贴图、水面贴图等。你可以：
 * 1. 直接使用默认 CDN（开箱即用，但依赖作者服务器）；
 * 2. 用 `createDefaultStatic('https://your-cdn.com/')` 换成自己的地址；
 * 3. 用 `createDefaultStatic('')` 使用相对路径，并把 `public/static` 拷贝到自己的站点。
 */
export const DEFAULT_STATIC_BASE = ''

/**
 * 把静态资源相对路径拼到 baseService 上。
 *
 * - 绝对地址（`https://`、`//cdn`）、`data:` URI、站点根路径（`/xxx`）原样返回；
 * - `baseService` 为空时返回相对路径（适用于把资源自托管到当前站点）；
 * - 自动处理两侧多余的 `/`，避免出现 `//` 或 `baseServiceundefined`。
 */
export function joinStaticUrl(baseService: string | undefined, path: string): string {
  if (!path) return ''
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('/')) {
    return path
  }
  const base = (baseService || '').replace(/\/+$/, '')
  if (!base) return path
  return base + '/' + path.replace(/^\/+/, '')
}

/** 天空盒六面贴图 */
type SkyBoxFaces = {
  positiveX: string
  negativeX: string
  positiveY: string
  negativeY: string
  positiveZ: string
  negativeZ: string
}

/**
 * 创建一份默认静态资源配置。
 * @param baseService - 静态资源前缀，默认使用 {@link DEFAULT_STATIC_BASE}
 */
export function createDefaultStatic(baseService: string = DEFAULT_STATIC_BASE): StaticResourceConf {
  const skyBox: Record<string, SkyBoxFaces> = {
    // 天空盒
    one: {
      positiveX: 'static/data/images/SkyBox/00h+00.jpg',
      negativeX: 'static/data/images/SkyBox/12h+00.jpg',
      positiveY: 'static/data/images/SkyBox/06h+00.jpg',
      negativeY: 'static/data/images/SkyBox/18h+00.jpg',
      positiveZ: 'static/data/images/SkyBox/06h+90.jpg',
      negativeZ: 'static/data/images/SkyBox/06h-90.jpg'
    },
    two: {
      positiveX: 'static/data/images/SkyBox/Version2_dark_px.jpg',
      negativeX: 'static/data/images/SkyBox/Version2_dark_mx.jpg',
      positiveY: 'static/data/images/SkyBox/Version2_dark_py.jpg',
      negativeY: 'static/data/images/SkyBox/Version2_dark_my.jpg',
      positiveZ: 'static/data/images/SkyBox/Version2_dark_pz.jpg',
      negativeZ: 'static/data/images/SkyBox/Version2_dark_mz.jpg'
    },
    three: {
      positiveX: 'static/data/images/SkyBox/tycho2t3_80_pxs.jpg',
      negativeX: 'static/data/images/SkyBox/tycho2t3_80_mxs.jpg',
      positiveY: 'static/data/images/SkyBox/tycho2t3_80_pys.jpg',
      negativeY: 'static/data/images/SkyBox/tycho2t3_80_mys.jpg',
      positiveZ: 'static/data/images/SkyBox/tycho2t3_80_pzs.jpg',
      negativeZ: 'static/data/images/SkyBox/tycho2t3_80_mzs.jpg'
    },
    nearOne: {
      positiveX: 'static/data/images/SkyBox/rightav9.jpg',
      negativeX: 'static/data/images/SkyBox/leftav9.jpg',
      positiveY: 'static/data/images/SkyBox/frontav9.jpg',
      negativeY: 'static/data/images/SkyBox/backav9.jpg',
      positiveZ: 'static/data/images/SkyBox/topav9.jpg',
      negativeZ: 'static/data/images/SkyBox/bottomav9.jpg'
    },
    nearTwo: {
      positiveX: 'static/data/images/SkyBox/SunSetRight.png',
      negativeX: 'static/data/images/SkyBox/SunSetLeft.png',
      positiveY: 'static/data/images/SkyBox/SunSetFront.png',
      negativeY: 'static/data/images/SkyBox/SunSetBack.png',
      positiveZ: 'static/data/images/SkyBox/SunSetUp.png',
      negativeZ: 'static/data/images/SkyBox/SunSetDown.png'
    },
    nearThree: {
      positiveX: 'static/data/images/SkyBox/Right.jpg',
      negativeX: 'static/data/images/SkyBox/Left.jpg',
      positiveY: 'static/data/images/SkyBox/Front.jpg',
      negativeY: 'static/data/images/SkyBox/Back.jpg',
      positiveZ: 'static/data/images/SkyBox/Up.jpg',
      negativeZ: 'static/data/images/SkyBox/Down.jpg'
    }
  }

  return {
    baseService,
    skyBox,
    drawPointGraphics: 'static/data/images/file/location4.png',
    graphic: {
      craeteRotateCylinderGraphics: 'static/data/images/file/cc2.png', // 创建旋转圆柱
      craeteDynamicCricleGraphics: 'static/data/images/Textures/circle_bg.png', // 动态旋转圆
      craeteDynamicShadeWallGraphics: 'static/data/images/Textures/fence.png', // 动态渐变墙
      createCustomDefBillboardGraphics: 'static/data/images/file/div1.png' // 默认自定义标牌气泡框
    },
    material: {
      PolylineCityLinkMaterialProperty: 'static/data/images/Textures/meteor_01.png', // 城市光效线
      WarnLinkMaterialProperty: 'static/data/images/Textures/jsx2.png' // 城市警示墙
    },
    plugin: {
      Css3Renderer_one: 'static/data/images/Textures/circle2.png', // 扩展 css3 动画元素（底座一 外环）
      Css3Renderer_two: 'static/data/images/Textures/circle1.png' // 扩展 css3 动画元素（底座二 内环）
    },
    primitive: {
      TetrahedronPrimitive: 'static/data/images/Textures/fence.png', // 光锥图元
      WaterPrimitive: 'static/data/images/Textures/river.png' // 水面效果
    },
    passEffect: {
      satellite: 'static/data/images/file/satellite.svg' // 卫星图标
    },
    amalysis: {
      // 兼容历史拼写：analysis -> amalysis
      createClipPlanAnalysis_wallImg: 'static/data/images/file/excavate_side_min.jpg', // 地形开挖分析
      createClipPlanAnalysis_bottomImg: 'static/data/images/file/excavate_bottom_min.jpg', // 地形开挖分析
      createSubmergedAnalysis: 'static/data/images/file/water.png' // 创建淹没分析
    }
  }
}

/**
 * 默认静态资源实例（指向 {@link DEFAULT_STATIC_BASE}）。
 *
 * ```ts
 * import { defaultStatic } from 'cesium_dev_kit/default-static'
 * initCesium({ defaultStatic, ... })
 * ```
 */
export const defaultStatic: StaticResourceConf = createDefaultStatic()
