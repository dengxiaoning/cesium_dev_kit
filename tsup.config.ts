import { defineConfig } from 'tsup'

/**
 * 库构建配置（与演示站 vite.config.ts 分离）
 *
 * 产出：
 * - dist/*.mjs     ESM
 * - dist/*.cjs     CJS
 * - dist/*.d.ts    类型声明
 * - dist/*.map     sourcemap
 *
 * 每个模块都是独立入口，使用方可以按需引入：
 *   import { Graphics } from 'cesium_dev_kit/graphics'
 * 从而避免把 echarts / dat.gui / libgif 等可选依赖打进业务包。
 */
export default defineConfig({
  entry: {
    index: 'src/utils/cesiumPluginsExtends/index.ts',
    graphics: 'src/utils/cesiumPluginsExtends/singleImport/Graphics.ts',
    material: 'src/utils/cesiumPluginsExtends/singleImport/Material.ts',
    primitive: 'src/utils/cesiumPluginsExtends/singleImport/Primitive.ts',
    draw: 'src/utils/cesiumPluginsExtends/singleImport/Draw.ts',
    analysis: 'src/utils/cesiumPluginsExtends/singleImport/Analysis.ts',
    plugin: 'src/utils/cesiumPluginsExtends/singleImport/Plugin.ts',
    'pass-effect': 'src/utils/cesiumPluginsExtends/singleImport/PassEffect.ts',
    control: 'src/utils/cesiumPluginsExtends/singleImport/Control.ts',
    three: 'src/utils/cesiumPluginsExtends/singleImport/ThreeJs.ts',
    'custom-cesium-plugin': 'src/utils/cesiumPluginsExtends/singleImport/CustomCesiumPlugin.ts',
    'default-static': 'src/utils/cesiumPluginsExtends/defaultStatic.ts',
    vue: 'src/utils/cesiumPluginsExtends/vue/index.ts',
    react: 'src/utils/cesiumPluginsExtends/react/index.ts',
    plot: 'src/utils/cesiumPluginsExtends/plot/index.ts',
    history: 'src/utils/cesiumPluginsExtends/history/index.ts',
    annotation: 'src/utils/cesiumPluginsExtends/annotation/index.ts',
    'web-components': 'src/utils/cesiumPluginsExtends/web-components/index.ts'
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  // 压缩产物，配合 sourcemap 兼顾体积与可调试性
  minify: true,
  clean: true,
  // 不做共享 chunk：每个子路径入口自包含，避免 import 'cesium_dev_kit/graphics'
  // 时被共享 chunk 连带引入 echarts / dat.gui 等可选依赖
  splitting: false,
  treeshake: true,
  target: 'es2019',
  platform: 'browser',
  outDir: 'dist',
  external: [
    'cesium',
    'three',
    'vue',
    'react',
    'react/jsx-runtime',
    'echarts',
    'dat.gui',
    'libgif',
    '@turf/turf',
    'concaveman'
  ],
  outExtension({ format }) {
    return { js: format === 'esm' ? '.mjs' : '.cjs' }
  }
})
