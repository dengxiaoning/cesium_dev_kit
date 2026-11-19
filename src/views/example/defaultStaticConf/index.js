/**
 * 兼容示例中的历史引用。
 *
 * 静态资源配置已收敛到库内（`cesiumPluginsExtends/defaultStatic.ts`），
 * 这样示例和发布后的 npm 包使用同一份地址，避免两处维护导致漂移。
 * 使用方可以：
 *   import { defaultStatic } from 'cesium_dev_kit/default-static'
 * 或自定义 CDN：
 *   import { createDefaultStatic } from 'cesium_dev_kit/default-static'
 *   const defaultStatic = createDefaultStatic('https://your-cdn.com/')
 */
export { defaultStatic } from '../../../utils/cesiumPluginsExtends/defaultStatic'
